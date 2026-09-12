// Import transformer pipeline at module level (allows jest.mock to intercept)
let pipeline
try {
  pipeline = require('@xenova/transformers').pipeline
} catch (error) {
  console.error(error)
}

const { unifyFormulaNotation, GREEK } = require('../helpers/formulaNotation')

// Noms grecs en toutes lettres -> symbole Unicode, pour reconnaître « rho » tapé
// au clavier (sans le « \ » de commande LaTeX que `unifyFormulaNotation` attend) —
// regex pré-compilée une fois : alternative des clés GREEK triée par longueur
// décroissante (« varepsilon » avant « epsilon », sinon le remplacement partiel
// laisserait un résidu « εilon »), bornée par `\b` pour ne jamais couper un mot
// plus long qui contiendrait un nom grec en sous-chaîne. `(?<!\\)` exclut « \rho »
// (commande LaTeX de l'éditeur, déjà traitée par `unifyFormulaNotation` — sans
// cette exclusion, « rho » matche aussi le « rho » de « \rho » via `\b` entre le
// « \ » non-mot et le « r », cassant ce chemin en un résidu « \ρ » corrompu).
const GREEK_NAMES_PATTERN = new RegExp(
  `(?<!\\\\)\\b(${Object.keys(GREEK).sort((a, b) => b.length - a.length).join('|')})\\b`,
  'gi'
)
const { algebraicallyEqual: isAlgebraicallyEqual } = require('../helpers/algebraicEquivalence')

// Stopwords anglais + français : l'application est francophone, la liste anglaise
// seule laissait « une », « dans », « les »… compter comme mots-clés dans la zone grise
const STOPWORDS = new Set([
  // Français
  'le',
  'la',
  'les',
  'un',
  'une',
  'des',
  'du',
  'de',
  'dans',
  'sur',
  'sous',
  'par',
  'pour',
  'avec',
  'sans',
  'vers',
  'chez',
  'et',
  'ou',
  'mais',
  'donc',
  'car',
  'ni',
  'or',
  'que',
  'qui',
  'quoi',
  'dont',
  'est',
  'sont',
  'être',
  'était',
  'étaient',
  'sera',
  'seront',
  'fait',
  'faire',
  'avoir',
  'ont',
  'aux',
  'ce',
  'cet',
  'cette',
  'ces',
  'son',
  'ses',
  'leur',
  'leurs',
  'ils',
  'elles',
  'nous',
  'vous',
  'tout',
  'tous',
  'toute',
  'toutes',
  'plus',
  'moins',
  'très',
  'aussi',
  'comme',
  'alors',
  'donc',
  'ainsi',
  'lors',
  'pas',
  'non',
  'oui',
  'se',
  'sa',
  'au',
  'il',
  'elle',
  'on',
  'lui',
  'ne',
  'en',
  // Mots de liaison courts (2026-09-08) : absents jusqu'ici, sans conséquence
  // tant que le plancher de longueur (`> 2` caractères) les filtrait déjà —
  // devenus nécessaires en STOPWORDS le jour où ce plancher a été retiré
  // (extractKeywords, cf. DECISIONS.md du même jour) pour ne pas polluer les
  // mots-clés d'une réponse en prose classique de bruit grammatical.
  'à',
  'a',
  'y',
  'où',
  'eu',
  'ça',
  'là',
  // C-02.09 (revue de code) : le batch du 2026-09-08 ci-dessus n'était pas exhaustif — d'autres mots
  // de liaison ≤ 2 caractères passaient encore, avec le même risque qu'à l'origine (ex. « si » commun
  // aux deux membres d'une phrase de type ratio peut faire passer `detectInversion` à `straight: true`
  // via ce seul mot, masquant une vraie inversion d'opérandes par ailleurs correctement détectée).
  'si',
  'tu',
  'ai',
  'va',
  // Anglais
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'if',
  'then',
  'so',
  'because',
  'on',
  'in',
  'at',
  'of',
  'for',
  'to',
  'from',
  'by',
  'with',
  'about',
  'is',
  'am',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'it',
  'this',
  'that',
  'these',
  'those',
  'do',
  'does',
  'did',
  'doing',
  'have',
  'has',
  'had',
  'not',
  'no',
  'yes',
  'i',
  'you',
  'he',
  'she',
  'we',
  'they',
  'them',
  'his',
  'her',
  'their',
  'as',
  'very',
  'really',
  'just'
])

// Seuil unique de décision (2026-09-09, remplace HIGH_THRESHOLD/LOW_THRESHOLD/
// zone grise) — voir le commentaire dans gradeSemantic pour le détail complet.
// Abaissé de 0,78 à 0,75 (2026-09-12, demande explicite utilisateur) : l'usage
// réel depuis le 2026-09-09 n'a remonté que des faux négatifs proches du seuil
// (réponses correctes rejetées, ex. « modèle isotherme » à 0,7407), jamais de
// faux positif — la calibration d'origine (DECISIONS.md 2026-07-18) n'ancrait
// 0,78 que sur un seul point négatif (0,717, « réponse fausse même domaine »),
// marge insuffisante pour trancher entre 0,75 et 0,78. 0,75 garde encore 0,033
// de marge sous ce seul cas négatif connu. NE corrige PAS le cas isotherme
// (0,7407 < 0,75) ni un score à 0,73 : reste sous le nouveau seuil aussi — voir
// DECISIONS.md 2026-09-12 pour le détail et pourquoi ces cas précis ne sont
// pas rattrapés par ce changement.
const HIGH_THRESHOLD = 0.75

// Séparateurs antisymétriques de la famille division/rapport : l'ordre des opérandes
// porte le sens (« masse par unité de volume » ≠ « volume par unité de masse »), mais
// les embeddings y sont quasi insensibles — d'où une vérification déterministe dédiée.
const RATIO_SEPARATOR = /\s(?:divisée?s? par|par unité de|rapportée?s? (?:à|au)|sur)\s/

// Séparateurs de tokenization pour extractKeywords/tokenize : espace + ponctuation
// « classique » (/, -, ., ,, :) + opérateurs/regroupements courants d'une formule
// tapée en texte simple, sans passer par l'assistant formule (=, *, +, ^, (, ), _ —
// bug reproduit le 2026-09-08, carte « barrage voûte » : « dF_P = P(z)(-dS) + P_atm
// dS » se fragmentait sinon en tokens absurdes à chaque parenthèse/indice) + « − »
// (signe moins Unicode des réponses de référence stockées, distinct du tiret ASCII)
// + « # »/« " » (résidu de corruption constaté sur plusieurs réponses de référence
// de ce même contenu physique — vraisemblablement un artefact d'extraction PDF sur
// une notation vectorielle, ex. « d #"F P = P (M ) #"dS » pour « d→F = P(M)·d→S » —
// non corrigé à la source ici (donnée, pas code), mais neutralisé comme séparateur
// pour ne pas polluer les tokens de bordure qu'il contamine) + « · » (point médian
// U+00B7, multiplication en notation française : « kg·m⁻³ », « -ρ·g » — déjà
// converti en « * » par unifyFormulaNotation à l'intérieur d'un segment $…$, mais
// pas ailleurs ; sans séparateur ici, colle les variables entre elles hors $…$).
const MATH_SEPARATORS = /[\s/\-−.,:=*+^()_#"·]+/

// Petits groupes de synonymes/variantes morphologiques FR unifiés vers un
// représentant canonique commun — pour `computeKeywordOverlap` uniquement,
// jamais pour l'embedding ni la comparaison symbolique. Trouvé le 2026-09-08 :
// « la pression décroît exponentiellement » (référence) et « la pression
// diminue de façon exponentielle » (étudiant, sens strictement identique) ne
// se recoupaient sur AUCUN mot, la comparaison de mots-clés étant purement
// littérale — l'embedding capte déjà cette proximité (~0,74) mais la zone
// grise retombe sur le recouvrement de mots-clés, aveugle aux synonymes.
// Volontairement borné à un vocabulaire non ambigu et fréquent en physique
// (croissance/décroissance d'une grandeur) plutôt qu'un thésaurus général,
// pour limiter le risque de rapprocher à tort des réponses sans rapport —
// cf. calibration DECISIONS.md 2026-07-18 (« réponse fausse même domaine »
// à 0,717 correctement rejetée par mots-clés : un thésaurus trop large
// aurait pu la faire passer à tort).
const SYNONYM_GROUPS = [
  ['augmente', 'augmenter', 'augmentation', 'croît', 'croit', 'croître', 'croitre', 'croissance', 'croissant', 'croissante', 'monte', 'monter', 'hausse'],
  ['diminue', 'diminuer', 'diminution', 'décroît', 'décroit', 'décroître', 'decroitre', 'décroissance', 'décroissant', 'décroissante', 'baisse', 'baisser']
]
const SYNONYM_CANONICAL = new Map(
  SYNONYM_GROUPS.flatMap((group) => group.map((word) => [word, group[0]]))
)

// Un adverbe français en « -ment » dérive presque toujours de l'adjectif au
// féminin qui le précède (« exponentielle » + « ment » = « exponentiellement »,
// « rapide » + « ment » = « rapidement ») — deux réponses qui n'emploient pas
// la même forme grammaticale du même mot (« décroît EXPONENTIELLEMENT » vs
// « de façon EXPONENTIELLE ») ne se recoupent sinon jamais en comparaison
// littérale. Règle mécanique et régulière : risque de faux rapprochement
// négligeable (peu de paires de mots français distincts qui ne diffèrent que
// par ce suffixe), donc appliquée sans liste de garde. Le seuil de longueur
// exclut les mots courts où « -ment » ne serait pas ce suffixe (« ciment »,
// « moment »).
function stripAdverbSuffix(token) {
  return token.length > 8 && token.endsWith('ment') ? token.slice(0, -4) : token
}

// Normalisation d'un mot-clé pour le recouvrement uniquement : synonymes puis
// suffixe adverbial (ordre neutre ici, les deux mécanismes ne se recouvrent pas).
function canonicalizeKeyword(token) {
  return SYNONYM_CANONICAL.get(token) ?? stripAdverbSuffix(token)
}

class SemanticService {
  constructor() {
    this.model = null
    this.modelLoading = null
  }

  /**
   * Lazy load the embedding model (one-time, singleton pattern)
   */
  async getModel() {
    if (this.model) return this.model

    if (this.modelLoading) {
      return this.modelLoading
    }

    this.modelLoading = this._initializeModel().finally(() => {
      this.modelLoading = null
    })
    this.model = await this.modelLoading
    return this.model
  }

  async _initializeModel() {
    try {
      if (!pipeline) {
        throw new Error('Transformers library not available')
      }
      // CHOIX: modèle multilingue MiniLM (50+ langues dont le français) plutôt que
      // all-mpnet-base-v2 (anglais) ou paraphrase-multilingual-mpnet-base-v2 (multilingue mais ~280 Mo)
      // RAISON: l'application est francophone — le modèle anglais déprimait les similarités entre
      // paraphrases françaises correctes (~0,61 pour une réponse juste reformulée) ; la variante
      // mpnet multilingue dépasse la limite mémoire des conteneurs API.
      // MESURE (2026-09-01, `docker stats` en local, conteneur au repos) : ~794 Mo de RSS une
      // fois MiniLM chargé — largement au-dessus des ~120 Mo estimés initialement (poids du
      // modèle sur disque, pas l'empreinte réelle du runtime ONNX WASM une fois en mémoire) et
      // au-dessus du défaut local (512 Mo, relevé à 1536M dans .env) ; voir CHANGELOG_AGENT.md
      // pour le détail et la limite prod (1 Gi, marge plus juste qu'espéré sous charge).
      console.log('[SemanticService] Loading embedding model: paraphrase-multilingual-MiniLM-L12-v2...')
      const extractor = await pipeline(
        'feature-extraction',
        'Xenova/paraphrase-multilingual-MiniLM-L12-v2'
      )
      console.log('[SemanticService] Model loaded successfully.')
      return extractor
    } catch (error) {
      console.error('[SemanticService] Failed to load model:', error?.message || error)
      throw new Error('Failed to load embedding model')
    }
  }

  /**
   * normalization de texte : trim, lowercase, collapse spaces
   */
  normalizeText(text) {
    if (!text || typeof text !== 'string') return ''
    return text
      .trim()
      // « ∆ » (U+2206, symbole INCREMENT) et « Δ » (U+0394, lettre grecque Delta)
      // sont visuellement indiscernables mais des codepoints distincts — trouvé
      // le 2026-09-08 dans les réponses de référence de plusieurs questions de
      // thermodynamique (« ∆S », « ∆Ucycle », U+2206), qui ne matcheraient jamais
      // un Δ grec réellement tapé par l'étudiant (U+0394, se minusculise ensuite
      // en δ comme n'importe quelle lettre grecque). Unifié avant la casse.
      .replace(/∆/g, 'Δ')
      .toLowerCase()
      // Nom grec en toutes lettres -> symbole Unicode (« rho » -> « ρ »). Trouvé
      // le 2026-09-09 (carte Torricelli, Patm = ρ·g·h) : « rho » scorait 76 %
      // (zone grise, incorrect) et « ρ » 81 % (zone haute, correct) pour un
      // contenu strictement identique — l'embedding traite « rho » et « ρ »
      // comme lexicalement différents, ce n'est pas un problème de mots-clés
      // mais du texte envoyé à l'embedding lui-même. `unifyFormulaNotation`
      // faisait déjà cette conversion mais seulement pour « \rho » (commande
      // LaTeX de l'éditeur) — jamais pour « rho » tapé tel quel au clavier, le
      // cas le plus probable pour un étudiant sans clavier grec. Appliqué ici,
      // en amont de l'embedding ET du recouvrement de mots-clés (les deux en
      // bénéficient), pas seulement à l'intérieur d'un segment $…$.
      .replace(GREEK_NAMES_PATTERN, (name) => GREEK[name] ?? name)
      .replace(/\s+/g, ' ')
  }

  /**
   * Normalisation symbolique pour comparer des formules : les trois écritures
   * coexistant en base convergent vers une même forme canonique —
   * raccourcis V1 (« over(1, 2) », « x² »), LaTeX de l'éditeur V2
   * (« \frac{1}{2} », « v^{2} ») et texte libre (« U = R × I »).
   * La multiplication explicite est supprimée de la forme canonique : le LaTeX
   * de l'éditeur écrit « mv » là où la V1 écrivait « m*v » — « r*i » ≡ « ri ».
   * Délègue l'unification des notations à helpers/formulaNotation (partagée
   * avec algebraicallyEqual, qui a besoin de garder les opérateurs).
   *
   * @param {string} text - Texte ou formule à normaliser
   * @returns {string} Forme canonique comparable
   */
  normalizeSymbolic(text) {
    return unifyFormulaNotation(text).replace(/\*/g, '')
  }

  /**
   * Équivalence algébrique de deux formules — complète normalizeSymbolic pour
   * les cas que la comparaison textuelle ne peut pas voir : commutativité
   * (a+b ≡ b+a), division comme puissance inverse (a/b ≡ a·b⁻¹), combinaison de
   * termes/facteurs semblables (x+x ≡ 2x), racine comme exposant, équations
   * symétriques (U=RI ≡ RI=U). Comparaison par forme canonique, pas un CAS :
   * ne résout ni ne simplifie, n'expand pas les produits (voir helpers/
   * algebraicEquivalence pour le détail du périmètre et DECISIONS.md 2026-07-19).
   *
   * @param {string} a
   * @param {string} b
   * @returns {boolean}
   */
  algebraicallyEqual(a, b) {
    return isAlgebraicallyEqual(a, b)
  }

  /**
   * Isole les segments $…$ (formules, convention FormulaHelperComponent — une
   * réponse peut mêler texte libre et formule insérée en LaTeX brut : « $-\rho
   * \cdot g \cdot dV$, dirigé vers le bas ») du texte libre autour, chacun
   * segmenté séparément :
   * - formule : passée par `unifyFormulaNotation` (\rho -> ρ, \cdot -> *,
   *   retire les $) puis éclatée sur `MATH_SEPARATORS` pour que chaque
   *   variable redevienne un token individuel comparable à une référence en
   *   notation espacée (« −ρ dV g ») — sans ce découpage la formule unifiée
   *   ressortirait comme un seul bloc collé (« ρ*g*dv »).
   * - texte libre : mêmes séparateurs `MATH_SEPARATORS`, plus les espaces —
   *   nécessaire aussi hors segment $…$ : une formule physique tapée en texte
   *   simple, sans passer par l'assistant formule (« dF_P = P(z)(-dS) +
   *   P_atm dS = ρ_0 g (z - H) dS »), utilise déjà parenthèses/exposant/
   *   indice/opérateurs — sans les traiter en séparateurs ici aussi, elle se
   *   fragmenterait en tokens absurdes (« p(z)( », « ds) », « (z », « h) »),
   *   incomparables à la moindre reformulation avec un espacement différent
   *   (bug reproduit le 2026-09-08, carte « barrage voûte », sans aucun $…$).
   * Le résultat des deux segments est ensuite simplement concaténé par
   * `tokenize` — seule la formule a besoin d'`unifyFormulaNotation` en amont
   * (conversion LaTeX -> notation brute), `extractKeywords` traite le tout
   * de façon uniforme une fois tokenizé (aucun filtre différencié entre
   * formule et texte libre).
   */
  splitFormulaAndProseTokens(normalizedText) {
    const formulaTokens = []
    const prose = normalizedText.replace(/\$([^$]+)\$/g, (_, formula) => {
      formulaTokens.push(...unifyFormulaNotation(formula).split(MATH_SEPARATORS).filter(Boolean))
      return ' '
    })
    const proseTokens = prose.split(MATH_SEPARATORS).filter(Boolean)
    return { formulaTokens, proseTokens }
  }

  /**
   * tokenization simple (liste à plat, formule et texte libre confondus)
   */
  tokenize(text) {
    const { formulaTokens, proseTokens } = this.splitFormulaAndProseTokens(this.normalizeText(text))
    return [...formulaTokens, ...proseTokens]
  }

  /**
   * Un token est « substantiel » s'il contient au moins une lettre ou un chiffre —
   * exclut les résidus de ponctuation/opérateurs isolés (« = », « - »…) que la
   * tokenization peut laisser passer sans qu'ils portent de sens lexical.
   */
  isSubstantialToken(token) {
    return /[a-zà-öø-ÿͰ-Ͽ0-9]/i.test(token)
  }

  /**
   * Extraction de mots-clés : tous les tokens substantiels hors stopwords,
   * sans plancher de longueur.
   *
   * USAGE (2026-09-09) — n'intervient plus dans `gradeSemantic` (la décision
   * est désormais un seuil unique sur le score sémantique, cf. son commentaire ;
   * `computeKeywordOverlap` n'a donc plus d'appelant en dehors des tests).
   * Reste utilisée par `detectInversion`/`splitRatio`, seul appelant restant.
   *
   * HISTORIQUE — le filtre imposait à l'origine `length > 2`, avec un repli
   * permissif si ce filtre strict ne laissait rien. Deux angles morts trouvés
   * le 2026-09-08 (session Leitner, cf. DECISIONS.md) :
   * 1. Une réponse entièrement symbolique/courte (« dP = ρg dV ») ne produit
   *    que des tokens de 1-2 caractères (variables physiques : ρ, g, V, m,
   *    F…) — le filtre strict seul renvoyait un ensemble vide, forçant
   *    `computeKeywordOverlap` à 0 (cf. son garde `size === 0`) et rejetant
   *    la réponse en zone grise indépendamment de son contenu réel.
   * 2. Le repli conditionnel (n'agir que si le strict est vide) échouait dès
   *    qu'UN SEUL token « accidentellement » long traînait à côté des
   *    variables courtes — une prose environnante (« dirigé » dans « $ρg
   *    dV$, dirigé vers le bas ») ou même un fragment de formule qui se
   *    trouve dépasser 2 caractères par hasard (« atm » dans « dF_P =
   *    P(z)(-dS) + P_atm dS » coupé sur l'indice — cf. `MATH_SEPARATORS`) :
   *    le repli ne se déclenchait alors jamais, et les variables courtes
   *    disparaissaient silencieusement du set de mots-clés.
   * Le plancher de longueur n'apportait plus rien que `STOPWORDS` (~75 mots
   * FR/EN) ne couvre déjà : il est retiré plutôt que rafistolé une troisième
   * fois. `isSubstantialToken` continue d'exclure les résidus de ponctuation
   * purs qu'un stopword ne peut pas voir (« = », « - »…).
   */
  extractKeywords(text) {
    return new Set(
      this.tokenize(text)
        .filter((token) => this.isSubstantialToken(token) && !STOPWORDS.has(token))
        .map(canonicalizeKeyword)
    )
  }

  /**
   * calcul de l'overlap de mots-clés entre deux ensembles
   */
  computeKeywordOverlap(keywords1, keywords2) {
    if (keywords1.size === 0 || keywords2.size === 0) return 0

    const intersection = new Set([...keywords1].filter((k) => keywords2.has(k)))
    const union = new Set([...keywords1, ...keywords2])

    return intersection.size / union.size
  }

  /**
   * Découpe une phrase de type rapport/division en opérandes gauche/droite.
   *
   * @param {string} text - Texte normalisé
   * @returns {{ left: Set<string>, right: Set<string> }|null} Mots-clés de chaque côté, ou null si pas de séparateur
   */
  splitRatio(text) {
    const normalized = this.normalizeText(text)
    const match = normalized.match(RATIO_SEPARATOR)
    if (!match) return null
    return {
      left: this.extractKeywords(normalized.slice(0, match.index)),
      right: this.extractKeywords(normalized.slice(match.index + match[0].length))
    }
  }

  /**
   * Détecte une inversion d'opérandes entre la réponse attendue et celle de l'étudiant
   * (ex : « le volume divisé par la masse » pour « la masse par unité de volume »).
   * Conservateur : ne se déclenche que si les deux phrases contiennent un séparateur
   * de rapport et que les opérandes sont strictement croisés.
   *
   * @param {string} reference - Réponse attendue (normalisée ou brute)
   * @param {string} studentAnswer - Réponse de l'étudiant (normalisée ou brute)
   * @returns {boolean} true si les opérandes sont inversés
   */
  detectInversion(reference, studentAnswer) {
    const ref = this.splitRatio(reference)
    const stu = this.splitRatio(studentAnswer)
    if (!ref || !stu) return false
    if (!ref.left.size || !ref.right.size || !stu.left.size || !stu.right.size) return false

    const overlaps = (a, b) => [...a].some((k) => b.has(k))
    const straight = overlaps(stu.left, ref.left) || overlaps(stu.right, ref.right)
    const crossed = overlaps(stu.left, ref.right) && overlaps(stu.right, ref.left)
    return crossed && !straight
  }

  /**
   * calcul de la similarité cosinus entre deux embeddings
   */
  cosineSimilarity(embedding1, embedding2) {
    const dotProduct = embedding1.reduce((acc, val, i) => acc + val * embedding2[i], 0)
    const norm1 = Math.sqrt(embedding1.reduce((acc, val) => acc + val * val, 0))
    const norm2 = Math.sqrt(embedding2.reduce((acc, val) => acc + val * val, 0))

    if (norm1 === 0 || norm2 === 0) return 0
    return dotProduct / (norm1 * norm2)
  }

  /**
   * noter une réponse étudiante par rapport à une ou plusieurs réponses correctes
   * @param {string|string[]} correctAnswers
   * @param {string} studentAnswer
   * @returns {object} - { is_correct, score, strategy, explanation, decision_zone }
   */
  async gradeSemantic(correctAnswers, studentAnswer) {
    // Normalize input
    const studentNorm = this.normalizeText(studentAnswer)

    // reponse vide
    if (!studentNorm) {
      return {
        is_correct: false,
        score: 0.0,
        strategy: 'semantic',
        explanation: 'No answer provided.',
        decision_zone: 'low'
      }
    }

    let correctList
    if (Array.isArray(correctAnswers)) {
      correctList = correctAnswers.map((a) => this.normalizeText(a)).filter((a) => a)
    } else {
      const normalized = this.normalizeText(correctAnswers)
      correctList = normalized ? [normalized] : []
    }

    if (correctList.length === 0) {
      return {
        is_correct: false,
        score: 0.0,
        strategy: 'semantic',
        explanation: 'No correct answer provided.',
        decision_zone: 'low'
      }
    }

    // Court-circuit symbolique : une formule identique à la normalisation près
    // (« u=r*i » ≡ « U = R × I ») — ou algébriquement équivalente (« a/b » ≡
    // « a*b^-1 », « a+b » ≡ « b+a »…) — est correcte sans passer par
    // l'embedding : les embeddings comparent mal les écritures symboliques.
    const studentSym = this.normalizeSymbolic(studentAnswer)
    if (
      studentSym &&
      correctList.some(
        (c) => this.normalizeSymbolic(c) === studentSym || this.algebraicallyEqual(studentAnswer, c)
      )
    ) {
      return {
        is_correct: true,
        score: 1.0,
        strategy: 'exact',
        explanation: 'Correct (correspondance exacte).',
        decision_zone: 'high'
      }
    }

    try {
      // Load model
      const model = await this.getModel()

      // encodage des réponses
      const studentEmbedding = await model(studentNorm, {
        pooling: 'mean',
        normalize: true
      })
      const studentData = Array.from(studentEmbedding.data)

      const correctEmbeddings = await Promise.all(
        correctList.map(async (correct) => {
          const emb = await model(correct, {
            pooling: 'mean',
            normalize: true
          })
          return Array.from(emb.data)
        })
      )

      const similarities = correctEmbeddings.map((emb, idx) => ({
        score: this.cosineSimilarity(studentData, emb),
        reference: correctList[idx],
        index: idx
      }))

      const best = similarities.reduce((prev, curr) => (curr.score > prev.score ? curr : prev))
      const bestScore = best.score
      const bestRef = best.reference

      // Décision à seuil unique (2026-09-09) : le verdict est une fonction
      // strictement croissante du score de proximité sémantique affiché à
      // l'étudiant — aucun autre critère n'intervient. Remplace l'ancienne
      // « zone grise » (55-78 %, tranchée par recouvrement de mots-clés, un
      // critère indépendant du score) : ce mécanisme a produit 6 bugs distincts
      // en une seule journée (2026-09-08/09, cf. DECISIONS.md) et surtout
      // rendait la décision non-monotone par construction — un score plus bas
      // pouvait passer pendant qu'un score plus haut échouait sur une autre
      // carte, symptôme central signalé dès le premier retour utilisateur et
      // jamais résolu par les correctifs ponctuels de la zone grise elle-même.
      // Choix explicite de l'utilisateur (2026-09-09) après ce constat : « le
      // résultat annoncé devrait se baser sur le pourcentage avancé par le
      // modèle de proximité sémantique ».
      // Seuil retenu à l'origine (2026-09-09) : `HIGH_THRESHOLD` (0,78) — le seul
      // qui classait correctement les 8 cas de la calibration DECISIONS.md
      // 2026-07-18 sans aucune assistance de mots-clés (le seul cas alors tombé
      // en "zone grise", une réponse fausse du même domaine à 0,717, était déjà
      // sous 0,78 ; les 7 autres étaient tous soit ≥0,806 soit à 0,15).
      // Abaissé à 0,75 le 2026-09-12 (cf. commentaire sur la constante) : cette
      // calibration n'avait qu'un seul point négatif (0,717) pour ancrer la
      // limite basse — marge jugée insuffisante face aux faux négatifs remontés
      // en usage réel. Coût assumé inchangé dans son principe : une réponse
      // correcte mais formulée très différemment dont le score reste sous le
      // seuil (ex. la carte « modèle isotherme » de l'audit du 2026-09-08, à
      // 0,74, reste incorrecte même après cet abaissement) redevient
      // « incorrect » — accepté en échange de la garantie de monotonicité.
      const isCorrect = bestScore >= HIGH_THRESHOLD
      const decisionZone = isCorrect ? 'high' : 'low'
      const matchedRef = bestRef

      // Garde anti-inversion : les embeddings scorent haut sur « Y divisé par X »
      // quand la réponse attendue est « X divisé par Y » — on rejette explicitement.
      if (isCorrect && this.detectInversion(matchedRef, studentNorm)) {
        return {
          is_correct: false,
          score: parseFloat(bestScore.toFixed(4)),
          strategy: 'semantic',
          explanation: `Incorrect (ordre des termes inversé, similarity=${bestScore.toFixed(2)}).`,
          decision_zone: 'inversion'
        }
      }

      // generation d'explication
      const explanation = isCorrect
        ? `Correct (similarity=${bestScore.toFixed(2)}).`
        : `Incorrect (similarity=${bestScore.toFixed(2)}).`

      return {
        is_correct: isCorrect,
        score: parseFloat(bestScore.toFixed(4)),
        strategy: 'semantic',
        explanation,
        decision_zone: decisionZone
      }
    } catch (error) {
      console.error('[SemanticService] Error during grading:', error?.message || error)
      throw error
    }
  }
}

module.exports = new SemanticService()

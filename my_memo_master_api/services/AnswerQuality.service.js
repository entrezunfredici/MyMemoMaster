const semanticService = require('./Semantic.service')

// Service consultatif : évalue la qualité d'une réponse de référence (générée par IA ou saisie
// à la main) AVANT qu'elle ne serve de base à la correction sémantique (Semantic.service.js).
// Ne bloque jamais une création/édition — ne renvoie que des avertissements en français destinés
// à l'écran de relecture (validation IA ou création manuelle d'une réponse). Décision explicite
// (DECISIONS.md 2026-09-12) : une validation stricte/bloquante a été écartée pour ce ticket, ce
// service reste donc purement consultatif par construction, pas par oubli.
//
// Origine : audit réel (2026-09-12) d'une carte IA sur l'énergie interne dont la réponse
// enregistrée ("Une fonction d'état extensive associée au système.") ne mentionnait même pas le
// mot "énergie" — heuristiques ci-dessous conçues pour détecter précisément ce type de défaut,
// vérifiées sur ce cas réel avant/après correction du prompt de génération (cf. AiCardGeneration.
// service.js, règles 9-10 du prompt système).

// Mots topicalement génériques dans un contexte de cours scientifique — reviennent dans presque
// toute question de physique/thermodynamique sans jamais identifier LE sujet précis interrogé.
// Retirés du calcul de recouvrement ci-dessous uniquement (jamais de Semantic.service.js, qui a
// ses propres besoins pour detectInversion/splitRatio — liste volontairement locale à ce service
// et à ce seul usage, pour ne pas risquer de régression sur le moteur de correction lui-même).
// Trouvé le 2026-09-12 : "système" apparaît dans la question ET dans la réponse défectueuse de
// l'exemple ci-dessus, ce qui aurait masqué le défaut à un recouvrement de mots-clés naïf — cette
// liste existe pour que le recoupement porte sur le terme réellement distinctif ("énergie"), pas
// sur le vocabulaire de contexte partagé par toutes les questions du domaine.
const GENERIC_FILLER_KEYWORDS = new Set([
  'système', 'systeme',
  'grandeur',
  'transformation',
  'valeur',
  'relation',
  'expression',
  'définition', 'definition',
  'fonction',
  'état', 'etat',
  'processus',
  'quantité', 'quantite',
  'cours'
])

// Une lettre grecque isolée (ρ, η, δ, Δ...) ou un motif "X = ..." — évoque une formule tapée en
// texte brut plutôt qu'en LaTeX. Recherché uniquement HORS des segments $...$ déjà balisés (cf.
// stripFormulaSegments) pour ne jamais signaler une formule correctement balisée.
const UNWRAPPED_FORMULA_HINT = /[ρηδΔ∆ωΩαβγλμπσφχθ]|(?<![A-Za-zÀ-ÖØ-öø-ÿ])[A-Za-z]\s*=\s*[^=\s]/

// En-deçà, une réponse-phrase (pas une formule/valeur isolée) est jugée potentiellement trop
// courte pour être une définition complète — seuil délibérément bas (avertissement, pas un rejet).
const MIN_SUBSTANTIAL_LENGTH = 15

// Nombre de mots (hors formule $...$) à partir duquel une réponse est traitée comme une
// "phrase/définition" plutôt qu'une valeur ou une formule isolée (règle 10 du prompt IA — la
// richesse de acceptedAnswers n'a de sens que pour ce type de réponse).
const MIN_SENTENCE_WORDS = 5

// Recouvrement de mots-clés (cf. Semantic.service.computeKeywordOverlap) au-delà duquel deux
// formulations sont jugées quasi-identiques, donc n'apportant aucune couverture supplémentaire.
const NEAR_DUPLICATE_OVERLAP_THRESHOLD = 0.85

class AnswerQualityService {
  /**
   * Retire les segments $...$ d'un texte (formules déjà balisées) — pour détecter une formule qui
   * aurait échappé au balisage LaTeX sans se méprendre sur une formule correctement écrite.
   */
  stripFormulaSegments(text) {
    return text.replace(/\$[^$]+\$/g, ' ')
  }

  /**
   * Détecte une formule/symbole tapé en texte brut (lettre grecque isolée, motif "X = ...") hors
   * de tout segment $...$ déjà balisé.
   */
  hasUnwrappedFormula(text) {
    return UNWRAPPED_FORMULA_HINT.test(this.stripFormulaSegments(text))
  }

  /**
   * Mots-clés d'un texte, débarrassés des mots de remplissage topicalement génériques
   * (GENERIC_FILLER_KEYWORDS) — délègue l'extraction elle-même à Semantic.service, ce filtre
   * additionnel n'existe que pour cette évaluation de qualité.
   */
  extractDistinctiveKeywords(text) {
    return new Set(
      [...semanticService.extractKeywords(text)].filter((k) => !GENERIC_FILLER_KEYWORDS.has(k))
    )
  }

  /**
   * La réponse partage-t-elle au moins un mot-clé distinctif avec l'énoncé de la question ?
   * Absence totale de recoupement = signe probable d'une réponse elliptique qui ne se comprend
   * qu'en connaissant la question (règle 9 du prompt IA). Jamais vérifié si l'un des deux textes
   * ne produit aucun mot-clé distinctif (rien de fiable à comparer — pas de faux positif).
   */
  sharesSubjectWithStatement(statement, answer) {
    const statementKeywords = this.extractDistinctiveKeywords(statement)
    const answerKeywords = this.extractDistinctiveKeywords(answer)
    if (statementKeywords.size === 0 || answerKeywords.size === 0) return true
    return [...statementKeywords].some((k) => answerKeywords.has(k))
  }

  /**
   * Une réponse "phrase" (au moins MIN_SENTENCE_WORDS mots hors formule), par opposition à une
   * valeur ou une formule isolée où l'autonomie du sujet et la reformulation n'ont pas de sens.
   */
  isSentenceLike(answer) {
    return this.stripFormulaSegments(answer).trim().split(/\s+/).filter(Boolean).length >= MIN_SENTENCE_WORDS
  }

  /**
   * Deux réponses sont "quasi-identiques" si leur recouvrement de mots-clés est très élevé —
   * signale une reformulation qui n'ajoute aucune couverture réelle de plus (règle 10 du prompt IA).
   */
  areNearDuplicates(a, b) {
    const ka = semanticService.extractKeywords(a)
    const kb = semanticService.extractKeywords(b)
    if (ka.size === 0 || kb.size === 0) return a.trim().toLowerCase() === b.trim().toLowerCase()
    return semanticService.computeKeywordOverlap(ka, kb) >= NEAR_DUPLICATE_OVERLAP_THRESHOLD
  }

  /**
   * Évalue la qualité des réponses de référence d'une question (IA ou saisie manuelle) — service
   * purement consultatif, ne bloque jamais une création/édition.
   *
   * @param {string} statement - Énoncé de la question
   * @param {string[]} answers - Toutes les formulations acceptées pour cette question (la
   *   première est traitée comme réponse principale, les suivantes comme reformulations)
   * @returns {string[]} Avertissements en français (tableau vide si rien à signaler)
   */
  assess(statement, answers) {
    const warnings = []
    const nonEmpty = (Array.isArray(answers) ? answers : [answers]).map((a) => (a || '').trim()).filter(Boolean)
    if (!statement || !statement.trim() || nonEmpty.length === 0) return warnings

    const [primary, ...alternatives] = nonEmpty
    const primaryHasFormula = /\$[^$]+\$/.test(primary) || this.hasUnwrappedFormula(primary)

    // Règle 9 : autonomie de la réponse principale
    if (!this.sharesSubjectWithStatement(statement, primary)) {
      warnings.push(
        "La réponse ne semble mentionner aucun mot-clé distinctif de l'énoncé — vérifie qu'elle " +
        'reste compréhensible sans relire la question (évite les pronoms ou tournures elliptiques).'
      )
    }

    // Réponse principale très courte (hors cas légitime d'une formule/valeur isolée)
    if (primary.length < MIN_SUBSTANTIAL_LENGTH && !primaryHasFormula) {
      warnings.push('La réponse principale est très courte — vérifie qu\'elle reste complète et informative.')
    }

    // Règle 8 : formule tapée en texte brut plutôt qu'en LaTeX balisé $...$
    if (nonEmpty.some((a) => this.hasUnwrappedFormula(a))) {
      warnings.push(
        "Une expression ressemble à une formule non balisée en $...$/LaTeX — la correction " +
        'sémantique risque de moins bien la reconnaître.'
      )
    }

    // Règle 10 : richesse des reformulations, uniquement pertinent pour une réponse-phrase
    if (this.isSentenceLike(primary)) {
      if (alternatives.length === 0) {
        warnings.push(
          "Aucune reformulation alternative n'est proposée pour cette réponse-phrase — ajoute au " +
          'moins une variante pour couvrir plus de façons de répondre correctement.'
        )
      } else if (alternatives.every((alt) => this.areNearDuplicates(primary, alt))) {
        warnings.push(
          'Les reformulations proposées sont presque identiques à la réponse principale — elles ' +
          "n'ajoutent pas de couverture supplémentaire."
        )
      }
    }

    return warnings
  }

  /**
   * Traduit un tableau d'avertissements (`assess`) en un niveau global à 3 paliers — pour un
   * affichage synthétique (badge/pastille de couleur) plutôt que la liste détaillée. Même
   * vocabulaire que `decision_zone` de Semantic.service.js ('high'/'low') pour rester cohérent
   * dans le reste du code, complété d'un palier intermédiaire ('medium') : contrairement à
   * `decision_zone` (verdict binaire correct/incorrect), il s'agit ici d'une jauge de qualité, pas
   * d'une décision — un seul avertissement mineur ne mérite pas le même traitement visuel qu'aucun
   * ou que plusieurs.
   *
   * @param {string[]} warnings - Sortie de `assess`
   * @returns {'high'|'medium'|'low'} 'high' (0 avertissement), 'medium' (1), 'low' (2 ou plus)
   */
  levelFromWarnings(warnings) {
    const count = (warnings || []).length
    if (count === 0) return 'high'
    if (count === 1) return 'medium'
    return 'low'
  }
}

module.exports = new AnswerQualityService()

jest.resetModules()

jest.mock('@xenova/transformers', () => {
  return {
    pipeline: jest.fn(async () => {
      // retourne une fonction d'extraction de features simulée
      return jest.fn(async (text) => {
        // simule une embedding vectorielle basée sur le hash du texte
        const hash = text.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
        const baseVector = [Math.sin(hash / 100), Math.cos(hash / 100), (hash % 1000) / 1000]
        return { data: new Float32Array(baseVector) }
      })
    })
  }
})

const SemanticService = require('../../services/Semantic.service')

describe('SemanticService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset singleton model
    SemanticService.model = null
    SemanticService.modelLoading = null
  })

  describe('normalizeText', () => {
    it('should normalize text: trim, lowercase, collapse spaces', () => {
      const text = '  HELLO   World  '
      const result = SemanticService.normalizeText(text)
      expect(result).toBe('hello world')
    })

    it('should return empty string for null or non-string', () => {
      expect(SemanticService.normalizeText(null)).toBe('')
      expect(SemanticService.normalizeText(undefined)).toBe('')
    })

    // Bug distinct trouvé le 2026-09-08 en auditant plus largement la base (questions
    // 18/20/21, thermodynamique — pas rencontré par les 3 cartes initialement
    // signalées, même famille de défaut) : « ∆ » (U+2206, symbole INCREMENT, utilisé
    // dans les réponses de référence stockées) et « Δ » (U+0394, vraie lettre grecque
    // Delta, ce qu'un étudiant tape réellement) sont visuellement indiscernables mais
    // des codepoints distincts — jamais égaux en comparaison de chaînes sans unification.
    it('unifie « ∆ » (symbole incrément) et « Δ » (lettre grecque Delta), visuellement identiques mais de codepoints différents', () => {
      expect(SemanticService.normalizeText('∆S')).toBe(SemanticService.normalizeText('ΔS'))
    })
  })

  describe('tokenize', () => {
    it('should split text into tokens', () => {
      const text = 'hello world test'
      const result = SemanticService.tokenize(text)
      expect(result).toEqual(['hello', 'world', 'test'])
    })

    // Bug reproduit le 2026-09-08 (retest utilisateur après le premier correctif) :
    // une formule insérée via l'assistant formule (FormulaHelperComponent) est
    // entourée de « $…$ » en LaTeX brut, mêlée à du texte libre. Ni « $ » ni « \ »
    // n'étaient des séparateurs : les tokens de bordure devenaient « $dp »/« dv$ »
    // et les commandes LaTeX (« \rho », « \cdot ») survivaient telles quelles —
    // aucun recouvrement possible avec une référence en notation brute, reproduit
    // à 75 % « À revoir » identique sur 3 sessions malgré le premier correctif.
    it('isole un segment $…$ en LaTeX et le convertit en tokens individuels comparables à une notation brute', () => {
      const result = SemanticService.tokenize(String.raw`$dP = -\rho \cdot g \cdot dV$, dirigé vers le bas`)
      expect(result).toEqual(['dp', 'ρ', 'g', 'dv', 'dirigé', 'vers', 'le', 'bas'])
    })
  })

  describe('extractKeywords', () => {
    it('should remove stopwords and short tokens', () => {
      const text = 'the quick brown fox jumps'
      const result = SemanticService.extractKeywords(text)
      // 'the' (stopword), 'a' (stopword/short), 'of' (stopword) should be removed
      // 'quick', 'brown', 'jumps' should remain
      expect(result.has('quick')).toBe(true)
      expect(result.has('brown')).toBe(true)
      expect(result.has('jumps')).toBe(true)
      expect(result.has('the')).toBe(false)
    })

    it('should remove tokens shorter than 3 characters that are stopwords', () => {
      // Historiquement testé comme « tokens < 3 caractères » (plancher de longueur,
      // retiré le 2026-09-08 — voir les tests ci-dessous) : ce cas particulier reste
      // à 0 parce que 'to'/'be'/'or'/'not' sont déjà tous des stopwords, indépendamment
      // de tout plancher de longueur.
      const text = 'to be or not to be'
      const result = SemanticService.extractKeywords(text)
      expect(result.size).toBe(0)
    })

    // Bug reproduit le 2026-09-08 (session Leitner) : une réponse physiquement
    // correcte mais très symbolique (« dP = ρg dV ») ne produisait AUCUN mot-clé
    // (tous les tokens ≤2 caractères), forçant computeKeywordOverlap à 0 et donc
    // un rejet automatique en zone grise — indépendamment du score sémantique
    // affiché (75 % dans le cas réel). Root cause : le plancher `length > 2` du
    // filtre de mots-clés, retiré depuis (cf. DECISIONS.md du même jour).
    it('garde les variables physiques courtes (« ρg ») même seules dans une réponse symbolique', () => {
      const result = SemanticService.extractKeywords('dP = ρg dV')
      expect(result.size).toBeGreaterThan(0)
      expect(result.has('ρg')).toBe(true)
    })

    it('fonctionne aussi pour des variables latines pures (« F = ma »)', () => {
      const result = SemanticService.extractKeywords('F = ma')
      expect(result.has('f')).toBe(true)
      expect(result.has('ma')).toBe(true)
    })

    it("n'introduit pas un opérateur isolé (« = ») comme mot-clé", () => {
      const result = SemanticService.extractKeywords('F = ma')
      expect(result.has('=')).toBe(false)
    })

    it('ne réintroduit jamais un stopword, même court (pas de régression sur la prose)', () => {
      const result = SemanticService.extractKeywords("le principe d'archimède")
      expect(result.has('principe')).toBe(true)
      expect(result.has('le')).toBe(false) // stopword
    })

    // Bug reproduit le 2026-09-08 (retest utilisateur, cf. describe('tokenize') ci-dessus) :
    // avec l'ancien filtre à deux niveaux (strict > 2 caractères, repli permissif
    // seulement si le strict était vide), une réponse mêlant formule $…$ et texte
    // libre fournissait déjà des mots-clés > 2 caractères via la prose (« dirigé »),
    // donc le repli symbolique ne se déclenchait jamais — les variables courtes de
    // la formule (ρ, g, dV) disparaissaient silencieusement. Le filtre unique
    // (sans plancher de longueur) les inclut désormais dans tous les cas.
    it('inclut toujours les variables courtes issues d\'un segment $…$, même quand du texte libre fournit déjà des mots-clés', () => {
      const result = SemanticService.extractKeywords(
        String.raw`$dP = -\rho \cdot g \cdot dV$, dirigé vers le bas`
      )
      expect(result.has('ρ')).toBe(true)
      expect(result.has('g')).toBe(true)
      expect(result.has('dv')).toBe(true)
      expect(result.has('dirigé')).toBe(true)
    })

    it('le recouvrement avec une référence en notation brute redevient non-nul pour une réponse formule+prose', () => {
      const studentKeywords = SemanticService.extractKeywords(
        String.raw`$dP = -\rho \cdot g \cdot dV$, dirigé vers le bas`
      )
      const referenceKeywords = SemanticService.extractKeywords('−ρ g dV')
      const overlap = SemanticService.computeKeywordOverlap(studentKeywords, referenceKeywords)
      expect(overlap).toBeGreaterThan(0.3)
    })

    // Bug distinct reproduit le 2026-09-08 (retest utilisateur, carte « barrage
    // voûte », réponse tapée en texte simple SANS l'assistant formule — donc sans
    // aucun $…$). Les parenthèses/indices/opérateurs n'étaient séparateurs nulle
    // part hors segment $…$ : « dF_P = P(z)(-dS) + P_atm dS = ρ_0 g (z - H) dS »
    // se fragmentait en tokens absurdes (« p(z)( », « ds) », « (z », « h) »).
    it('sépare parenthèses/indices/opérateurs même hors segment $…$ (formule en texte simple)', () => {
      const result = SemanticService.extractKeywords('dF_P = P(z)(-dS) + P_atm dS = ρ_0 g (z - H) dS')
      expect(result.has('df')).toBe(true)
      expect(result.has('p')).toBe(true)
      expect(result.has('z')).toBe(true)
      expect(result.has('ds')).toBe(true)
      expect(result.has('atm')).toBe(true)
      expect(result.has('ρ')).toBe(true)
      expect(result.has('g')).toBe(true)
      expect(result.has('h')).toBe(true)
      // aucun résidu de parenthèse collée à un token
      expect([...result].some((k) => k.includes('(') || k.includes(')'))).toBe(false)
    })

    it('le recouvrement redevient non-nul entre deux formulations d\'une même formule en texte simple', () => {
      const referenceKeywords = SemanticService.extractKeywords(
        'dF_P = P(z)(-dS) + P_atm dS = ρ_0 g (z - H) dS'
      )
      const studentKeywords = SemanticService.extractKeywords(
        'dF = P(z) * (-dS) + Patm * dS = rho0 * g * (z - H) * dS'
      )
      const overlap = SemanticService.computeKeywordOverlap(studentKeywords, referenceKeywords)
      expect(overlap).toBeGreaterThan(0.3)
    })

    // Bug distinct reproduit le 2026-09-08 : plusieurs réponses de référence de ce
    // même contenu physique (questions 27/34/65/70/72/73 en base) portent un
    // artefact de corruption « #" » (vraisemblablement une extraction PDF ratée
    // d'une notation vectorielle) — ex. « d #"F P = P (M ) #"dS ». Sans traitement,
    // « #" » colle au token de bordure (« #"f », « #"ds ») et empêche tout
    // recouvrement avec une réponse étudiante propre, quelle que soit sa pertinence
    // réelle. Neutralisé comme séparateur (`MATH_SEPARATORS`) : la donnée reste
    // corrompue en base (hors périmètre de ce correctif), mais n'empêche plus la
    // comparaison.
    it('neutralise l\'artefact de corruption « #" » présent sur certaines réponses de référence', () => {
      const result = SemanticService.extractKeywords('d #"F P = P (M ) #"dS')
      expect(result.has('f')).toBe(true)
      expect(result.has('ds')).toBe(true)
      expect([...result].some((k) => k.includes('#') || k.includes('"'))).toBe(false)
    })

    // Bug distinct trouvé le 2026-09-08 en auditant plus largement la base (aucune
    // des 3 cartes signalées par l'utilisateur ne l'a rencontré, mais même famille
    // de défaut — questions 26/28/31/63, thermodynamique/fluides) : le point médian
    // « · » (multiplication en notation française : « kg·m⁻³ », « -ρ·g ») n'était
    // séparateur nulle part hors segment $…$. Collé sans espace, il fusionnait deux
    // variables en un seul token, incomparable à la même formule écrite avec un
    // espace ou un astérisque à la place.
    it('sépare le point médian « · » (multiplication) même hors segment $…$', () => {
      const withDot = SemanticService.extractKeywords('dP/dz = -ρ·g')
      const withSpace = SemanticService.extractKeywords('dP/dz = -ρ g')
      expect(withDot).toEqual(withSpace)
      expect(withDot.has('ρ')).toBe(true)
      expect(withDot.has('g')).toBe(true)
    })

    // Bug distinct signalé le 2026-09-08 (carte « modèle isotherme de l'atmosphère »,
    // 67 % affiché, « À revoir ») : recouvrement de mots-clés purement littéral,
    // aveugle aux synonymes (« décroît » ≠ « diminue ») et aux variantes
    // morphologiques (« exponentiellement » ≠ « exponentielle ») — alors que
    // l'embedding capte déjà cette proximité (~0,74). Sur demande explicite de
    // traiter ce cas, `canonicalizeKeyword` (synonymes + suffixe adverbial -ment)
    // unifie ces paires pour le recouvrement, sans toucher au texte comparé par
    // l'embedding.
    it('unifie un synonyme de variation courant en physique (« décroît » / « diminue »)', () => {
      const ref = SemanticService.extractKeywords('La pression décroît avec l\'altitude')
      const student = SemanticService.extractKeywords('La pression diminue avec l\'altitude')
      expect(ref).toEqual(student)
    })

    it('unifie un adverbe en -ment avec l\'adjectif dont il dérive (« exponentiellement » / « exponentielle »)', () => {
      const ref = SemanticService.extractKeywords('décroît exponentiellement')
      const student = SemanticService.extractKeywords('de façon exponentielle')
      expect(ref.has('exponentielle')).toBe(true)
      expect(student.has('exponentielle')).toBe(true)
    })

    it('ne déclenche pas la règle -ment sur un mot court non concerné (« moment »)', () => {
      const result = SemanticService.extractKeywords('à ce moment précis')
      expect(result.has('moment')).toBe(true)
    })

    it('améliore le recouvrement même sans suffire seul (la référence longue reste sous le seuil)', () => {
      // Sur la référence longue et complète, synonyme + suffixe ne suffisent pas
      // seuls à passer le seuil de 0,3 (trop de mots de la phrase ne recoupent
      // rien côté étudiant) — c'est la combinaison avec le fix « meilleure
      // référence » (describe('gradeSemantic') ci-dessous) qui règle ce cas
      // réel : une référence COURTE de la même liste, elle, passe largement.
      const ref = SemanticService.extractKeywords(
        "La pression atmosphérique décroît exponentiellement avec l'altitude selon la loi P(z) = P0 e^(-z/δ), où δ est une constante caractéristique."
      )
      const student = SemanticService.extractKeywords("La pression diminue de façon exponentielle avec l'altitude")
      expect(SemanticService.computeKeywordOverlap(student, ref)).toBeGreaterThan(0.11) // > l'overlap d'avant ce fix
    })
  })

  describe('computeKeywordOverlap', () => {
    it('should compute overlap correctly', () => {
      const keywords1 = new Set(['dog', 'cat', 'bird'])
      const keywords2 = new Set(['dog', 'cat', 'fish'])
      const overlap = SemanticService.computeKeywordOverlap(keywords1, keywords2)
      // intersection: {dog, cat} = 2
      // union: {dog, cat, bird, fish} = 4
      // overlap = 2/4 = 0.5
      expect(overlap).toBeCloseTo(0.5, 2)
    })

    it('should return 0 if one set is empty', () => {
      const keywords1 = new Set(['dog'])
      const keywords2 = new Set()
      const overlap = SemanticService.computeKeywordOverlap(keywords1, keywords2)
      expect(overlap).toBe(0)
    })

    it('scénario réel : deux réponses symboliques ne diffèrent plus à tort par un recouvrement à 0', () => {
      // Avant le repli de extractKeywords, les deux ensembles étaient vides
      // (Set(0)) et computeKeywordOverlap retournait 0 systématiquement —
      // rejet automatique en zone grise sans rapport avec le score sémantique.
      const studentKeywords = SemanticService.extractKeywords('dP = ρg dV')
      const referenceKeywords = SemanticService.extractKeywords('dP = -ρg dV')
      const overlap = SemanticService.computeKeywordOverlap(studentKeywords, referenceKeywords)
      expect(overlap).toBeGreaterThan(0)
    })
  })

  describe('cosineSimilarity', () => {
    it('should compute cosine similarity correctly', () => {
      const emb1 = [1, 0, 0]
      const emb2 = [1, 0, 0]
      const similarity = SemanticService.cosineSimilarity(emb1, emb2)
      expect(similarity).toBeCloseTo(1.0, 2) // Perfect match
    })

    it('should return 0 for orthogonal vectors', () => {
      const emb1 = [1, 0]
      const emb2 = [0, 1]
      const similarity = SemanticService.cosineSimilarity(emb1, emb2)
      expect(similarity).toBeCloseTo(0, 2)
    })
  })

  describe('gradeSemantic', () => {
    it('should handle empty student answer', async () => {
      const result = await SemanticService.gradeSemantic('test answer', '')
      expect(result.is_correct).toBe(false)
      expect(result.score).toBe(0.0)
      expect(result.explanation).toBe('No answer provided.')
      expect(result.decision_zone).toBe('low')
    })

    it('should handle empty correct answers', async () => {
      const result = await SemanticService.gradeSemantic('', 'student answer')
      expect(result.is_correct).toBe(false)
      expect(result.score).toBe(0.0)
      expect(result.decision_zone).toBe('low')
    })

    it('should accept correct_answers as string', async () => {
      const result = await SemanticService.gradeSemantic('correct answer', 'student answer')
      expect(result).toHaveProperty('is_correct')
      expect(result).toHaveProperty('score')
      expect(result.strategy).toBe('semantic')
    })

    it('should accept correct_answers as array', async () => {
      const result = await SemanticService.gradeSemantic(
        ['answer one', 'answer two'],
        'student answer'
      )
      expect(result).toHaveProperty('is_correct')
      expect(result.strategy).toBe('semantic')
    })

    it('should return strategy "semantic" when answers differ, "exact" on symbolic match', async () => {
      const semanticCases = [
        { correct: ['test1', 'test2'], student: 'student' },
        { correct: 'correct', student: 'different answer' }
      ]
      for (const test of semanticCases) {
        const result = await SemanticService.gradeSemantic(test.correct, test.student)
        expect(result.strategy).toBe('semantic')
      }

      // Copie exacte (à la normalisation symbolique près) : court-circuit sans embedding
      const exact = await SemanticService.gradeSemantic('test', 'test')
      expect(exact.strategy).toBe('exact')
      expect(exact.is_correct).toBe(true)
      expect(exact.score).toBe(1.0)
    })

    it('gradeSemantic - formule équivalente à la normalisation près - correcte sans embedding', async () => {
      const result = await SemanticService.gradeSemantic('U = R × I', 'u=r*i')
      expect(result.is_correct).toBe(true)
      expect(result.strategy).toBe('exact')
      expect(result.score).toBe(1.0)
    })

    it('gradeSemantic - formule en délimiteurs KaTeX ($…$, \\cdot) - correcte sans embedding', async () => {
      const result = await SemanticService.gradeSemantic('$U = R \\cdot I$', 'U = R × I')
      expect(result.is_correct).toBe(true)
      expect(result.strategy).toBe('exact')
    })

    it('gradeSemantic - équivalence algébrique (commutativité) - correcte sans embedding', async () => {
      // "R*I" et "I*R" ne matchent pas en comparaison textuelle stricte
      // (ordre différent) — seule l'équivalence algébrique les rapproche
      const result = await SemanticService.gradeSemantic('U = R*I', 'U = I*R')
      expect(result.is_correct).toBe(true)
      expect(result.strategy).toBe('exact')
      expect(result.score).toBe(1.0)
    })

    it('gradeSemantic - équivalence algébrique (division ≡ puissance inverse) - correcte sans embedding', async () => {
      const result = await SemanticService.gradeSemantic('over(F, S)', 'F*S^-1')
      expect(result.is_correct).toBe(true)
      expect(result.strategy).toBe('exact')
    })

    it('gradeSemantic - opérandes inversés avec similarité maximale - rejetés (garde anti-inversion)', async () => {
      // Anagramme : même somme de char codes → le mock produit des vecteurs identiques
      // (similarité 1.0), seule la garde anti-inversion peut rejeter.
      const result = await SemanticService.gradeSemantic(
        'la masse divisée par le volume',
        'le volume divisée par la masse'
      )
      expect(result.is_correct).toBe(false)
      expect(result.decision_zone).toBe('inversion')
      expect(result.explanation).toContain('inversé')
    })

    it('should include decision_zone in response', async () => {
      const result = await SemanticService.gradeSemantic('test', 'test')
      expect(['high', 'low', 'grey_zone']).toContain(result.decision_zone)
    })

    it('should have score as number between 0 and 1', async () => {
      const result = await SemanticService.gradeSemantic('test', 'test')
      expect(typeof result.score).toBe('number')
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(1)
    })

    it('should include explanation', async () => {
      const result = await SemanticService.gradeSemantic('test answer', 'student answer')
      expect(result.explanation).toBeDefined()
      expect(typeof result.explanation).toBe('string')
    })
  })

  describe('normalizeSymbolic', () => {
    it('unifie casse, espaces, opérateurs et délimiteurs KaTeX', () => {
      // La multiplication explicite est supprimée de la forme canonique :
      // le LaTeX de l'éditeur V2 écrit « ri » là où la V1 écrivait « r*i »
      expect(SemanticService.normalizeSymbolic('U = R × I')).toBe('u=ri')
      expect(SemanticService.normalizeSymbolic('$p = F \\cdot S$')).toBe('p=fs')
      expect(SemanticService.normalizeSymbolic('a ÷ b')).toBe('a/b')
      expect(SemanticService.normalizeSymbolic('')).toBe('')
      expect(SemanticService.normalizeSymbolic(null)).toBe('')
    })

    it('fait converger raccourcis V1 et LaTeX V2 vers la même forme (fractions)', () => {
      const v1 = SemanticService.normalizeSymbolic('over(1, 2)')
      const v2 = SemanticService.normalizeSymbolic('$\\frac{1}{2}$')
      expect(v1).toBe('1/2')
      expect(v2).toBe('1/2')
    })

    it('fait converger une formule physique complète V1 ≡ V2', () => {
      const v1 = SemanticService.normalizeSymbolic('E = over(1, 2) * m * v^2')
      const v2 = SemanticService.normalizeSymbolic('E = \\frac{1}{2}mv^{2}')
      expect(v1).toBe(v2)
      expect(v1).toBe('e=1/2mv^2')
    })

    it('unifie exposants Unicode, ^{…} et ^n', () => {
      expect(SemanticService.normalizeSymbolic('x²')).toBe('x^2')
      expect(SemanticService.normalizeSymbolic('x^{2}')).toBe('x^2')
      expect(SemanticService.normalizeSymbolic('x^2')).toBe('x^2')
    })

    it('unifie racines, valeurs absolues et \\left/\\right', () => {
      expect(SemanticService.normalizeSymbolic('sqrt(x)')).toBe(SemanticService.normalizeSymbolic('\\sqrt{x}'))
      expect(SemanticService.normalizeSymbolic('abs(x)')).toBe(SemanticService.normalizeSymbolic('\\left|x\\right|'))
    })

    it('unifie grec LaTeX/Unicode et ensembles', () => {
      expect(SemanticService.normalizeSymbolic('\\Delta = b^2 - 4ac')).toBe(SemanticService.normalizeSymbolic('Δ = b² - 4*a*c'))
      expect(SemanticService.normalizeSymbolic('x \\in \\mathbb{R}')).toBe(SemanticService.normalizeSymbolic('x \\in ℝ'))
    })

    it('ignore les \\placeholder{} vides (trous non remplis de l’éditeur)', () => {
      expect(SemanticService.normalizeSymbolic('\\frac{\\placeholder{1}}{\\placeholder{2}}')).toBe('1/2')
    })

    it('normalise les matrices LaTeX en gardant le délimiteur distinct', () => {
      expect(SemanticService.normalizeSymbolic('\\begin{pmatrix}1 & 2 \\\\ 3 & 4\\end{pmatrix}'))
        .toBe('pmatrix(1,2;3,4)')
      expect(SemanticService.normalizeSymbolic('\\begin{vmatrix}1 & 2 \\\\ 3 & 4\\end{vmatrix}'))
        .not.toBe(SemanticService.normalizeSymbolic('\\begin{pmatrix}1 & 2 \\\\ 3 & 4\\end{pmatrix}'))
    })
  })

  describe('detectInversion', () => {
    it('détecte une inversion stricte des opérandes (divisé par)', () => {
      expect(
        SemanticService.detectInversion(
          'la masse divisée par le volume',
          'le volume divisé par la masse'
        )
      ).toBe(true)
    })

    it('détecte une inversion entre séparateurs différents de la même famille', () => {
      expect(
        SemanticService.detectInversion(
          'la masse par unité de volume',
          'le volume sur la masse'
        )
      ).toBe(true)
    })

    it("ne se déclenche pas quand l'ordre est respecté", () => {
      expect(
        SemanticService.detectInversion(
          'la masse par unité de volume',
          'la masse divisée par le volume'
        )
      ).toBe(false)
    })

    it("ne se déclenche pas quand l'une des phrases n'a pas de séparateur de rapport", () => {
      expect(
        SemanticService.detectInversion('la masse par unité de volume', 'la masse volumique')
      ).toBe(false)
    })

    it('ne se déclenche pas sur des opérandes sans recouvrement', () => {
      expect(
        SemanticService.detectInversion(
          'la masse divisée par le volume',
          'la tension divisée par la résistance'
        )
      ).toBe(false)
    })
  })

  describe('Model loading (lazy singleton)', () => {
    it('should load model lazily on first use', async () => {
      // First call
      const result1 = await SemanticService.gradeSemantic('test1', 'answer1')
      expect(result1.strategy).toBe('semantic')

      // Second call should reuse model (not visible in test but behavior is correct)
      const result2 = await SemanticService.gradeSemantic('test2', 'answer2')
      expect(result2.strategy).toBe('semantic')
    })
  })
})

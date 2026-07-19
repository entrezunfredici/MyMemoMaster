// Import transformer pipeline at module level (allows jest.mock to intercept)
let pipeline
try {
  pipeline = require('@xenova/transformers').pipeline
} catch (error) {
  console.error(error)
}

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

const HIGH_THRESHOLD = 0.78
const LOW_THRESHOLD = 0.55
const KEYWORD_OVERLAP_THRESHOLD = 0.3

// Séparateurs antisymétriques de la famille division/rapport : l'ordre des opérandes
// porte le sens (« masse par unité de volume » ≠ « volume par unité de masse »), mais
// les embeddings y sont quasi insensibles — d'où une vérification déterministe dédiée.
const RATIO_SEPARATOR = /\s(?:divisée?s? par|par unité de|rapportée?s? (?:à|au)|sur)\s/

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
      // mpnet multilingue dépasse la limite mémoire des conteneurs API (512 Mo → OOM en boucle),
      // MiniLM (~120 Mo) tient dans le même gabarit que l'ancien modèle
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
    return text.trim().toLowerCase().replace(/\s+/g, ' ')
  }

  /**
   * Normalisation symbolique pour comparer des formules : les trois écritures
   * coexistant en base convergent vers une même forme canonique —
   * raccourcis V1 (« over(1, 2) », « x² »), LaTeX de l'éditeur V2
   * (« \frac{1}{2} », « v^{2} ») et texte libre (« U = R × I »).
   * La multiplication explicite est supprimée de la forme canonique : le LaTeX
   * de l'éditeur écrit « mv » là où la V1 écrivait « m*v » — « r*i » ≡ « ri ».
   *
   * @param {string} text - Texte ou formule à normaliser
   * @returns {string} Forme canonique comparable
   */
  normalizeSymbolic(text) {
    if (!text || typeof text !== 'string') return ''
    let s = text
    let prev

    // Raccourcis V1 -> forme commune
    s = s
      .replace(/\b(?:over|frac)\(\s*([^,()]+?)\s*,\s*([^()]+?)\s*\)/gi, '($1)/($2)')
      .replace(/\babs\(([^()]*)\)/gi, '|$1|')

    // LaTeX structurel (éditeur V2) -> forme commune
    s = s
      .replace(/\\placeholder\{([^{}]*)\}/g, '$1')
      .replace(/\\left|\\right/g, '')
      .replace(/\\lbrack/g, '[')
      .replace(/\\rbrack/g, ']')
      .replace(/\\[lr]vert/g, '|')
      .replace(/\\[lr]Vert/g, '‖')
      .replace(/\\[,;!:]/g, '')
      .replace(/\\[dt]frac/g, '\\frac')
      .replace(/\\sqrt\[([^\]]*)\]\{([^{}]*)\}/g, 'nsqrt($1,$2)')
    // Fractions et racines : itératif pour les imbrications
    do {
      prev = s
      s = s
        .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)')
        .replace(/\\sqrt\{([^{}]*)\}/g, 'sqrt($1)')
        .replace(/\\(ln|log|exp|cos|sin|tan|vec|overrightarrow|overline|tilde|hat|dot|ddot|text|mathrm)\{([^{}]*)\}/g, '$1($2)')
    } while (s !== prev)
    s = s.replace(/\\(ln|log|exp|cos|sin|tan)\b/g, '$1')

    // Matrices : \begin{pmatrix}a & b \\ c\end{pmatrix} -> pmatrix(a,b;c) —
    // les délimiteurs restent distincts (déterminant vmatrix ≠ matrice pmatrix)
    if (/\\begin\{/.test(s)) {
      s = s
        .replace(/\\begin\{([a-z]*matrix|cases)\}/g, '$1(')
        .replace(/\\end\{(?:[a-z]*matrix|cases)\}/g, ')')
        .replace(/\\\\/g, ';')
        .replace(/&/g, ',')
    }

    // Ensembles, constantes, relations : Unicode et LaTeX vers un même jeton
    s = s
      .replace(/\\mathbb\{([a-zA-Z])\}/g, '$1')
      .replace(/[ℕℤℚℝℂ𝕂]/gu, (c) => ({ 'ℕ': 'N', 'ℤ': 'Z', 'ℚ': 'Q', 'ℝ': 'R', 'ℂ': 'C', '𝕂': 'K' }[c]))
      .replace(/\\infty\b/g, '∞')
      .replace(/\\pm\b/g, '±')
      .replace(/\\div\b/g, '÷')
      .replace(/\\(?:le|leq)\b/g, '<=')
      .replace(/\\(?:ge|geq)\b/g, '>=')
      .replace(/\\(?:ne|neq)\b/g, '≠')
      .replace(/≤/g, '<=')
      .replace(/≥/g, '>=')
      .replace(/\\(?:to|rightarrow)\b/g, '->')
      .replace(/→/g, '->')

    // Grec LaTeX -> Unicode (les deux écritures coexistent : palette V1 vs V2)
    const GREEK = {
      alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε',
      zeta: 'ζ', eta: 'η', theta: 'θ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'µ',
      nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ',
      phi: 'φ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
      Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π',
      Sigma: 'Σ', Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
    }
    s = s.replace(/\\([a-zA-Z]+)\b/g, (m, name) => GREEK[name] ?? m)

    // Exposants/indices : accolades -> parenthèses ; superscripts Unicode -> ^(n)
    const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' }
    s = s
      .replace(/([\^_])\{([^{}]*)\}/g, '$1($2)')
      .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, (run) => '^(' + run.split('').map((c) => SUP[c] ?? c).join('') + ')')

    // Parenthèses redondantes autour d'un jeton simple : (2) -> 2, ^(2) -> ^2
    do {
      prev = s
      s = s.replace(/\(([a-zA-Z0-9.∞±]+)\)/g, '$1')
    } while (s !== prev)

    return s
      .toLowerCase()
      .replace(/\\cdot|\\times/g, '*')
      .replace(/[×⋅·*]/g, '')
      .replace(/÷/g, '/')
      .replace(/[$\s]/g, '')
  }

  /**
   * tokenization simple
   */
  tokenize(text) {
    const normalized = this.normalizeText(text)
    return normalized.split(/[\s/\-.,:]+/).filter(Boolean)
  }

  /**
   * Extaction de mots-clés : tokens > 2 chars et pas dans stopwords
   */
  extractKeywords(text) {
    const tokens = this.tokenize(text)
    return new Set(tokens.filter((token) => token.length > 2 && !STOPWORDS.has(token)))
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
    // (« u=r*i » ≡ « U = R × I ») est correcte sans passer par l'embedding —
    // les embeddings comparent mal les écritures symboliques.
    const studentSym = this.normalizeSymbolic(studentAnswer)
    if (studentSym && correctList.some((c) => this.normalizeSymbolic(c) === studentSym)) {
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

      let isCorrect = false
      let decisionZone = 'low'

      if (bestScore >= HIGH_THRESHOLD) {
        // High confidence: correct
        isCorrect = true
        decisionZone = 'high'
      } else if (bestScore <= LOW_THRESHOLD) {
        // Low confidence: incorrect
        isCorrect = false
        decisionZone = 'low'
      } else {
        // Grey zone: use keyword overlap
        decisionZone = 'grey_zone'
        const studentKeywords = this.extractKeywords(studentNorm)
        const correctKeywords = this.extractKeywords(bestRef)
        const overlap = this.computeKeywordOverlap(studentKeywords, correctKeywords)

        isCorrect = overlap >= KEYWORD_OVERLAP_THRESHOLD
      }

      // Garde anti-inversion : les embeddings scorent haut sur « Y divisé par X »
      // quand la réponse attendue est « X divisé par Y » — on rejette explicitement.
      if (isCorrect && this.detectInversion(bestRef, studentNorm)) {
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

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

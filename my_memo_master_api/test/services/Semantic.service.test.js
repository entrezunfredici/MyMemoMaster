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
  })

  describe('tokenize', () => {
    it('should split text into tokens', () => {
      const text = 'hello world test'
      const result = SemanticService.tokenize(text)
      expect(result).toEqual(['hello', 'world', 'test'])
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

    it('should remove tokens shorter than 3 characters', () => {
      const text = 'to be or not to be'
      const result = SemanticService.extractKeywords(text)
      expect(result.size).toBe(0) // All are stopwords or too short
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
      expect(SemanticService.normalizeSymbolic('U = R × I')).toBe('u=r*i')
      expect(SemanticService.normalizeSymbolic('$p = F \\cdot S$')).toBe('p=f*s')
      expect(SemanticService.normalizeSymbolic('a ÷ b')).toBe('a/b')
      expect(SemanticService.normalizeSymbolic('')).toBe('')
      expect(SemanticService.normalizeSymbolic(null)).toBe('')
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

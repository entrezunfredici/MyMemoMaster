const mistralGradingService = require('../../services/MistralGrading.service')
const semanticService = require('../../services/Semantic.service')
const gradingCache = require('../../helpers/mistralGradingCache')
const aiQuotaService = require('../../services/AiQuota.service')

jest.mock('../../services/AiQuota.service', () => ({
  hasGradingCapacity: jest.fn(),
  recordGradingUsage: jest.fn()
}))
jest.mock('../../helpers/mistralGradingCache', () => ({
  getCachedVerdict: jest.fn(),
  setCachedVerdict: jest.fn()
}))

const semanticResult = (score, extra = {}) => ({
  is_correct: score >= 0.75,
  score,
  strategy: 'semantic',
  explanation: `similarity=${score}`,
  decision_zone: score >= 0.75 ? 'high' : 'low',
  ...extra
})

const mockFetchVerdict = (verdict) =>
  jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify(verdict) } }],
      usage: { prompt_tokens: 120, completion_tokens: 20 }
    })
  })

describe('MistralGradingService', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    gradingCache.getCachedVerdict.mockReset().mockResolvedValue(null)
    gradingCache.setCachedVerdict.mockReset().mockResolvedValue(undefined)
    aiQuotaService.hasGradingCapacity.mockReset().mockResolvedValue(true)
    aiQuotaService.recordGradingUsage.mockReset().mockResolvedValue(undefined)
    process.env.MISTRAL_API_KEY = 'test-key'
  })
  afterAll(() => {
    delete process.env.MISTRAL_API_KEY
  })

  describe('grade', () => {
    it('grade - score >= 0,90 - garde le verdict sémantique sans appel Mistral', async () => {
      jest.spyOn(semanticService, 'gradeSemantic').mockResolvedValue(semanticResult(0.95))
      const fetchSpy = jest.spyOn(global, 'fetch')
      const result = await mistralGradingService.grade('ref', 'rep', 'Q ?')
      expect(result.strategy).toBe('semantic')
      expect(result.is_correct).toBe(true)
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('grade - score < 0,35 - garde le verdict sémantique sans appel Mistral', async () => {
      jest.spyOn(semanticService, 'gradeSemantic').mockResolvedValue(semanticResult(0.2))
      const fetchSpy = jest.spyOn(global, 'fetch')
      const result = await mistralGradingService.grade('ref', 'rep')
      expect(result.is_correct).toBe(false)
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('grade - zone intermédiaire, Mistral dit correct - retourne is_correct true, strategy mistral', async () => {
      jest.spyOn(semanticService, 'gradeSemantic').mockResolvedValue(semanticResult(0.67))
      mockFetchVerdict({ correct: true, reason: 'Le volume constant est bien exprimé.' })
      const result = await mistralGradingService.grade(['ref'], 'rep', 'Q ?')
      expect(result).toMatchObject({
        is_correct: true,
        score: 0.67,
        strategy: 'mistral',
        decision_zone: 'llm',
        explanation: 'Le volume constant est bien exprimé.'
      })
      expect(result.usage).toEqual({ promptTokens: 120, completionTokens: 20 })
    })

    it('grade - zone intermédiaire, Mistral dit incorrect - retourne is_correct false', async () => {
      jest.spyOn(semanticService, 'gradeSemantic').mockResolvedValue(semanticResult(0.56))
      mockFetchVerdict({ correct: false, reason: 'Autre grandeur.' })
      const result = await mistralGradingService.grade('ref', 'pression constante', 'Q ?')
      expect(result.is_correct).toBe(false)
      expect(result.strategy).toBe('mistral')
    })

    it('grade - zone intermédiaire, inversion détectée - ne sollicite pas Mistral', async () => {
      jest.spyOn(semanticService, 'gradeSemantic').mockResolvedValue(
        semanticResult(0.6, { decision_zone: 'inversion', is_correct: false })
      )
      const fetchSpy = jest.spyOn(global, 'fetch')
      const result = await mistralGradingService.grade('ref', 'rep')
      expect(result.decision_zone).toBe('inversion')
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('grade - clé Mistral absente - repli sur le verdict sémantique', async () => {
      delete process.env.MISTRAL_API_KEY
      const semantic = semanticResult(0.67)
      jest.spyOn(semanticService, 'gradeSemantic').mockResolvedValue(semantic)
      const result = await mistralGradingService.grade('ref', 'rep')
      expect(result).toMatchObject({ ...semantic, degraded: true, degraded_reason: 'unavailable' })
      expect(result.degraded_message).toMatch(/risque d'erreur/)
    })

    it('grade - Mistral en erreur HTTP - repli sur le verdict sémantique', async () => {
      const semantic = semanticResult(0.67)
      jest.spyOn(semanticService, 'gradeSemantic').mockResolvedValue(semantic)
      jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 503 })
      const result = await mistralGradingService.grade('ref', 'rep')
      expect(result).toMatchObject({ ...semantic, degraded: true, degraded_reason: 'unavailable' })
      expect(result.degraded_message).toMatch(/risque d'erreur/)
    })

    it('grade - réponse Mistral sans verdict booléen - repli sur le verdict sémantique', async () => {
      const semantic = semanticResult(0.67)
      jest.spyOn(semanticService, 'gradeSemantic').mockResolvedValue(semantic)
      mockFetchVerdict({ correct: 'oui' })
      const result = await mistralGradingService.grade('ref', 'rep')
      expect(result).toMatchObject({ ...semantic, degraded: true, degraded_reason: 'unavailable' })
      expect(result.degraded_message).toMatch(/risque d'erreur/)
    })
  })

  describe('grade - zone haute (embedding trompeur)', () => {
    it('grade - score 0,84 sur une réponse fausse - Mistral invalide le verdict sémantique', async () => {
      jest.spyOn(semanticService, 'gradeSemantic').mockResolvedValue(semanticResult(0.84))
      mockFetchVerdict({ correct: false, reason: 'Entropie extensive, pas intensive.' })
      const result = await mistralGradingService.grade('ref', "L'entropie est intensive", 'Q ?')
      expect(result.is_correct).toBe(false)
      expect(result.strategy).toBe('mistral')
    })
  })

  describe('mode dégradé et plafond', () => {
    it('grade - plafond atteint - verdict sémantique dégradé (reason quota), Mistral non appelé', async () => {
      const semantic = semanticResult(0.67)
      jest.spyOn(semanticService, 'gradeSemantic').mockResolvedValue(semantic)
      aiQuotaService.hasGradingCapacity.mockResolvedValue(false)
      const fetchSpy = jest.spyOn(global, 'fetch')
      const result = await mistralGradingService.grade('ref', 'rep', 'Q ?', { userId: 7 })
      expect(result).toMatchObject({ ...semantic, degraded: true, degraded_reason: 'quota' })
      expect(aiQuotaService.hasGradingCapacity).toHaveBeenCalledWith(7)
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('grade - plafond atteint mais verdict en cache - sert le cache, non dégradé', async () => {
      jest.spyOn(semanticService, 'gradeSemantic').mockResolvedValue(semanticResult(0.67))
      gradingCache.getCachedVerdict.mockResolvedValue({ correct: true, reason: 'En cache.' })
      aiQuotaService.hasGradingCapacity.mockResolvedValue(false)
      const result = await mistralGradingService.grade('ref', 'rep', 'Q ?', { userId: 7 })
      expect(result.degraded).toBeUndefined()
      expect(result.is_correct).toBe(true)
    })

    it('grade - hors zone Mistral - jamais dégradé et plafond non consulté', async () => {
      jest.spyOn(semanticService, 'gradeSemantic').mockResolvedValue(semanticResult(0.95))
      const result = await mistralGradingService.grade('ref', 'rep')
      expect(result.degraded).toBeUndefined()
      expect(aiQuotaService.hasGradingCapacity).not.toHaveBeenCalled()
    })

    it('grade - appel Mistral réussi - usage journalisé pour cet utilisateur', async () => {
      jest.spyOn(semanticService, 'gradeSemantic').mockResolvedValue(semanticResult(0.67))
      mockFetchVerdict({ correct: true, reason: 'OK.' })
      const result = await mistralGradingService.grade('ref', 'rep', 'Q ?', { userId: 7 })
      expect(result.degraded).toBeUndefined()
      expect(aiQuotaService.recordGradingUsage).toHaveBeenCalledWith({
        userId: 7,
        model: 'mistral-small-latest',
        promptTokens: 120,
        completionTokens: 20
      })
    })

    it('grade - journalisation en échec - le verdict est quand même renvoyé', async () => {
      jest.spyOn(semanticService, 'gradeSemantic').mockResolvedValue(semanticResult(0.67))
      mockFetchVerdict({ correct: true, reason: 'OK.' })
      aiQuotaService.recordGradingUsage.mockRejectedValue(new Error('db'))
      const result = await mistralGradingService.grade('ref', 'rep')
      expect(result).toMatchObject({ is_correct: true, strategy: 'mistral' })
    })

    it('grade - lecture du quota en échec - correction autorisée (fail-open)', async () => {
      jest.spyOn(semanticService, 'gradeSemantic').mockResolvedValue(semanticResult(0.67))
      mockFetchVerdict({ correct: false, reason: 'Non.' })
      aiQuotaService.hasGradingCapacity.mockRejectedValue(new Error('db'))
      const result = await mistralGradingService.grade('ref', 'rep')
      expect(result.strategy).toBe('mistral')
    })
  })

  describe('cache', () => {
    it('grade - verdict déjà en cache - ne rappelle pas Mistral', async () => {
      jest.spyOn(semanticService, 'gradeSemantic').mockResolvedValue(semanticResult(0.67))
      gradingCache.getCachedVerdict.mockResolvedValue({ correct: true, reason: 'En cache.' })
      const fetchSpy = jest.spyOn(global, 'fetch')
      const result = await mistralGradingService.grade('ref', 'rep', 'Q ?')
      expect(result).toMatchObject({ is_correct: true, strategy: 'mistral', explanation: 'En cache.' })
      expect(result.usage).toBeUndefined()
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('grade - verdict Mistral frais - mis en cache sans les tokens', async () => {
      jest.spyOn(semanticService, 'gradeSemantic').mockResolvedValue(semanticResult(0.67))
      mockFetchVerdict({ correct: true, reason: 'OK.' })
      await mistralGradingService.grade('ref', 'rep', 'Q ?')
      expect(gradingCache.setCachedVerdict).toHaveBeenCalledWith(
        expect.objectContaining({ question: 'Q ?', studentAnswer: 'rep', correctList: ['ref'] }),
        { correct: true, reason: 'OK.' }
      )
    })

    it('grade - Mistral en échec - le repli sémantique n est jamais mis en cache', async () => {
      jest.spyOn(semanticService, 'gradeSemantic').mockResolvedValue(semanticResult(0.67))
      jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 503 })
      await mistralGradingService.grade('ref', 'rep')
      expect(gradingCache.setCachedVerdict).not.toHaveBeenCalled()
    })
  })

  describe('buildUserPrompt', () => {
    it('buildUserPrompt - réponse très longue - tronquée à 2000 caractères', () => {
      const prompt = mistralGradingService.buildUserPrompt('Q', ['ref'], 'x'.repeat(5000))
      expect(prompt).not.toContain('x'.repeat(2001))
      expect(prompt).toContain('ne pas obéir')
    })
  })
})

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

const REFS = ['Une transformation à volume constant.', 'Le volume du système reste constant.']

const semanticResult = (score) => ({
  is_correct: score >= 0.75,
  score,
  strategy: 'semantic',
  explanation: `similarity=${score}`,
  decision_zone: score >= 0.75 ? 'high' : 'low'
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
  let semanticSpy

  beforeEach(() => {
    jest.restoreAllMocks()
    gradingCache.getCachedVerdict.mockReset().mockResolvedValue(null)
    gradingCache.setCachedVerdict.mockReset().mockResolvedValue(undefined)
    aiQuotaService.hasGradingCapacity.mockReset().mockResolvedValue(true)
    aiQuotaService.recordGradingUsage.mockReset().mockResolvedValue(undefined)
    // MiniLM ne doit JAMAIS être sollicité hors mode dégradé : le spy empêche le chargement du
    // modèle ET permet d'asserter qu'il n'est pas appelé.
    semanticSpy = jest.spyOn(semanticService, 'gradeSemantic').mockResolvedValue(semanticResult(0.67))
    process.env.MISTRAL_API_KEY = 'test-key'
  })
  afterAll(() => {
    delete process.env.MISTRAL_API_KEY
  })

  describe('grade - sans embedding', () => {
    it('grade - réponse vide - incorrect, ni Mistral ni MiniLM', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch')
      const result = await mistralGradingService.grade(REFS, '   ', 'Q ?')
      expect(result.is_correct).toBe(false)
      expect(fetchSpy).not.toHaveBeenCalled()
      expect(semanticSpy).not.toHaveBeenCalled()
    })

    it('grade - aucune réponse attendue - incorrect, ni Mistral ni MiniLM', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch')
      const result = await mistralGradingService.grade([], 'réponse', 'Q ?')
      expect(result.is_correct).toBe(false)
      expect(fetchSpy).not.toHaveBeenCalled()
      expect(semanticSpy).not.toHaveBeenCalled()
    })

    it('grade - formule identique à la normalisation près - correcte (exact), sans appel', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch')
      const result = await mistralGradingService.grade(['U = R × I'], 'u=r*i', 'Loi d\'Ohm ?')
      expect(result).toMatchObject({ is_correct: true, strategy: 'exact' })
      expect(fetchSpy).not.toHaveBeenCalled()
      expect(semanticSpy).not.toHaveBeenCalled()
    })
  })

  describe('grade - verdict Mistral', () => {
    it('grade - Mistral dit correct - is_correct true, score 1, strategy mistral, MiniLM non appelé', async () => {
      mockFetchVerdict({ correct: true, reason: 'Le volume constant est bien exprimé.' })
      const result = await mistralGradingService.grade(REFS, 'Le volume reste identique', 'Q ?')
      expect(result).toMatchObject({
        is_correct: true,
        score: 1,
        strategy: 'mistral',
        decision_zone: 'llm',
        explanation: 'Le volume constant est bien exprimé.'
      })
      expect(result.degraded).toBeUndefined()
      expect(result.usage).toEqual({ promptTokens: 120, completionTokens: 20 })
      expect(semanticSpy).not.toHaveBeenCalled()
    })

    it('grade - Mistral dit incorrect - is_correct false, score 0', async () => {
      mockFetchVerdict({ correct: false, reason: 'Autre grandeur.' })
      const result = await mistralGradingService.grade(REFS, 'La pression reste constante', 'Q ?')
      expect(result).toMatchObject({ is_correct: false, score: 0, strategy: 'mistral' })
    })

    it('grade - raison absente - explication par défaut en français', async () => {
      mockFetchVerdict({ correct: true })
      const result = await mistralGradingService.grade(REFS, 'volume identique')
      expect(result.explanation).toBe('Correct (jugé par Mistral).')
    })

    it('grade - réponse acceptée sous forme de chaîne - transmise comme liste', async () => {
      const fetchSpy = mockFetchVerdict({ correct: true, reason: 'OK.' })
      await mistralGradingService.grade('Une seule réponse', 'volume identique', 'Q ?')
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
      expect(body.messages[1].content).toContain('1. Une seule réponse')
      expect(body.temperature).toBe(0)
    })

    it('grade - appel Mistral réussi - usage journalisé pour cet utilisateur', async () => {
      mockFetchVerdict({ correct: true, reason: 'OK.' })
      await mistralGradingService.grade(REFS, 'volume identique', 'Q ?', { userId: 7 })
      expect(aiQuotaService.recordGradingUsage).toHaveBeenCalledWith({
        userId: 7,
        model: 'mistral-small-latest',
        promptTokens: 120,
        completionTokens: 20
      })
    })

    it('grade - journalisation en échec - le verdict est quand même renvoyé', async () => {
      mockFetchVerdict({ correct: true, reason: 'OK.' })
      aiQuotaService.recordGradingUsage.mockRejectedValue(new Error('db'))
      const result = await mistralGradingService.grade(REFS, 'volume identique')
      expect(result).toMatchObject({ is_correct: true, strategy: 'mistral' })
    })

    it('grade - lecture du quota en échec - correction autorisée (fail-open)', async () => {
      mockFetchVerdict({ correct: false, reason: 'Non.' })
      aiQuotaService.hasGradingCapacity.mockRejectedValue(new Error('db'))
      const result = await mistralGradingService.grade(REFS, 'rep')
      expect(result.strategy).toBe('mistral')
    })
  })

  describe('grade - mode dégradé (seul usage de MiniLM)', () => {
    it('grade - plafond atteint - verdict MiniLM dégradé (reason quota), Mistral non appelé', async () => {
      aiQuotaService.hasGradingCapacity.mockResolvedValue(false)
      const fetchSpy = jest.spyOn(global, 'fetch')
      const result = await mistralGradingService.grade(REFS, 'rep', 'Q ?', { userId: 7 })
      expect(result).toMatchObject({ ...semanticResult(0.67), degraded: true, degraded_reason: 'quota' })
      expect(result.degraded_message).toMatch(/risque d'erreur/)
      expect(aiQuotaService.hasGradingCapacity).toHaveBeenCalledWith(7)
      expect(fetchSpy).not.toHaveBeenCalled()
      expect(semanticSpy).toHaveBeenCalledTimes(1)
    })

    it('grade - plafond atteint mais verdict en cache - sert le cache, non dégradé, MiniLM non appelé', async () => {
      gradingCache.getCachedVerdict.mockResolvedValue({ correct: true, reason: 'En cache.' })
      aiQuotaService.hasGradingCapacity.mockResolvedValue(false)
      const result = await mistralGradingService.grade(REFS, 'rep', 'Q ?', { userId: 7 })
      expect(result).toMatchObject({ is_correct: true, strategy: 'mistral', explanation: 'En cache.' })
      expect(result.degraded).toBeUndefined()
      expect(result.usage).toBeUndefined()
      expect(semanticSpy).not.toHaveBeenCalled()
    })

    it('grade - clé Mistral absente - repli dégradé (unavailable)', async () => {
      delete process.env.MISTRAL_API_KEY
      const result = await mistralGradingService.grade(REFS, 'rep')
      expect(result).toMatchObject({ degraded: true, degraded_reason: 'unavailable' })
    })

    it('grade - Mistral en erreur HTTP - repli dégradé et rien en cache', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 503 })
      const result = await mistralGradingService.grade(REFS, 'rep')
      expect(result).toMatchObject({ degraded: true, degraded_reason: 'unavailable' })
      expect(gradingCache.setCachedVerdict).not.toHaveBeenCalled()
    })

    it('grade - réponse Mistral sans verdict booléen - repli dégradé', async () => {
      mockFetchVerdict({ correct: 'oui' })
      const result = await mistralGradingService.grade(REFS, 'rep')
      expect(result).toMatchObject({ degraded: true, degraded_reason: 'unavailable' })
    })
  })

  describe('grade - nombres et dates', () => {
    it('grade - nombre en lettres égal à la référence - correct sans appel Mistral ni MiniLM', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch')
      const result = await mistralGradingService.grade(['1789'], 'mille sept cent quatre-vingt-neuf', 'En quelle année ?')
      expect(result).toMatchObject({ is_correct: true, strategy: 'numeric' })
      expect(fetchSpy).not.toHaveBeenCalled()
      expect(semanticSpy).not.toHaveBeenCalled()
    })

    it('grade - nombre différent et plafond atteint - incorrect déterministe, sans MiniLM ni dégradé', async () => {
      aiQuotaService.hasGradingCapacity.mockResolvedValue(false)
      const result = await mistralGradingService.grade(['1789'], '1798', 'En quelle année ?', { userId: 7 })
      expect(result).toMatchObject({ is_correct: false, strategy: 'numeric' })
      expect(result.degraded).toBeUndefined()
      expect(semanticSpy).not.toHaveBeenCalled()
    })

    it('grade - nombre différent et Mistral disponible - Mistral tranche (approximation possible)', async () => {
      mockFetchVerdict({ correct: true, reason: 'Arrondi acceptable.' })
      const result = await mistralGradingService.grade(['3,14'], '3,1416', 'Valeur de pi ?')
      expect(result).toMatchObject({ is_correct: true, strategy: 'mistral' })
    })
  })

  describe('grade - plafond de concurrence du mode dégradé', () => {
    const defer = () => {
      let resolve
      const promise = new Promise((r) => {
        resolve = r
      })
      return { promise, resolve }
    }

    beforeEach(() => {
      aiQuotaService.hasGradingCapacity.mockResolvedValue(false)
      delete process.env.GRADING_DEGRADED_CONCURRENCY
      delete process.env.GRADING_DEGRADED_MAX_QUEUE
    })
    afterEach(() => {
      delete process.env.GRADING_DEGRADED_CONCURRENCY
      delete process.env.GRADING_DEGRADED_MAX_QUEUE
    })

    it('grade - 3 corrections dégradées simultanées, concurrence 1 - exécutées une par une', async () => {
      let running = 0
      let maxRunning = 0
      const gates = [defer(), defer(), defer()]
      let call = 0
      semanticSpy.mockImplementation(async () => {
        const gate = gates[call++]
        running += 1
        maxRunning = Math.max(maxRunning, running)
        await gate.promise
        running -= 1
        return semanticResult(0.5)
      })

      const all = [1, 2, 3].map((i) => mistralGradingService.grade(REFS, `réponse ${i}`, 'Q ?'))
      await new Promise((r) => setImmediate(r))
      await new Promise((r) => setImmediate(r))
      expect(maxRunning).toBe(1)

      gates.forEach((g) => g.resolve())
      const results = await Promise.all(all)
      expect(results).toHaveLength(3)
      expect(results.every((r) => r.degraded === true)).toBe(true)
      expect(maxRunning).toBe(1)
    })

    it('grade - file pleine - échec rapide 503 en français, le reste aboutit', async () => {
      process.env.GRADING_DEGRADED_MAX_QUEUE = '1'
      const gate = defer()
      semanticSpy.mockImplementation(async () => {
        await gate.promise
        return semanticResult(0.5)
      })

      const first = mistralGradingService.grade(REFS, 'rep 1', 'Q ?')
      const second = mistralGradingService.grade(REFS, 'rep 2', 'Q ?')
      await new Promise((r) => setImmediate(r))
      await new Promise((r) => setImmediate(r))
      const third = mistralGradingService.grade(REFS, 'rep 3', 'Q ?')
      await expect(third).rejects.toMatchObject({
        statusCode: 503,
        message: expect.stringContaining('momentanément surchargé')
      })

      gate.resolve()
      await expect(first).resolves.toMatchObject({ degraded: true })
      await expect(second).resolves.toMatchObject({ degraded: true })
    })

    it('grade - une correction dégradée en erreur - libère sa place pour la suivante', async () => {
      semanticSpy.mockRejectedValueOnce(new Error('modèle indisponible')).mockResolvedValueOnce(semanticResult(0.5))
      await expect(mistralGradingService.grade(REFS, 'rep 1', 'Q ?')).rejects.toThrow('modèle indisponible')
      await expect(mistralGradingService.grade(REFS, 'rep 2', 'Q ?')).resolves.toMatchObject({ degraded: true })
    })
  })

  describe('cache', () => {
    it('grade - verdict déjà en cache - ne rappelle pas Mistral', async () => {
      gradingCache.getCachedVerdict.mockResolvedValue({ correct: true, reason: 'En cache.' })
      const fetchSpy = jest.spyOn(global, 'fetch')
      const result = await mistralGradingService.grade(REFS, 'rep', 'Q ?')
      expect(result).toMatchObject({ is_correct: true, strategy: 'mistral', explanation: 'En cache.' })
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('grade - verdict Mistral frais - mis en cache sans les tokens', async () => {
      mockFetchVerdict({ correct: true, reason: 'OK.' })
      await mistralGradingService.grade(REFS, 'rep', 'Q ?')
      expect(gradingCache.setCachedVerdict).toHaveBeenCalledWith(
        expect.objectContaining({ question: 'Q ?', studentAnswer: 'rep', correctList: REFS }),
        { correct: true, reason: 'OK.' }
      )
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

const mockRedis = { get: jest.fn(), set: jest.fn(), quit: jest.fn() }
jest.mock('../../helpers/redisClient', () => ({ createFailFastClient: () => mockRedis }))

const cache = require('../../helpers/mistralGradingCache')

const params = { model: 'm', question: 'Q ?', correctList: ['a', 'b'], studentAnswer: 'Rep' }

describe('mistralGradingCache', () => {
  beforeEach(() => {
    mockRedis.get.mockReset()
    mockRedis.set.mockReset()
  })

  it('cacheKey - casse, espaces et ordre des références ignorés - même clé', () => {
    const k1 = cache.cacheKey(params)
    const k2 = cache.cacheKey({ ...params, studentAnswer: '  rep ', correctList: ['B', 'a'] })
    expect(k1).toBe(k2)
  })

  it('cacheKey - réponse ou modèle différent - clé différente, sans texte en clair', () => {
    const k = cache.cacheKey(params)
    expect(cache.cacheKey({ ...params, studentAnswer: 'autre' })).not.toBe(k)
    expect(cache.cacheKey({ ...params, model: 'm2' })).not.toBe(k)
    expect(k).toMatch(/^grading:mistral:[0-9a-f]{64}$/)
  })

  it('getCachedVerdict - entrée présente - retourne le verdict', async () => {
    mockRedis.get.mockResolvedValue(JSON.stringify({ correct: true, reason: 'x' }))
    expect(await cache.getCachedVerdict(params)).toEqual({ correct: true, reason: 'x' })
  })

  it('getCachedVerdict - Redis en erreur - retourne null (fail-open)', async () => {
    mockRedis.get.mockRejectedValue(new Error('down'))
    expect(await cache.getCachedVerdict(params)).toBeNull()
  })

  it('setCachedVerdict - écriture avec TTL de 7 jours', async () => {
    await cache.setCachedVerdict(params, { correct: false, reason: 'y' })
    expect(mockRedis.set).toHaveBeenCalledWith(expect.any(String), '{"correct":false,"reason":"y"}', 'EX', 604800)
  })

  it('setCachedVerdict - Redis en erreur - ne propage pas', async () => {
    mockRedis.set.mockRejectedValue(new Error('down'))
    await expect(cache.setCachedVerdict(params, { correct: true, reason: '' })).resolves.toBeUndefined()
  })
})

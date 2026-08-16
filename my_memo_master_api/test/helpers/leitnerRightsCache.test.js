const mockRedisInstance = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  quit: jest.fn().mockResolvedValue(),
  on: jest.fn()
}

jest.mock('ioredis', () => jest.fn().mockImplementation(() => mockRedisInstance))
jest.mock('../../helpers/logger', () => ({ warn: jest.fn() }))

describe('leitnerRightsCache', () => {
  let rightsCache
  let logger

  const rights = { canAdd: true, canEdit: true, canDelete: false }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
    mockRedisInstance.get.mockReset().mockResolvedValue(null)
    mockRedisInstance.set.mockReset().mockResolvedValue('OK')
    mockRedisInstance.del.mockReset().mockResolvedValue(1)
    // Re-require après resetModules : voir tokenBlacklist.test.js pour la raison (mocks déconnectés sinon)
    logger = require('../../helpers/logger')
    rightsCache = require('../../helpers/leitnerRightsCache')
  })

  // ── getCachedRights ──────────────────────────────────────────────────────

  describe('getCachedRights', () => {
    it('retourne null si aucune entrée en cache', async () => {
      mockRedisInstance.get.mockResolvedValue(null)

      const result = await rightsCache.getCachedRights(2, 10)

      expect(mockRedisInstance.get).toHaveBeenCalledWith('leitner:rights:2:10')
      expect(result).toBeNull()
    })

    it('retourne les droits désérialisés si présents en cache', async () => {
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(rights))

      const result = await rightsCache.getCachedRights(2, 10)

      expect(result).toEqual(rights)
    })

    it('fail-open : une erreur Redis retourne null plutôt que de bloquer la résolution des droits', async () => {
      mockRedisInstance.get.mockRejectedValue(new Error('ECONNREFUSED'))

      const result = await rightsCache.getCachedRights(2, 10)

      expect(result).toBeNull()
      expect(logger.warn).toHaveBeenCalled()
    })
  })

  // ── setCachedRights ───────────────────────────────────────────────────────

  describe('setCachedRights', () => {
    it('sérialise les droits avec une TTL de 30s', async () => {
      await rightsCache.setCachedRights(2, 10, rights)

      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'leitner:rights:2:10',
        JSON.stringify(rights),
        'EX',
        30
      )
    })

    it("fail-open : une erreur Redis est logguée mais ne remonte pas à l'appelant", async () => {
      mockRedisInstance.set.mockRejectedValue(new Error('ECONNREFUSED'))

      await expect(rightsCache.setCachedRights(2, 10, rights)).resolves.toBeUndefined()
      expect(logger.warn).toHaveBeenCalled()
    })
  })

  // ── invalidateRights ──────────────────────────────────────────────────────

  describe('invalidateRights', () => {
    it('supprime la clé de cache du couple (utilisateur, système)', async () => {
      await rightsCache.invalidateRights(2, 10)

      expect(mockRedisInstance.del).toHaveBeenCalledWith('leitner:rights:2:10')
    })

    it("fail-open : une erreur Redis est logguée mais ne remonte pas à l'appelant", async () => {
      mockRedisInstance.del.mockRejectedValue(new Error('ECONNREFUSED'))

      await expect(rightsCache.invalidateRights(2, 10)).resolves.toBeUndefined()
      expect(logger.warn).toHaveBeenCalled()
    })
  })
})

const mockRedisInstance = {
  set: jest.fn(),
  get: jest.fn(),
  quit: jest.fn().mockResolvedValue(),
  on: jest.fn()
}

jest.mock('ioredis', () => jest.fn().mockImplementation(() => mockRedisInstance))
jest.mock('../../helpers/logger', () => ({ warn: jest.fn() }))
// Ce fichier teste le vrai helpers/tokenBlacklist.js (seul ioredis est mocké, ci-dessus) — annule le
// mock global posé par test/setup.js pour tous les autres fichiers (voir son commentaire).
jest.unmock('../../helpers/tokenBlacklist')

describe('tokenBlacklist', () => {
  let tokenBlacklist
  let logger

  beforeEach(async () => {
    jest.clearAllMocks()
    jest.resetModules()
    mockRedisInstance.set.mockReset().mockResolvedValue('OK')
    mockRedisInstance.get.mockReset().mockResolvedValue(null)
    // Re-require après resetModules : logger et tokenBlacklist doivent pointer sur la même
    // instance de mock, sinon les assertions sur logger.warn portent sur un mock déconnecté.
    logger = require('../../helpers/logger')
    tokenBlacklist = require('../../helpers/tokenBlacklist')
  })

  // ── revokeUserTokens ──────────────────────────────────────────────────────

  describe('revokeUserTokens', () => {
    it('pose un marqueur avec TTL (2 jours) sur la clé jwt:revoked-since:<userId>', async () => {
      await tokenBlacklist.revokeUserTokens(42)

      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'jwt:revoked-since:42',
        expect.any(Number),
        'EX',
        2 * 24 * 60 * 60
      )
    })

    it('fail-open : une erreur Redis est loggée mais ne remonte pas', async () => {
      mockRedisInstance.set.mockRejectedValue(new Error('ECONNREFUSED'))

      await expect(tokenBlacklist.revokeUserTokens(42)).resolves.toBeUndefined()
      expect(logger.warn).toHaveBeenCalled()
    })
  })

  // ── isTokenRevoked ────────────────────────────────────────────────────────

  describe('isTokenRevoked', () => {
    it("retourne false si aucune révocation n'a jamais eu lieu pour l'utilisateur", async () => {
      mockRedisInstance.get.mockResolvedValue(null)

      const result = await tokenBlacklist.isTokenRevoked(42, Math.floor(Date.now() / 1000))

      expect(result).toBe(false)
    })

    it('retourne true si le token a été émis avant la dernière révocation', async () => {
      const revokedAt = Date.now()
      mockRedisInstance.get.mockResolvedValue(String(revokedAt))
      const issuedBefore = Math.floor((revokedAt - 60_000) / 1000) // iat 1 min avant la révocation

      const result = await tokenBlacklist.isTokenRevoked(42, issuedBefore)

      expect(result).toBe(true)
    })

    it('retourne false si le token a été émis après la dernière révocation (reconnexion)', async () => {
      const revokedAt = Date.now()
      mockRedisInstance.get.mockResolvedValue(String(revokedAt))
      const issuedAfter = Math.floor((revokedAt + 60_000) / 1000) // iat 1 min après la révocation

      const result = await tokenBlacklist.isTokenRevoked(42, issuedAfter)

      expect(result).toBe(false)
    })

    it('fail-open : une erreur Redis retourne false (non révoqué) plutôt que de bloquer l\'auth', async () => {
      mockRedisInstance.get.mockRejectedValue(new Error('ECONNREFUSED'))

      const result = await tokenBlacklist.isTokenRevoked(42, Math.floor(Date.now() / 1000))

      expect(result).toBe(false)
      expect(logger.warn).toHaveBeenCalled()
    })
  })
})

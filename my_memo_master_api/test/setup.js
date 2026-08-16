// Désactive le rate limiting pour tous les tests par défaut.
// Les tests qui valident le comportement du rate limiter (security.test.js) gèrent cette variable eux-mêmes.
process.env.RATE_LIMIT_DISABLED = 'true'

// Mock par défaut de la blacklist JWT (A07-M1) pour tous les tests : Auth.middleware.js l'appelle sur
// CHAQUE requête authentifiée, et la plupart des tests de controllers ne s'en soucient pas (ils ne
// mockent que leur propre service). Sans ce mock global, ces tests tenteraient une vraie connexion
// Redis (indisponible en CI/local hors docker-compose) à chaque requête.
// Les fichiers qui testent explicitement la révocation (Auth.middleware.test.js, User.*.test.js,
// tokenBlacklist.test.js) redéfinissent ce mock — ou l'annulent via jest.unmock — dans leur propre
// jest.mock(), qui prend le pas sur celui-ci.
jest.mock('../helpers/tokenBlacklist', () => ({
  revokeUserTokens: jest.fn().mockResolvedValue(undefined),
  isTokenRevoked: jest.fn().mockResolvedValue(false)
}))

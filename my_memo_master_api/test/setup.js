// Désactive le rate limiting pour tous les tests par défaut.
// Les tests qui valident le comportement du rate limiter (security.test.js) gèrent cette variable eux-mêmes.
process.env.RATE_LIMIT_DISABLED = 'true'

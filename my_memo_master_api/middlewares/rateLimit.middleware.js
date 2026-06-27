const rateLimit = require('express-rate-limit')
const { ipKeyGenerator } = require('express-rate-limit')

// CHOIX: skipInTest comme fonction (pas booléen) pour être réévalué à chaque requête
// RAISON: permet de modifier NODE_ENV en cours de test sans recréer le middleware
const skipInTest = () => process.env.NODE_ENV === 'test'

// Extrait l'userId du JWT sans vérifier la signature — usage exclusif : clé de rate limiting.
// Vérifie le type de l'id et l'expiration pour limiter le bucket poisoning (DoS ciblé par userId).
// CHOIX: fallback via ipKeyGenerator (pas req.ip direct) — requis par express-rate-limit v7+ pour IPv6.
function userKeyFromJwt(req) {
  const auth = req.headers.authorization
  if (auth?.startsWith('Bearer ')) {
    try {
      const b64 = auth.slice(7).split('.')[1]
      if (!b64 || b64.length > 512) return ipKeyGenerator(req)
      const payload = JSON.parse(Buffer.from(b64, 'base64url').toString())
      const now = Math.floor(Date.now() / 1000)
      if (
        Number.isInteger(payload?.id) && payload.id > 0 &&
        Number.isInteger(payload?.exp) && payload.exp > now
      ) return `uid_${payload.id}`
    } catch {}
  }
  return ipKeyGenerator(req)
}

/**
 * Limiteur pour les actions d'authentification sensibles.
 * Couvre login, vérification email, mot de passe oublié et réinitialisation.
 * Configurable via AUTH_RATE_MAX et AUTH_RATE_WINDOW_MS.
 *
 * @type {import("express-rate-limit").RateLimitRequestHandler}
 */
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_MAX, 10) || 5,
  skip: skipInTest,
  message: { message: 'Trop de tentatives, réessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
})

/**
 * Limiteur pour la création de compte.
 * Configurable via REGISTER_RATE_MAX et REGISTER_RATE_WINDOW_MS.
 *
 * @type {import("express-rate-limit").RateLimitRequestHandler}
 */
const registerLimiter = rateLimit({
  windowMs: parseInt(process.env.REGISTER_RATE_WINDOW_MS, 10) || 60 * 60 * 1000,
  max: parseInt(process.env.REGISTER_RATE_MAX, 10) || 10,
  skip: skipInTest,
  message: { message: 'Trop de créations de compte, réessayez dans 1 heure.' },
  standardHeaders: true,
  legacyHeaders: false
})

/**
 * Limiteur global sur l'ensemble des routes API.
 * Protection contre les abus non ciblés (scraping, spam de routes).
 * Configurable via API_RATE_MAX et API_RATE_WINDOW_MS.
 *
 * @type {import("express-rate-limit").RateLimitRequestHandler}
 */
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.API_RATE_WINDOW_MS, 10) || 15 * 60 * 1000,
  // CHOIX: 500 req/15min par userId (≈33/min) — marge pour 20-30 navigations + requêtes parallèles
  // RAISON: keying par userId évite le problème NAT scolaire (plusieurs élèves derrière la même IP)
  max: parseInt(process.env.API_RATE_MAX, 10) || 500,
  keyGenerator: userKeyFromJwt,
  skip: skipInTest,
  message: { message: 'Trop de requêtes, réessayez plus tard.' },
  standardHeaders: true,
  legacyHeaders: false
})

module.exports = { authLimiter, registerLimiter, apiLimiter }

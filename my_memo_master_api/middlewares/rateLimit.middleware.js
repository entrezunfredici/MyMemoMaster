const rateLimit = require('express-rate-limit')

// CHOIX: skipInTest comme fonction (pas booléen) pour être réévalué à chaque requête
// RAISON: permet de modifier NODE_ENV en cours de test sans recréer le middleware
const skipInTest = () => process.env.NODE_ENV === 'test'

// Extrait l'ID utilisateur du JWT sans vérifier la signature.
// Usage exclusif : clé de rate limiting (pas d'autorisation).
// Un JWT forgé ne donne accès à rien — il augmente seulement son propre compteur.
function userKeyFromJwt(req) {
  const auth = req.headers.authorization
  if (auth?.startsWith('Bearer ')) {
    try {
      const payload = JSON.parse(Buffer.from(auth.slice(7).split('.')[1], 'base64url').toString())
      if (payload?.id) return `uid_${payload.id}`
    } catch {}
  }
  return req.ip
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
  // CHOIX: 500 req/15min par utilisateur (≈33/min) — marge pour 20-30 navigations + requêtes parallèles
  // RAISON: 200/IP trop bas pour un SPA multi-requêtes ; clé par userId évite le problème NAT scolaire
  max: parseInt(process.env.API_RATE_MAX, 10) || 500,
  // CHOIX: keyGenerator sur userId JWT plutôt que IP
  // RAISON: plusieurs utilisateurs derrière le même NAT (lycée, famille) ne partagent plus leur quota
  keyGenerator: userKeyFromJwt,
  skip: skipInTest,
  message: { message: 'Trop de requêtes, réessayez plus tard.' },
  standardHeaders: true,
  legacyHeaders: false
})

module.exports = { authLimiter, registerLimiter, apiLimiter }

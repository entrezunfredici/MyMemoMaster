const rateLimit = require('express-rate-limit')
const { ipKeyGenerator } = require('express-rate-limit')

// CHOIX: skip via RATE_LIMIT_DISABLED (pas NODE_ENV) — découple le rate limiting de l'environnement.
// Les tests qui veulent désactiver le rate limiting posent RATE_LIMIT_DISABLED=true (via setup.js).
// Les tests qui vérifient le rate limiting (security.test.js) le désactivent au niveau du test.
const skipRateLimit = () => process.env.RATE_LIMIT_DISABLED === 'true'

// Résout l'IP réelle du client.
// Derrière Cloudflare, CF-Connecting-IP porte l'IP du visiteur et est réécrit par
// Cloudflare à chaque requête (une valeur envoyée par le client est écrasée).
// FIABLE UNIQUEMENT si l'origine n'accepte que les plages Cloudflare (security
// group OpenStack) : sans ce filtrage, un attaquant joignant l'origine en direct
// forge l'en-tête et s'octroie un bucket neuf à chaque requête.
function clientIp(req) {
  const cf = req.headers['cf-connecting-ip']
  if (typeof cf === 'string' && cf.length > 0 && cf.length <= 45) return cf
  return req.ip || req.socket?.remoteAddress || 'unknown'
}

// Extrait l'userId du JWT sans vérifier la signature — usage exclusif : clé de rate limiting.
// Vérifie le type de l'id et l'expiration pour limiter le bucket poisoning (DoS ciblé par userId).
// CHOIX: fallback via ipKeyGenerator, qui attend une CHAÎNE IP depuis express-rate-limit v8
// (la v7 acceptait la requête). Lui passer `req` renvoyait l'objet requête lui-même comme clé :
// le MemoryStore étant une Map, chaque requête produisait une clé unique et le compteur ne
// dépassait jamais 1 — le rate limiting par IP était totalement inopérant.
function userKeyFromJwt(req) {
  const auth = req.headers.authorization
  if (auth?.startsWith('Bearer ')) {
    try {
      const b64 = auth.slice(7).split('.')[1]
      if (!b64 || b64.length > 512) return ipKeyGenerator(clientIp(req))
      const payload = JSON.parse(Buffer.from(b64, 'base64url').toString())
      const now = Math.floor(Date.now() / 1000)
      if (
        Number.isInteger(payload?.id) && payload.id > 0 &&
        Number.isInteger(payload?.exp) && payload.exp > now
      ) return `uid_${payload.id}`
    } catch {
      // parse error — fallback to IP key
    }
  }
  return ipKeyGenerator(clientIp(req))
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
  max: parseInt(process.env.AUTH_RATE_MAX, 10) || 10,
  // Seules les tentatives échouées (4xx/5xx) incrémentent le compteur
  skipSuccessfulRequests: true,
  skip: skipRateLimit,
  message: { message: 'Trop de tentatives échouées, réessayez dans 15 minutes.' },
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
  skip: skipRateLimit,
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
  skip: skipRateLimit,
  message: { message: 'Trop de requêtes, réessayez plus tard.' },
  standardHeaders: true,
  legacyHeaders: false
})

/**
 * Limiteur dédié à la génération de cartes par IA (POST /ai-generation-batches) — CORRECTIF C-01.11 :
 * cette route déclenche un vrai appel LLM/OCR payant par requête, mais ne reposait jusqu'ici que sur
 * apiLimiter (500 req/15 min, calibré pour des routes CRUD légères) — combiné au fait que le quota
 * quotidien (AiQuotaService#checkQuota) peut être contourné par des générations qui échouent après
 * l'appel payant (voir DECISIONS.md), rien n'empêchait des centaines d'appels réels en 15 minutes.
 * Fenêtre plus large qu'authLimiter/registerLimiter (le quota quotidien par défaut est déjà de 10
 * générations/jour — voir helpers/aiQuotaConfig.js — un plafond horaire généreux n'entrave donc pas
 * un usage légitime tout en bornant fortement l'abus, y compris si le quota est un jour recontourné
 * autrement). Configurable via AI_GENERATION_RATE_MAX et AI_GENERATION_RATE_WINDOW_MS.
 *
 * @type {import("express-rate-limit").RateLimitRequestHandler}
 */
const aiGenerationLimiter = rateLimit({
  windowMs: parseInt(process.env.AI_GENERATION_RATE_WINDOW_MS, 10) || 60 * 60 * 1000,
  max: parseInt(process.env.AI_GENERATION_RATE_MAX, 10) || 15,
  keyGenerator: userKeyFromJwt,
  skip: skipRateLimit,
  message: { message: 'Trop de générations IA demandées, réessayez plus tard.' },
  standardHeaders: true,
  legacyHeaders: false
})

module.exports = { authLimiter, registerLimiter, apiLimiter, aiGenerationLimiter }

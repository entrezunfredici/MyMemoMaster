const { createFailFastClient } = require('./redisClient')
const logger = require('./logger')

// Marge large au-dessus de tout AUTH_JWT_EXPIRES_IN raisonnable (15m par défaut, jamais > qq heures) :
// la clé s'auto-nettoie sans qu'on ait à parser la chaîne d'expiration du JWT.
const REVOCATION_TTL_SECONDS = 2 * 24 * 60 * 60 // 2 jours

let client = null

function getClient() {
  if (!client) client = createFailFastClient('token-blacklist')
  return client
}

/**
 * Révoque tous les tokens JWT émis avant maintenant pour un utilisateur — logout, réinitialisation
 * ou changement de mot de passe, désactivation de compte. Un token dont le claim `iat` est antérieur
 * à ce marqueur est rejeté par Auth.middleware même s'il n'est pas encore expiré (A07-M1).
 *
 * Fail-open : si Redis est indisponible, la révocation échoue silencieusement (log warn) plutôt que
 * de faire échouer l'action utilisateur (logout/reset) — même choix que BullMQ (DECISIONS.md 2026-06-12).
 *
 * @param {number} userId
 */
async function revokeUserTokens(userId) {
  try {
    await getClient().set(`jwt:revoked-since:${userId}`, Date.now(), 'EX', REVOCATION_TTL_SECONDS)
  } catch (err) {
    logger.warn(`[token-blacklist] Échec de révocation pour l'utilisateur ${userId} : ${err?.message || err}`)
  }
}

/**
 * Indique si un token doit être considéré comme révoqué : émis (`iat`) avant la dernière révocation
 * connue pour cet utilisateur.
 *
 * Fail-open : une erreur Redis est traitée comme "non révoqué" — une panne Redis dégraderait sinon
 * l'authentification de toute l'API pour tout le monde, un risque jugé pire que la fenêtre de
 * révocation manquée le temps de l'incident.
 *
 * @param {number} userId
 * @param {number} issuedAt - Claim `iat` du JWT (secondes depuis epoch)
 * @returns {Promise<boolean>}
 */
async function isTokenRevoked(userId, issuedAt) {
  try {
    const revokedSince = await getClient().get(`jwt:revoked-since:${userId}`)
    if (!revokedSince) return false
    return issuedAt * 1000 < Number(revokedSince)
  } catch (err) {
    logger.warn(`[token-blacklist] Échec de vérification pour l'utilisateur ${userId} : ${err?.message || err}`)
    return false
  }
}

/**
 * Ferme la connexion Redis (tests, arrêt propre du process).
 */
async function close() {
  if (client) {
    await client.quit()
    client = null
  }
}

module.exports = { revokeUserTokens, isTokenRevoked, close }

const { createFailFastClient } = require('./redisClient')
const logger = require('./logger')

// R5 (B4_RENDU.md §5) : 30-60 s recommandées ; 30 s retenu (borne basse) pour limiter la fenêtre
// pendant laquelle un partage/retrait de droit récent resterait invisible malgré l'invalidation
// explicite posée à chaque écriture sur LeitnerSystemsUsers (voir invalidate() et ses appelants).
const RIGHTS_TTL_SECONDS = 30

let client = null

function getClient() {
  if (!client) client = createFailFastClient('leitner-rights-cache')
  return client
}

function cacheKey(userId, idSystem) {
  return `leitner:rights:${userId}:${idSystem}`
}

/**
 * Retourne les droits mis en cache pour un couple (utilisateur, système), ou `null` si absents/expirés
 * ou si Redis est indisponible — dans tous les cas l'appelant retombe sur la résolution DB (fail-open).
 *
 * @param {number} userId
 * @param {number} idSystem
 * @returns {Promise<{canAdd: boolean, canEdit: boolean, canDelete: boolean}|null>}
 */
async function getCachedRights(userId, idSystem) {
  try {
    const raw = await getClient().get(cacheKey(userId, idSystem))
    return raw ? JSON.parse(raw) : null
  } catch (err) {
    logger.warn(`[leitner-rights-cache] Échec de lecture (${userId}/${idSystem}) : ${err?.message || err}`)
    return null
  }
}

/**
 * Met en cache les droits résolus depuis la DB, TTL courte (30 s).
 *
 * Fail-open : une erreur d'écriture (Redis indisponible) est logguée mais n'empêche pas l'appelant de
 * continuer avec les droits qu'il vient de résoudre depuis la DB — le cache est une optimisation, jamais
 * la source de vérité.
 *
 * @param {number} userId
 * @param {number} idSystem
 * @param {{canAdd: boolean, canEdit: boolean, canDelete: boolean}} rights
 */
async function setCachedRights(userId, idSystem, rights) {
  try {
    await getClient().set(cacheKey(userId, idSystem), JSON.stringify(rights), 'EX', RIGHTS_TTL_SECONDS)
  } catch (err) {
    logger.warn(`[leitner-rights-cache] Échec d'écriture (${userId}/${idSystem}) : ${err?.message || err}`)
  }
}

/**
 * Invalide le cache d'un couple (utilisateur, système) — à appeler à chaque changement de partage
 * (création/modification/suppression d'un `LeitnerSystemsUsers`). L'appartenance (`LeitnerSystem.idUser`)
 * n'est jamais réassignée après création, elle n'a donc pas besoin de point d'invalidation dédié.
 *
 * @param {number} userId
 * @param {number} idSystem
 */
async function invalidateRights(userId, idSystem) {
  try {
    await getClient().del(cacheKey(userId, idSystem))
  } catch (err) {
    logger.warn(`[leitner-rights-cache] Échec d'invalidation (${userId}/${idSystem}) : ${err?.message || err}`)
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

module.exports = { getCachedRights, setCachedRights, invalidateRights, close }

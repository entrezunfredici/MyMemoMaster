const crypto = require('crypto')
const { createFailFastClient } = require('./redisClient')
const logger = require('./logger')

// CHOIX: 7 jours — un verdict ne dépend que de (question, réponses attendues, réponse étudiante,
//        modèle) : il n'y a rien à invalider tant que ces entrées ne changent pas, la TTL ne sert qu'à
//        borner la mémoire. Modifier une carte change ses réponses attendues, donc la clé.
const GRADING_TTL_SECONDS = 7 * 24 * 3600

let client = null

function getClient() {
  if (!client) client = createFailFastClient('mistral-grading-cache')
  return client
}

/**
 * Clé de cache : empreinte des entrées normalisées (casse/espaces) + modèle, jamais le texte brut
 * (les réponses étudiantes ne sont pas stockées en clair dans les clés Redis).
 *
 * @param {{ model: string, question: string, correctList: string[], studentAnswer: string }} params
 * @returns {string}
 */
function cacheKey({ model, question, correctList, studentAnswer }) {
  const norm = (s) => String(s ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
  const digest = crypto
    .createHash('sha256')
    .update(JSON.stringify([model, norm(question), correctList.map(norm).sort(), norm(studentAnswer)]))
    .digest('hex')
  return `grading:mistral:${digest}`
}

/**
 * Verdict en cache, ou `null` si absent ou Redis indisponible (fail-open : l'appelant interroge Mistral).
 *
 * @param {object} params - voir cacheKey
 * @returns {Promise<{ correct: boolean, reason: string }|null>}
 */
async function getCachedVerdict(params) {
  try {
    const raw = await getClient().get(cacheKey(params))
    return raw ? JSON.parse(raw) : null
  } catch (err) {
    logger.warn(`[mistral-grading-cache] Échec de lecture : ${err?.message || err}`)
    return null
  }
}

/**
 * Met un verdict Mistral en cache. Fail-open : une erreur d'écriture est loguée, jamais propagée.
 *
 * @param {object} params - voir cacheKey
 * @param {{ correct: boolean, reason: string }} verdict
 */
async function setCachedVerdict(params, verdict) {
  try {
    await getClient().set(cacheKey(params), JSON.stringify(verdict), 'EX', GRADING_TTL_SECONDS)
  } catch (err) {
    logger.warn(`[mistral-grading-cache] Échec d'écriture : ${err?.message || err}`)
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

module.exports = { getCachedVerdict, setCachedVerdict, cacheKey, close }

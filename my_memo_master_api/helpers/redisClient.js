const Redis = require('ioredis')
const redisConfig = require('../config/redis.config')
const logger = require('./logger')

/**
 * Crée un client Redis "fail-fast" pour les usages hors file d'attente (caches, lookups).
 *
 * `config/redis.config.js` est pensé pour BullMQ (`maxRetriesPerRequest: null` = retries illimités,
 * requis par ses commandes bloquantes) — repris tel quel ailleurs, ça transformerait chaque appel qui
 * dépend de Redis en attente infinie tant que Redis est injoignable. Ce client applique ses propres
 * réglages : échec rapide par commande, reconnexion en tâche de fond bornée, jamais de blocage du
 * thread appelant. Adapté à tout usage où l'absence de Redis doit dégrader (fail-open), pas paralyser
 * l'API — voir `helpers/tokenBlacklist.js` et `helpers/leitnerRightsCache.js`.
 *
 * @param {string} logPrefix - préfixe des logs d'erreur de connexion (ex: 'token-blacklist')
 * @returns {import('ioredis').Redis}
 */
function createFailFastClient(logPrefix) {
  const client = new Redis({
    ...redisConfig,
    maxRetriesPerRequest: 1,
    connectTimeout: 800,
    enableOfflineQueue: false,
    retryStrategy: (times) => Math.min(times * 500, 5000)
  })
  client.on('error', (err) => {
    logger.warn(`[${logPrefix}] Erreur de connexion Redis : ${err?.message || err}`)
  })
  return client
}

module.exports = { createFailFastClient }

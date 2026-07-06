require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const http = require('http')
const db = require('./models')
const app = require('./app')
const logger = require('./helpers/logger')
const { register } = require('./helpers/metrics')
const semanticService = require('./services/Semantic.service')

const DEFAULT_MAX_RETRIES = 10
const DEFAULT_RETRY_DELAY_MS = 5000

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const PORT = Number(process.env.PORT || process.env.API_PORT || 8080)
const HOST = '0.0.0.0'
const shouldSyncSchema = (process.env.ENVIRONMENT || '').trim().toLowerCase() !== 'prod'

const server = http.createServer(app)
server.listen(PORT, HOST, () => {
  logger.info(`[API] Listening on ${HOST}:${PORT}`)
})

// CHOIX: serveur HTTP dédié aux métriques, sur un port distinct de l'API publique
// RAISON: l'Ingress/Traefik ne route que le port applicatif (${PORT}) — un serveur
//         séparé garantit que /metrics reste inatteignable de l'extérieur sans
//         dépendre d'une règle d'exclusion fragile côté reverse-proxy
const METRICS_PORT = Number(process.env.METRICS_PORT || 9090)
const metricsServer = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/metrics') {
    try {
      res.writeHead(200, { 'Content-Type': register.contentType })
      res.end(await register.metrics())
    } catch (error) {
      logger.error(`Metrics endpoint error: ${error?.message || error}`)
      res.writeHead(500)
      res.end()
    }
  } else {
    res.writeHead(404)
    res.end()
  }
})
metricsServer.listen(METRICS_PORT, HOST, () => {
  logger.info(`[Metrics] Listening on ${HOST}:${METRICS_PORT}`)
})

;(async () => {
  const maxRetries = toPositiveInt(process.env.DB_SYNC_MAX_RETRIES, DEFAULT_MAX_RETRIES)
  const retryDelayMs = toPositiveInt(process.env.DB_SYNC_RETRY_DELAY, DEFAULT_RETRY_DELAY_MS)
  let schemaSynced = false

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const dbEmpty = await db.isDatabaseEmpty()

      if (!schemaSynced && (shouldSyncSchema || dbEmpty)) {
        const reason = dbEmpty ? 'empty database detected' : 'dev/test mode'
        logger.info(`[DB] Running Sequelize sync (${reason})…`)
        await db.syncModels()
        schemaSynced = true
      }

      await db.instance.authenticate()
      logger.info('Database connection OK')
      return
    } catch (err) {
      logger.error(`DB connect failed (${attempt}/${maxRetries}): ${err?.message || err}`)
      if (attempt < maxRetries) {
        await wait(retryDelayMs)
      }
    }
  }

  logger.error('DB still unreachable; API keeps serving non-DB routes.')
})()

// Pre-warm the semantic model in the background so the first Leitner correction
// doesn't block a user request for 30+ seconds (model download ~80 MB).
semanticService.getModel().catch((err) => {
  logger.warn(`[SemanticService] Pre-warm failed: ${err?.message || err}`)
})

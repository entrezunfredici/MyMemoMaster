const client = require('prom-client')

// CHOIX: Registry dédiée plutôt que le registre global client.register
// RAISON: isole nos métriques de toute autre lib qui utiliserait aussi prom-client
const register = new client.Registry()

// USE (Utilization, Saturation, Errors) — métriques process Node.js par défaut
// (CPU, mémoire, event loop lag, handles actifs). Désactivé en test pour éviter
// un setInterval qui traînerait après la fin des tests Jest.
if (process.env.NODE_ENV !== 'test') {
  client.collectDefaultMetrics({ register })
}

// RED (Rate, Errors, Duration) — métriques HTTP custom, alimentées par
// middlewares/metrics.middleware.js
const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Durée des requêtes HTTP en secondes',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register]
})

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Nombre total de requêtes HTTP (Rate = somme ; Errors = filtrer status_code >= 500)',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
})

module.exports = { register, httpRequestDurationSeconds, httpRequestsTotal }

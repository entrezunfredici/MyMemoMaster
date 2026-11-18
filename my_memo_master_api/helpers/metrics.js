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

// Gamification (C-06) : volumétrie des événements, badges attribués et coût de l'évaluation, qui s'exécute
// à chaque exercice, session Leitner ou consultation de carte (voir services/Badge.service.js).
const gamificationEventsTotal = new client.Counter({
  name: 'gamification_events_total',
  help: "Événements de pratique traités par le moteur de badges (label type : exercise.submitted, leitner.session.completed, mindmap.viewed)",
  labelNames: ['type'],
  registers: [register]
})

const badgesAwardedTotal = new client.Counter({
  name: 'badges_awarded_total',
  help: 'Badges attribués (label badge : code du catalogue)',
  labelNames: ['badge'],
  registers: [register]
})

const gamificationEvaluationDurationSeconds = new client.Histogram({
  name: 'gamification_evaluation_duration_seconds',
  help: "Durée d'un traitement d'événement par le moteur de badges (jour d'activité + évaluation)",
  labelNames: ['type'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2],
  registers: [register]
})

module.exports = {
  register,
  httpRequestDurationSeconds,
  httpRequestsTotal,
  gamificationEventsTotal,
  badgesAwardedTotal,
  gamificationEvaluationDurationSeconds
}

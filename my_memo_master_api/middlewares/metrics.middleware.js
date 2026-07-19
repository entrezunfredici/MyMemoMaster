const { httpRequestDurationSeconds, httpRequestsTotal } = require('../helpers/metrics')

/**
 * Instrumente chaque requête HTTP pour les métriques RED (Rate, Errors, Duration).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
module.exports = function metricsMiddleware(req, res, next) {
  const startedAt = process.hrtime.bigint()

  res.on('finish', () => {
    const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1e9
    // CHOIX: route nommée (req.route.path) plutôt que req.originalUrl
    // RAISON: évite l'explosion de cardinalité Prometheus sur les segments dynamiques (/users/123, /users/456, ...)
    const route = req.route ? `${req.baseUrl}${req.route.path}` : 'non_route'
    const labels = { method: req.method, route, status_code: res.statusCode }

    httpRequestDurationSeconds.observe(labels, durationSeconds)
    httpRequestsTotal.inc(labels)
  })

  next()
}

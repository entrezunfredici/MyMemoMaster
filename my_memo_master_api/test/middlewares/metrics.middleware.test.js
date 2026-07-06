const { EventEmitter } = require('events')

jest.mock('../../helpers/metrics', () => ({
  httpRequestDurationSeconds: { observe: jest.fn() },
  httpRequestsTotal: { inc: jest.fn() }
}))

const metricsMiddleware = require('../../middlewares/metrics.middleware')
const { httpRequestDurationSeconds, httpRequestsTotal } = require('../../helpers/metrics')

describe('metricsMiddleware', () => {
  let req, res, next

  beforeEach(() => {
    jest.clearAllMocks()
    req = Object.assign(new EventEmitter(), { method: 'GET', baseUrl: '/api/v1', route: { path: '/users' } })
    res = Object.assign(new EventEmitter(), { statusCode: 200 })
    next = jest.fn()
  })

  it('appelle next() immédiatement - ne bloque pas la requête', () => {
    metricsMiddleware(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
  })

  it("requête terminée - route connue - incrémente le compteur avec le bon label route", () => {
    metricsMiddleware(req, res, next)
    res.emit('finish')

    expect(httpRequestsTotal.inc).toHaveBeenCalledWith({ method: 'GET', route: '/api/v1/users', status_code: 200 })
  })

  it('requête terminée - route connue - observe une durée numérique positive', () => {
    metricsMiddleware(req, res, next)
    res.emit('finish')

    expect(httpRequestDurationSeconds.observe).toHaveBeenCalledTimes(1)
    const [labels, duration] = httpRequestDurationSeconds.observe.mock.calls[0]
    expect(labels).toEqual({ method: 'GET', route: '/api/v1/users', status_code: 200 })
    expect(duration).toBeGreaterThanOrEqual(0)
  })

  it("route non matchée (404) - label 'non_route' pour éviter l'explosion de cardinalité", () => {
    req.route = undefined
    req.baseUrl = ''
    res.statusCode = 404

    metricsMiddleware(req, res, next)
    res.emit('finish')

    expect(httpRequestsTotal.inc).toHaveBeenCalledWith({ method: 'GET', route: 'non_route', status_code: 404 })
  })

  it('erreur serveur (500) - status_code reflété dans les labels', () => {
    res.statusCode = 500

    metricsMiddleware(req, res, next)
    res.emit('finish')

    expect(httpRequestsTotal.inc).toHaveBeenCalledWith({ method: 'GET', route: '/api/v1/users', status_code: 500 })
  })
})

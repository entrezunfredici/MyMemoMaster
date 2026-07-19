const metrics = require('../../helpers/metrics')

describe('helpers/metrics', () => {
  it('register - expose un content-type Prometheus text/plain', () => {
    expect(metrics.register.contentType).toMatch(/text\/plain/)
  })

  it('httpRequestsTotal - inc() - apparaît dans register.metrics()', async () => {
    metrics.httpRequestsTotal.inc({ method: 'GET', route: '/test', status_code: 200 })

    const output = await metrics.register.metrics()

    expect(output).toContain('http_requests_total')
  })

  it('httpRequestDurationSeconds - observe() - apparaît dans register.metrics()', async () => {
    metrics.httpRequestDurationSeconds.observe({ method: 'GET', route: '/test', status_code: 200 }, 0.05)

    const output = await metrics.register.metrics()

    expect(output).toContain('http_request_duration_seconds')
  })

  it("collectDefaultMetrics (USE) - désactivé en environnement de test - pas de métriques process", async () => {
    const output = await metrics.register.metrics()

    expect(output).not.toContain('process_cpu_user_seconds_total')
  })
})

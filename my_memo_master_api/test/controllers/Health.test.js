// Tests du health endpoint /api/v1/health (readiness probe K8s)
// La route vit dans app.js (hors routeur v1 — voir commentaire CHOIX/RAISON dans app.js)

jest.mock('../../models/index', () => ({
  instance: { sync: jest.fn(), authenticate: jest.fn() }
}))

jest.mock('../../jobs/fifo.cron', () => ({ startFifoCron: jest.fn() }))
jest.mock('../../jobs/reminder.worker', () => ({ startReminderWorker: jest.fn() }))
jest.mock('../../jobs/reminder.queue', () => ({
  getReminderQueue: jest.fn(),
  closeReminderQueue: jest.fn()
}))
jest.mock('../../jobs/kpiAlert.cron', () => ({ startKpiAlertCron: jest.fn() }))
jest.mock('../../helpers/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  http: jest.fn()
}))

const request = require('supertest')
const { instance } = require('../../models/index')
const app = require('../../app')

describe('GET /api/v1/health', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('base de données joignable - retourne 200 avec status ok', async () => {
    instance.authenticate.mockResolvedValue()

    const res = await request(app).get('/api/v1/health')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })

  test('base de données injoignable - retourne 503 avec status unavailable', async () => {
    instance.authenticate.mockRejectedValue(new Error('connexion refusée'))

    const res = await request(app).get('/api/v1/health')

    expect(res.status).toBe(503)
    expect(res.body).toEqual({ status: 'unavailable' })
  })

  test('accessible sans token - aucune authentification requise', async () => {
    instance.authenticate.mockResolvedValue()

    const res = await request(app).get('/api/v1/health')

    expect(res.status).toBe(200)
  })
})

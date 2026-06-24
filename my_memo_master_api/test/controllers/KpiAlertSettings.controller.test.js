const request = require('supertest')
const jwt = require('jsonwebtoken')

const mockUpdate = jest.fn()
const mockFindOrCreate = jest.fn()

jest.mock('../../models/index', () => ({
  Role: {},
  Subject: {},
  LeitnerSystem: {},
  LeitnerSystemsUsers: {},
  LeitnerCard: {},
  LeitnerBox: {},
  Unit: {},
  User: {},
  Response: {},
  Fields: {},
  FieldsType: {},
  Diagramme: {},
  Test: {},
  Question: {},
  Tutorials: {},
  UserOnboardingState: {},
  ClassGroup: {},
  ClassGroupUsers: {},
  CalendarEvent: {},
  EventOccurrence: {},
  Deadline: {},
  RevisionSession: {},
  Reminder: {},
  TestResult: {},
  UserKpiAlertSettings: { findOrCreate: mockFindOrCreate }
}))

jest.mock('../../helpers/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }))
jest.mock('../../jobs/fifo.cron', () => ({ startFifoCron: jest.fn() }))
jest.mock('../../jobs/reminder.worker', () => ({ startReminderWorker: jest.fn() }))
jest.mock('../../jobs/kpiAlert.cron', () => ({ startKpiAlertCron: jest.fn() }))

process.env.AUTH_JWT_SECRET = 'test-secret'
process.env.NODE_ENV = 'test'

const app = require('../../app')

const BASE = '/api/v1'
const makeToken = (payload = { id: 1 }) => jwt.sign(payload, 'test-secret')

const SETTINGS_FIXTURE = {
  id: 1, userId: 1,
  enabled: true, inAppEnabled: true, emailEnabled: false, pushEnabled: false,
  streakAlertEnabled: true, disciplineAlertEnabled: true, scoreDropAlertEnabled: true,
  thresholdDiscipline: 40, lastDigestSentAt: null
}

describe('KpiAlertSettings Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdate.mockResolvedValue(SETTINGS_FIXTURE)
    mockFindOrCreate.mockResolvedValue([{ ...SETTINGS_FIXTURE, update: mockUpdate }])
  })

  // ── GET /kpi/alert-settings ────────────────────────────────────────────────

  describe('GET /kpi/alert-settings', () => {
    it('200 — retourne les paramètres de l\'utilisateur authentifié', async () => {
      const res = await request(app)
        .get(`${BASE}/kpi/alert-settings`)
        .set('Authorization', `Bearer ${makeToken({ id: 3 })}`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('enabled')
      expect(res.body).toHaveProperty('streakAlertEnabled')
      expect(res.body).toHaveProperty('thresholdDiscipline')
      expect(mockFindOrCreate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 3 } })
      )
    })

    it('200 — crée les paramètres avec les valeurs par défaut si absents (findOrCreate)', async () => {
      const res = await request(app)
        .get(`${BASE}/kpi/alert-settings`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(mockFindOrCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          defaults: expect.objectContaining({
            enabled: true,
            streakAlertEnabled: true,
            thresholdDiscipline: 40
          })
        })
      )
    })

    it('401 — sans token', async () => {
      const res = await request(app).get(`${BASE}/kpi/alert-settings`)

      expect(res.status).toBe(401)
      expect(mockFindOrCreate).not.toHaveBeenCalled()
    })

    it('401 — token invalide', async () => {
      const res = await request(app)
        .get(`${BASE}/kpi/alert-settings`)
        .set('Authorization', 'Bearer invalid.token.here')

      expect(res.status).toBe(401)
      expect(mockFindOrCreate).not.toHaveBeenCalled()
    })

    it('500 — retourne une erreur si findOrCreate échoue', async () => {
      mockFindOrCreate.mockRejectedValueOnce(new Error('DB error'))

      const res = await request(app)
        .get(`${BASE}/kpi/alert-settings`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
      expect(res.body.message).toBeDefined()
    })
  })

  // ── PUT /kpi/alert-settings ────────────────────────────────────────────────

  describe('PUT /kpi/alert-settings', () => {
    it('200 — met à jour plusieurs champs avec un payload valide', async () => {
      const res = await request(app)
        .put(`${BASE}/kpi/alert-settings`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ enabled: false, thresholdDiscipline: 60 })

      expect(res.status).toBe(200)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false, thresholdDiscipline: 60 })
      )
    })

    it('200 — payload partiel (un seul champ)', async () => {
      const res = await request(app)
        .put(`${BASE}/kpi/alert-settings`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ streakAlertEnabled: false })

      expect(res.status).toBe(200)
      expect(mockUpdate).toHaveBeenCalledWith({ streakAlertEnabled: false })
    })

    it('200 — payload vide — appelle update avec {}', async () => {
      const res = await request(app)
        .put(`${BASE}/kpi/alert-settings`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({})

      expect(res.status).toBe(200)
      expect(mockUpdate).toHaveBeenCalledWith({})
    })

    it('200 — ignore les champs non autorisés (whitelist)', async () => {
      const res = await request(app)
        .put(`${BASE}/kpi/alert-settings`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ enabled: false, userId: 999, lastDigestSentAt: '2026-01-01' })

      expect(res.status).toBe(200)
      expect(mockUpdate).toHaveBeenCalledWith({ enabled: false })
    })

    it('400 — enabled n\'est pas un booléen', async () => {
      const res = await request(app)
        .put(`${BASE}/kpi/alert-settings`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ enabled: 'oui' })

      expect(res.status).toBe(400)
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('400 — thresholdDiscipline supérieur à 100', async () => {
      const res = await request(app)
        .put(`${BASE}/kpi/alert-settings`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ thresholdDiscipline: 150 })

      expect(res.status).toBe(400)
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('400 — thresholdDiscipline négatif', async () => {
      const res = await request(app)
        .put(`${BASE}/kpi/alert-settings`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ thresholdDiscipline: -1 })

      expect(res.status).toBe(400)
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('400 — scoreDropAlertEnabled n\'est pas un booléen (chaîne invalide)', async () => {
      const res = await request(app)
        .put(`${BASE}/kpi/alert-settings`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ scoreDropAlertEnabled: 'oui' })

      expect(res.status).toBe(400)
    })

    it('401 — sans token', async () => {
      const res = await request(app)
        .put(`${BASE}/kpi/alert-settings`)
        .send({ enabled: false })

      expect(res.status).toBe(401)
      expect(mockFindOrCreate).not.toHaveBeenCalled()
    })

    it('500 — retourne une erreur si findOrCreate échoue', async () => {
      mockFindOrCreate.mockRejectedValueOnce(new Error('DB error'))

      const res = await request(app)
        .put(`${BASE}/kpi/alert-settings`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ enabled: false })

      expect(res.status).toBe(500)
      expect(res.body.message).toBeDefined()
    })

    it('500 — retourne une erreur si update échoue', async () => {
      mockUpdate.mockRejectedValueOnce(new Error('Update failed'))

      const res = await request(app)
        .put(`${BASE}/kpi/alert-settings`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ enabled: false })

      expect(res.status).toBe(500)
      expect(res.body.message).toBeDefined()
    })
  })
})

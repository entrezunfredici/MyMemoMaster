const request = require('supertest')
const jwt = require('jsonwebtoken')

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
  UserKpiAlertSettings: {}
}))

jest.mock('../../services/KpiAlertSettings.service')
jest.mock('../../helpers/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }))
jest.mock('../../jobs/fifo.cron', () => ({ startFifoCron: jest.fn() }))
jest.mock('../../jobs/reminder.worker', () => ({ startReminderWorker: jest.fn() }))
jest.mock('../../jobs/kpiAlert.cron', () => ({ startKpiAlertCron: jest.fn() }))

process.env.AUTH_JWT_SECRET = 'test-secret'
process.env.NODE_ENV = 'test'

const app = require('../../app')
const kpiAlertSettingsService = require('../../services/KpiAlertSettings.service')

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
    kpiAlertSettingsService.getOrCreate.mockResolvedValue(SETTINGS_FIXTURE)
    kpiAlertSettingsService.update.mockResolvedValue(SETTINGS_FIXTURE)
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
      expect(kpiAlertSettingsService.getOrCreate).toHaveBeenCalledWith(3)
    })

    it('200 — délègue la création avec defaults au service', async () => {
      const res = await request(app)
        .get(`${BASE}/kpi/alert-settings`)
        .set('Authorization', `Bearer ${makeToken({ id: 7 })}`)

      expect(res.status).toBe(200)
      expect(kpiAlertSettingsService.getOrCreate).toHaveBeenCalledWith(7)
    })

    it('401 — sans token', async () => {
      const res = await request(app).get(`${BASE}/kpi/alert-settings`)

      expect(res.status).toBe(401)
      expect(kpiAlertSettingsService.getOrCreate).not.toHaveBeenCalled()
    })

    it('401 — token invalide', async () => {
      const res = await request(app)
        .get(`${BASE}/kpi/alert-settings`)
        .set('Authorization', 'Bearer invalid.token.here')

      expect(res.status).toBe(401)
      expect(kpiAlertSettingsService.getOrCreate).not.toHaveBeenCalled()
    })

    it('500 — retourne une erreur si le service échoue', async () => {
      kpiAlertSettingsService.getOrCreate.mockRejectedValueOnce(new Error('DB error'))

      const res = await request(app)
        .get(`${BASE}/kpi/alert-settings`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
      expect(res.body.message).toBeDefined()
    })
  })

  // ── PUT /kpi/alert-settings ────────────────────────────────────────────────

  describe('PUT /kpi/alert-settings', () => {
    it('200 — délègue la mise à jour au service avec le body et l\'userId', async () => {
      const res = await request(app)
        .put(`${BASE}/kpi/alert-settings`)
        .set('Authorization', `Bearer ${makeToken({ id: 5 })}`)
        .send({ enabled: false, thresholdDiscipline: 60 })

      expect(res.status).toBe(200)
      expect(kpiAlertSettingsService.update).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ enabled: false, thresholdDiscipline: 60 })
      )
    })

    it('200 — payload partiel (un seul champ)', async () => {
      const res = await request(app)
        .put(`${BASE}/kpi/alert-settings`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ streakAlertEnabled: false })

      expect(res.status).toBe(200)
      expect(kpiAlertSettingsService.update).toHaveBeenCalled()
    })

    it('200 — payload vide', async () => {
      const res = await request(app)
        .put(`${BASE}/kpi/alert-settings`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({})

      expect(res.status).toBe(200)
      expect(kpiAlertSettingsService.update).toHaveBeenCalled()
    })

    it('400 — enabled n\'est pas un booléen', async () => {
      const res = await request(app)
        .put(`${BASE}/kpi/alert-settings`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ enabled: 'oui' })

      expect(res.status).toBe(400)
      expect(kpiAlertSettingsService.update).not.toHaveBeenCalled()
    })

    it('400 — thresholdDiscipline supérieur à 100', async () => {
      const res = await request(app)
        .put(`${BASE}/kpi/alert-settings`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ thresholdDiscipline: 150 })

      expect(res.status).toBe(400)
      expect(kpiAlertSettingsService.update).not.toHaveBeenCalled()
    })

    it('400 — thresholdDiscipline négatif', async () => {
      const res = await request(app)
        .put(`${BASE}/kpi/alert-settings`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ thresholdDiscipline: -1 })

      expect(res.status).toBe(400)
      expect(kpiAlertSettingsService.update).not.toHaveBeenCalled()
    })

    it('400 — scoreDropAlertEnabled n\'est pas un booléen (chaîne invalide)', async () => {
      const res = await request(app)
        .put(`${BASE}/kpi/alert-settings`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ scoreDropAlertEnabled: 'oui' })

      expect(res.status).toBe(400)
      expect(kpiAlertSettingsService.update).not.toHaveBeenCalled()
    })

    it('401 — sans token', async () => {
      const res = await request(app)
        .put(`${BASE}/kpi/alert-settings`)
        .send({ enabled: false })

      expect(res.status).toBe(401)
      expect(kpiAlertSettingsService.update).not.toHaveBeenCalled()
    })

    it('500 — retourne une erreur si le service échoue', async () => {
      kpiAlertSettingsService.update.mockRejectedValueOnce(new Error('DB error'))

      const res = await request(app)
        .put(`${BASE}/kpi/alert-settings`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ enabled: false })

      expect(res.status).toBe(500)
      expect(res.body.message).toBeDefined()
    })
  })
})

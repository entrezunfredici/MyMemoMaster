jest.mock('../../models/index', () => ({
  instance: { sync: jest.fn() },
  User: {},
  Role: {},
  Subject: {},
  LeitnerSystem: {},
  LeitnerCard: {},
  LeitnerBox: {},
  LeitnerSystemsUsers: {},
  Unit: {},
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
  ClassGroupSection: {},
  ClassGroupResource: {},
  ClassGroupSubmission: {},
  CalendarEvent: {},
  EventOccurrence: {},
  Deadline: {},
  RevisionSession: {},
  Reminder: {},
  TestResult: {},
  Invitation: {},
  UserKpiAlertSettings: {},
  Tag: {},
  KpiConsent: {}
}))

jest.mock('../../jobs/fifo.cron', () => ({ startFifoCron: jest.fn() }))
jest.mock('../../jobs/reminder.worker', () => ({ startReminderWorker: jest.fn() }))
jest.mock('../../jobs/kpiAlert.cron', () => ({ startKpiAlertCron: jest.fn() }))
jest.mock('../../helpers/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }))

jest.mock('../../services/KpiConsent.service', () => ({
  grantConsent: jest.fn(),
  revokeConsent: jest.fn(),
  getMyConsents: jest.fn(),
  getStudentKpis: jest.fn()
}))

process.env.AUTH_JWT_SECRET = 'test-secret'
process.env.VITE_FRONT_URL = 'http://localhost:5173'
process.env.NODE_ENV = 'test'

const request = require('supertest')
const jwt = require('jsonwebtoken')
const app = require('../../app')
const service = require('../../services/KpiConsent.service')

const BASE = '/api/v1'
const makeToken = (payload = { id: 1 }) => jwt.sign(payload, 'test-secret', { expiresIn: '1d' })

const mockConsent = { id: 1, studentId: 1, teacherId: 2, classGroupId: 1, subjectId: null }

describe('KpiConsent Controller', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── POST /kpi/consent ─────────────────────────────────────────────────────────

  describe('POST /kpi/consent', () => {
    const validBody = { teacherId: 2, classGroupId: 1 }

    it('201 — consentement accordé avec subjectId', async () => {
      const consentWithSubject = { ...mockConsent, subjectId: 5 }
      service.grantConsent.mockResolvedValue(consentWithSubject)

      const res = await request(app)
        .post(`${BASE}/kpi/consent`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ teacherId: 2, classGroupId: 1, subjectId: 5 })

      expect(res.status).toBe(201)
      expect(res.body.data.subjectId).toBe(5)
    })

    it('201 — consentement accordé', async () => {
      service.grantConsent.mockResolvedValue(mockConsent)

      const res = await request(app)
        .post(`${BASE}/kpi/consent`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send(validBody)

      expect(res.status).toBe(201)
      expect(res.body.data).toEqual(mockConsent)
    })

    it('400 — teacherId manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/kpi/consent`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ classGroupId: 1 })

      expect(res.status).toBe(400)
    })

    it('400 — classGroupId manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/kpi/consent`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ teacherId: 2 })

      expect(res.status).toBe(400)
    })

    it('401 — pas de token', async () => {
      const res = await request(app)
        .post(`${BASE}/kpi/consent`)
        .send(validBody)

      expect(res.status).toBe(401)
    })

    it('403 — utilisateur non étudiant dans ce groupe', async () => {
      service.grantConsent.mockResolvedValue('not_student')

      const res = await request(app)
        .post(`${BASE}/kpi/consent`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send(validBody)

      expect(res.status).toBe(403)
    })

    it('404 — enseignant introuvable dans ce groupe', async () => {
      service.grantConsent.mockResolvedValue('not_teacher')

      const res = await request(app)
        .post(`${BASE}/kpi/consent`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send(validBody)

      expect(res.status).toBe(404)
    })

    it('500 — le service échoue', async () => {
      service.grantConsent.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .post(`${BASE}/kpi/consent`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send(validBody)

      expect(res.status).toBe(500)
    })
  })

  // ── DELETE /kpi/consent/:teacherId/:classGroupId ──────────────────────────────

  describe('DELETE /kpi/consent/:teacherId/:classGroupId', () => {
    it('200 — consentement révoqué', async () => {
      service.revokeConsent.mockResolvedValue(true)

      const res = await request(app)
        .delete(`${BASE}/kpi/consent/2/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
    })

    it('401 — pas de token', async () => {
      const res = await request(app).delete(`${BASE}/kpi/consent/2/1`)
      expect(res.status).toBe(401)
    })

    it('404 — consentement introuvable', async () => {
      service.revokeConsent.mockResolvedValue(null)

      const res = await request(app)
        .delete(`${BASE}/kpi/consent/2/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(404)
    })

    it('200 — révocation par matière (?subjectId=5)', async () => {
      service.revokeConsent.mockResolvedValue(true)

      const res = await request(app)
        .delete(`${BASE}/kpi/consent/2/1?subjectId=5`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
    })

    it('500 — le service échoue', async () => {
      service.revokeConsent.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .delete(`${BASE}/kpi/consent/2/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
    })
  })

  // ── GET /kpi/consent/my ───────────────────────────────────────────────────────

  describe('GET /kpi/consent/my', () => {
    it('200 — retourne la liste des consentements', async () => {
      service.getMyConsents.mockResolvedValue([mockConsent])

      const res = await request(app)
        .get(`${BASE}/kpi/consent/my`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
    })

    it('200 — liste vide', async () => {
      service.getMyConsents.mockResolvedValue([])

      const res = await request(app)
        .get(`${BASE}/kpi/consent/my`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
    })

    it('401 — pas de token', async () => {
      const res = await request(app).get(`${BASE}/kpi/consent/my`)
      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      service.getMyConsents.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .get(`${BASE}/kpi/consent/my`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
    })
  })

  // ── GET /kpi/student/:studentId ───────────────────────────────────────────────

  describe('GET /kpi/student/:studentId', () => {
    const mockKpis = { revision: {}, exercises: {}, leitner: {} }

    it('200 — enseignant avec consentement — retourne les KPI', async () => {
      service.getStudentKpis.mockResolvedValue(mockKpis)

      const res = await request(app)
        .get(`${BASE}/kpi/student/2?classGroupId=1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
    })

    it('400 — classGroupId manquant', async () => {
      const res = await request(app)
        .get(`${BASE}/kpi/student/2`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(400)
    })

    it('401 — pas de token', async () => {
      const res = await request(app).get(`${BASE}/kpi/student/2?classGroupId=1`)
      expect(res.status).toBe(401)
    })

    it('403 — non enseignant dans le groupe', async () => {
      service.getStudentKpis.mockResolvedValue('not_teacher')

      const res = await request(app)
        .get(`${BASE}/kpi/student/2?classGroupId=1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(403)
    })

    it("403 — pas de consentement de l'étudiant", async () => {
      service.getStudentKpis.mockResolvedValue('no_consent')

      const res = await request(app)
        .get(`${BASE}/kpi/student/2?classGroupId=1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(403)
    })

    it('500 — le service échoue', async () => {
      service.getStudentKpis.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .get(`${BASE}/kpi/student/2?classGroupId=1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
    })
  })
})

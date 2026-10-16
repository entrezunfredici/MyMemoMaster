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
jest.mock('../../jobs/reminder.queue', () => ({ getReminderQueue: jest.fn(), closeReminderQueue: jest.fn() }))
jest.mock('../../jobs/kpiAlert.cron', () => ({ startKpiAlertCron: jest.fn() }))
jest.mock('../../helpers/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }))

jest.mock('../../services/ClassGroupSubmission.service', () => ({
  findBySection: jest.fn(),
  upsert: jest.fn(),
  delete: jest.fn()
}))

process.env.AUTH_JWT_SECRET = 'test-secret'
process.env.VITE_FRONT_URL = 'http://localhost:5173'
process.env.NODE_ENV = 'test'

const request = require('supertest')
const jwt = require('jsonwebtoken')
const app = require('../../app')
const service = require('../../services/ClassGroupSubmission.service')

const BASE = '/api/v1'
const makeToken = (payload = { id: 1 }) => jwt.sign(payload, 'test-secret', { expiresIn: '1d' })

const mockSub = { id: 1, sectionId: 1, classGroupId: 1, studentId: 1, url: 'https://example.com' }

describe('ClassGroupSubmission Controller', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── GET /class-groups/:id/sections/:sectionId/submissions ─────────────────────

  describe('GET /class-groups/:id/sections/:sectionId/submissions', () => {
    it('200 — retourne les soumissions de la section', async () => {
      service.findBySection.mockResolvedValue([mockSub])

      const res = await request(app)
        .get(`${BASE}/class-groups/1/sections/1/submissions`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
    })

    it('200 — liste vide', async () => {
      service.findBySection.mockResolvedValue([])

      const res = await request(app)
        .get(`${BASE}/class-groups/1/sections/1/submissions`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
    })

    it('401 — pas de token', async () => {
      const res = await request(app).get(`${BASE}/class-groups/1/sections/1/submissions`)
      expect(res.status).toBe(401)
    })

    it('403 — non membre du groupe', async () => {
      service.findBySection.mockResolvedValue(false)

      const res = await request(app)
        .get(`${BASE}/class-groups/1/sections/1/submissions`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(403)
    })

    it('500 — le service échoue', async () => {
      service.findBySection.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .get(`${BASE}/class-groups/1/sections/1/submissions`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
    })
  })

  // ── POST /class-groups/:id/sections/:sectionId/submissions ────────────────────

  describe('POST /class-groups/:id/sections/:sectionId/submissions', () => {
    it('200 — soumission créée ou mise à jour', async () => {
      service.upsert.mockResolvedValue(mockSub)

      const res = await request(app)
        .post(`${BASE}/class-groups/1/sections/1/submissions`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ url: 'https://example.com' })

      expect(res.status).toBe(200)
      expect(service.upsert).toHaveBeenCalledTimes(1)
    })

    it('400 — URL invalide', async () => {
      const res = await request(app)
        .post(`${BASE}/class-groups/1/sections/1/submissions`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ url: 'pas-une-url' })

      expect(res.status).toBe(400)
    })

    it('400 — fileSize négatif', async () => {
      const res = await request(app)
        .post(`${BASE}/class-groups/1/sections/1/submissions`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ fileSize: -1 })

      expect(res.status).toBe(400)
    })

    it('401 — pas de token', async () => {
      const res = await request(app)
        .post(`${BASE}/class-groups/1/sections/1/submissions`)
        .send({ url: 'https://example.com' })

      expect(res.status).toBe(401)
    })

    it('403 — non membre du groupe', async () => {
      service.upsert.mockResolvedValue(false)

      const res = await request(app)
        .post(`${BASE}/class-groups/1/sections/1/submissions`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ url: 'https://example.com' })

      expect(res.status).toBe(403)
    })

    it('404 — section absente ou pas de type rendu', async () => {
      service.upsert.mockResolvedValue(null)

      const res = await request(app)
        .post(`${BASE}/class-groups/1/sections/99/submissions`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ url: 'https://example.com' })

      expect(res.status).toBe(404)
    })

    it('500 — le service échoue', async () => {
      service.upsert.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .post(`${BASE}/class-groups/1/sections/1/submissions`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ url: 'https://example.com' })

      expect(res.status).toBe(500)
    })
  })

  // ── DELETE /class-groups/:id/sections/:sectionId/submissions/:submissionId ────

  describe('DELETE /class-groups/:id/sections/:sectionId/submissions/:submissionId', () => {
    it('200 — soumission supprimée', async () => {
      service.delete.mockResolvedValue(true)

      const res = await request(app)
        .delete(`${BASE}/class-groups/1/sections/1/submissions/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
    })

    it('401 — pas de token', async () => {
      const res = await request(app).delete(`${BASE}/class-groups/1/sections/1/submissions/1`)
      expect(res.status).toBe(401)
    })

    it('403 — droits insuffisants', async () => {
      service.delete.mockResolvedValue(false)

      const res = await request(app)
        .delete(`${BASE}/class-groups/1/sections/1/submissions/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(403)
    })

    it('404 — soumission introuvable', async () => {
      service.delete.mockResolvedValue(null)

      const res = await request(app)
        .delete(`${BASE}/class-groups/1/sections/1/submissions/99`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(404)
    })

    it('500 — le service échoue', async () => {
      service.delete.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .delete(`${BASE}/class-groups/1/sections/1/submissions/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
    })
  })
})

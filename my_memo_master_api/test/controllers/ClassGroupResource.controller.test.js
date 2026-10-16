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

jest.mock('../../services/ClassGroupResource.service', () => ({
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
}))

process.env.AUTH_JWT_SECRET = 'test-secret'
process.env.VITE_FRONT_URL = 'http://localhost:5173'
process.env.NODE_ENV = 'test'

const request = require('supertest')
const jwt = require('jsonwebtoken')
const app = require('../../app')
const service = require('../../services/ClassGroupResource.service')

const BASE = '/api/v1'
const makeToken = (payload = { id: 1 }) => jwt.sign(payload, 'test-secret', { expiresIn: '1d' })

const mockResource = { id: 1, title: 'Cours Maths', type: 'cours', classGroupId: 1, createdBy: 1 }

describe('ClassGroupResource Controller', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── GET /class-groups/:id/resources ──────────────────────────────────────────

  describe('GET /class-groups/:id/resources', () => {
    it('200 — retourne les ressources du groupe', async () => {
      service.findAll.mockResolvedValue([mockResource])

      const res = await request(app)
        .get(`${BASE}/class-groups/1/resources`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
    })

    it('200 — liste vide', async () => {
      service.findAll.mockResolvedValue([])

      const res = await request(app)
        .get(`${BASE}/class-groups/1/resources`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
    })

    it('401 — pas de token', async () => {
      const res = await request(app).get(`${BASE}/class-groups/1/resources`)
      expect(res.status).toBe(401)
    })

    it('403 — non membre du groupe', async () => {
      service.findAll.mockResolvedValue(false)

      const res = await request(app)
        .get(`${BASE}/class-groups/1/resources`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(403)
    })

    it('500 — le service échoue', async () => {
      service.findAll.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .get(`${BASE}/class-groups/1/resources`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
    })
  })

  // ── POST /class-groups/:id/resources ─────────────────────────────────────────

  describe('POST /class-groups/:id/resources', () => {
    const validBody = { title: 'Cours Maths', type: 'cours' }

    it('201 — ressource créée', async () => {
      service.create.mockResolvedValue(mockResource)

      const res = await request(app)
        .post(`${BASE}/class-groups/1/resources`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send(validBody)

      expect(res.status).toBe(201)
      expect(service.create).toHaveBeenCalledTimes(1)
    })

    it('400 — title manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/class-groups/1/resources`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ type: 'cours' })

      expect(res.status).toBe(400)
    })

    it('400 — type manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/class-groups/1/resources`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ title: 'Cours Maths' })

      expect(res.status).toBe(400)
    })

    it('400 — type invalide', async () => {
      const res = await request(app)
        .post(`${BASE}/class-groups/1/resources`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ title: 'Cours', type: 'invalide' })

      expect(res.status).toBe(400)
    })

    it('401 — pas de token', async () => {
      const res = await request(app)
        .post(`${BASE}/class-groups/1/resources`)
        .send(validBody)

      expect(res.status).toBe(401)
    })

    it('403 — droits insuffisants (non enseignant)', async () => {
      service.create.mockResolvedValue(false)

      const res = await request(app)
        .post(`${BASE}/class-groups/1/resources`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send(validBody)

      expect(res.status).toBe(403)
    })

    it('500 — le service échoue', async () => {
      service.create.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .post(`${BASE}/class-groups/1/resources`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send(validBody)

      expect(res.status).toBe(500)
    })
  })

  // ── PUT /class-groups/:id/resources/:resourceId ───────────────────────────────

  describe('PUT /class-groups/:id/resources/:resourceId', () => {
    it('200 — ressource mise à jour', async () => {
      service.update.mockResolvedValue({ ...mockResource, title: 'Nouveau titre' })

      const res = await request(app)
        .put(`${BASE}/class-groups/1/resources/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ title: 'Nouveau titre' })

      expect(res.status).toBe(200)
    })

    it('400 — type invalide', async () => {
      const res = await request(app)
        .put(`${BASE}/class-groups/1/resources/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ type: 'invalide' })

      expect(res.status).toBe(400)
    })

    it('401 — pas de token', async () => {
      const res = await request(app)
        .put(`${BASE}/class-groups/1/resources/1`)
        .send({ title: 'Nouveau titre' })

      expect(res.status).toBe(401)
    })

    it('403 — droits insuffisants', async () => {
      service.update.mockResolvedValue(false)

      const res = await request(app)
        .put(`${BASE}/class-groups/1/resources/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ title: 'Nouveau titre' })

      expect(res.status).toBe(403)
    })

    it('404 — ressource introuvable', async () => {
      service.update.mockResolvedValue(null)

      const res = await request(app)
        .put(`${BASE}/class-groups/1/resources/99`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ title: 'Nouveau titre' })

      expect(res.status).toBe(404)
    })

    it('500 — le service échoue', async () => {
      service.update.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .put(`${BASE}/class-groups/1/resources/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ title: 'Nouveau titre' })

      expect(res.status).toBe(500)
    })
  })

  // ── DELETE /class-groups/:id/resources/:resourceId ────────────────────────────

  describe('DELETE /class-groups/:id/resources/:resourceId', () => {
    it('200 — ressource supprimée', async () => {
      service.delete.mockResolvedValue(true)

      const res = await request(app)
        .delete(`${BASE}/class-groups/1/resources/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
    })

    it('401 — pas de token', async () => {
      const res = await request(app).delete(`${BASE}/class-groups/1/resources/1`)
      expect(res.status).toBe(401)
    })

    it('403 — droits insuffisants', async () => {
      service.delete.mockResolvedValue(false)

      const res = await request(app)
        .delete(`${BASE}/class-groups/1/resources/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(403)
    })

    it('404 — ressource introuvable', async () => {
      service.delete.mockResolvedValue(null)

      const res = await request(app)
        .delete(`${BASE}/class-groups/1/resources/99`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(404)
    })

    it('500 — le service échoue', async () => {
      service.delete.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .delete(`${BASE}/class-groups/1/resources/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
    })
  })
})

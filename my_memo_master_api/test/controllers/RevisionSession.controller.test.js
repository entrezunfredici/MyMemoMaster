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
  CalendarEvent: {},
  EventOccurrence: {},
  Deadline: {},
  RevisionSession: {}
}))

jest.mock('../../jobs/fifo.cron', () => ({ startFifoCron: jest.fn() }))
jest.mock('../../helpers/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }))

jest.mock('../../services/RevisionSession.service', () => ({
  findAll: jest.fn(),
  findToday: jest.fn(),
  findOne: jest.fn(),
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
const revisionSessionService = require('../../services/RevisionSession.service')

const BASE = '/api/v1'
const makeToken = (payload = { id: 1 }) => jwt.sign(payload, 'test-secret', { expiresIn: '1d' })

const mockSession = {
  id: 1,
  name: 'Révision maths',
  date: '2026-06-15',
  startTime: '09:00',
  endTime: '11:00',
  userId: 1
}
const validBody = {
  name: 'Révision maths',
  date: '2026-06-15',
  startTime: '09:00',
  endTime: '11:00'
}

describe('RevisionSession Controller', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── GET /revision-sessions ─────────────────────────────────────────────────
  describe('GET /revision-sessions', () => {
    it("200 — retourne les séances de l'utilisateur", async () => {
      revisionSessionService.findAll.mockResolvedValue([mockSession])

      const res = await request(app)
        .get(`${BASE}/revision-sessions`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
    })

    it('200 — liste vide', async () => {
      revisionSessionService.findAll.mockResolvedValue([])

      const res = await request(app)
        .get(`${BASE}/revision-sessions`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
    })

    it('401 — pas de token', async () => {
      const res = await request(app).get(`${BASE}/revision-sessions`)
      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      revisionSessionService.findAll.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .get(`${BASE}/revision-sessions`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
    })
  })

  // ── GET /revision-sessions/today ───────────────────────────────────────────
  describe('GET /revision-sessions/today', () => {
    it('200 — retourne les séances du jour', async () => {
      revisionSessionService.findToday.mockResolvedValue([mockSession])

      const res = await request(app)
        .get(`${BASE}/revision-sessions/today`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
    })

    it("200 — aucune séance aujourd'hui", async () => {
      revisionSessionService.findToday.mockResolvedValue([])

      const res = await request(app)
        .get(`${BASE}/revision-sessions/today`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
    })

    it('401 — pas de token', async () => {
      const res = await request(app).get(`${BASE}/revision-sessions/today`)
      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      revisionSessionService.findToday.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .get(`${BASE}/revision-sessions/today`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
    })
  })

  // ── GET /revision-sessions/:id ─────────────────────────────────────────────
  describe('GET /revision-sessions/:id', () => {
    it('200 — retourne la séance', async () => {
      revisionSessionService.findOne.mockResolvedValue(mockSession)

      const res = await request(app)
        .get(`${BASE}/revision-sessions/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body.data.name).toBe('Révision maths')
    })

    it('404 — séance introuvable ou non propriétaire', async () => {
      revisionSessionService.findOne.mockResolvedValue(null)

      const res = await request(app)
        .get(`${BASE}/revision-sessions/99`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(404)
    })

    it('500 — le service échoue', async () => {
      revisionSessionService.findOne.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .get(`${BASE}/revision-sessions/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
    })
  })

  // ── POST /revision-sessions ────────────────────────────────────────────────
  describe('POST /revision-sessions', () => {
    it('201 — crée la séance', async () => {
      revisionSessionService.create.mockResolvedValue(mockSession)

      const res = await request(app)
        .post(`${BASE}/revision-sessions`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send(validBody)

      expect(res.status).toBe(201)
      expect(revisionSessionService.create).toHaveBeenCalledTimes(1)
    })

    it('400 — name manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/revision-sessions`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ date: '2026-06-15', startTime: '09:00', endTime: '11:00' })

      expect(res.status).toBe(400)
    })

    it('400 — date manquante', async () => {
      const res = await request(app)
        .post(`${BASE}/revision-sessions`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Révision', startTime: '09:00', endTime: '11:00' })

      expect(res.status).toBe(400)
    })

    it('400 — endTime <= startTime', async () => {
      const res = await request(app)
        .post(`${BASE}/revision-sessions`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Révision', date: '2026-06-15', startTime: '11:00', endTime: '09:00' })

      expect(res.status).toBe(400)
    })

    it('400 — format heure invalide', async () => {
      const res = await request(app)
        .post(`${BASE}/revision-sessions`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Révision', date: '2026-06-15', startTime: '9h00', endTime: '11h00' })

      expect(res.status).toBe(400)
    })

    it('401 — pas de token', async () => {
      const res = await request(app).post(`${BASE}/revision-sessions`).send(validBody)
      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      revisionSessionService.create.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .post(`${BASE}/revision-sessions`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send(validBody)

      expect(res.status).toBe(500)
    })
  })

  // ── PUT /revision-sessions/:id ─────────────────────────────────────────────
  describe('PUT /revision-sessions/:id', () => {
    it('200 — met à jour la séance', async () => {
      revisionSessionService.update.mockResolvedValue({ ...mockSession, name: 'Révision physique' })

      const res = await request(app)
        .put(`${BASE}/revision-sessions/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Révision physique' })

      expect(res.status).toBe(200)
    })

    it('404 — séance introuvable ou non propriétaire', async () => {
      revisionSessionService.update.mockResolvedValue(null)

      const res = await request(app)
        .put(`${BASE}/revision-sessions/99`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Révision physique' })

      expect(res.status).toBe(404)
    })

    it('400 — endTime <= startTime si les deux sont fournis', async () => {
      const res = await request(app)
        .put(`${BASE}/revision-sessions/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ startTime: '14:00', endTime: '10:00' })

      expect(res.status).toBe(400)
    })

    it('500 — le service échoue', async () => {
      revisionSessionService.update.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .put(`${BASE}/revision-sessions/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Révision physique' })

      expect(res.status).toBe(500)
    })
  })

  // ── DELETE /revision-sessions/:id ─────────────────────────────────────────
  describe('DELETE /revision-sessions/:id', () => {
    it('200 — supprime la séance', async () => {
      revisionSessionService.delete.mockResolvedValue(true)

      const res = await request(app)
        .delete(`${BASE}/revision-sessions/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
    })

    it('404 — séance introuvable ou non propriétaire', async () => {
      revisionSessionService.delete.mockResolvedValue(false)

      const res = await request(app)
        .delete(`${BASE}/revision-sessions/99`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(404)
    })

    it('401 — pas de token', async () => {
      const res = await request(app).delete(`${BASE}/revision-sessions/1`)
      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      revisionSessionService.delete.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .delete(`${BASE}/revision-sessions/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
    })
  })
})

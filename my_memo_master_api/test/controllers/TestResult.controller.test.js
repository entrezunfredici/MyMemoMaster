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
  TestResult: {}
}))

jest.mock('../../services/TestResult.service', () => ({
  findByTest: jest.fn(),
  findByUser: jest.fn(),
  create: jest.fn()
}))
jest.mock('../../helpers/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }))
jest.mock('../../jobs/fifo.cron', () => ({ startFifoCron: jest.fn() }))
jest.mock('../../jobs/reminder.worker', () => ({ startReminderWorker: jest.fn() }))

process.env.AUTH_JWT_SECRET = 'test-secret'
process.env.NODE_ENV = 'test'

const app = require('../../app')
const testResultService = require('../../services/TestResult.service')

const BASE = '/api/v1'
const SECRET = 'test-secret'
const makeToken = (payload = { id: 1 }) => jwt.sign(payload, SECRET)

const RESULT_FIXTURE = {
  resultId: 1,
  testId: 1,
  userId: 1,
  score: 7,
  total: 10,
  completedAt: '2026-06-21T10:00:00.000Z'
}

const HISTORY_FIXTURE = {
  ...RESULT_FIXTURE,
  test: { testId: 1, name: 'Contrôle Maths', subject: { subjectId: 1, name: 'Maths' } }
}

describe('TestResult Controller', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── GET /test-results ──────────────────────────────────────────────────────────
  describe('GET /test-results', () => {
    it('200 — retourne l\'historique de l\'utilisateur', async () => {
      testResultService.findByUser.mockResolvedValue([HISTORY_FIXTURE])

      const res = await request(app)
        .get(`${BASE}/test-results`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(1)
      expect(res.body[0].resultId).toBe(1)
      expect(testResultService.findByUser).toHaveBeenCalledWith(1)
    })

    it('200 — retourne une liste vide', async () => {
      testResultService.findByUser.mockResolvedValue([])

      const res = await request(app)
        .get(`${BASE}/test-results`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })

    it('401 — sans token', async () => {
      const res = await request(app).get(`${BASE}/test-results`)
      expect(res.status).toBe(401)
      expect(testResultService.findByUser).not.toHaveBeenCalled()
    })

    it('500 — le service échoue', async () => {
      testResultService.findByUser.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .get(`${BASE}/test-results`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
      expect(res.body.message).toBeDefined()
    })
  })

  // ── GET /test-results/test/:testId ─────────────────────────────────────────────
  describe('GET /test-results/test/:testId', () => {
    it('200 — retourne les résultats pour un test', async () => {
      testResultService.findByTest.mockResolvedValue([RESULT_FIXTURE])

      const res = await request(app)
        .get(`${BASE}/test-results/test/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(1)
      expect(res.body[0].score).toBe(7)
      expect(testResultService.findByTest).toHaveBeenCalledWith(1, 1)
    })

    it('200 — aucun résultat pour ce test', async () => {
      testResultService.findByTest.mockResolvedValue([])

      const res = await request(app)
        .get(`${BASE}/test-results/test/99`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })

    it('401 — sans token', async () => {
      const res = await request(app).get(`${BASE}/test-results/test/1`)
      expect(res.status).toBe(401)
      expect(testResultService.findByTest).not.toHaveBeenCalled()
    })

    it('500 — le service échoue', async () => {
      testResultService.findByTest.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .get(`${BASE}/test-results/test/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
      expect(res.body.message).toBeDefined()
    })
  })

  // ── POST /test-results ─────────────────────────────────────────────────────────
  describe('POST /test-results', () => {
    it('201 — enregistre le résultat', async () => {
      testResultService.create.mockResolvedValue(RESULT_FIXTURE)

      const res = await request(app)
        .post(`${BASE}/test-results`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ testId: 1, score: 7, total: 10 })

      expect(res.status).toBe(201)
      expect(res.body.resultId).toBe(1)
      expect(testResultService.create).toHaveBeenCalledWith({ testId: 1, userId: 1, score: 7, total: 10 })
    })

    it('400 — testId manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/test-results`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ score: 7, total: 10 })

      expect(res.status).toBe(400)
      expect(res.body.errors).toBeDefined()
      expect(testResultService.create).not.toHaveBeenCalled()
    })

    it('400 — score manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/test-results`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ testId: 1, total: 10 })

      expect(res.status).toBe(400)
    })

    it('400 — total manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/test-results`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ testId: 1, score: 7 })

      expect(res.status).toBe(400)
    })

    it('400 — score négatif', async () => {
      const res = await request(app)
        .post(`${BASE}/test-results`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ testId: 1, score: -1, total: 10 })

      expect(res.status).toBe(400)
    })

    it('400 — total = 0 (non strictement positif)', async () => {
      const res = await request(app)
        .post(`${BASE}/test-results`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ testId: 1, score: 0, total: 0 })

      expect(res.status).toBe(400)
    })

    it('401 — sans token', async () => {
      const res = await request(app)
        .post(`${BASE}/test-results`)
        .send({ testId: 1, score: 7, total: 10 })

      expect(res.status).toBe(401)
      expect(testResultService.create).not.toHaveBeenCalled()
    })

    it('500 — le service échoue', async () => {
      testResultService.create.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .post(`${BASE}/test-results`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ testId: 1, score: 7, total: 10 })

      expect(res.status).toBe(500)
      expect(res.body.message).toBeDefined()
    })
  })
})

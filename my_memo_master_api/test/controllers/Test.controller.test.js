jest.mock('../../models/index', () => ({
  instance: { sync: jest.fn() },
  sequelize: { transaction: jest.fn() },
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
  Tutorials: {}
}))

jest.mock('../../jobs/fifo.cron', () => ({ startFifoCron: jest.fn() }))
jest.mock('../../jobs/reminder.worker', () => ({ startReminderWorker: jest.fn() }))
jest.mock('../../helpers/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }))

jest.mock('../../services/Test.service', () => ({
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  submitAnswers: jest.fn()
}))

jest.mock('../../services/Deadline.service', () => ({
  findAll: jest.fn(),
  findOne: jest.fn(),
  findByTest: jest.fn(),
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
const testService = require('../../services/Test.service')
const deadlineService = require('../../services/Deadline.service')

const BASE = '/api/v1'
const SECRET = 'test-secret'
const makeToken = (payload = { id: 1 }) => jwt.sign(payload, SECRET)

const mockTest = { testId: 1, name: 'Contrôle Maths', subjectId: 1 }

const SUBMIT_RESULT = {
  score: 1,
  total: 2,
  resultId: 10,
  results: [
    { questionId: 1, correct: true, correctAnswer: 'Paris' },
    { questionId: 2, correct: false, correctAnswer: 'Berlin' }
  ]
}

const VALID_ANSWERS = [
  { questionId: 1, answer: 'Paris' },
  { questionId: 2, answer: 'Rome' }
]

describe('Test Controller', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── GET /tests ─────────────────────────────────────────────────────────────
  describe('GET /tests', () => {
    it('200 — retourne tous les tests', async () => {
      testService.findAll.mockResolvedValue([mockTest])

      const res = await request(app).get(`${BASE}/tests`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(1)
      expect(testService.findAll).toHaveBeenCalledTimes(1)
    })

    it('200 — retourne une liste vide', async () => {
      testService.findAll.mockResolvedValue([])

      const res = await request(app).get(`${BASE}/tests`)

      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })

    it('500 — le service échoue', async () => {
      testService.findAll.mockRejectedValue(new Error('DB error'))

      const res = await request(app).get(`${BASE}/tests`)

      expect(res.status).toBe(500)
    })
  })

  // ── GET /tests/:id ─────────────────────────────────────────────────────────
  describe('GET /tests/:id', () => {
    it('200 — retourne le test', async () => {
      testService.findOne.mockResolvedValue(mockTest)

      const res = await request(app).get(`${BASE}/tests/1`)

      expect(res.status).toBe(200)
      expect(res.body.name).toBe('Contrôle Maths')
    })

    it('404 — test introuvable', async () => {
      testService.findOne.mockResolvedValue(null)

      const res = await request(app).get(`${BASE}/tests/99`)

      expect(res.status).toBe(404)
    })

    it('500 — le service échoue', async () => {
      testService.findOne.mockRejectedValue(new Error('DB error'))

      const res = await request(app).get(`${BASE}/tests/1`)

      expect(res.status).toBe(500)
    })
  })

  // ── POST /tests ────────────────────────────────────────────────────────────
  describe('POST /tests', () => {
    it('201 — crée un test', async () => {
      testService.create.mockResolvedValue(mockTest)

      const res = await request(app)
        .post(`${BASE}/tests`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Contrôle Maths', subjectId: 1 })

      expect(res.status).toBe(201)
      expect(testService.create).toHaveBeenCalledTimes(1)
    })

    it('401 — sans token', async () => {
      const res = await request(app)
        .post(`${BASE}/tests`)
        .send({ name: 'Contrôle Maths', subjectId: 1 })
      expect(res.status).toBe(401)
    })

    it('400 — name manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/tests`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ subjectId: 1 })

      expect(res.status).toBe(400)
      expect(res.body.errors).toBeDefined()
    })

    it('400 — subjectId manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/tests`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Contrôle Maths' })

      expect(res.status).toBe(400)
    })

    it('400 — subjectId invalide (non entier)', async () => {
      const res = await request(app)
        .post(`${BASE}/tests`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Contrôle Maths', subjectId: 'abc' })

      expect(res.status).toBe(400)
    })

    it('400 — name trop court (< 2 chars)', async () => {
      const res = await request(app)
        .post(`${BASE}/tests`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'A', subjectId: 1 })

      expect(res.status).toBe(400)
    })

    it('500 — le service échoue', async () => {
      testService.create.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .post(`${BASE}/tests`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Contrôle Maths', subjectId: 1 })

      expect(res.status).toBe(500)
    })
  })

  // ── PUT /tests/:id ─────────────────────────────────────────────────────────
  describe('PUT /tests/:id', () => {
    it('200 — met à jour le test', async () => {
      testService.update.mockResolvedValue({ ...mockTest, name: 'Contrôle Maths v2' })

      const res = await request(app)
        .put(`${BASE}/tests/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Contrôle Maths v2' })

      expect(res.status).toBe(200)
    })

    it('401 — sans token', async () => {
      const res = await request(app).put(`${BASE}/tests/1`).send({ name: 'Contrôle Maths v2' })
      expect(res.status).toBe(401)
    })

    it('400 — subjectId invalide', async () => {
      const res = await request(app)
        .put(`${BASE}/tests/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ subjectId: -1 })

      expect(res.status).toBe(400)
    })

    it('500 — le service échoue', async () => {
      testService.update.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .put(`${BASE}/tests/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Contrôle Maths v2' })

      expect(res.status).toBe(500)
    })
  })

  // ── DELETE /tests/:id ──────────────────────────────────────────────────────
  describe('DELETE /tests/:id', () => {
    it('204 — supprime le test', async () => {
      testService.delete.mockResolvedValue(true)

      const res = await request(app)
        .delete(`${BASE}/tests/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(204)
    })

    it('401 — sans token', async () => {
      const res = await request(app).delete(`${BASE}/tests/1`)
      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      testService.delete.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .delete(`${BASE}/tests/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
    })
  })

  // ── POST /tests/:id/submit ─────────────────────────────────────────────────
  describe('POST /tests/:id/submit', () => {
    it('200 — correction effectuée, retourne score + détails', async () => {
      testService.submitAnswers.mockResolvedValue(SUBMIT_RESULT)

      const res = await request(app)
        .post(`${BASE}/tests/1/submit`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ answers: VALID_ANSWERS })

      expect(res.status).toBe(200)
      expect(res.body.score).toBe(1)
      expect(res.body.total).toBe(2)
      expect(res.body.resultId).toBe(10)
      expect(res.body.results).toHaveLength(2)
      expect(testService.submitAnswers).toHaveBeenCalledWith(1, 1, VALID_ANSWERS)
    })

    it('404 — test introuvable', async () => {
      testService.submitAnswers.mockResolvedValue(null)

      const res = await request(app)
        .post(`${BASE}/tests/99/submit`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ answers: VALID_ANSWERS })

      expect(res.status).toBe(404)
      expect(res.body.message).toBeDefined()
    })

    it('400 — answers manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/tests/1/submit`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({})

      expect(res.status).toBe(400)
      expect(testService.submitAnswers).not.toHaveBeenCalled()
    })

    it('400 — answers tableau vide', async () => {
      const res = await request(app)
        .post(`${BASE}/tests/1/submit`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ answers: [] })

      expect(res.status).toBe(400)
      expect(testService.submitAnswers).not.toHaveBeenCalled()
    })

    it('400 — questionId invalide dans answers', async () => {
      const res = await request(app)
        .post(`${BASE}/tests/1/submit`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ answers: [{ questionId: 0, answer: 'test' }] })

      expect(res.status).toBe(400)
      expect(testService.submitAnswers).not.toHaveBeenCalled()
    })

    it('401 — sans token', async () => {
      const res = await request(app)
        .post(`${BASE}/tests/1/submit`)
        .send({ answers: VALID_ANSWERS })

      expect(res.status).toBe(401)
      expect(testService.submitAnswers).not.toHaveBeenCalled()
    })

    it('500 — le service échoue', async () => {
      testService.submitAnswers.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .post(`${BASE}/tests/1/submit`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ answers: VALID_ANSWERS })

      expect(res.status).toBe(500)
      expect(res.body.message).toBeDefined()
    })
  })

  // ── GET /tests/:id/deadlines ───────────────────────────────────────────────
  describe('GET /tests/:id/deadlines', () => {
    const mockDeadlines = [
      { id: 1, name: 'Rendre le contrôle', dueDate: '2026-07-01', testId: 1 }
    ]

    it('200 — retourne les échéances de l\'exercice', async () => {
      deadlineService.findByTest.mockResolvedValue(mockDeadlines)

      const res = await request(app)
        .get(`${BASE}/tests/1/deadlines`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
      expect(deadlineService.findByTest).toHaveBeenCalledWith(1, 1)
    })

    it('200 — liste vide si aucun groupe', async () => {
      deadlineService.findByTest.mockResolvedValue([])

      const res = await request(app)
        .get(`${BASE}/tests/99/deadlines`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
    })

    it('401 — sans token', async () => {
      const res = await request(app).get(`${BASE}/tests/1/deadlines`)
      expect(res.status).toBe(401)
      expect(deadlineService.findByTest).not.toHaveBeenCalled()
    })

    it('500 — le service échoue', async () => {
      deadlineService.findByTest.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .get(`${BASE}/tests/1/deadlines`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
      expect(res.body.message).toBeDefined()
    })
  })
})

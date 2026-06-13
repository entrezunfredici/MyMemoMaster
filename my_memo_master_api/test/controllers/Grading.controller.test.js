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
jest.mock('../../helpers/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }))

jest.mock('../../services/Grading.service', () => ({
  gradeDateAnswer: jest.fn()
}))

jest.mock('../../services/Semantic.service', () => ({
  gradeSemantic: jest.fn()
}))

process.env.AUTH_JWT_SECRET = 'test-secret'
process.env.VITE_FRONT_URL = 'http://localhost:5173'
process.env.NODE_ENV = 'test'

const request = require('supertest')
const app = require('../../app')
const gradingService = require('../../services/Grading.service')
const semanticService = require('../../services/Semantic.service')

const BASE = '/api/v1'

describe('Grading Controller — validation', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── POST /grading/date ─────────────────────────────────────────────────────
  describe('POST /grading/date', () => {
    it('200 — retourne le résultat de correction', async () => {
      gradingService.gradeDateAnswer.mockReturnValue({
        is_correct: true,
        score: 1.0,
        strategy: 'date',
        explanation: 'ok'
      })

      const res = await request(app)
        .post(`${BASE}/grading/date`)
        .send({ correct_answer: '1939', student_answer: '1er septembre 1939' })

      expect(res.status).toBe(200)
      expect(gradingService.gradeDateAnswer).toHaveBeenCalledTimes(1)
    })

    it('400 — correct_answer manquant', async () => {
      const res = await request(app).post(`${BASE}/grading/date`).send({ student_answer: '1939' })

      expect(res.status).toBe(400)
      expect(res.body.errors).toBeDefined()
    })

    it('400 — student_answer manquant', async () => {
      const res = await request(app).post(`${BASE}/grading/date`).send({ correct_answer: '1939' })

      expect(res.status).toBe(400)
      expect(res.body.errors).toBeDefined()
    })

    it("400 — correct_answer n'est pas une chaîne", async () => {
      const res = await request(app)
        .post(`${BASE}/grading/date`)
        .send({ correct_answer: 123, student_answer: '1939' })

      expect(res.status).toBe(400)
    })
  })

  // ── POST /grading/semantic ─────────────────────────────────────────────────
  describe('POST /grading/semantic', () => {
    it('200 — correct_answers est une string', async () => {
      semanticService.gradeSemantic.mockResolvedValue({
        is_correct: true,
        score: 0.9,
        strategy: 'semantic',
        explanation: 'ok'
      })

      const res = await request(app)
        .post(`${BASE}/grading/semantic`)
        .send({
          correct_answers: 'La photosynthèse produit du glucose.',
          student_answer: 'Les plantes produisent du glucose.'
        })

      expect(res.status).toBe(200)
      expect(semanticService.gradeSemantic).toHaveBeenCalledTimes(1)
    })

    it('200 — correct_answers est un tableau de strings', async () => {
      semanticService.gradeSemantic.mockResolvedValue({
        is_correct: false,
        score: 0.3,
        strategy: 'semantic',
        explanation: 'non'
      })

      const res = await request(app)
        .post(`${BASE}/grading/semantic`)
        .send({ correct_answers: ['Réponse A', 'Réponse B'], student_answer: 'autre réponse' })

      expect(res.status).toBe(200)
    })

    it('400 — correct_answers manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/grading/semantic`)
        .send({ student_answer: 'réponse' })

      expect(res.status).toBe(400)
      expect(res.body.errors).toBeDefined()
    })

    it('400 — student_answer manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/grading/semantic`)
        .send({ correct_answers: 'bonne réponse' })

      expect(res.status).toBe(400)
    })

    it('400 — correct_answers est un tableau vide', async () => {
      const res = await request(app)
        .post(`${BASE}/grading/semantic`)
        .send({ correct_answers: [], student_answer: 'réponse' })

      expect(res.status).toBe(400)
    })

    it('400 — correct_answers est un nombre', async () => {
      const res = await request(app)
        .post(`${BASE}/grading/semantic`)
        .send({ correct_answers: 42, student_answer: 'réponse' })

      expect(res.status).toBe(400)
    })
  })
})

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

jest.mock('../../services/Question.service', () => ({
  getAllQuestions: jest.fn(),
  getQuestionsByTest: jest.fn(),
  getQuestionByCard: jest.fn(),
  findOne: jest.fn(),
  getCorrectionByQuestion: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
}))

process.env.AUTH_JWT_SECRET = 'test-secret'
process.env.VITE_FRONT_URL = 'http://localhost:5173'
process.env.NODE_ENV = 'test'

const request = require('supertest')
const app = require('../../app')
const questionService = require('../../services/Question.service')

const BASE = '/api/v1'

const mockQuestion = {
  idQuestion: 1,
  statement: 'Quelle est la capitale ?',
  questionPosition: 1,
  type: 'open'
}

describe('Question Controller', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── GET /questions ─────────────────────────────────────────────────────────
  describe('GET /questions', () => {
    it('200 — retourne toutes les questions', async () => {
      questionService.getAllQuestions.mockResolvedValue([mockQuestion])

      const res = await request(app).get(`${BASE}/questions`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(1)
    })

    it('200 — liste vide', async () => {
      questionService.getAllQuestions.mockResolvedValue([])

      const res = await request(app).get(`${BASE}/questions`)

      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })

    it('500 — le service échoue', async () => {
      questionService.getAllQuestions.mockRejectedValue(new Error('DB error'))

      const res = await request(app).get(`${BASE}/questions`)

      expect(res.status).toBe(500)
    })
  })

  // ── GET /questions/tests/:testId ───────────────────────────────────────────
  describe('GET /questions/tests/:testId', () => {
    it('200 — retourne les questions du test', async () => {
      questionService.getQuestionsByTest.mockResolvedValue([mockQuestion])

      const res = await request(app).get(`${BASE}/questions/tests/1`)

      expect(res.status).toBe(200)
      expect(questionService.getQuestionsByTest).toHaveBeenCalledWith('1')
    })

    it('500 — le service échoue', async () => {
      questionService.getQuestionsByTest.mockRejectedValue(new Error('DB error'))

      const res = await request(app).get(`${BASE}/questions/tests/1`)

      expect(res.status).toBe(500)
    })
  })

  // ── GET /questions/card/:cardId ────────────────────────────────────────────
  describe('GET /questions/card/:cardId', () => {
    it('200 — retourne la question de la carte', async () => {
      questionService.getQuestionByCard.mockResolvedValue(mockQuestion)

      const res = await request(app).get(`${BASE}/questions/card/1`)

      expect(res.status).toBe(200)
      expect(questionService.getQuestionByCard).toHaveBeenCalledWith('1')
    })

    it('500 — le service échoue', async () => {
      questionService.getQuestionByCard.mockRejectedValue(new Error('DB error'))

      const res = await request(app).get(`${BASE}/questions/card/1`)

      expect(res.status).toBe(500)
    })
  })

  // ── GET /questions/:id ─────────────────────────────────────────────────────
  describe('GET /questions/:id', () => {
    it('200 — retourne la question', async () => {
      questionService.findOne.mockResolvedValue(mockQuestion)

      const res = await request(app).get(`${BASE}/questions/1`)

      expect(res.status).toBe(200)
      expect(res.body.statement).toBe('Quelle est la capitale ?')
    })

    it('500 — le service échoue', async () => {
      questionService.findOne.mockRejectedValue(new Error('DB error'))

      const res = await request(app).get(`${BASE}/questions/1`)

      expect(res.status).toBe(500)
    })
  })

  // ── GET /questions/correction/:id ─────────────────────────────────────────
  describe('GET /questions/correction/:id', () => {
    it('200 — retourne la correction', async () => {
      questionService.getCorrectionByQuestion.mockResolvedValue({ idResponse: 5, correction: true })

      const res = await request(app).get(`${BASE}/questions/correction/1`)

      expect(res.status).toBe(200)
    })

    it('500 — le service échoue', async () => {
      questionService.getCorrectionByQuestion.mockRejectedValue(new Error('DB error'))

      const res = await request(app).get(`${BASE}/questions/correction/1`)

      expect(res.status).toBe(500)
    })
  })

  // ── POST /questions ────────────────────────────────────────────────────────
  describe('POST /questions', () => {
    const validBody = { statement: 'Quelle est la capitale ?', questionPosition: 1, type: 'open' }

    it('201 — crée une question', async () => {
      questionService.create.mockResolvedValue(mockQuestion)

      const res = await request(app).post(`${BASE}/questions`).send(validBody)

      expect(res.status).toBe(201)
      expect(questionService.create).toHaveBeenCalledTimes(1)
    })

    it('400 — statement manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/questions`)
        .send({ questionPosition: 1, type: 'open' })

      expect(res.status).toBe(400)
      expect(res.body.errors).toBeDefined()
    })

    it('400 — type manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/questions`)
        .send({ statement: 'Question ?', questionPosition: 1 })

      expect(res.status).toBe(400)
    })

    it('400 — questionPosition invalide (non entier)', async () => {
      const res = await request(app)
        .post(`${BASE}/questions`)
        .send({ statement: 'Question ?', questionPosition: 'abc', type: 'open' })

      expect(res.status).toBe(400)
    })

    it('400 — idTest invalide (non entier)', async () => {
      const res = await request(app)
        .post(`${BASE}/questions`)
        .send({ ...validBody, idTest: 'abc' })

      expect(res.status).toBe(400)
    })

    it('500 — le service échoue', async () => {
      questionService.create.mockRejectedValue(new Error('DB error'))

      const res = await request(app).post(`${BASE}/questions`).send(validBody)

      expect(res.status).toBe(500)
    })
  })

  // ── PUT /questions/edit/:id ────────────────────────────────────────────────
  describe('PUT /questions/edit/:id', () => {
    it('200 — met à jour la question', async () => {
      questionService.update.mockResolvedValue({
        ...mockQuestion,
        statement: 'Question modifiée ?'
      })

      const res = await request(app)
        .put(`${BASE}/questions/edit/1`)
        .send({ statement: 'Question modifiée ?' })

      expect(res.status).toBe(200)
    })

    it('400 — statement vide (ne peut pas être vide si fourni)', async () => {
      const res = await request(app).put(`${BASE}/questions/edit/1`).send({ statement: '' })

      expect(res.status).toBe(400)
    })

    it('500 — le service échoue', async () => {
      questionService.update.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .put(`${BASE}/questions/edit/1`)
        .send({ statement: 'Question modifiée ?' })

      expect(res.status).toBe(500)
    })
  })

  // ── DELETE /questions/:id ──────────────────────────────────────────────────
  describe('DELETE /questions/:id', () => {
    it('204 — supprime la question', async () => {
      questionService.delete.mockResolvedValue(true)

      const res = await request(app).delete(`${BASE}/questions/1`)

      expect(res.status).toBe(204)
    })

    it('500 — le service échoue', async () => {
      questionService.delete.mockRejectedValue(new Error('DB error'))

      const res = await request(app).delete(`${BASE}/questions/1`)

      expect(res.status).toBe(500)
    })
  })
})

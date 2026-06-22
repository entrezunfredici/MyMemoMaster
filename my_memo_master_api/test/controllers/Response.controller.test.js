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

jest.mock('../../services/Response.service', () => ({
  getAllResponsesByQuestion: jest.fn(),
  getCorrectionByQuestion: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
}))

process.env.AUTH_JWT_SECRET = 'test-secret'
process.env.VITE_FRONT_URL = 'http://localhost:5173'
process.env.NODE_ENV = 'test'

const request = require('supertest')
const app = require('../../app')
const responseService = require('../../services/Response.service')

const BASE = '/api/v1'

const mockResponse = { idResponse: 1, content: 'Paris', correction: true, idQuestion: 1 }

describe('Response Controller', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── GET /responses/question/:questionId ────────────────────────────────────
  describe('GET /responses/question/:questionId', () => {
    it('200 — retourne les réponses de la question', async () => {
      responseService.getAllResponsesByQuestion.mockResolvedValue([mockResponse])

      const res = await request(app).get(`${BASE}/responses/question/1`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(1)
    })

    it('200 — liste vide pour une question sans réponses', async () => {
      responseService.getAllResponsesByQuestion.mockResolvedValue([])

      const res = await request(app).get(`${BASE}/responses/question/99`)

      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })

    it('500 — le service échoue', async () => {
      responseService.getAllResponsesByQuestion.mockRejectedValue(new Error('DB error'))

      const res = await request(app).get(`${BASE}/responses/question/1`)

      expect(res.status).toBe(500)
    })
  })

  // ── GET /responses/correction/:questionId ─────────────────────────────────
  describe('GET /responses/correction/:questionId', () => {
    it('200 — retourne la correction', async () => {
      responseService.getCorrectionByQuestion.mockResolvedValue({
        ...mockResponse,
        correction: true
      })

      const res = await request(app).get(`${BASE}/responses/correction/1`)

      expect(res.status).toBe(200)
    })

    it('404 — aucune correction trouvée', async () => {
      responseService.getCorrectionByQuestion.mockResolvedValue(null)

      const res = await request(app).get(`${BASE}/responses/correction/99`)

      expect(res.status).toBe(404)
    })

    it('500 — le service échoue', async () => {
      responseService.getCorrectionByQuestion.mockRejectedValue(new Error('DB error'))

      const res = await request(app).get(`${BASE}/responses/correction/1`)

      expect(res.status).toBe(500)
    })
  })

  // ── GET /responses/:id ─────────────────────────────────────────────────────
  describe('GET /responses/:id', () => {
    it('200 — retourne la réponse', async () => {
      responseService.findOne.mockResolvedValue(mockResponse)

      const res = await request(app).get(`${BASE}/responses/1`)

      expect(res.status).toBe(200)
      expect(res.body.content).toBe('Paris')
    })

    it('404 — réponse introuvable', async () => {
      responseService.findOne.mockResolvedValue(null)

      const res = await request(app).get(`${BASE}/responses/99`)

      expect(res.status).toBe(404)
    })

    it('500 — le service échoue', async () => {
      responseService.findOne.mockRejectedValue(new Error('DB error'))

      const res = await request(app).get(`${BASE}/responses/1`)

      expect(res.status).toBe(500)
    })
  })

  // ── POST /responses ────────────────────────────────────────────────────────
  describe('POST /responses', () => {
    const validBody = { content: 'Paris', correction: true, idQuestion: 1 }

    it('201 — crée une réponse', async () => {
      responseService.create.mockResolvedValue(mockResponse)

      const res = await request(app).post(`${BASE}/responses`).send(validBody)

      expect(res.status).toBe(201)
      expect(responseService.create).toHaveBeenCalledTimes(1)
    })

    it('400 — content manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/responses`)
        .send({ correction: true, questionId: 1 })

      expect(res.status).toBe(400)
      expect(res.body.errors).toBeDefined()
    })

    it('400 — correction manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/responses`)
        .send({ content: 'Paris', questionId: 1 })

      expect(res.status).toBe(400)
    })

    it('400 — questionId manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/responses`)
        .send({ content: 'Paris', correction: true })

      expect(res.status).toBe(400)
    })

    it("400 — correction n'est pas un booléen", async () => {
      const res = await request(app)
        .post(`${BASE}/responses`)
        .send({ content: 'Paris', correction: 'oui', questionId: 1 })

      expect(res.status).toBe(400)
    })

    it("400 — questionId n'est pas un entier positif", async () => {
      const res = await request(app)
        .post(`${BASE}/responses`)
        .send({ content: 'Paris', correction: true, questionId: -1 })

      expect(res.status).toBe(400)
    })

    it('500 — le service échoue', async () => {
      responseService.create.mockRejectedValue(new Error('DB error'))

      const res = await request(app).post(`${BASE}/responses`).send(validBody)

      expect(res.status).toBe(500)
    })
  })

  // ── PUT /responses/edit/:id ────────────────────────────────────────────────
  describe('PUT /responses/edit/:id', () => {
    it('200 — met à jour la réponse', async () => {
      responseService.update.mockResolvedValue({ ...mockResponse, content: 'Lyon' })

      const res = await request(app).put(`${BASE}/responses/edit/1`).send({ content: 'Lyon' })

      expect(res.status).toBe(200)
    })

    it("400 — correction n'est pas un booléen", async () => {
      const res = await request(app).put(`${BASE}/responses/edit/1`).send({ correction: 'yes' })

      expect(res.status).toBe(400)
    })

    it('500 — le service échoue', async () => {
      responseService.update.mockRejectedValue(new Error('DB error'))

      const res = await request(app).put(`${BASE}/responses/edit/1`).send({ content: 'Lyon' })

      expect(res.status).toBe(500)
    })
  })

  // ── DELETE /responses/:id ──────────────────────────────────────────────────
  describe('DELETE /responses/:id', () => {
    it('204 — supprime la réponse', async () => {
      responseService.delete.mockResolvedValue(true)

      const res = await request(app).delete(`${BASE}/responses/1`)

      expect(res.status).toBe(204)
    })

    it('500 — le service échoue', async () => {
      responseService.delete.mockRejectedValue(new Error('DB error'))

      const res = await request(app).delete(`${BASE}/responses/1`)

      expect(res.status).toBe(500)
    })
  })
})

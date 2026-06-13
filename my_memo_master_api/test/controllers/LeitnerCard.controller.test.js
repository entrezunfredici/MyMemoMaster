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

jest.mock('../../services/LeitnerCard.service', () => ({
  getCardsByBoxId: jest.fn(),
  getCardById: jest.fn(),
  getDueCards: jest.fn(),
  addCard: jest.fn(),
  updateCard: jest.fn(),
  correctResponse: jest.fn(),
  deleteCard: jest.fn(),
  getCardSystem: jest.fn(),
  resolveUserRights: jest.fn()
}))

process.env.AUTH_JWT_SECRET = 'test-secret'
process.env.VITE_FRONT_URL = 'http://localhost:5173'
process.env.NODE_ENV = 'test'

const request = require('supertest')
const jwt = require('jsonwebtoken')
const app = require('../../app')
const leitnerCardService = require('../../services/LeitnerCard.service')

const BASE = '/api/v1'

// rights: true simule les droits d'écriture sur le système Leitner
const makeToken = (payload = { id: 1, rights: true }) =>
  jwt.sign(payload, 'test-secret', { expiresIn: '1d' })

const mockCard = { idCard: 1, idQuestion: 1, idBox: 1 }

describe('LeitnerCard Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // updateCard et deleteCard appellent ces deux méthodes avant d'agir
    leitnerCardService.getCardSystem.mockResolvedValue(1)
    leitnerCardService.resolveUserRights.mockResolvedValue({
      canAdd: true,
      canEdit: true,
      canDelete: true
    })
  })

  // ── GET /leitnercards/due/:systemId ────────────────────────────────────────
  describe('GET /leitnercards/due/:systemId', () => {
    it('200 — retourne les cartes à réviser', async () => {
      leitnerCardService.getDueCards.mockResolvedValue([mockCard])

      const res = await request(app)
        .get(`${BASE}/leitnercards/due/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(1)
    })

    it('200 — aucune carte à réviser', async () => {
      leitnerCardService.getDueCards.mockResolvedValue([])

      const res = await request(app)
        .get(`${BASE}/leitnercards/due/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })

    it('401 — pas de token', async () => {
      const res = await request(app).get(`${BASE}/leitnercards/due/1`)
      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      leitnerCardService.getDueCards.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .get(`${BASE}/leitnercards/due/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
    })
  })

  // ── GET /leitnercards/leitnerboxes/:leitnerboxid ───────────────────────────
  describe('GET /leitnercards/leitnerboxes/:leitnerboxid', () => {
    it('200 — retourne les cartes de la boîte', async () => {
      leitnerCardService.getCardsByBoxId.mockResolvedValue([mockCard])

      const res = await request(app)
        .get(`${BASE}/leitnercards/leitnerboxes/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
    })

    it('401 — pas de token', async () => {
      const res = await request(app).get(`${BASE}/leitnercards/leitnerboxes/1`)
      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      leitnerCardService.getCardsByBoxId.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .get(`${BASE}/leitnercards/leitnerboxes/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
    })
  })

  // ── GET /leitnercards/:id ──────────────────────────────────────────────────
  describe('GET /leitnercards/:id', () => {
    it('200 — retourne la carte', async () => {
      leitnerCardService.getCardById.mockResolvedValue(mockCard)

      const res = await request(app)
        .get(`${BASE}/leitnercards/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body.idCard).toBe(1)
    })

    it('404 — carte introuvable', async () => {
      leitnerCardService.getCardById.mockResolvedValue(null)

      const res = await request(app)
        .get(`${BASE}/leitnercards/99`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(404)
    })

    it('401 — pas de token', async () => {
      const res = await request(app).get(`${BASE}/leitnercards/1`)
      expect(res.status).toBe(401)
    })
  })

  // ── POST /leitnercards ─────────────────────────────────────────────────────
  describe('POST /leitnercards', () => {
    it('201 — crée une carte', async () => {
      leitnerCardService.addCard.mockResolvedValue(mockCard)

      const res = await request(app)
        .post(`${BASE}/leitnercards`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ idQuestion: 1, idSystem: 1 })

      expect(res.status).toBe(201)
      expect(leitnerCardService.addCard).toHaveBeenCalledTimes(1)
    })

    it('400 — idQuestion manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/leitnercards`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({})

      expect(res.status).toBe(400)
      expect(res.body.errors).toBeDefined()
    })

    it('400 — idQuestion invalide (non entier positif)', async () => {
      const res = await request(app)
        .post(`${BASE}/leitnercards`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ idQuestion: 0 })

      expect(res.status).toBe(400)
    })

    it('401 — pas de token', async () => {
      const res = await request(app).post(`${BASE}/leitnercards`).send({ idQuestion: 1 })

      expect(res.status).toBe(401)
    })

    it('403 — le service refuse (droits insuffisants)', async () => {
      const err = new Error('Droits insuffisants')
      err.statusCode = 403
      leitnerCardService.addCard.mockRejectedValue(err)

      const res = await request(app)
        .post(`${BASE}/leitnercards`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ idQuestion: 1, idSystem: 1 })

      expect(res.status).toBe(403)
    })
  })

  // ── PUT /leitnercards/:id ──────────────────────────────────────────────────
  describe('PUT /leitnercards/:id', () => {
    it('200 — met à jour la carte', async () => {
      leitnerCardService.updateCard.mockResolvedValue({ ...mockCard, idQuestion: 2 })

      const res = await request(app)
        .put(`${BASE}/leitnercards/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ idQuestion: 2 })

      expect(res.status).toBe(200)
    })

    it('403 — droits insuffisants ou carte introuvable', async () => {
      leitnerCardService.updateCard.mockResolvedValue(null)

      const res = await request(app)
        .put(`${BASE}/leitnercards/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ idQuestion: 2 })

      expect(res.status).toBe(403)
    })

    it('400 — idQuestion invalide', async () => {
      const res = await request(app)
        .put(`${BASE}/leitnercards/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ idQuestion: -1 })

      expect(res.status).toBe(400)
    })

    it('401 — pas de token', async () => {
      const res = await request(app).put(`${BASE}/leitnercards/1`).send({ idQuestion: 2 })

      expect(res.status).toBe(401)
    })
  })

  // ── POST /leitnercards/response ────────────────────────────────────────────
  describe('POST /leitnercards/response', () => {
    it('200 — soumet une réponse correctement', async () => {
      leitnerCardService.correctResponse.mockResolvedValue({
        success: true,
        correction: 'correct',
        score: 0.9,
        explanation: 'Bonne réponse'
      })

      const res = await request(app)
        .post(`${BASE}/leitnercards/response`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ cardId: 1, studentAnswer: 'La photosynthèse produit du glucose.' })

      expect(res.status).toBe(200)
    })

    it('404 — carte introuvable', async () => {
      leitnerCardService.correctResponse.mockResolvedValue(null)

      const res = await request(app)
        .post(`${BASE}/leitnercards/response`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ cardId: 99, studentAnswer: 'Réponse' })

      expect(res.status).toBe(404)
    })

    it('400 — cardId manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/leitnercards/response`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ studentAnswer: 'Réponse' })

      expect(res.status).toBe(400)
      expect(res.body.errors).toBeDefined()
    })

    it('400 — studentAnswer manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/leitnercards/response`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ cardId: 1 })

      expect(res.status).toBe(400)
    })

    it('401 — pas de token', async () => {
      const res = await request(app)
        .post(`${BASE}/leitnercards/response`)
        .send({ cardId: 1, studentAnswer: 'Réponse' })

      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      leitnerCardService.correctResponse.mockRejectedValue(new Error('AI error'))

      const res = await request(app)
        .post(`${BASE}/leitnercards/response`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ cardId: 1, studentAnswer: 'Réponse' })

      expect(res.status).toBe(500)
    })
  })

  // ── DELETE /leitnercards/:id ───────────────────────────────────────────────
  describe('DELETE /leitnercards/:id', () => {
    it('200 — supprime la carte', async () => {
      leitnerCardService.deleteCard.mockResolvedValue(true)

      const res = await request(app)
        .delete(`${BASE}/leitnercards/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
    })

    it('403 — droits insuffisants ou carte introuvable', async () => {
      leitnerCardService.deleteCard.mockResolvedValue(null)

      const res = await request(app)
        .delete(`${BASE}/leitnercards/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(403)
    })

    it('401 — pas de token', async () => {
      const res = await request(app).delete(`${BASE}/leitnercards/1`)
      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      leitnerCardService.deleteCard.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .delete(`${BASE}/leitnercards/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
    })
  })
})

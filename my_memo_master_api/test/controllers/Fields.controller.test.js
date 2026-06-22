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

jest.mock('../../services/Fields.service', () => ({
  findAll: jest.fn(),
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
const fieldService = require('../../services/Fields.service')

const BASE = '/api/v1'

const mockField = { fieldId: 1, fieldletter: 'A', idType: 1, data: 'Valeur' }

describe('Fields Controller', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── GET /fields ────────────────────────────────────────────────────────────
  describe('GET /fields', () => {
    it('200 — retourne tous les champs', async () => {
      fieldService.findAll.mockResolvedValue([mockField])

      const res = await request(app).get(`${BASE}/fields`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(1)
    })

    it('200 — liste vide', async () => {
      fieldService.findAll.mockResolvedValue([])

      const res = await request(app).get(`${BASE}/fields`)

      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })

    it('500 — le service échoue', async () => {
      fieldService.findAll.mockRejectedValue(new Error('DB error'))

      const res = await request(app).get(`${BASE}/fields`)

      expect(res.status).toBe(500)
    })
  })

  // ── GET /fields/:id ────────────────────────────────────────────────────────
  describe('GET /fields/:id', () => {
    it('200 — retourne le champ', async () => {
      fieldService.findOne.mockResolvedValue(mockField)

      const res = await request(app).get(`${BASE}/fields/1`)

      expect(res.status).toBe(200)
      expect(res.body.fieldletter).toBe('A')
    })

    it('404 — champ introuvable', async () => {
      fieldService.findOne.mockResolvedValue(null)

      const res = await request(app).get(`${BASE}/fields/99`)

      expect(res.status).toBe(404)
    })

    it('500 — le service échoue', async () => {
      fieldService.findOne.mockRejectedValue(new Error('DB error'))

      const res = await request(app).get(`${BASE}/fields/1`)

      expect(res.status).toBe(500)
    })
  })

  // ── POST /fields ───────────────────────────────────────────────────────────
  describe('POST /fields', () => {
    const validBody = { fieldletter: 'B', idType: 1, data: 'Données' }

    it('201 — crée un champ', async () => {
      fieldService.create.mockResolvedValue(mockField)

      const res = await request(app).post(`${BASE}/fields`).send(validBody)

      expect(res.status).toBe(201)
      expect(fieldService.create).toHaveBeenCalledTimes(1)
    })

    it('400 — fieldletter manquant (validator)', async () => {
      const res = await request(app).post(`${BASE}/fields`).send({ idType: 1, data: 'Données' })

      expect(res.status).toBe(400)
      expect(res.body.errors).toBeDefined()
    })

    it('400 — idType manquant (validator)', async () => {
      const res = await request(app)
        .post(`${BASE}/fields`)
        .send({ fieldletter: 'B', data: 'Données' })

      expect(res.status).toBe(400)
    })

    it('400 — data manquant (validator)', async () => {
      const res = await request(app).post(`${BASE}/fields`).send({ fieldletter: 'B', idType: 1 })

      expect(res.status).toBe(400)
    })

    it('400 — fieldletter dépasse 5 caractères', async () => {
      const res = await request(app)
        .post(`${BASE}/fields`)
        .send({ fieldletter: 'TOOLONG', idType: 1, data: 'Données' })

      expect(res.status).toBe(400)
    })

    it('400 — idType invalide (non entier positif)', async () => {
      const res = await request(app)
        .post(`${BASE}/fields`)
        .send({ fieldletter: 'B', idType: 0, data: 'Données' })

      expect(res.status).toBe(400)
    })

    it('500 — le service échoue', async () => {
      fieldService.create.mockRejectedValue(new Error('DB error'))

      const res = await request(app).post(`${BASE}/fields`).send(validBody)

      expect(res.status).toBe(500)
    })
  })

  // ── PUT /fields/:id ────────────────────────────────────────────────────────
  describe('PUT /fields/:id', () => {
    it('200 — met à jour le champ', async () => {
      fieldService.update.mockResolvedValue({ ...mockField, fieldletter: 'C' })

      const res = await request(app).put(`${BASE}/fields/1`).send({ fieldletter: 'C' })

      expect(res.status).toBe(200)
    })

    it('404 — champ introuvable', async () => {
      fieldService.update.mockResolvedValue(null)

      const res = await request(app).put(`${BASE}/fields/99`).send({ fieldletter: 'C' })

      expect(res.status).toBe(404)
    })

    it('400 — fieldletter dépasse 5 caractères (si fourni)', async () => {
      const res = await request(app).put(`${BASE}/fields/1`).send({ fieldletter: 'TOOLONG' })

      expect(res.status).toBe(400)
    })

    it('500 — le service échoue', async () => {
      fieldService.update.mockRejectedValue(new Error('DB error'))

      const res = await request(app).put(`${BASE}/fields/1`).send({ fieldletter: 'C' })

      expect(res.status).toBe(500)
    })
  })

  // ── DELETE /fields/:id ─────────────────────────────────────────────────────
  describe('DELETE /fields/:id', () => {
    it('204 — supprime le champ', async () => {
      fieldService.delete.mockResolvedValue(true)

      const res = await request(app).delete(`${BASE}/fields/1`)

      expect(res.status).toBe(204)
    })

    it('404 — champ introuvable', async () => {
      fieldService.delete.mockResolvedValue(null)

      const res = await request(app).delete(`${BASE}/fields/99`)

      expect(res.status).toBe(404)
    })

    it('500 — le service échoue', async () => {
      fieldService.delete.mockRejectedValue(new Error('DB error'))

      const res = await request(app).delete(`${BASE}/fields/1`)

      expect(res.status).toBe(500)
    })
  })
})

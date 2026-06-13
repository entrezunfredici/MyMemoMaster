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

jest.mock('../../services/Unit.service', () => ({
  getAllUnits: jest.fn(),
  getUnitById: jest.fn(),
  addUnit: jest.fn(),
  updateUnit: jest.fn(),
  deleteUnit: jest.fn()
}))

process.env.AUTH_JWT_SECRET = 'test-secret'
process.env.VITE_FRONT_URL = 'http://localhost:5173'
process.env.NODE_ENV = 'test'

const request = require('supertest')
const jwt = require('jsonwebtoken')
const app = require('../../app')
const unitService = require('../../services/Unit.service')

const makeToken = (payload = { id: 1 }) => jwt.sign(payload, 'test-secret', { expiresIn: '1d' })

const BASE = '/api/v1'

const mockUnit = { unitId: 1, name: 'Mètre', denomination: 'm', physicalQuantityName: 'Longueur' }

describe('Unit Controller', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── GET /units ─────────────────────────────────────────────────────────────
  describe('GET /units', () => {
    it('200 — retourne toutes les unités', async () => {
      unitService.getAllUnits.mockResolvedValue([mockUnit])

      const res = await request(app)
        .get(`${BASE}/units`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(1)
    })

    it('200 — retourne une liste vide', async () => {
      unitService.getAllUnits.mockResolvedValue([])

      const res = await request(app)
        .get(`${BASE}/units`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })

    it('401 — pas de token', async () => {
      const res = await request(app).get(`${BASE}/units`)
      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      unitService.getAllUnits.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .get(`${BASE}/units`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
    })
  })

  // ── GET /units/:id ─────────────────────────────────────────────────────────
  describe('GET /units/:id', () => {
    it("200 — retourne l'unité", async () => {
      unitService.getUnitById.mockResolvedValue(mockUnit)

      const res = await request(app)
        .get(`${BASE}/units/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body.name).toBe('Mètre')
    })

    it('404 — unité introuvable', async () => {
      unitService.getUnitById.mockResolvedValue(null)

      const res = await request(app)
        .get(`${BASE}/units/99`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(404)
    })

    it('401 — pas de token', async () => {
      const res = await request(app).get(`${BASE}/units/1`)
      expect(res.status).toBe(401)
    })
  })

  // ── POST /units ────────────────────────────────────────────────────────────
  describe('POST /units', () => {
    const validBody = { name: 'Kilogramme', denomination: 'kg', physicalQuantityName: 'Masse' }

    it('201 — crée une unité', async () => {
      unitService.addUnit.mockResolvedValue({ unitId: 2, ...validBody })

      const res = await request(app)
        .post(`${BASE}/units`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send(validBody)

      expect(res.status).toBe(201)
      expect(unitService.addUnit).toHaveBeenCalledTimes(1)
    })

    it('400 — name manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/units`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ denomination: 'kg', physicalQuantityName: 'Masse' })

      expect(res.status).toBe(400)
    })

    it('400 — denomination manquante', async () => {
      const res = await request(app)
        .post(`${BASE}/units`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Kilogramme', physicalQuantityName: 'Masse' })

      expect(res.status).toBe(400)
    })

    it('400 — physicalQuantityName manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/units`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Kilogramme', denomination: 'kg' })

      expect(res.status).toBe(400)
    })

    it('401 — pas de token', async () => {
      const res = await request(app).post(`${BASE}/units`).send(validBody)

      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      unitService.addUnit.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .post(`${BASE}/units`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send(validBody)

      expect(res.status).toBe(500)
    })
  })

  // ── PUT /units/:id ─────────────────────────────────────────────────────────
  describe('PUT /units/:id', () => {
    it("200 — met à jour l'unité", async () => {
      unitService.updateUnit.mockResolvedValue({ ...mockUnit, name: 'Kilomètre' })

      const res = await request(app)
        .put(`${BASE}/units/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Kilomètre' })

      expect(res.status).toBe(200)
    })

    it('404 — unité introuvable', async () => {
      unitService.updateUnit.mockResolvedValue(null)

      const res = await request(app)
        .put(`${BASE}/units/99`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Kilomètre' })

      expect(res.status).toBe(404)
    })

    it('401 — pas de token', async () => {
      const res = await request(app).put(`${BASE}/units/1`).send({ name: 'Kilomètre' })

      expect(res.status).toBe(401)
    })
  })

  // ── DELETE /units/:id ──────────────────────────────────────────────────────
  describe('DELETE /units/:id', () => {
    it("200 — supprime l'unité", async () => {
      unitService.deleteUnit.mockResolvedValue(true)

      const res = await request(app)
        .delete(`${BASE}/units/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
    })

    it('404 — unité introuvable', async () => {
      unitService.deleteUnit.mockResolvedValue(null)

      const res = await request(app)
        .delete(`${BASE}/units/99`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(404)
    })

    it('401 — pas de token', async () => {
      const res = await request(app).delete(`${BASE}/units/1`)
      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      unitService.deleteUnit.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .delete(`${BASE}/units/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
    })
  })
})

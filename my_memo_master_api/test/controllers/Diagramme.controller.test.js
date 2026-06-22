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

jest.mock('../../services/Diagramme.service', () => ({
  findByUser: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  resolveSubject: jest.fn()
}))

process.env.AUTH_JWT_SECRET = 'test-secret'
process.env.VITE_FRONT_URL = 'http://localhost:5173'
process.env.NODE_ENV = 'test'

const request = require('supertest')
const jwt = require('jsonwebtoken')
const app = require('../../app')
const diagrammeService = require('../../services/Diagramme.service')

const BASE = '/api/v1'

const makeToken = (payload = { id: 1 }) => jwt.sign(payload, 'test-secret', { expiresIn: '1d' })

const mockDiagramme = { id: 1, mmName: 'Mind Map Maths', mindMapJson: '{}', userId: 1 }

describe('Diagramme Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    diagrammeService.resolveSubject.mockResolvedValue(1)
  })

  // ── GET /diagrammes ────────────────────────────────────────────────────────
  describe('GET /diagrammes', () => {
    it("200 — retourne les diagrammes de l'utilisateur", async () => {
      diagrammeService.findByUser.mockResolvedValue([mockDiagramme])

      const res = await request(app)
        .get(`${BASE}/diagrammes`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(1)
      expect(diagrammeService.findByUser).toHaveBeenCalledWith(1)
    })

    it('200 — liste vide', async () => {
      diagrammeService.findByUser.mockResolvedValue([])

      const res = await request(app)
        .get(`${BASE}/diagrammes`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })

    it('401 — pas de token', async () => {
      const res = await request(app).get(`${BASE}/diagrammes`)
      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      diagrammeService.findByUser.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .get(`${BASE}/diagrammes`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
    })
  })

  // ── GET /diagrammes/:id ────────────────────────────────────────────────────
  describe('GET /diagrammes/:id', () => {
    it('200 — retourne le diagramme', async () => {
      diagrammeService.findOne.mockResolvedValue(mockDiagramme)

      const res = await request(app)
        .get(`${BASE}/diagrammes/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body.mmName).toBe('Mind Map Maths')
    })

    it('404 — diagramme introuvable', async () => {
      diagrammeService.findOne.mockResolvedValue(null)

      const res = await request(app)
        .get(`${BASE}/diagrammes/99`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(404)
    })

    it('403 — non propriétaire', async () => {
      diagrammeService.findOne.mockResolvedValue({ ...mockDiagramme, userId: 2 })

      const res = await request(app)
        .get(`${BASE}/diagrammes/1`)
        .set('Authorization', `Bearer ${makeToken({ id: 1 })}`)

      expect(res.status).toBe(403)
    })

    it('401 — pas de token', async () => {
      const res = await request(app).get(`${BASE}/diagrammes/1`)
      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      diagrammeService.findOne.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .get(`${BASE}/diagrammes/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
    })
  })

  // ── POST /diagrammes ───────────────────────────────────────────────────────
  describe('POST /diagrammes', () => {
    const validBody = { mmName: 'Mind Map Maths', mindMapJson: '{}', subjectId: 1 }

    it('201 — crée un diagramme avec subjectId valide', async () => {
      diagrammeService.create.mockResolvedValue(mockDiagramme)

      const res = await request(app)
        .post(`${BASE}/diagrammes`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send(validBody)

      expect(res.status).toBe(201)
      expect(diagrammeService.create).toHaveBeenCalledTimes(1)
    })

    it('201 — crée un diagramme sans subjectId (utilise le sujet par défaut)', async () => {
      diagrammeService.create.mockResolvedValue(mockDiagramme)

      const res = await request(app)
        .post(`${BASE}/diagrammes`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ mmName: 'Mind Map Maths', mindMapJson: '{}' })

      expect(res.status).toBe(201)
      expect(diagrammeService.resolveSubject).toHaveBeenCalledWith(undefined)
    })

    it('400 — mmName manquant (validator)', async () => {
      const res = await request(app)
        .post(`${BASE}/diagrammes`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ mindMapJson: '{}' })

      expect(res.status).toBe(400)
      expect(res.body.errors).toBeDefined()
    })

    it('400 — mindMapJson manquant (validator)', async () => {
      const res = await request(app)
        .post(`${BASE}/diagrammes`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ mmName: 'Mind Map Maths' })

      expect(res.status).toBe(400)
    })

    it('401 — pas de token', async () => {
      const res = await request(app).post(`${BASE}/diagrammes`).send(validBody)

      expect(res.status).toBe(401)
    })
  })

  // ── PUT /diagrammes/:id ────────────────────────────────────────────────────
  describe('PUT /diagrammes/:id', () => {
    it('200 — met à jour le diagramme (propriétaire)', async () => {
      diagrammeService.findById.mockResolvedValue({ ...mockDiagramme, userId: 1 })
      diagrammeService.update.mockResolvedValue({ ...mockDiagramme, mmName: 'Mis à jour' })

      const res = await request(app)
        .put(`${BASE}/diagrammes/1`)
        .set('Authorization', `Bearer ${makeToken({ id: 1 })}`)
        .send({ mmName: 'Mis à jour', mindMapJson: '{"updated":true}' })

      expect(res.status).toBe(200)
    })

    it('403 — non propriétaire', async () => {
      diagrammeService.findById.mockResolvedValue({ ...mockDiagramme, userId: 2 })

      const res = await request(app)
        .put(`${BASE}/diagrammes/1`)
        .set('Authorization', `Bearer ${makeToken({ id: 1 })}`)
        .send({ mmName: 'Mis à jour', mindMapJson: '{}' })

      expect(res.status).toBe(403)
    })

    it('404 — diagramme introuvable', async () => {
      diagrammeService.findById.mockResolvedValue(null)

      const res = await request(app)
        .put(`${BASE}/diagrammes/99`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ mmName: 'Mis à jour', mindMapJson: '{}' })

      expect(res.status).toBe(404)
    })

    it('400 — mmName manquant (validator)', async () => {
      const res = await request(app)
        .put(`${BASE}/diagrammes/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ mindMapJson: '{}' })

      expect(res.status).toBe(400)
    })

    it('401 — pas de token', async () => {
      const res = await request(app)
        .put(`${BASE}/diagrammes/1`)
        .send({ mmName: 'Mis à jour', mindMapJson: '{}' })

      expect(res.status).toBe(401)
    })
  })

  // ── DELETE /diagrammes/:id ─────────────────────────────────────────────────
  describe('DELETE /diagrammes/:id', () => {
    it('204 — supprime le diagramme (propriétaire)', async () => {
      diagrammeService.findById.mockResolvedValue({ ...mockDiagramme, userId: 1 })
      diagrammeService.delete.mockResolvedValue(true)

      const res = await request(app)
        .delete(`${BASE}/diagrammes/1`)
        .set('Authorization', `Bearer ${makeToken({ id: 1 })}`)

      expect(res.status).toBe(204)
    })

    it('403 — non propriétaire', async () => {
      diagrammeService.findById.mockResolvedValue({ ...mockDiagramme, userId: 2 })

      const res = await request(app)
        .delete(`${BASE}/diagrammes/1`)
        .set('Authorization', `Bearer ${makeToken({ id: 1 })}`)

      expect(res.status).toBe(403)
    })

    it('404 — diagramme introuvable', async () => {
      diagrammeService.findById.mockResolvedValue(null)

      const res = await request(app)
        .delete(`${BASE}/diagrammes/99`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(404)
    })

    it('401 — pas de token', async () => {
      const res = await request(app).delete(`${BASE}/diagrammes/1`)
      expect(res.status).toBe(401)
    })
  })
})

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

jest.mock('../../services/Role.service', () => ({
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
const jwt = require('jsonwebtoken')
const app = require('../../app')
const roleService = require('../../services/Role.service')

const makeToken = (payload = { id: 1 }) => jwt.sign(payload, 'test-secret', { expiresIn: '1d' })

const BASE = '/api/v1'

describe('Role Controller', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── GET /roles ─────────────────────────────────────────────────────────────
  describe('GET /roles', () => {
    it('200 — retourne tous les rôles', async () => {
      roleService.findAll.mockResolvedValue([
        { roleId: 1, name: 'Admin' },
        { roleId: 2, name: 'Étudiant' }
      ])

      const res = await request(app)
        .get(`${BASE}/roles`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(2)
      expect(roleService.findAll).toHaveBeenCalledTimes(1)
    })

    it('200 — retourne une liste vide', async () => {
      roleService.findAll.mockResolvedValue([])

      const res = await request(app)
        .get(`${BASE}/roles`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })

    it('401 — pas de token', async () => {
      const res = await request(app).get(`${BASE}/roles`)
      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      roleService.findAll.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .get(`${BASE}/roles`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
    })
  })

  // ── GET /roles/:id ─────────────────────────────────────────────────────────
  describe('GET /roles/:id', () => {
    it('200 — retourne le rôle', async () => {
      roleService.findOne.mockResolvedValue({ roleId: 1, name: 'Admin' })

      const res = await request(app)
        .get(`${BASE}/roles/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body.name).toBe('Admin')
    })

    it('404 — rôle introuvable', async () => {
      roleService.findOne.mockResolvedValue(null)

      const res = await request(app)
        .get(`${BASE}/roles/99`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(404)
    })

    it('401 — pas de token', async () => {
      const res = await request(app).get(`${BASE}/roles/1`)
      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      roleService.findOne.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .get(`${BASE}/roles/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
    })
  })

  // ── POST /roles ────────────────────────────────────────────────────────────
  describe('POST /roles', () => {
    it('201 — crée un rôle', async () => {
      roleService.create.mockResolvedValue({ roleId: 3, name: 'Professeur' })

      const res = await request(app)
        .post(`${BASE}/roles`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Professeur' })

      expect(res.status).toBe(201)
      expect(roleService.create).toHaveBeenCalledTimes(1)
    })

    it('400 — name manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/roles`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({})

      expect(res.status).toBe(400)
      expect(res.body.errors).toBeDefined()
    })

    it('400 — name trop court (< 2 chars)', async () => {
      const res = await request(app)
        .post(`${BASE}/roles`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'A' })

      expect(res.status).toBe(400)
    })

    it('401 — pas de token', async () => {
      const res = await request(app).post(`${BASE}/roles`).send({ name: 'Professeur' })

      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      roleService.create.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .post(`${BASE}/roles`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Professeur' })

      expect(res.status).toBe(500)
    })
  })

  // ── PUT /roles/:id ─────────────────────────────────────────────────────────
  describe('PUT /roles/:id', () => {
    it('200 — met à jour le rôle', async () => {
      roleService.update.mockResolvedValue({ roleId: 1, name: 'Super Admin' })

      const res = await request(app)
        .put(`${BASE}/roles/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Super Admin' })

      expect(res.status).toBe(200)
    })

    it('404 — rôle introuvable', async () => {
      roleService.update.mockResolvedValue(null)

      const res = await request(app)
        .put(`${BASE}/roles/99`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Super Admin' })

      expect(res.status).toBe(404)
    })

    it('400 — name trop court', async () => {
      const res = await request(app)
        .put(`${BASE}/roles/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'X' })

      expect(res.status).toBe(400)
    })

    it('401 — pas de token', async () => {
      const res = await request(app).put(`${BASE}/roles/1`).send({ name: 'Super Admin' })

      expect(res.status).toBe(401)
    })
  })

  // ── DELETE /roles/:id ──────────────────────────────────────────────────────
  describe('DELETE /roles/:id', () => {
    it('204 — supprime le rôle', async () => {
      roleService.delete.mockResolvedValue(true)

      const res = await request(app)
        .delete(`${BASE}/roles/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(204)
    })

    it('404 — rôle introuvable', async () => {
      roleService.delete.mockResolvedValue(null)

      const res = await request(app)
        .delete(`${BASE}/roles/99`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(404)
    })

    it('401 — pas de token', async () => {
      const res = await request(app).delete(`${BASE}/roles/1`)
      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      roleService.delete.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .delete(`${BASE}/roles/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
    })
  })
})

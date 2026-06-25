jest.mock('../../models/index', () => ({
  instance: { sync: jest.fn() },
  sequelize: { transaction: jest.fn() },
  User: { findByPk: jest.fn() },
  Role: {},
  Subject: {},
  LeitnerSystem: {},
  LeitnerSystemsUsers: {},
  LeitnerCard: {},
  LeitnerBox: {},
  Unit: {},
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
  TestResult: {},
  Invitation: {},
  UserKpiAlertSettings: {},
  Tag: {}
}))

jest.mock('../../services/Tag.service', () => ({
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  setTagsForMindMap: jest.fn(),
  setTagsForLeitnerSystem: jest.fn(),
  setTagsForTest: jest.fn()
}))

jest.mock('../../helpers/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }))
jest.mock('../../jobs/fifo.cron', () => ({ startFifoCron: jest.fn() }))
jest.mock('../../jobs/reminder.worker', () => ({ startReminderWorker: jest.fn() }))
jest.mock('../../jobs/kpiAlert.cron', () => ({ startKpiAlertCron: jest.fn() }))

process.env.AUTH_JWT_SECRET = 'test-secret'
process.env.NODE_ENV = 'test'

const request = require('supertest')
const jwt = require('jsonwebtoken')
const app = require('../../app')
const tagService = require('../../services/Tag.service')

const BASE = '/api/v1'
const makeToken = (payload = { id: 1 }) => jwt.sign(payload, 'test-secret')

const TAG_FIXTURE = { tagId: 1, name: 'révision', color: '#6366F1' }
const TAGS_FIXTURE = [TAG_FIXTURE, { tagId: 2, name: 'maths', color: '#EF4444' }]

describe('Tag Controller', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── GET /tags ──────────────────────────────────────────────────────────────
  describe('GET /tags', () => {
    it('200 — retourne tous les tags', async () => {
      tagService.findAll.mockResolvedValue(TAGS_FIXTURE)

      const res = await request(app)
        .get(`${BASE}/tags`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(2)
      expect(tagService.findAll).toHaveBeenCalledTimes(1)
    })

    it('200 — retourne une liste vide', async () => {
      tagService.findAll.mockResolvedValue([])

      const res = await request(app)
        .get(`${BASE}/tags`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })

    it('401 — pas de token', async () => {
      const res = await request(app).get(`${BASE}/tags`)
      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      tagService.findAll.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .get(`${BASE}/tags`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
    })
  })

  // ── GET /tags/:id ──────────────────────────────────────────────────────────
  describe('GET /tags/:id', () => {
    it('200 — retourne le tag', async () => {
      tagService.findOne.mockResolvedValue(TAG_FIXTURE)

      const res = await request(app)
        .get(`${BASE}/tags/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body.name).toBe('révision')
    })

    it('404 — tag introuvable', async () => {
      tagService.findOne.mockResolvedValue(null)

      const res = await request(app)
        .get(`${BASE}/tags/99`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(404)
    })

    it('401 — pas de token', async () => {
      const res = await request(app).get(`${BASE}/tags/1`)
      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      tagService.findOne.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .get(`${BASE}/tags/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
    })
  })

  // ── POST /tags ─────────────────────────────────────────────────────────────
  describe('POST /tags', () => {
    it('201 — crée un tag', async () => {
      tagService.create.mockResolvedValue(TAG_FIXTURE)

      const res = await request(app)
        .post(`${BASE}/tags`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'révision', color: '#6366F1' })

      expect(res.status).toBe(201)
      expect(res.body.data.name).toBe('révision')
      expect(tagService.create).toHaveBeenCalledTimes(1)
    })

    it('201 — crée un tag sans couleur (utilise la couleur par défaut)', async () => {
      tagService.create.mockResolvedValue(TAG_FIXTURE)

      const res = await request(app)
        .post(`${BASE}/tags`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'révision' })

      expect(res.status).toBe(201)
    })

    it('400 — couleur invalide', async () => {
      const res = await request(app)
        .post(`${BASE}/tags`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'révision', color: 'rouge' })

      expect(res.status).toBe(400)
      expect(tagService.create).not.toHaveBeenCalled()
    })

    it('400 — name manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/tags`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({})

      expect(res.status).toBe(400)
      expect(res.body.errors).toBeDefined()
      expect(tagService.create).not.toHaveBeenCalled()
    })

    it('400 — name trop long (> 50 chars)', async () => {
      const res = await request(app)
        .post(`${BASE}/tags`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'a'.repeat(51) })

      expect(res.status).toBe(400)
      expect(tagService.create).not.toHaveBeenCalled()
    })

    it('401 — pas de token', async () => {
      const res = await request(app)
        .post(`${BASE}/tags`)
        .send({ name: 'révision' })

      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      tagService.create.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .post(`${BASE}/tags`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'révision' })

      expect(res.status).toBe(500)
    })
  })

  // ── PUT /tags/:id ──────────────────────────────────────────────────────────
  describe('PUT /tags/:id', () => {
    it('200 — met à jour le tag', async () => {
      tagService.update.mockResolvedValue({ tagId: 1, name: 'physique' })

      const res = await request(app)
        .put(`${BASE}/tags/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'physique' })

      expect(res.status).toBe(200)
      expect(res.body.data.name).toBe('physique')
    })

    it('404 — tag introuvable', async () => {
      tagService.update.mockResolvedValue(null)

      const res = await request(app)
        .put(`${BASE}/tags/99`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'physique' })

      expect(res.status).toBe(404)
    })

    it('400 — aucun champ fourni', async () => {
      const res = await request(app)
        .put(`${BASE}/tags/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({})

      expect(res.status).toBe(400)
      expect(tagService.update).not.toHaveBeenCalled()
    })

    it('200 — met à jour uniquement la couleur', async () => {
      tagService.update.mockResolvedValue({ tagId: 1, name: 'révision', color: '#EF4444' })

      const res = await request(app)
        .put(`${BASE}/tags/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ color: '#EF4444' })

      expect(res.status).toBe(200)
      expect(res.body.data.color).toBe('#EF4444')
    })

    it('400 — couleur invalide', async () => {
      const res = await request(app)
        .put(`${BASE}/tags/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ color: 'rouge' })

      expect(res.status).toBe(400)
      expect(tagService.update).not.toHaveBeenCalled()
    })

    it('401 — pas de token', async () => {
      const res = await request(app)
        .put(`${BASE}/tags/1`)
        .send({ name: 'physique' })

      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      tagService.update.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .put(`${BASE}/tags/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'physique' })

      expect(res.status).toBe(500)
    })
  })

  // ── DELETE /tags/:id ───────────────────────────────────────────────────────
  describe('DELETE /tags/:id', () => {
    it('200 — supprime le tag', async () => {
      tagService.delete.mockResolvedValue(true)

      const res = await request(app)
        .delete(`${BASE}/tags/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body.message).toMatch(/supprim/i)
    })

    it('404 — tag introuvable', async () => {
      tagService.delete.mockResolvedValue(false)

      const res = await request(app)
        .delete(`${BASE}/tags/99`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(404)
    })

    it('401 — pas de token', async () => {
      const res = await request(app).delete(`${BASE}/tags/1`)
      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      tagService.delete.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .delete(`${BASE}/tags/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
    })
  })

  // ── PUT /tags/diagrammes/:id ───────────────────────────────────────────────
  describe('PUT /tags/diagrammes/:id', () => {
    it('200 — met à jour les tags de la carte mentale', async () => {
      tagService.setTagsForMindMap.mockResolvedValue(TAGS_FIXTURE)

      const res = await request(app)
        .put(`${BASE}/tags/diagrammes/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ tagIds: [1, 2] })

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(2)
      expect(tagService.setTagsForMindMap).toHaveBeenCalledWith('1', [1, 2])
    })

    it('200 — accepte un tableau vide (suppression de tous les tags)', async () => {
      tagService.setTagsForMindMap.mockResolvedValue([])

      const res = await request(app)
        .put(`${BASE}/tags/diagrammes/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ tagIds: [] })

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
    })

    it('404 — carte mentale introuvable', async () => {
      tagService.setTagsForMindMap.mockResolvedValue(null)

      const res = await request(app)
        .put(`${BASE}/tags/diagrammes/99`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ tagIds: [1] })

      expect(res.status).toBe(404)
    })

    it('400 — tagIds manquant', async () => {
      const res = await request(app)
        .put(`${BASE}/tags/diagrammes/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({})

      expect(res.status).toBe(400)
      expect(tagService.setTagsForMindMap).not.toHaveBeenCalled()
    })

    it('400 — tagIds contient des non-entiers', async () => {
      const res = await request(app)
        .put(`${BASE}/tags/diagrammes/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ tagIds: ['abc', 1] })

      expect(res.status).toBe(400)
    })

    it('401 — pas de token', async () => {
      const res = await request(app)
        .put(`${BASE}/tags/diagrammes/1`)
        .send({ tagIds: [1] })

      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      tagService.setTagsForMindMap.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .put(`${BASE}/tags/diagrammes/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ tagIds: [1] })

      expect(res.status).toBe(500)
    })
  })

  // ── PUT /tags/leitnersystems/:id ───────────────────────────────────────────
  describe('PUT /tags/leitnersystems/:id', () => {
    it('200 — met à jour les tags du système Leitner', async () => {
      tagService.setTagsForLeitnerSystem.mockResolvedValue(TAGS_FIXTURE)

      const res = await request(app)
        .put(`${BASE}/tags/leitnersystems/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ tagIds: [1, 2] })

      expect(res.status).toBe(200)
      expect(tagService.setTagsForLeitnerSystem).toHaveBeenCalledWith('1', [1, 2])
    })

    it('404 — système Leitner introuvable', async () => {
      tagService.setTagsForLeitnerSystem.mockResolvedValue(null)

      const res = await request(app)
        .put(`${BASE}/tags/leitnersystems/99`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ tagIds: [1] })

      expect(res.status).toBe(404)
    })

    it('400 — tagIds manquant', async () => {
      const res = await request(app)
        .put(`${BASE}/tags/leitnersystems/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({})

      expect(res.status).toBe(400)
      expect(tagService.setTagsForLeitnerSystem).not.toHaveBeenCalled()
    })

    it('401 — pas de token', async () => {
      const res = await request(app)
        .put(`${BASE}/tags/leitnersystems/1`)
        .send({ tagIds: [1] })

      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      tagService.setTagsForLeitnerSystem.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .put(`${BASE}/tags/leitnersystems/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ tagIds: [1] })

      expect(res.status).toBe(500)
    })
  })

  // ── PUT /tags/tests/:id ────────────────────────────────────────────────────
  describe('PUT /tags/tests/:id', () => {
    it('200 — met à jour les tags de l\'exercice', async () => {
      tagService.setTagsForTest.mockResolvedValue(TAGS_FIXTURE)

      const res = await request(app)
        .put(`${BASE}/tags/tests/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ tagIds: [1, 2] })

      expect(res.status).toBe(200)
      expect(tagService.setTagsForTest).toHaveBeenCalledWith('1', [1, 2])
    })

    it('404 — exercice introuvable', async () => {
      tagService.setTagsForTest.mockResolvedValue(null)

      const res = await request(app)
        .put(`${BASE}/tags/tests/99`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ tagIds: [1] })

      expect(res.status).toBe(404)
    })

    it('400 — tagIds manquant', async () => {
      const res = await request(app)
        .put(`${BASE}/tags/tests/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({})

      expect(res.status).toBe(400)
      expect(tagService.setTagsForTest).not.toHaveBeenCalled()
    })

    it('401 — pas de token', async () => {
      const res = await request(app)
        .put(`${BASE}/tags/tests/1`)
        .send({ tagIds: [1] })

      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      tagService.setTagsForTest.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .put(`${BASE}/tags/tests/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ tagIds: [1] })

      expect(res.status).toBe(500)
    })
  })
})

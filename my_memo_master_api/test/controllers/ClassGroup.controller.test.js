jest.mock('../../models/index', () => ({
  instance: { sync: jest.fn() },
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
  Tutorials: {},
  UserOnboardingState: {},
  ClassGroup: {},
  ClassGroupUsers: {},
  CalendarEvent: {},
  EventOccurrence: {},
  Deadline: {},
  RevisionSession: {}
}))

jest.mock('../../jobs/fifo.cron', () => ({ startFifoCron: jest.fn() }))
jest.mock('../../helpers/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }))

jest.mock('../../services/ClassGroup.service', () => ({
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  addMember: jest.fn(),
  removeMember: jest.fn(),
  getKpi: jest.fn(),
  getStudentAnalytics: jest.fn()
}))

process.env.AUTH_JWT_SECRET = 'test-secret'
process.env.VITE_FRONT_URL = 'http://localhost:5173'
process.env.NODE_ENV = 'test'

const request = require('supertest')
const jwt = require('jsonwebtoken')
const app = require('../../app')
const classGroupService = require('../../services/ClassGroup.service')

const BASE = '/api/v1'
const makeToken = (payload = { id: 1 }) => jwt.sign(payload, 'test-secret', { expiresIn: '1d' })

const mockGroup = {
  id: 1,
  name: 'Terminale S1',
  description: 'Classe de terminale',
  createdBy: 1,
  members: []
}

describe('ClassGroup Controller', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── GET /class-groups ──────────────────────────────────────────────────────
  describe('GET /class-groups', () => {
    it('200 — retourne la liste des groupes', async () => {
      classGroupService.findAll.mockResolvedValue([mockGroup])

      const res = await request(app)
        .get(`${BASE}/class-groups`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
    })

    it('200 — liste vide', async () => {
      classGroupService.findAll.mockResolvedValue([])

      const res = await request(app)
        .get(`${BASE}/class-groups`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
    })

    it('401 — pas de token', async () => {
      const res = await request(app).get(`${BASE}/class-groups`)
      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      classGroupService.findAll.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .get(`${BASE}/class-groups`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
    })
  })

  // ── GET /class-groups/:id ──────────────────────────────────────────────────
  describe('GET /class-groups/:id', () => {
    it('200 — retourne le groupe', async () => {
      classGroupService.findOne.mockResolvedValue(mockGroup)

      const res = await request(app)
        .get(`${BASE}/class-groups/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body.data.name).toBe('Terminale S1')
    })

    it('404 — groupe introuvable', async () => {
      classGroupService.findOne.mockResolvedValue(null)

      const res = await request(app)
        .get(`${BASE}/class-groups/99`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(404)
    })

    it('500 — le service échoue', async () => {
      classGroupService.findOne.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .get(`${BASE}/class-groups/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
    })
  })

  // ── POST /class-groups ─────────────────────────────────────────────────────
  describe('POST /class-groups', () => {
    const validBody = { name: 'Terminale S1', description: 'Classe de terminale' }

    it('201 — crée le groupe', async () => {
      classGroupService.create.mockResolvedValue(mockGroup)

      const res = await request(app)
        .post(`${BASE}/class-groups`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send(validBody)

      expect(res.status).toBe(201)
      expect(classGroupService.create).toHaveBeenCalledTimes(1)
    })

    it('403 — droits insuffisants', async () => {
      classGroupService.create.mockResolvedValue(false)

      const res = await request(app)
        .post(`${BASE}/class-groups`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send(validBody)

      expect(res.status).toBe(403)
    })

    it('400 — name manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/class-groups`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ description: 'test' })

      expect(res.status).toBe(400)
    })

    it('400 — name trop court', async () => {
      const res = await request(app)
        .post(`${BASE}/class-groups`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'A' })

      expect(res.status).toBe(400)
    })

    it('401 — pas de token', async () => {
      const res = await request(app).post(`${BASE}/class-groups`).send(validBody)
      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      classGroupService.create.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .post(`${BASE}/class-groups`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send(validBody)

      expect(res.status).toBe(500)
    })
  })

  // ── PUT /class-groups/:id ──────────────────────────────────────────────────
  describe('PUT /class-groups/:id', () => {
    it('200 — met à jour le groupe', async () => {
      classGroupService.update.mockResolvedValue({ ...mockGroup, name: 'Terminale S2' })

      const res = await request(app)
        .put(`${BASE}/class-groups/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Terminale S2' })

      expect(res.status).toBe(200)
    })

    it('403 — droits insuffisants', async () => {
      classGroupService.update.mockResolvedValue(false)

      const res = await request(app)
        .put(`${BASE}/class-groups/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Terminale S2' })

      expect(res.status).toBe(403)
    })

    it('404 — groupe introuvable', async () => {
      classGroupService.update.mockResolvedValue(null)

      const res = await request(app)
        .put(`${BASE}/class-groups/99`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Terminale S2' })

      expect(res.status).toBe(404)
    })

    it('400 — name trop court', async () => {
      const res = await request(app)
        .put(`${BASE}/class-groups/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'X' })

      expect(res.status).toBe(400)
    })

    it('500 — le service échoue', async () => {
      classGroupService.update.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .put(`${BASE}/class-groups/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ name: 'Terminale S2' })

      expect(res.status).toBe(500)
    })
  })

  // ── DELETE /class-groups/:id ───────────────────────────────────────────────
  describe('DELETE /class-groups/:id', () => {
    it('200 — supprime le groupe', async () => {
      classGroupService.delete.mockResolvedValue(true)

      const res = await request(app)
        .delete(`${BASE}/class-groups/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
    })

    it('403 — droits insuffisants', async () => {
      classGroupService.delete.mockResolvedValue(false)

      const res = await request(app)
        .delete(`${BASE}/class-groups/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(403)
    })

    it('404 — groupe introuvable', async () => {
      classGroupService.delete.mockResolvedValue(null)

      const res = await request(app)
        .delete(`${BASE}/class-groups/99`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(404)
    })

    it('401 — pas de token', async () => {
      const res = await request(app).delete(`${BASE}/class-groups/1`)
      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      classGroupService.delete.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .delete(`${BASE}/class-groups/1`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
    })
  })

  // ── POST /class-groups/:id/members ─────────────────────────────────────────
  describe('POST /class-groups/:id/members', () => {
    const validBody = { userId: 2, role: 'student' }

    it('201 — ajoute un membre', async () => {
      classGroupService.addMember.mockResolvedValue({ classGroupId: 1, userId: 2, role: 'student' })

      const res = await request(app)
        .post(`${BASE}/class-groups/1/members`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send(validBody)

      expect(res.status).toBe(201)
    })

    it('403 — droits insuffisants', async () => {
      classGroupService.addMember.mockResolvedValue(false)

      const res = await request(app)
        .post(`${BASE}/class-groups/1/members`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send(validBody)

      expect(res.status).toBe(403)
    })

    it('404 — groupe introuvable', async () => {
      classGroupService.addMember.mockResolvedValue(null)

      const res = await request(app)
        .post(`${BASE}/class-groups/1/members`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send(validBody)

      expect(res.status).toBe(404)
    })

    it('400 — role invalide', async () => {
      const res = await request(app)
        .post(`${BASE}/class-groups/1/members`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ userId: 2, role: 'admin' })

      expect(res.status).toBe(400)
    })

    it('400 — userId manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/class-groups/1/members`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ role: 'student' })

      expect(res.status).toBe(400)
    })

    it('500 — le service échoue', async () => {
      classGroupService.addMember.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .post(`${BASE}/class-groups/1/members`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send(validBody)

      expect(res.status).toBe(500)
    })
  })

  // ── DELETE /class-groups/:id/members/:userId ───────────────────────────────
  describe('DELETE /class-groups/:id/members/:userId', () => {
    it('200 — retire le membre', async () => {
      classGroupService.removeMember.mockResolvedValue(true)

      const res = await request(app)
        .delete(`${BASE}/class-groups/1/members/2`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
    })

    it('403 — droits insuffisants', async () => {
      classGroupService.removeMember.mockResolvedValue(false)

      const res = await request(app)
        .delete(`${BASE}/class-groups/1/members/2`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(403)
    })

    it('404 — membre introuvable', async () => {
      classGroupService.removeMember.mockResolvedValue(null)

      const res = await request(app)
        .delete(`${BASE}/class-groups/1/members/99`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(404)
    })

    it('500 — le service échoue', async () => {
      classGroupService.removeMember.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .delete(`${BASE}/class-groups/1/members/2`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
    })
  })

  // ── GET /class-groups/:id/kpi ──────────────────────────────────────────────
  describe('GET /class-groups/:id/kpi', () => {
    const mockKpi = { memberCount: 10, studentCount: 8, teacherCount: 2, pendingInvitations: 1, avgScore: 74.5 }

    it('200 — retourne les KPI du groupe', async () => {
      classGroupService.getKpi.mockResolvedValue(mockKpi)

      const res = await request(app)
        .get(`${BASE}/class-groups/1/kpi`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual(mockKpi)
    })

    it('403 — accès refusé (non enseignant du groupe)', async () => {
      classGroupService.getKpi.mockResolvedValue(false)

      const res = await request(app)
        .get(`${BASE}/class-groups/1/kpi`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(403)
    })

    it('404 — groupe introuvable', async () => {
      classGroupService.getKpi.mockResolvedValue(null)

      const res = await request(app)
        .get(`${BASE}/class-groups/99/kpi`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(404)
    })

    it('401 — pas de token', async () => {
      const res = await request(app).get(`${BASE}/class-groups/1/kpi`)
      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      classGroupService.getKpi.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .get(`${BASE}/class-groups/1/kpi`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
    })
  })

  // ── GET /class-groups/:id/kpi/students ─────────────────────────────────────
  describe('GET /class-groups/:id/kpi/students', () => {
    const mockAnalytics = {
      activeStudentsCount: 5,
      atRiskCount: 1,
      scoreWeeklyTrend: [],
      students: []
    }

    it('200 — retourne l\'analyse pédagogique', async () => {
      classGroupService.getStudentAnalytics.mockResolvedValue(mockAnalytics)

      const res = await request(app)
        .get(`${BASE}/class-groups/1/kpi/students`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body.data.activeStudentsCount).toBe(5)
      expect(res.body.data.atRiskCount).toBe(1)
    })

    it('403 — accès refusé (non enseignant du groupe)', async () => {
      classGroupService.getStudentAnalytics.mockResolvedValue(false)

      const res = await request(app)
        .get(`${BASE}/class-groups/1/kpi/students`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(403)
    })

    it('404 — groupe introuvable', async () => {
      classGroupService.getStudentAnalytics.mockResolvedValue(null)

      const res = await request(app)
        .get(`${BASE}/class-groups/99/kpi/students`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(404)
    })

    it('401 — pas de token', async () => {
      const res = await request(app).get(`${BASE}/class-groups/1/kpi/students`)
      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      classGroupService.getStudentAnalytics.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .get(`${BASE}/class-groups/1/kpi/students`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
    })
  })
})

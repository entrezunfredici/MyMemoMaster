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
  RevisionSession: {},
  Invitation: {},
  TestResult: {}
}))

jest.mock('../../jobs/fifo.cron', () => ({ startFifoCron: jest.fn() }))
jest.mock('../../jobs/reminder.worker', () => ({ startReminderWorker: jest.fn() }))
jest.mock('../../helpers/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }))

jest.mock('../../services/Invitation.service', () => ({
  invite: jest.fn(),
  findByGroup: jest.fn(),
  findMine: jest.fn(),
  respond: jest.fn()
}))

process.env.AUTH_JWT_SECRET = 'test-secret'
process.env.VITE_FRONT_URL = 'http://localhost:5173'
process.env.NODE_ENV = 'test'

const request = require('supertest')
const jwt = require('jsonwebtoken')
const app = require('../../app')
const invitationService = require('../../services/Invitation.service')

const BASE = '/api/v1'
const makeToken = (payload = { id: 1 }) => jwt.sign(payload, 'test-secret', { expiresIn: '1d' })

const mockInvitation = {
  id: 1,
  classGroupId: 1,
  targetUserId: 2,
  invitedByUserId: 1,
  role: 'student',
  status: 'pending'
}

describe('Invitation Controller', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── POST /class-groups/:id/invitations ────────────────────────────────────────

  describe('POST /class-groups/:id/invitations', () => {
    const validBody = { targetUserId: 2, role: 'student' }

    it('201 — envoie une invitation', async () => {
      invitationService.invite.mockResolvedValue(mockInvitation)

      const res = await request(app)
        .post(`${BASE}/class-groups/1/invitations`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send(validBody)

      expect(res.status).toBe(201)
      expect(res.body.data.id).toBe(1)
      expect(invitationService.invite).toHaveBeenCalledWith('1', 1, validBody)
    })

    it('403 — droits insuffisants', async () => {
      invitationService.invite.mockResolvedValue(false)

      const res = await request(app)
        .post(`${BASE}/class-groups/1/invitations`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send(validBody)

      expect(res.status).toBe(403)
    })

    it('404 — groupe introuvable', async () => {
      invitationService.invite.mockResolvedValue(null)

      const res = await request(app)
        .post(`${BASE}/class-groups/99/invitations`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send(validBody)

      expect(res.status).toBe(404)
    })

    it('400 — targetUserId manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/class-groups/1/invitations`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ role: 'student' })

      expect(res.status).toBe(400)
      expect(invitationService.invite).not.toHaveBeenCalled()
    })

    it('400 — rôle invalide', async () => {
      const res = await request(app)
        .post(`${BASE}/class-groups/1/invitations`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ targetUserId: 2, role: 'admin' })

      expect(res.status).toBe(400)
    })

    it('401 — sans token', async () => {
      const res = await request(app)
        .post(`${BASE}/class-groups/1/invitations`)
        .send(validBody)

      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      invitationService.invite.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .post(`${BASE}/class-groups/1/invitations`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send(validBody)

      expect(res.status).toBe(500)
    })
  })

  // ── GET /class-groups/:id/invitations ─────────────────────────────────────────

  describe('GET /class-groups/:id/invitations', () => {
    it('200 — liste les invitations du groupe', async () => {
      invitationService.findByGroup.mockResolvedValue([mockInvitation])

      const res = await request(app)
        .get(`${BASE}/class-groups/1/invitations`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
    })

    it('200 — liste vide', async () => {
      invitationService.findByGroup.mockResolvedValue([])

      const res = await request(app)
        .get(`${BASE}/class-groups/1/invitations`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
    })

    it('403 — droits insuffisants', async () => {
      invitationService.findByGroup.mockResolvedValue(false)

      const res = await request(app)
        .get(`${BASE}/class-groups/1/invitations`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(403)
    })

    it('401 — sans token', async () => {
      const res = await request(app).get(`${BASE}/class-groups/1/invitations`)
      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      invitationService.findByGroup.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .get(`${BASE}/class-groups/1/invitations`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
    })
  })

  // ── GET /invitations/mine ─────────────────────────────────────────────────────

  describe('GET /invitations/mine', () => {
    it('200 — liste mes invitations pending', async () => {
      invitationService.findMine.mockResolvedValue([mockInvitation])

      const res = await request(app)
        .get(`${BASE}/invitations/mine`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
      expect(invitationService.findMine).toHaveBeenCalledWith(1)
    })

    it('200 — liste vide', async () => {
      invitationService.findMine.mockResolvedValue([])

      const res = await request(app)
        .get(`${BASE}/invitations/mine`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
    })

    it('401 — sans token', async () => {
      const res = await request(app).get(`${BASE}/invitations/mine`)
      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      invitationService.findMine.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .get(`${BASE}/invitations/mine`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
    })
  })

  // ── PUT /invitations/:id ──────────────────────────────────────────────────────

  describe('PUT /invitations/:id', () => {
    it('200 — accepte une invitation', async () => {
      invitationService.respond.mockResolvedValue({ ...mockInvitation, status: 'accepted' })

      const res = await request(app)
        .put(`${BASE}/invitations/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ status: 'accepted' })

      expect(res.status).toBe(200)
      expect(res.body.data.status).toBe('accepted')
      expect(invitationService.respond).toHaveBeenCalledWith('1', 1, 'accepted')
    })

    it('200 — décline une invitation', async () => {
      invitationService.respond.mockResolvedValue({ ...mockInvitation, status: 'declined' })

      const res = await request(app)
        .put(`${BASE}/invitations/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ status: 'declined' })

      expect(res.status).toBe(200)
    })

    it('404 — invitation introuvable ou déjà traitée', async () => {
      invitationService.respond.mockResolvedValue(null)

      const res = await request(app)
        .put(`${BASE}/invitations/99`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ status: 'accepted' })

      expect(res.status).toBe(404)
    })

    it('403 — pas la bonne cible', async () => {
      invitationService.respond.mockResolvedValue(false)

      const res = await request(app)
        .put(`${BASE}/invitations/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ status: 'accepted' })

      expect(res.status).toBe(403)
    })

    it('400 — status invalide', async () => {
      const res = await request(app)
        .put(`${BASE}/invitations/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ status: 'pending' })

      expect(res.status).toBe(400)
      expect(invitationService.respond).not.toHaveBeenCalled()
    })

    it('400 — status manquant', async () => {
      const res = await request(app)
        .put(`${BASE}/invitations/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({})

      expect(res.status).toBe(400)
    })

    it('401 — sans token', async () => {
      const res = await request(app)
        .put(`${BASE}/invitations/1`)
        .send({ status: 'accepted' })

      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      invitationService.respond.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .put(`${BASE}/invitations/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ status: 'accepted' })

      expect(res.status).toBe(500)
    })
  })
})

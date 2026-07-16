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

jest.mock('../../services/OnboardingState.service', () => ({
  getOnboardingByUserId: jest.fn(),
  updateOnboarding: jest.fn()
}))

process.env.AUTH_JWT_SECRET = 'test-secret'
process.env.VITE_FRONT_URL = 'http://localhost:5173'
process.env.NODE_ENV = 'test'

const request = require('supertest')
const jwt = require('jsonwebtoken')
const app = require('../../app')
const onboardingStateService = require('../../services/OnboardingState.service')

const BASE = '/api/v1'

const makeToken = (payload = { id: 1 }) => jwt.sign(payload, 'test-secret', { expiresIn: '1d' })

describe('OnboardingState Controller — validation', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── GET /onboardingState/byUserId ─────────────────────────────────────────
  describe('GET /onboardingState/byUserId', () => {
    it("200 — retourne l'état d'onboarding de l'utilisateur connecté", async () => {
      onboardingStateService.getOnboardingByUserId.mockResolvedValue({
        tour_seen: true,
        checklist: {}
      })

      const res = await request(app)
        .get(`${BASE}/onboardingState/byUserId`)
        .set('Authorization', `Bearer ${makeToken({ id: 1 })}`)

      expect(res.status).toBe(200)
      expect(onboardingStateService.getOnboardingByUserId).toHaveBeenCalledWith(1)
    })

    it('404 — onboarding introuvable (service retourne null)', async () => {
      onboardingStateService.getOnboardingByUserId.mockResolvedValue(null)

      const res = await request(app)
        .get(`${BASE}/onboardingState/byUserId`)
        .set('Authorization', `Bearer ${makeToken({ id: 99 })}`)

      expect(res.status).toBe(404)
    })

    it('500 — le service lève une erreur', async () => {
      onboardingStateService.getOnboardingByUserId.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .get(`${BASE}/onboardingState/byUserId`)
        .set('Authorization', `Bearer ${makeToken({ id: 1 })}`)

      expect(res.status).toBe(500)
    })

    it('401 — non authentifié', async () => {
      const res = await request(app).get(`${BASE}/onboardingState/byUserId`)
      expect(res.status).toBe(401)
    })
  })

  // ── PUT /onboardingState/:id ───────────────────────────────────────────────
  describe('PUT /onboardingState/:id', () => {
    it("200 — met à jour l'onboarding avec des données valides", async () => {
      onboardingStateService.updateOnboarding.mockResolvedValue({
        userId: 1,
        tourSeen: true,
        checklist: {}
      })

      const res = await request(app)
        .put(`${BASE}/onboardingState/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ tourSeen: true })

      expect(res.status).toBe(200)
    })

    it('200 — met à jour avec checklist objet valide', async () => {
      onboardingStateService.updateOnboarding.mockResolvedValue({
        userId: 1,
        tourSeen: false,
        checklist: { step1: true }
      })

      const res = await request(app)
        .put(`${BASE}/onboardingState/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ checklist: { step1: true } })

      expect(res.status).toBe(200)
    })

    it('200 — met à jour avec tour_seen (format lu par le service)', async () => {
      onboardingStateService.updateOnboarding.mockResolvedValue({
        tour_seen: true,
        checklist: {}
      })

      const res = await request(app)
        .put(`${BASE}/onboardingState/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ tour_seen: true })

      expect(res.status).toBe(200)
      expect(onboardingStateService.updateOnboarding).toHaveBeenCalledWith(1, { tour_seen: true })
    })

    it("400 — tour_seen n'est pas un booléen", async () => {
      const res = await request(app)
        .put(`${BASE}/onboardingState/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ tour_seen: 'oui' })

      expect(res.status).toBe(400)
      expect(res.body.errors).toBeDefined()
    })

    it("400 — tourSeen n'est pas un booléen", async () => {
      const res = await request(app)
        .put(`${BASE}/onboardingState/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ tourSeen: 'oui' })

      expect(res.status).toBe(400)
      expect(res.body.errors).toBeDefined()
    })

    it("400 — checklist n'est pas un objet", async () => {
      const res = await request(app)
        .put(`${BASE}/onboardingState/1`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ checklist: 'invalid' })

      expect(res.status).toBe(400)
    })

    it('401 — non authentifié', async () => {
      const res = await request(app).put(`${BASE}/onboardingState/1`).send({ tourSeen: true })

      expect(res.status).toBe(401)
    })
  })
})

const request = require('supertest')
const jwt = require('jsonwebtoken')

jest.mock('../../models/index', () => ({
  Role: {},
  Subject: {},
  LeitnerSystem: {},
  LeitnerSystemsUsers: {},
  LeitnerCard: {},
  LeitnerBox: {},
  Unit: {},
  User: {},
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
  LeitnerReviewSession: {}
}))

jest.mock('../../services/LeitnerReviewSession.service', () => ({
  create: jest.fn()
}))
jest.mock('../../helpers/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }))
jest.mock('../../jobs/fifo.cron', () => ({ startFifoCron: jest.fn() }))
jest.mock('../../jobs/reminder.worker', () => ({ startReminderWorker: jest.fn() }))

process.env.AUTH_JWT_SECRET = 'test-secret'
process.env.NODE_ENV = 'test'

const app = require('../../app')
const leitnerReviewSessionService = require('../../services/LeitnerReviewSession.service')

const BASE = '/api/v1'
const SECRET = 'test-secret'
const makeToken = (payload = { id: 1 }) => jwt.sign(payload, SECRET)

const SESSION_FIXTURE = { id: 1, userId: 1, idSystem: 2, cardsReviewed: 5, durationSeconds: 120 }

describe('LeitnerReviewSession Controller', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── POST /leitner-review-sessions ───────────────────────────────────────────
  describe('POST /leitner-review-sessions', () => {
    it('201 — journalise la session', async () => {
      leitnerReviewSessionService.create.mockResolvedValue(SESSION_FIXTURE)

      const res = await request(app)
        .post(`${BASE}/leitner-review-sessions`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ idSystem: 2, cardsReviewed: 5, durationSeconds: 120 })

      expect(res.status).toBe(201)
      expect(res.body.id).toBe(1)
      expect(leitnerReviewSessionService.create).toHaveBeenCalledWith({
        userId: 1,
        idSystem: 2,
        cardsReviewed: 5,
        durationSeconds: 120
      })
    })

    it('201 — durationSeconds = 0 accepté (session quasi instantanée)', async () => {
      leitnerReviewSessionService.create.mockResolvedValue({ ...SESSION_FIXTURE, durationSeconds: 0 })

      const res = await request(app)
        .post(`${BASE}/leitner-review-sessions`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ idSystem: 2, cardsReviewed: 1, durationSeconds: 0 })

      expect(res.status).toBe(201)
    })

    it('400 — idSystem manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/leitner-review-sessions`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ cardsReviewed: 5, durationSeconds: 120 })

      expect(res.status).toBe(400)
      expect(leitnerReviewSessionService.create).not.toHaveBeenCalled()
    })

    it('400 — cardsReviewed = 0 (non strictement positif)', async () => {
      const res = await request(app)
        .post(`${BASE}/leitner-review-sessions`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ idSystem: 2, cardsReviewed: 0, durationSeconds: 120 })

      expect(res.status).toBe(400)
    })

    it('400 — durationSeconds au-delà du plafond (4h)', async () => {
      const res = await request(app)
        .post(`${BASE}/leitner-review-sessions`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ idSystem: 2, cardsReviewed: 5, durationSeconds: 14401 })

      expect(res.status).toBe(400)
      expect(leitnerReviewSessionService.create).not.toHaveBeenCalled()
    })

    it('400 — durationSeconds négatif', async () => {
      const res = await request(app)
        .post(`${BASE}/leitner-review-sessions`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ idSystem: 2, cardsReviewed: 5, durationSeconds: -1 })

      expect(res.status).toBe(400)
    })

    it('401 — sans token', async () => {
      const res = await request(app)
        .post(`${BASE}/leitner-review-sessions`)
        .send({ idSystem: 2, cardsReviewed: 5, durationSeconds: 120 })

      expect(res.status).toBe(401)
      expect(leitnerReviewSessionService.create).not.toHaveBeenCalled()
    })

    it('500 — le service échoue', async () => {
      leitnerReviewSessionService.create.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .post(`${BASE}/leitner-review-sessions`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ idSystem: 2, cardsReviewed: 5, durationSeconds: 120 })

      expect(res.status).toBe(500)
      expect(res.body.message).toBeDefined()
    })
  })
})

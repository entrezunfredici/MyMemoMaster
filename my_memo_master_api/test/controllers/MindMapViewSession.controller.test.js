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
  LeitnerReviewSession: {},
  MindMapViewSession: {}
}))

jest.mock('../../services/MindMapViewSession.service', () => ({
  create: jest.fn()
}))
jest.mock('../../helpers/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }))
jest.mock('../../jobs/fifo.cron', () => ({ startFifoCron: jest.fn() }))
jest.mock('../../jobs/reminder.worker', () => ({ startReminderWorker: jest.fn() }))

process.env.AUTH_JWT_SECRET = 'test-secret'
process.env.NODE_ENV = 'test'

const app = require('../../app')
const mindMapViewSessionService = require('../../services/MindMapViewSession.service')

const BASE = '/api/v1'
const SECRET = 'test-secret'
const makeToken = (payload = { id: 1 }) => jwt.sign(payload, SECRET)

const SESSION_FIXTURE = { id: 1, userId: 1, idMindMap: 2, durationSeconds: 120 }

describe('MindMapViewSession Controller', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── POST /mindmap-view-sessions ─────────────────────────────────────────────
  describe('POST /mindmap-view-sessions', () => {
    it('201 — journalise la consultation', async () => {
      mindMapViewSessionService.create.mockResolvedValue(SESSION_FIXTURE)

      const res = await request(app)
        .post(`${BASE}/mindmap-view-sessions`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ idMindMap: 2, durationSeconds: 120 })

      expect(res.status).toBe(201)
      expect(res.body.id).toBe(1)
      expect(mindMapViewSessionService.create).toHaveBeenCalledWith({
        userId: 1,
        idMindMap: 2,
        durationSeconds: 120
      })
    })

    it('201 — durationSeconds = 0 accepté (consultation quasi instantanée)', async () => {
      mindMapViewSessionService.create.mockResolvedValue({ ...SESSION_FIXTURE, durationSeconds: 0 })

      const res = await request(app)
        .post(`${BASE}/mindmap-view-sessions`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ idMindMap: 2, durationSeconds: 0 })

      expect(res.status).toBe(201)
    })

    it('400 — idMindMap manquant', async () => {
      const res = await request(app)
        .post(`${BASE}/mindmap-view-sessions`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ durationSeconds: 120 })

      expect(res.status).toBe(400)
      expect(mindMapViewSessionService.create).not.toHaveBeenCalled()
    })

    it('400 — durationSeconds au-delà du plafond (4h)', async () => {
      const res = await request(app)
        .post(`${BASE}/mindmap-view-sessions`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ idMindMap: 2, durationSeconds: 14401 })

      expect(res.status).toBe(400)
      expect(mindMapViewSessionService.create).not.toHaveBeenCalled()
    })

    it('400 — durationSeconds négatif', async () => {
      const res = await request(app)
        .post(`${BASE}/mindmap-view-sessions`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ idMindMap: 2, durationSeconds: -1 })

      expect(res.status).toBe(400)
    })

    it('401 — sans token', async () => {
      const res = await request(app)
        .post(`${BASE}/mindmap-view-sessions`)
        .send({ idMindMap: 2, durationSeconds: 120 })

      expect(res.status).toBe(401)
      expect(mindMapViewSessionService.create).not.toHaveBeenCalled()
    })

    it('500 — le service échoue', async () => {
      mindMapViewSessionService.create.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .post(`${BASE}/mindmap-view-sessions`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ idMindMap: 2, durationSeconds: 120 })

      expect(res.status).toBe(500)
      expect(res.body.message).toBeDefined()
    })
  })
})

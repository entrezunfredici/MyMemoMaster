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
  TestResult: {}
}))

jest.mock('../../services/Kpi.service', () => ({
  getMyKpis: jest.fn()
}))
jest.mock('../../helpers/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }))
jest.mock('../../jobs/fifo.cron', () => ({ startFifoCron: jest.fn() }))
jest.mock('../../jobs/reminder.worker', () => ({ startReminderWorker: jest.fn() }))

process.env.AUTH_JWT_SECRET = 'test-secret'
process.env.NODE_ENV = 'test'

const app = require('../../app')
const kpiService = require('../../services/Kpi.service')

const BASE = '/api/v1'
const makeToken = (payload = { id: 1 }) => jwt.sign(payload, 'test-secret')

const KPI_FIXTURE = {
  revision: { totalPlanned: 10, totalCompleted: 8, completionRate: 80, streakDays: 3, sessionsLast30Days: 10, completedLast30Days: 8, weeklyActivity: [], totalMinutes: 120 },
  exercises: { totalTests: 5, avgScore: 72, maxScore: 90, minScore: 50, recentTrend: 10, scoreHistory: [] },
  leitner: { totalCards: 20, cardsByBox: { 1: 5, 2: 5, 3: 4, 4: 3, 5: 3 }, globalSuccessRate: 68, mastery: 30, cardsDue: 4 },
  subjects: { totalUnique: 3, list: [{ subjectId: 1, name: 'Maths', tests: 3, systems: 1 }] },
  discipline: { plannedThisWeek: 3, completedThisWeek: 2, disciplineScore: 80 },
  badges: [{ id: 'streak7', label: '7 jours de suite', icon: '🔥', unlocked: false, description: '' }]
}

describe('Kpi Controller', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── GET /kpi/my ───────────────────────────────────────────────────────────────

  describe('GET /kpi/my', () => {
    it('200 — retourne les KPI de l\'utilisateur authentifié', async () => {
      kpiService.getMyKpis.mockResolvedValue(KPI_FIXTURE)

      const res = await request(app)
        .get(`${BASE}/kpi/my`)
        .set('Authorization', `Bearer ${makeToken({ id: 7 })}`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('revision')
      expect(res.body).toHaveProperty('exercises')
      expect(res.body).toHaveProperty('leitner')
      expect(res.body).toHaveProperty('badges')
      expect(kpiService.getMyKpis).toHaveBeenCalledWith(7)
    })

    it('401 — sans token', async () => {
      const res = await request(app).get(`${BASE}/kpi/my`)

      expect(res.status).toBe(401)
      expect(kpiService.getMyKpis).not.toHaveBeenCalled()
    })

    it('401 — token invalide', async () => {
      const res = await request(app)
        .get(`${BASE}/kpi/my`)
        .set('Authorization', 'Bearer invalid.token.here')

      expect(res.status).toBe(401)
      expect(kpiService.getMyKpis).not.toHaveBeenCalled()
    })

    it('500 — retourne un message d\'erreur si le service échoue', async () => {
      kpiService.getMyKpis.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .get(`${BASE}/kpi/my`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
      expect(res.body.message).toBeDefined()
    })
  })
})

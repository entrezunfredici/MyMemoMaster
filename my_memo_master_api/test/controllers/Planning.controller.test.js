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
  Reminder: {}
}))

jest.mock('../../jobs/fifo.cron', () => ({ startFifoCron: jest.fn() }))
jest.mock('../../jobs/reminder.worker', () => ({ startReminderWorker: jest.fn() }))
jest.mock('../../helpers/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }))

jest.mock('../../services/Planning.service', () => ({
  getLoad: jest.fn(),
  getPriorities: jest.fn()
}))

process.env.AUTH_JWT_SECRET = 'test-secret'
process.env.VITE_FRONT_URL = 'http://localhost:5173'
process.env.NODE_ENV = 'test'

const request = require('supertest')
const jwt = require('jsonwebtoken')
const app = require('../../app')
const planningService = require('../../services/Planning.service')

const BASE = '/api/v1/planning'
const makeToken = (payload = { id: 1 }) => jwt.sign(payload, 'test-secret', { expiresIn: '1d' })

const mockLoad = [
  { date: '2026-06-13', cardsDue: 5, sessions: 1, deadlines: 0, loadScore: 8 },
  { date: '2026-06-14', cardsDue: 0, sessions: 2, deadlines: 1, loadScore: 11 }
]

const mockPriorities = {
  overdue: [{ type: 'deadline', id: 2, name: 'Rendu rapport', dueDate: '2026-06-10', daysOverdue: 3 }],
  today: [
    { type: 'revision_session', id: 1, name: 'Maths', startTime: '09:00', endTime: '11:00' },
    { type: 'leitner', systemId: 1, name: 'Histoire', cardsDue: 8 }
  ],
  upcoming: [{ type: 'revision_session', id: 3, name: 'Physique', date: '2026-06-15', daysUntil: 2 }]
}

describe('GET /planning/load', () => {
  beforeEach(() => jest.clearAllMocks())

  test('getLoad - authentifié - retourne la charge sur 14 jours par défaut', async () => {
    planningService.getLoad.mockResolvedValue(mockLoad)
    const res = await request(app)
      .get(`${BASE}/load`)
      .set('Authorization', `Bearer ${makeToken()}`)
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual(mockLoad)
    expect(planningService.getLoad).toHaveBeenCalledWith(1, 14)
  })

  test('getLoad - paramètre days=7 - appelle le service avec 7', async () => {
    planningService.getLoad.mockResolvedValue([])
    const res = await request(app)
      .get(`${BASE}/load?days=7`)
      .set('Authorization', `Bearer ${makeToken()}`)
    expect(res.status).toBe(200)
    expect(planningService.getLoad).toHaveBeenCalledWith(1, 7)
  })

  test('getLoad - days invalide (0) - retourne 400', async () => {
    const res = await request(app)
      .get(`${BASE}/load?days=0`)
      .set('Authorization', `Bearer ${makeToken()}`)
    expect(res.status).toBe(400)
    expect(planningService.getLoad).not.toHaveBeenCalled()
  })

  test('getLoad - days invalide (91) - retourne 400', async () => {
    const res = await request(app)
      .get(`${BASE}/load?days=91`)
      .set('Authorization', `Bearer ${makeToken()}`)
    expect(res.status).toBe(400)
  })

  test('getLoad - sans token - retourne 401', async () => {
    const res = await request(app).get(`${BASE}/load`)
    expect(res.status).toBe(401)
    expect(planningService.getLoad).not.toHaveBeenCalled()
  })

  test('getLoad - erreur service - retourne 500', async () => {
    planningService.getLoad.mockRejectedValue(new Error('DB error'))
    const res = await request(app)
      .get(`${BASE}/load`)
      .set('Authorization', `Bearer ${makeToken()}`)
    expect(res.status).toBe(500)
    expect(res.body.message).toBe('Erreur lors du calcul de la charge de révision.')
  })
})

describe('GET /planning/priorities', () => {
  beforeEach(() => jest.clearAllMocks())

  test('getPriorities - authentifié - retourne les trois catégories', async () => {
    planningService.getPriorities.mockResolvedValue(mockPriorities)
    const res = await request(app)
      .get(`${BASE}/priorities`)
      .set('Authorization', `Bearer ${makeToken()}`)
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual(mockPriorities)
    expect(planningService.getPriorities).toHaveBeenCalledWith(1)
  })

  test('getPriorities - sans token - retourne 401', async () => {
    const res = await request(app).get(`${BASE}/priorities`)
    expect(res.status).toBe(401)
    expect(planningService.getPriorities).not.toHaveBeenCalled()
  })

  test('getPriorities - erreur service - retourne 500', async () => {
    planningService.getPriorities.mockRejectedValue(new Error('DB error'))
    const res = await request(app)
      .get(`${BASE}/priorities`)
      .set('Authorization', `Bearer ${makeToken()}`)
    expect(res.status).toBe(500)
    expect(res.body.message).toBe('Erreur lors du calcul des priorités.')
  })
})

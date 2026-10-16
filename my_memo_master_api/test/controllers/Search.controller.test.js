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

jest.mock('../../services/Search.service', () => ({
  searchAll: jest.fn()
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
const searchService = require('../../services/Search.service')

const makeToken = (payload = { id: 1 }) => jwt.sign(payload, 'test-secret', { expiresIn: '1d' })

const EMPTY_RESULT = { mindMaps: [], leitnerSystems: [], tests: [] }

const FULL_RESULT = {
  mindMaps: [{ idMindMap: 1, mmName: 'Algèbre', subjectId: 1, subject: { subjectId: 1, name: 'Maths' }, tags: [] }],
  leitnerSystems: [{ idSystem: 2, name: 'Leitner Maths', subjectId: 1, subject: { subjectId: 1, name: 'Maths' }, tags: [] }],
  tests: [{ testId: 3, name: 'Test Maths', subjectId: 1, subject: { subjectId: 1, name: 'Maths' }, tags: [] }]
}

describe('Search Controller', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── GET /api/v1/search — sans filtre ─────────────────────────────────────────
  describe('GET /api/v1/search (sans filtre)', () => {
    it('200 — retourne tous les contenus de l\'utilisateur', async () => {
      searchService.searchAll.mockResolvedValue(FULL_RESULT)

      const res = await request(app)
        .get('/api/v1/search')
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('mindMaps')
      expect(res.body).toHaveProperty('leitnerSystems')
      expect(res.body).toHaveProperty('tests')
      expect(searchService.searchAll).toHaveBeenCalledWith(1, { subjectId: null, q: null })
    })

    it('200 — retourne des listes vides si aucun contenu', async () => {
      searchService.searchAll.mockResolvedValue(EMPTY_RESULT)

      const res = await request(app)
        .get('/api/v1/search')
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body.mindMaps).toHaveLength(0)
      expect(res.body.leitnerSystems).toHaveLength(0)
      expect(res.body.tests).toHaveLength(0)
    })

    it('401 — pas de token', async () => {
      const res = await request(app).get('/api/v1/search')
      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      searchService.searchAll.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .get('/api/v1/search')
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
      expect(res.body.message).toMatch(/erreur/i)
    })
  })

  // ── GET /api/v1/search?subjectId=X ───────────────────────────────────────────
  describe('GET /api/v1/search?subjectId=X', () => {
    it('200 — filtre par sujet', async () => {
      searchService.searchAll.mockResolvedValue(FULL_RESULT)

      const res = await request(app)
        .get('/api/v1/search?subjectId=1')
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(searchService.searchAll).toHaveBeenCalledWith(1, { subjectId: 1, q: null })
    })

    it('400 — subjectId non entier', async () => {
      const res = await request(app)
        .get('/api/v1/search?subjectId=abc')
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(400)
    })

    it('400 — subjectId = 0 (entier non positif)', async () => {
      const res = await request(app)
        .get('/api/v1/search?subjectId=0')
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(400)
    })
  })

  // ── GET /api/v1/search?q=terme ───────────────────────────────────────────────
  describe('GET /api/v1/search?q=terme', () => {
    it('200 — filtre par texte libre', async () => {
      searchService.searchAll.mockResolvedValue(FULL_RESULT)

      const res = await request(app)
        .get('/api/v1/search?q=algèbre')
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(searchService.searchAll).toHaveBeenCalledWith(1, { subjectId: null, q: 'algèbre' })
    })

    it('400 — q dépasse 200 caractères', async () => {
      const longQ = 'a'.repeat(201)

      const res = await request(app)
        .get(`/api/v1/search?q=${longQ}`)
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(400)
    })
  })

  // ── GET /api/v1/search?subjectId=X&q=terme ───────────────────────────────────
  describe('GET /api/v1/search?subjectId=X&q=terme', () => {
    it('200 — filtre combiné sujet + texte', async () => {
      searchService.searchAll.mockResolvedValue(FULL_RESULT)

      const res = await request(app)
        .get('/api/v1/search?subjectId=2&q=révision')
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(searchService.searchAll).toHaveBeenCalledWith(1, { subjectId: 2, q: 'révision' })
    })

    it('200 — retourne liste vide si aucun résultat combiné', async () => {
      searchService.searchAll.mockResolvedValue(EMPTY_RESULT)

      const res = await request(app)
        .get('/api/v1/search?subjectId=99&q=introuvable')
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body.mindMaps).toHaveLength(0)
    })
  })
})

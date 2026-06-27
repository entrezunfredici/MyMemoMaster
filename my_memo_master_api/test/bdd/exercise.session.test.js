// Tests fonctionnels parcours complet exercices (M-06.12)
// Base SQLite en mémoire — Semantic.service mocké (NLP ~30s).
// Les autres couches (controller → service → model → DB) sont réelles.

process.env.AUTH_JWT_SECRET = 'test-secret'
process.env.NODE_ENV = 'test'
process.env.VITE_FRONT_URL = 'http://localhost:5173'
// SQLite in-memory : DB isolée par fichier de test, aucune pollution entre runs
process.env.DB_STORAGE = ':memory:'

jest.mock('../../services/Semantic.service', () => ({ gradeSemantic: jest.fn() }))
jest.mock('../../jobs/fifo.cron', () => ({ startFifoCron: jest.fn() }))
jest.mock('../../jobs/reminder.worker', () => ({ startReminderWorker: jest.fn() }))
jest.mock('../../jobs/reminder.queue', () => ({ getReminderQueue: jest.fn(), closeReminderQueue: jest.fn() }))
jest.mock('../../jobs/kpiAlert.cron', () => ({ startKpiAlertCron: jest.fn() }))
jest.mock('../../helpers/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }))

const request = require('supertest')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const semanticService = require('../../services/Semantic.service')
const app = require('../../app')
const { syncModels, Test, Question, User, Role, Subject, TestResult } = require('../../models')

const BASE = '/api/v1'
const makeToken = (userId) => jwt.sign({ id: userId }, 'test-secret', { expiresIn: '1d' })

// ─── État partagé entre scénarios ───────────────────────────────────────────
let token
let userId
let testId
let qIds // { open, mcq, fill_blank, reorder }

describe('Exercices — parcours complet (tests fonctionnels)', () => {
  // ── Initialisation : DB in-memory + données de référence ──────────────────
  beforeAll(async () => {
    await syncModels({ force: true })

    const role = await Role.create({ name: 'Étudiant' })
    const user = await User.create({
      name: 'Exercise Tester',
      email: 'exercise@test.fr',
      password: await bcrypt.hash('Test1234!', 10),
      roleId: role.roleId,
      hasValidatedEmail: true,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    userId = user.userId
    token = makeToken(userId)

    const subject = await Subject.create({ name: 'Géographie' })
    const test = await Test.create({ name: 'Test fonctionnel', subjectId: subject.subjectId })
    testId = test.testId

    // 4 questions — une par type supporté
    const qOpen = await Question.create({
      statement: 'Quelle est la capitale de la France ?',
      questionPosition: 0,
      type: 'open',
      content: { correct_answer: 'Paris' }
    })
    const qMcq = await Question.create({
      statement: 'Quel est le résultat de 2+2 ?',
      questionPosition: 1,
      type: 'mcq',
      content: { options: [{ text: '3', correct: false }, { text: '4', correct: true }] }
    })
    const qFill = await Question.create({
      statement: 'Complète la phrase.',
      questionPosition: 2,
      type: 'fill_blank',
      content: { template: 'La {{0}} est belle.', blanks: ['France'] }
    })
    const qReorder = await Question.create({
      statement: 'Remets dans le bon ordre.',
      questionPosition: 3,
      type: 'reorder',
      content: { fragments: ['le', 'chat', 'dort'] }
    })

    // Association via la table de jointure testQuestions
    await qOpen.addTest(test)
    await qMcq.addTest(test)
    await qFill.addTest(test)
    await qReorder.addTest(test)

    qIds = {
      open: qOpen.idQuestion,
      mcq: qMcq.idQuestion,
      fill_blank: qFill.idQuestion,
      reorder: qReorder.idQuestion
    }
  })

  // ── Auth & validation ─────────────────────────────────────────────────────

  it('POST /tests/:id/submit — sans token — 401', async () => {
    const res = await request(app)
      .post(`${BASE}/tests/${testId}/submit`)
      .send({ answers: [{ questionId: qIds.open, answer: 'Paris' }] })

    expect(res.status).toBe(401)
  })

  it('POST /tests/:id/submit — answers manquant — 400', async () => {
    const res = await request(app)
      .post(`${BASE}/tests/${testId}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({})

    expect(res.status).toBe(400)
    expect(res.body.errors).toBeDefined()
  })

  it('POST /tests/:id/submit — answers tableau vide — 400', async () => {
    const res = await request(app)
      .post(`${BASE}/tests/${testId}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: [] })

    expect(res.status).toBe(400)
  })

  it('POST /tests/:id/submit — test introuvable — 404', async () => {
    const res = await request(app)
      .post(`${BASE}/tests/99999/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: [{ questionId: qIds.open, answer: 'Paris' }] })

    expect(res.status).toBe(404)
  })

  // ── Parcours nominal — 4/4 correct ────────────────────────────────────────

  it('parcours nominal — 4/4 réponses correctes — score = 4, TestResult persisté en DB', async () => {
    semanticService.gradeSemantic.mockResolvedValueOnce({
      is_correct: true, score: 1.0, explanation: 'Correct.', decision_zone: 'high'
    })

    const res = await request(app)
      .post(`${BASE}/tests/${testId}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        answers: [
          { questionId: qIds.open,      answer: 'Paris' },
          { questionId: qIds.mcq,       answer: 1 },
          { questionId: qIds.fill_blank, answer: ['France'] },
          { questionId: qIds.reorder,   answer: ['le', 'chat', 'dort'] }
        ]
      })

    expect(res.status).toBe(200)
    expect(res.body.score).toBe(4)
    expect(res.body.total).toBe(4)
    expect(res.body.resultId).toBeDefined()
    expect(res.body.results).toHaveLength(4)
    expect(res.body.results.every(r => r.correct)).toBe(true)

    // Vérification directe en base
    const saved = await TestResult.findByPk(res.body.resultId)
    expect(saved).not.toBeNull()
    expect(saved.userId).toBe(userId)
    expect(saved.testId).toBe(testId)
    expect(saved.score).toBe(4)
    expect(saved.total).toBe(4)
  })

  // ── Tout faux ─────────────────────────────────────────────────────────────

  it('0/4 correct — score = 0', async () => {
    semanticService.gradeSemantic.mockResolvedValueOnce({
      is_correct: false, score: 0, explanation: 'Incorrect.', decision_zone: 'low'
    })

    const res = await request(app)
      .post(`${BASE}/tests/${testId}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        answers: [
          { questionId: qIds.open,      answer: 'Lyon' },
          { questionId: qIds.mcq,       answer: 0 },
          { questionId: qIds.fill_blank, answer: ['Allemagne'] },
          { questionId: qIds.reorder,   answer: ['dort', 'le', 'chat'] }
        ]
      })

    expect(res.status).toBe(200)
    expect(res.body.score).toBe(0)
    expect(res.body.results.filter(r => r.correct)).toHaveLength(0)
  })

  // ── Question non répondue ─────────────────────────────────────────────────

  it('question non répondue — traitée comme incorrecte pour tous les types', async () => {
    // open avec answer vide → early return dans _checkAnswer, pas d'appel sémantique
    const res = await request(app)
      .post(`${BASE}/tests/${testId}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: [{ questionId: qIds.mcq, answer: null }] })

    expect(res.status).toBe(200)
    expect(res.body.results.find(r => r.questionId === qIds.open)?.correct).toBe(false)
    expect(res.body.results.find(r => r.questionId === qIds.mcq)?.correct).toBe(false)
    expect(res.body.results.find(r => r.questionId === qIds.fill_blank)?.correct).toBe(false)
    expect(res.body.results.find(r => r.questionId === qIds.reorder)?.correct).toBe(false)
    expect(res.body.score).toBe(0)
  })

  // ── Correction par type ───────────────────────────────────────────────────

  it('mcq — bonne option (index 1) → correct:true + correctAnswer="4"', async () => {
    // open non fournie → answer null → early return, pas d'appel sémantique
    const res = await request(app)
      .post(`${BASE}/tests/${testId}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: [{ questionId: qIds.mcq, answer: 1 }] })

    expect(res.status).toBe(200)
    const r = res.body.results.find(q => q.questionId === qIds.mcq)
    expect(r.correct).toBe(true)
    expect(r.correctAnswer).toBe('4')
  })

  it('fill_blank — insensible à la casse et aux espaces', async () => {
    const res = await request(app)
      .post(`${BASE}/tests/${testId}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: [{ questionId: qIds.fill_blank, answer: [' FRANCE '] }] })

    expect(res.status).toBe(200)
    const r = res.body.results.find(q => q.questionId === qIds.fill_blank)
    expect(r.correct).toBe(true)
    expect(r.correctAnswer).toBe('France')
  })

  it('reorder — ordre incorrect → correct:false + correctAnswer="le chat dort"', async () => {
    const res = await request(app)
      .post(`${BASE}/tests/${testId}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: [{ questionId: qIds.reorder, answer: ['dort', 'chat', 'le'] }] })

    expect(res.status).toBe(200)
    const r = res.body.results.find(q => q.questionId === qIds.reorder)
    expect(r.correct).toBe(false)
    expect(r.correctAnswer).toBe('le chat dort')
  })

  // ── GET /tests/:id ─────────────────────────────────────────────────────────

  it('GET /tests/:id — retourne le test avec les 4 questions et leur content parsé', async () => {
    const res = await request(app).get(`${BASE}/tests/${testId}`)

    expect(res.status).toBe(200)
    expect(res.body.testId).toBe(testId)
    expect(res.body.question).toHaveLength(4)

    const types = res.body.question.map(q => q.type).sort()
    expect(types).toEqual(['fill_blank', 'mcq', 'open', 'reorder'])

    const openQ = res.body.question.find(q => q.type === 'open')
    expect(openQ.content.correct_answer).toBe('Paris')

    const mcqQ = res.body.question.find(q => q.type === 'mcq')
    expect(mcqQ.content.options).toHaveLength(2)
    expect(mcqQ.content.options[1].correct).toBe(true)
  })
})

afterAll(async () => {
  const { instance } = require('../../models')
  await instance.close()
})

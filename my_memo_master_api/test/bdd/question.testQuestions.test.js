// Test de non-régression fonctionnel (route → controller → service → DB réelle SQLite en mémoire)
// pour BUG TROUVÉ EN CONDITIONS RÉELLES (2026-09-08, logs conteneur API/Postgres) : `POST /questions`
// avec un `idTest` échouait systématiquement en 500 — "null value in column createdAt of relation
// testQuestions violates not-null constraint" — bloquant TOUTE création d'exercice avec au moins une
// question, manuelle ou générée par IA. Cause : dérive de schéma entre une base Postgres existante
// (table `testQuestions` créée par un `sequelize.sync()` avant l'ajout du modèle explicite
// `TestQuestion.model.js#timestamps:false`) et le modèle/la migration de création actuels — corrigée
// par la migration `20260908000001-drop-testquestions-timestamps.js`.
//
// Une base SQLite en mémoire fraîchement synchronisée depuis les modèles actuels (`syncModels`,
// comme tous les tests `test/bdd/*.js`) ne peut PAS reproduire une dérive de schéma historique — ce
// test ne garantit donc pas l'absence de dérive sur une base déjà existante, seulement que le chemin
// applicatif `question.addTest(test)` (`services/Question.service.js#create`) fonctionne de bout en
// bout quand le schéma est conforme aux modèles actuels (régression du CODE, pas de la donnée).

process.env.AUTH_JWT_SECRET = 'test-secret'
process.env.NODE_ENV = 'test'
process.env.VITE_FRONT_URL = 'http://localhost:5173'
process.env.DB_STORAGE = ':memory:'

jest.mock('../../jobs/fifo.cron', () => ({ startFifoCron: jest.fn() }))
jest.mock('../../jobs/reminder.worker', () => ({ startReminderWorker: jest.fn() }))
jest.mock('../../jobs/reminder.queue', () => ({ getReminderQueue: jest.fn(), closeReminderQueue: jest.fn() }))
jest.mock('../../jobs/kpiAlert.cron', () => ({ startKpiAlertCron: jest.fn() }))
jest.mock('../../helpers/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }))

const request = require('supertest')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const app = require('../../app')
const { syncModels, Role, User, Subject } = require('../../models')

const BASE = '/api/v1'
const makeToken = (userId) => jwt.sign({ id: userId }, 'test-secret', { expiresIn: '1d' })

describe('POST /questions — liaison réelle à un test via testQuestions (tests fonctionnels)', () => {
  let token
  let subjectId

  beforeAll(async () => {
    await syncModels({ force: true })
    const role = await Role.create({ name: 'Étudiant' })
    const user = await User.create({
      name: 'Question TestQuestions Tester',
      email: 'question-testquestions@test.fr',
      password: await bcrypt.hash('Test1234!', 10),
      roleId: role.roleId,
      hasValidatedEmail: true,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    token = makeToken(user.userId)
    const subject = await Subject.create({ name: 'Physique' })
    subjectId = subject.subjectId
  })

  it('crée un test puis une question liée (idTest) — la question apparaît dans GET /tests/:id (round-trip testQuestions réel)', async () => {
    const testRes = await request(app)
      .post(`${BASE}/tests`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Exercice de test', subjectId })
    expect(testRes.status).toBe(201)
    const testId = testRes.body.testId

    const questionRes = await request(app)
      .post(`${BASE}/questions`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        statement: 'Qu\'est-ce que la thermodynamique ?',
        questionPosition: 0,
        type: 'open',
        content: { correct_answer: 'Une branche de la physique.' },
        idTest: testId
      })

    // BUG : ce POST renvoyait 500 avant le correctif de schéma (migration 20260908000001)
    expect(questionRes.status).toBe(201)

    const fetchRes = await request(app)
      .get(`${BASE}/tests/${testId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(fetchRes.status).toBe(200)
    expect(fetchRes.body.question).toHaveLength(1)
    expect(fetchRes.body.question[0].statement).toBe('Qu\'est-ce que la thermodynamique ?')
  })

  it('deuxième question sur le même test (échec réel observé sur "Question 1" en pratique) — les deux se lient correctement', async () => {
    const testRes = await request(app)
      .post(`${BASE}/tests`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Exercice à plusieurs questions', subjectId })
    const testId = testRes.body.testId

    for (let i = 0; i < 2; i++) {
      const res = await request(app)
        .post(`${BASE}/questions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ statement: `Question ${i + 1}`, questionPosition: i, type: 'open', content: { correct_answer: 'R' }, idTest: testId })
      expect(res.status).toBe(201)
    }

    const fetchRes = await request(app).get(`${BASE}/tests/${testId}`).set('Authorization', `Bearer ${token}`)
    expect(fetchRes.body.question).toHaveLength(2)
  })
})

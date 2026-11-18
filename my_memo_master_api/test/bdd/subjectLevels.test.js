// Tests fonctionnels des niveaux par matière (B1) : GET /badges/me/subject-levels.
// Base SQLite en mémoire ; couches route → controller → service → model → DB réelles.

process.env.AUTH_JWT_SECRET = 'test-secret'
process.env.NODE_ENV = 'test'
process.env.VITE_FRONT_URL = 'http://localhost:5173'
process.env.DB_STORAGE = ':memory:'

jest.mock('../../services/MistralGrading.service', () => ({ grade: jest.fn() }))
jest.mock('../../jobs/fifo.cron', () => ({ startFifoCron: jest.fn() }))
jest.mock('../../jobs/reminder.worker', () => ({ startReminderWorker: jest.fn() }))
jest.mock('../../jobs/reminder.queue', () => ({ getReminderQueue: jest.fn(), closeReminderQueue: jest.fn() }))
jest.mock('../../jobs/kpiAlert.cron', () => ({ startKpiAlertCron: jest.fn() }))
jest.mock('../../jobs/streakReminder.cron', () => ({ startStreakReminderCron: jest.fn() }))
jest.mock('../../helpers/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }))

const request = require('supertest')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const app = require('../../app')
const {
  syncModels, User, Role, Subject, Test, TestResult, LeitnerSystem, LeitnerBox, LeitnerCard, Question, ClassGroup, TestClassGroup
} = require('../../models')

const BASE = '/api/v1'
const auth = (user) => ({ Authorization: `Bearer ${jwt.sign({ id: user.userId }, 'test-secret', { expiresIn: '1d' })}` })

let role
let counter = 0
const createUser = async () => {
  counter++
  return User.create({
    name: `Niveau Tester ${counter}`,
    email: `niveau${counter}@test.fr`,
    password: await bcrypt.hash('Test1234!', 10),
    roleId: role.roleId,
    hasValidatedEmail: true,
    createdAt: new Date(),
    updatedAt: new Date()
  })
}

// Système Leitner d'une matière avec `cards` cartes réparties en boîte 1 (à apprendre) et boîte 4 (maîtrisées)
const addSystem = async (user, subject, { mastered = 0, learning = 0 } = {}) => {
  const system = await LeitnerSystem.create({ name: `Sys ${subject.name}`, idUser: user.userId, subjectId: subject.subjectId })
  const [low, high] = await LeitnerBox.bulkCreate(
    [1, 4].map((level) => ({ level, intervall: 10, color: 111111, idSystem: system.idSystem }))
  )
  const question = await Question.create({ statement: 'Q', questionPosition: 1, type: 'text' })
  await LeitnerCard.bulkCreate([
    ...Array.from({ length: learning }, () => ({ idQuestion: question.idQuestion, idBox: low.idBox })),
    ...Array.from({ length: mastered }, () => ({ idQuestion: question.idQuestion, idBox: high.idBox }))
  ])
  return system
}
const addResults = async (user, subject, scores, { group = null } = {}) => {
  for (const [score, total] of scores) {
    const test = await Test.create({ name: 'S', subjectId: subject.subjectId, userId: user.userId })
    if (group) await TestClassGroup.create({ testId: test.testId, classGroupId: group.id })
    await TestResult.create({ testId: test.testId, userId: user.userId, score, total })
  }
}

describe('GET /badges/me/subject-levels — niveau par matière (B1)', () => {
  beforeAll(async () => {
    await syncModels({ force: true })
    role = await Role.create({ name: 'Étudiant' })
  })

  it('compte neuf - liste vide', async () => {
    const user = await createUser()

    const res = await request(app).get(`${BASE}/badges/me/subject-levels`).set(auth(user))

    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('sans jeton - 401', async () => {
    expect((await request(app).get(`${BASE}/badges/me/subject-levels`)).status).toBe(401)
  })

  it('cartes seules - Initié à 10 cartes maîtrisées, avec les statistiques', async () => {
    const user = await createUser()
    const maths = await Subject.create({ name: 'Maths' })
    await addSystem(user, maths, { mastered: 10, learning: 5 })

    const res = await request(app).get(`${BASE}/badges/me/subject-levels`).set(auth(user))

    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toMatchObject({
      subjectId: maths.subjectId,
      name: 'Maths',
      rank: 1,
      level: { code: 'initiate', label: 'Initié' },
      stats: { masteredCards: 10, totalCards: 15, exercises: 0, averagePercent: 0 },
      next: { code: 'confirmed', mode: 'both', cards: { current: 10, target: 50 } }
    })
  })

  it('exercices seuls - moyenne calculée en %, Initié à 2 exercices à 50 %', async () => {
    const user = await createUser()
    const physique = await Subject.create({ name: 'Physique' })
    await addResults(user, physique, [[1, 2], [3, 4]]) // 50 % et 75 % → moyenne 63 %

    const res = await request(app).get(`${BASE}/badges/me/subject-levels`).set(auth(user))

    expect(res.body[0]).toMatchObject({ name: 'Physique', rank: 1, stats: { masteredCards: 0, exercises: 2, averagePercent: 63 } })
  })

  it('cartes et exercices - Confirmé quand les deux axes y sont', async () => {
    const user = await createUser()
    const histoire = await Subject.create({ name: 'Histoire' })
    await addSystem(user, histoire, { mastered: 50 })
    await addResults(user, histoire, [[7, 10], [7, 10], [7, 10], [7, 10], [7, 10]])

    const res = await request(app).get(`${BASE}/badges/me/subject-levels`).set(auth(user))

    expect(res.body[0]).toMatchObject({ rank: 2, level: { code: 'confirmed' }, next: { code: 'expert' } })
  })

  it('exercices de groupe et résultats sans total - ne comptent pas', async () => {
    const user = await createUser()
    const chimie = await Subject.create({ name: 'Chimie' })
    const group = await ClassGroup.create({ name: 'Groupe', createdBy: user.userId })
    await addResults(user, chimie, [[4, 4], [4, 4], [4, 4]], { group })
    await addResults(user, chimie, [[0, 0]])

    const res = await request(app).get(`${BASE}/badges/me/subject-levels`).set(auth(user))

    expect(res.body).toEqual([])
  })

  it('matière dont le système est vide et sans exercice - absente', async () => {
    const user = await createUser()
    const vide = await Subject.create({ name: 'Vide' })
    await addSystem(user, vide, {})

    expect((await request(app).get(`${BASE}/badges/me/subject-levels`).set(auth(user))).body).toEqual([])
  })

  it('plusieurs matières - triées du niveau le plus haut au plus bas, puis par cartes maîtrisées', async () => {
    const user = await createUser()
    const a = await Subject.create({ name: 'Anglais' })
    const b = await Subject.create({ name: 'Biologie' })
    const c = await Subject.create({ name: 'Chimie 2' })
    await addSystem(user, a, { mastered: 10 })
    await addSystem(user, b, { mastered: 150 })
    await addResults(user, b, Array.from({ length: 10 }, () => [9, 10]))
    await addSystem(user, c, { mastered: 12 })

    const res = await request(app).get(`${BASE}/badges/me/subject-levels`).set(auth(user))

    expect(res.body.map((row) => [row.name, row.level.code])).toEqual([['Biologie', 'expert'], ['Chimie 2', 'initiate'], ['Anglais', 'initiate']])
    expect(res.body[0].next).toBeNull()
  })

  it('isolation - les données d’un autre utilisateur ne sont jamais mélangées', async () => {
    const user = await createUser()
    const other = await createUser()
    const maths = await Subject.create({ name: 'Maths isolé' })
    await addSystem(other, maths, { mastered: 200 })

    expect((await request(app).get(`${BASE}/badges/me/subject-levels`).set(auth(user))).body).toEqual([])
  })
})

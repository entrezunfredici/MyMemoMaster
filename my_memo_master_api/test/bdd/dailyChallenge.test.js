// Tests fonctionnels du défi du jour (A4) : réviser la matière la plus délaissée.
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
const dailyChallengeService = require('../../services/DailyChallenge.service')
const {
  syncModels, User, Role, Subject, Test, TestResult, LeitnerSystem, LeitnerBox, LeitnerCard, LeitnerReviewSession, Question, ClassGroup,
  TestClassGroup, UserGamificationSettings
} = require('../../models')

const BASE = '/api/v1'
const auth = (user) => ({ Authorization: `Bearer ${jwt.sign({ id: user.userId }, 'test-secret', { expiresIn: '1d' })}` })

// Instant fixe, en milieu de journée UTC : le « jour » est le même dans tous les fuseaux testés ici
const NOW = new Date('2026-11-18T12:00:00Z')
const daysAgo = (n, hour = 10) => new Date(Date.UTC(2026, 10, 18 - n, hour))

let role
let counter = 0
const createUser = async () => {
  counter++
  return User.create({
    name: `Défi Tester ${counter}`,
    email: `defi${counter}@test.fr`,
    password: await bcrypt.hash('Test1234!', 10),
    roleId: role.roleId,
    hasValidatedEmail: true,
    createdAt: new Date(),
    updatedAt: new Date()
  })
}
const createSubject = (name) => Subject.create({ name })

// Système Leitner d'une matière, avec ou sans cartes
const addSystem = async (user, subject, { cards = 3 } = {}) => {
  const system = await LeitnerSystem.create({ name: `Sys ${subject.name}`, idUser: user.userId, subjectId: subject.subjectId })
  const box = await LeitnerBox.create({ level: 1, intervall: 1, color: 111111, idSystem: system.idSystem })
  if (cards > 0) {
    const question = await Question.create({ statement: 'Q', questionPosition: 1, type: 'text' })
    await LeitnerCard.bulkCreate(Array.from({ length: cards }, () => ({ idQuestion: question.idQuestion, idBox: box.idBox })))
  }
  return system
}
const review = (user, system, completedAt) =>
  LeitnerReviewSession.create({ userId: user.userId, idSystem: system.idSystem, cardsReviewed: 3, durationSeconds: 30, completed: true, completedAt })
const exercise = async (user, subject, completedAt, { group = null } = {}) => {
  const test = await Test.create({ name: 'S', subjectId: subject.subjectId, userId: user.userId })
  if (group) await TestClassGroup.create({ testId: test.testId, classGroupId: group.id })
  return TestResult.create({ testId: test.testId, userId: user.userId, score: 1, total: 2, completedAt })
}

describe('Défi du jour (A4)', () => {
  beforeAll(async () => {
    await syncModels({ force: true })
    role = await Role.create({ name: 'Étudiant' })
  })

  it('aucune matière - pas de défi', async () => {
    const user = await createUser()

    expect(await dailyChallengeService.get(user.userId, NOW)).toMatchObject({ date: '2026-11-18', available: false, subject: null, done: false })
  })

  it('matière avec cartes jamais pratiquée - défi, sans ancienneté', async () => {
    const user = await createUser()
    const maths = await createSubject('Maths jamais')
    await addSystem(user, maths)

    const challenge = await dailyChallengeService.get(user.userId, NOW)

    expect(challenge).toMatchObject({ available: true, subject: { subjectId: maths.subjectId, name: 'Maths jamais' }, daysSince: null, done: false })
  })

  it('système sans aucune carte - rien à réviser, pas de défi', async () => {
    const user = await createUser()
    await addSystem(user, await createSubject('Vide'), { cards: 0 })

    expect((await dailyChallengeService.get(user.userId, NOW)).available).toBe(false)
  })

  it('pratiquée il y a 3 jours - pas délaissée, pas de défi', async () => {
    const user = await createUser()
    const physique = await createSubject('Physique récente')
    await review(user, await addSystem(user, physique), daysAgo(3))

    expect((await dailyChallengeService.get(user.userId, NOW)).available).toBe(false)
  })

  it('seuil : 6 jours - pas de défi ; 7 jours - défi', async () => {
    const user = await createUser()
    const sixDays = await createSubject('Six jours')
    await review(user, await addSystem(user, sixDays), daysAgo(6))
    expect((await dailyChallengeService.get(user.userId, NOW)).available).toBe(false)

    const sevenDays = await createSubject('Sept jours')
    await review(user, await addSystem(user, sevenDays), daysAgo(7))
    expect(await dailyChallengeService.get(user.userId, NOW)).toMatchObject({ available: true, subject: { name: 'Sept jours' }, daysSince: 7 })
  })

  it('plusieurs matières délaissées - la plus ancienne d’abord', async () => {
    const user = await createUser()
    const a = await createSubject('Dix jours')
    const b = await createSubject('Vingt jours')
    await review(user, await addSystem(user, a), daysAgo(10))
    await review(user, await addSystem(user, b), daysAgo(20))

    expect(await dailyChallengeService.get(user.userId, NOW)).toMatchObject({ subject: { name: 'Vingt jours' }, daysSince: 20 })
  })

  it('matière pratiquée puis délaissée - prioritaire sur une matière jamais pratiquée', async () => {
    const user = await createUser()
    const never = await createSubject('A jamais')
    await addSystem(user, never)
    const old = await createSubject('B ancienne')
    await review(user, await addSystem(user, old), daysAgo(9))

    expect(await dailyChallengeService.get(user.userId, NOW)).toMatchObject({ subject: { name: 'B ancienne' }, daysSince: 9 })
  })

  it('matière d’exercices seuls, sans système - candidate si délaissée', async () => {
    const user = await createUser()
    const histoire = await createSubject('Histoire exos')
    await exercise(user, histoire, daysAgo(12))

    expect(await dailyChallengeService.get(user.userId, NOW)).toMatchObject({ subject: { name: 'Histoire exos' }, daysSince: 12 })
  })

  it('pratique du jour dans la matière du défi - défi relevé, et le même défi toute la journée', async () => {
    const user = await createUser()
    const chimie = await createSubject('Chimie défi')
    const system = await addSystem(user, chimie)
    await review(user, system, daysAgo(15))
    const before = await dailyChallengeService.get(user.userId, NOW)
    expect(before).toMatchObject({ done: false, practicesToday: 0 })

    await review(user, system, daysAgo(0, 9))
    const after = await dailyChallengeService.get(user.userId, NOW)

    expect(after).toMatchObject({ subject: { name: 'Chimie défi' }, daysSince: 15, done: true, practicesToday: 1 })
  })

  it('pratique du jour dans une AUTRE matière - le défi n’est pas relevé', async () => {
    const user = await createUser()
    const delaissee = await createSubject('Délaissée')
    await review(user, await addSystem(user, delaissee), daysAgo(11))
    const active = await createSubject('Active')
    await review(user, await addSystem(user, active), daysAgo(0, 9))

    expect(await dailyChallengeService.get(user.userId, NOW)).toMatchObject({ subject: { name: 'Délaissée' }, done: false })
  })

  it('exercice de groupe - ne compte ni comme pratique ni pour relever le défi', async () => {
    const user = await createUser()
    const langue = await createSubject('Langue groupe')
    await review(user, await addSystem(user, langue), daysAgo(10))
    const group = await ClassGroup.create({ name: 'Groupe défi', createdBy: user.userId })
    await exercise(user, langue, daysAgo(0, 9), { group })

    expect(await dailyChallengeService.get(user.userId, NOW)).toMatchObject({ subject: { name: 'Langue groupe' }, done: false, practicesToday: 0 })
  })

  it('fuseau de l’utilisateur - une pratique faite « aujourd’hui » à Auckland relève le défi (veille en UTC)', async () => {
    const user = await createUser()
    await UserGamificationSettings.create({ userId: user.userId, timezone: 'Pacific/Auckland' })
    const geo = await createSubject('Géo fuseau')
    const system = await addSystem(user, geo)
    await review(user, system, daysAgo(12))
    // 12:00 UTC le 17 = 01:00 le 18 à Auckland (UTC+13) : « aujourd'hui » là-bas, mais la veille en UTC
    await review(user, system, new Date('2026-11-17T12:00:00Z'))

    const challenge = await dailyChallengeService.get(user.userId, new Date('2026-11-18T03:00:00Z'))

    expect(challenge.date).toBe('2026-11-18')
    expect(challenge).toMatchObject({ subject: { name: 'Géo fuseau' }, done: true, practicesToday: 1 })
  })

  it('même pratique pour un utilisateur sans fuseau (UTC) - la veille, donc pas de pratique du jour', async () => {
    const user = await createUser()
    await UserGamificationSettings.create({ userId: user.userId, timezone: 'UTC' })
    const geo = await createSubject('Géo UTC')
    const system = await addSystem(user, geo)
    await review(user, system, daysAgo(12))
    await review(user, system, new Date('2026-11-17T12:00:00Z'))

    const challenge = await dailyChallengeService.get(user.userId, new Date('2026-11-18T03:00:00Z'))

    // La dernière pratique date de la veille : la matière n'est plus délaissée, aucun défi
    expect(challenge).toMatchObject({ available: false, done: false })
  })

  it('isolation - la pratique d’un autre utilisateur ne compte pas', async () => {
    const user = await createUser()
    const other = await createUser()
    const maths = await createSubject('Maths isolée')
    const systemUser = await addSystem(user, maths)
    const systemOther = await addSystem(other, maths)
    await review(user, systemUser, daysAgo(10))
    await review(other, systemOther, daysAgo(0, 9))

    expect(await dailyChallengeService.get(user.userId, NOW)).toMatchObject({ done: false, practicesToday: 0 })
  })

  describe('API', () => {
    it('GET /badges/me/daily-challenge - 200 avec le défi', async () => {
      const user = await createUser()
      const maths = await createSubject('Maths API')
      await addSystem(user, maths)

      const res = await request(app).get(`${BASE}/badges/me/daily-challenge`).set(auth(user))

      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({ available: true, subject: { name: 'Maths API' }, done: false })
    })

    it('GET /badges/me/daily-challenge - sans jeton - 401', async () => {
      expect((await request(app).get(`${BASE}/badges/me/daily-challenge`)).status).toBe(401)
    })

    it('session-feedback - la pratique qui relève le défi est annoncée, pas les suivantes', async () => {
      const user = await createUser()
      const maths = await createSubject('Maths bilan')
      const system = await addSystem(user, maths)
      await review(user, system, daysAgo(14))
      await review(user, system, new Date())

      const first = await request(app).get(`${BASE}/badges/me/session-feedback`).set(auth(user))
      expect(first.body).toMatchObject({ challengeDone: true, challengeSubject: 'Maths bilan' })

      await review(user, system, new Date())
      const second = await request(app).get(`${BASE}/badges/me/session-feedback`).set(auth(user))
      expect(second.body).toMatchObject({ challengeDone: false, challengeSubject: null })
    })
  })
})

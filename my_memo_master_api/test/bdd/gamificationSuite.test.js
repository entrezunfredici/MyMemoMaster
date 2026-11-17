// Tests fonctionnels de la suite gamification : objectif quotidien, rappel de série menacée,
// « Obtenu avec » dans GET /badges, titre visible par un enseignant.
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
const dayjs = require('dayjs')
const app = require('../../app')
const gamificationProfileService = require('../../services/GamificationProfile.service')
const streakReminderService = require('../../services/StreakReminder.service')
const {
  syncModels, User, Role, Subject, Test, TestResult, LeitnerSystem, LeitnerReviewSession,
  UserBadge, UserActivityDay, UserGamificationSettings, Reminder
} = require('../../models')

const BASE = '/api/v1'
const makeToken = (userId) => jwt.sign({ id: userId }, 'test-secret', { expiresIn: '1d' })
const auth = (user) => ({ Authorization: `Bearer ${makeToken(user.userId)}` })
const day = (offset) => dayjs().subtract(offset, 'day').format('YYYY-MM-DD')

let role
let counter = 0
const createUser = async () => {
  counter++
  return User.create({
    name: `Suite Tester ${counter}`,
    email: `suite${counter}@test.fr`,
    password: await bcrypt.hash('Test1234!', 10),
    roleId: role.roleId,
    hasValidatedEmail: true,
    createdAt: new Date(),
    updatedAt: new Date()
  })
}
const setSettings = (user, patch) => UserGamificationSettings.create({ userId: user.userId, ...patch })
const practiceDays = (user, ...offsets) => UserActivityDay.bulkCreate(offsets.map((offset) => ({ userId: user.userId, date: day(offset) })))

describe('Suite gamification — objectif quotidien, rappel de série, obtenu avec, titre enseignant', () => {
  beforeAll(async () => {
    await syncModels({ force: true })
    role = await Role.create({ name: 'Étudiant' })
  })

  describe('GET /badges/me/daily-goal', () => {
    it('daily-goal - aucun objectif défini - zéros et jamais atteint', async () => {
      const user = await createUser()

      const res = await request(app).get(`${BASE}/badges/me/daily-goal`).set(auth(user))

      expect(res.status).toBe(200)
      expect(res.body).toEqual({
        date: dayjs().format('YYYY-MM-DD'),
        cards: { goal: 0, done: 0 },
        exercises: { goal: 0, done: 0 },
        achieved: false
      })
    })

    it('daily-goal - cartes et exercices du jour - comptés, hier ignoré', async () => {
      const user = await createUser()
      await setSettings(user, { dailyGoalCards: 10, dailyGoalExercises: 2 })
      const system = await LeitnerSystem.create({ name: 'Sys', idUser: user.userId })
      await LeitnerReviewSession.create({ userId: user.userId, idSystem: system.idSystem, cardsReviewed: 4, durationSeconds: 60, completed: true, completedAt: new Date() })
      await LeitnerReviewSession.create({ userId: user.userId, idSystem: system.idSystem, cardsReviewed: 3, durationSeconds: 60, completed: true, completedAt: new Date() })
      await LeitnerReviewSession.create({ userId: user.userId, idSystem: system.idSystem, cardsReviewed: 50, durationSeconds: 60, completed: true, completedAt: dayjs().subtract(1, 'day').toDate() })
      const subject = await Subject.create({ name: 'Maths' })
      const test = await Test.create({ name: 'S', subjectId: subject.subjectId, userId: user.userId })
      await TestResult.create({ testId: test.testId, userId: user.userId, score: 1, total: 2 })

      const res = await request(app).get(`${BASE}/badges/me/daily-goal`).set(auth(user))

      expect(res.body.cards).toEqual({ goal: 10, done: 7 })
      expect(res.body.exercises).toEqual({ goal: 2, done: 1 })
      expect(res.body.achieved).toBe(false)
    })

    it('daily-goal - un seul objectif défini et atteint - atteint (l’objectif à 0 est ignoré)', async () => {
      const user = await createUser()
      await setSettings(user, { dailyGoalCards: 5 })
      const system = await LeitnerSystem.create({ name: 'Sys', idUser: user.userId })
      await LeitnerReviewSession.create({ userId: user.userId, idSystem: system.idSystem, cardsReviewed: 5, durationSeconds: 60, completed: true, completedAt: new Date() })

      const res = await request(app).get(`${BASE}/badges/me/daily-goal`).set(auth(user))

      expect(res.body.achieved).toBe(true)
    })

    it('daily-goal - sans jeton - 401', async () => {
      const res = await request(app).get(`${BASE}/badges/me/daily-goal`)

      expect(res.status).toBe(401)
    })
  })

  describe('findStreaksAtRisk et rappel de série', () => {
    it('findStreaksAtRisk - série de 3 jours finie hier, rappel activé - menacée avec sa longueur', async () => {
      const user = await createUser()
      await setSettings(user, { streakReminderEnabled: true })
      await practiceDays(user, 1, 2, 3)

      const atRisk = await gamificationProfileService.findStreaksAtRisk()

      expect(atRisk).toContainEqual({ userId: user.userId, streak: 3 })
    })

    it('findStreaksAtRisk - a déjà pratiqué aujourd’hui - non menacée', async () => {
      const user = await createUser()
      await setSettings(user, { streakReminderEnabled: true })
      await practiceDays(user, 0, 1, 2)

      expect((await gamificationProfileService.findStreaksAtRisk()).map((e) => e.userId)).not.toContain(user.userId)
    })

    it('findStreaksAtRisk - série déjà rompue (rien hier) - non menacée', async () => {
      const user = await createUser()
      await setSettings(user, { streakReminderEnabled: true })
      await practiceDays(user, 4, 5, 6)

      expect((await gamificationProfileService.findStreaksAtRisk()).map((e) => e.userId)).not.toContain(user.userId)
    })

    it('findStreaksAtRisk - série d’un seul jour - sous le seuil, non menacée', async () => {
      const user = await createUser()
      await setSettings(user, { streakReminderEnabled: true })
      await practiceDays(user, 1)

      expect((await gamificationProfileService.findStreaksAtRisk()).map((e) => e.userId)).not.toContain(user.userId)
    })

    it('findStreaksAtRisk - rappel désactivé ou mode zen - non menacée', async () => {
      const off = await createUser()
      await setSettings(off, { streakReminderEnabled: false })
      await practiceDays(off, 1, 2, 3)
      const zen = await createUser()
      await setSettings(zen, { streakReminderEnabled: true, zenMode: true })
      await practiceDays(zen, 1, 2, 3)

      const ids = (await gamificationProfileService.findStreaksAtRisk()).map((e) => e.userId)

      expect(ids).not.toContain(off.userId)
      expect(ids).not.toContain(zen.userId)
    })

    it('runDailyReminders - série menacée - crée un rappel dans la cloche, une seule fois par jour', async () => {
      const user = await createUser()
      await setSettings(user, { streakReminderEnabled: true })
      await practiceDays(user, 1, 2, 3, 4)

      const first = await streakReminderService.runDailyReminders()
      const second = await streakReminderService.runDailyReminders()

      const reminders = await Reminder.findAll({ where: { userId: user.userId, entityType: 'streak_reminder' } })
      expect(reminders).toHaveLength(1)
      expect(reminders[0]).toMatchObject({ channel: 'in_app', status: 'pending' })
      expect(reminders[0].message).toContain('4 jours')
      expect(first.created).toBeGreaterThanOrEqual(1)
      expect(second.skipped).toBeGreaterThanOrEqual(1)
    })
  })

  describe('GET /badges - Obtenu avec', () => {
    it('GET /badges - badge obtenu avec une matière - earnedSubjects porte son nom, badge non obtenu : liste vide', async () => {
      const user = await createUser()
      const subject = await Subject.create({ name: 'Physique' })
      await UserBadge.create({ userId: user.userId, badgeCode: 'streak3', context: { value: 3, subjectIds: [subject.subjectId] } })

      const res = await request(app).get(`${BASE}/badges`).set(auth(user))

      const earned = res.body.find((b) => b.code === 'streak3')
      const other = res.body.find((b) => b.code === 'streak7')
      expect(res.status).toBe(200)
      expect(earned.earnedSubjects).toEqual([{ subjectId: subject.subjectId, name: 'Physique' }])
      expect(other.earnedSubjects).toEqual([])
    })
  })

  describe('getTeacherTitle', () => {
    it('getTeacherTitle - aucun titre choisi - null', async () => {
      const user = await createUser()

      expect(await gamificationProfileService.getTeacherTitle(user.userId)).toBeNull()
    })

    it('getTeacherTitle - titre choisi - code, libellé et icône du catalogue', async () => {
      const user = await createUser()
      await UserBadge.create({ userId: user.userId, badgeCode: 'streak7' })
      await gamificationProfileService.setProfile(user.userId, { titleCode: 'streak7' })

      expect(await gamificationProfileService.getTeacherTitle(user.userId)).toEqual({ code: 'streak7', label: '7 jours de suite', icon: '🔥' })
    })

    it('getTeacherTitle - titre absent des badges visibles - null (aucune fuite d’une matière non consentie)', async () => {
      const user = await createUser()
      await UserBadge.create({ userId: user.userId, badgeCode: 'streak7' })
      await gamificationProfileService.setProfile(user.userId, { titleCode: 'streak7' })

      expect(await gamificationProfileService.getTeacherTitle(user.userId, ['streak3'])).toBeNull()
      expect(await gamificationProfileService.getTeacherTitle(user.userId, ['streak7'])).not.toBeNull()
    })
  })
})

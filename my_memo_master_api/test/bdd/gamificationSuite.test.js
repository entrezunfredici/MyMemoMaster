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

      expect(atRisk).toContainEqual({ userId: user.userId, streak: 3, zone: null })
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

      // Heure fixée à 18 h locale : le rappel ne part qu'à cette heure-là (sinon le test dépendrait de l'horloge)
      const at18 = dayjs().hour(18).minute(30).second(0).toDate()
      const first = await streakReminderService.runDailyReminders(at18)
      const second = await streakReminderService.runDailyReminders(at18)

      const reminders = await Reminder.findAll({ where: { userId: user.userId, entityType: 'streak_reminder' } })
      expect(reminders).toHaveLength(1)
      expect(reminders[0]).toMatchObject({ channel: 'in_app', status: 'pending' })
      expect(reminders[0].message).toContain('4 jours')
      expect(first.created).toBeGreaterThanOrEqual(1)
      expect(second.skipped).toBeGreaterThanOrEqual(1)
    })

    it('runDailyReminders - hors de 18 h locale - aucun rappel', async () => {
      const user = await createUser()
      await setSettings(user, { streakReminderEnabled: true })
      await practiceDays(user, 1, 2, 3)

      const result = await streakReminderService.runDailyReminders(dayjs().hour(11).minute(30).toDate())

      expect(result.created).toBe(0)
      expect(await Reminder.count({ where: { userId: user.userId, entityType: 'streak_reminder' } })).toBe(0)
    })

    it('findStreaksAtRisk - heure locale : chacun est rappelé à 18 h dans SON fuseau', async () => {
      const paris = await createUser()
      await setSettings(paris, { streakReminderEnabled: true, timezone: 'Europe/Paris' })
      const tokyo = await createUser()
      await setSettings(tokyo, { streakReminderEnabled: true, timezone: 'Asia/Tokyo' })
      const instant = new Date('2026-06-10T16:30:00Z') // 18 h 30 le 10 à Paris (UTC+2), 01 h 30 le 11 à Tokyo
      await UserActivityDay.bulkCreate([
        ...['2026-06-07', '2026-06-08', '2026-06-09'].map((date) => ({ userId: paris.userId, date })),
        ...['2026-06-08', '2026-06-09', '2026-06-10'].map((date) => ({ userId: tokyo.userId, date }))
      ])

      const ids = (await gamificationProfileService.findStreaksAtRisk(instant, 2, 18)).map((e) => e.userId)

      expect(ids).toContain(paris.userId)
      expect(ids).not.toContain(tokyo.userId) // à Tokyo il est 01 h 30 : pas l'heure du rappel
    })

    it('findStreaksAtRisk - le « jour » est celui du fuseau : à Tokyo, le 10 est « hier » quand il est 01 h 30 le 11', async () => {
      const tokyo = await createUser()
      await setSettings(tokyo, { streakReminderEnabled: true, timezone: 'Asia/Tokyo' })
      const instant = new Date('2026-06-10T16:30:00Z')
      await UserActivityDay.bulkCreate(['2026-06-08', '2026-06-09', '2026-06-10'].map((date) => ({ userId: tokyo.userId, date })))

      const atRisk = await gamificationProfileService.findStreaksAtRisk(instant, 2)

      expect(atRisk).toContainEqual({ userId: tokyo.userId, streak: 3, zone: 'Asia/Tokyo' })
    })
  })

  describe('Fuseau horaire de l’utilisateur', () => {
    const instant = new Date('2026-11-18T03:00:00Z') // 16 h le 18 à Auckland, 19 h le 17 à Los Angeles
    const activityDayService = require('../../services/UserActivityDay.service')

    it('record - jour d’activité calculé dans le fuseau de l’utilisateur', async () => {
      const auckland = await createUser()
      await setSettings(auckland, { timezone: 'Pacific/Auckland' })
      const losAngeles = await createUser()
      await setSettings(losAngeles, { timezone: 'America/Los_Angeles' })

      await activityDayService.record(auckland.userId, instant)
      await activityDayService.record(losAngeles.userId, instant)

      expect(await activityDayService.findDates(auckland.userId)).toEqual(['2026-11-18'])
      expect(await activityDayService.findDates(losAngeles.userId)).toEqual(['2026-11-17'])
    })

    it('record - fuseau absent ou inconnu - repli sur le fuseau du serveur, sans erreur', async () => {
      const none = await createUser()
      const unknown = await createUser()
      await UserGamificationSettings.create({ userId: unknown.userId, timezone: 'Nulle/Part' })

      await activityDayService.record(none.userId, instant)
      await activityDayService.record(unknown.userId, instant)

      const expected = dayjs(instant).format('YYYY-MM-DD')
      expect(await activityDayService.findDates(none.userId)).toEqual([expected])
      expect(await activityDayService.findDates(unknown.userId)).toEqual([expected])
    })

    it('getDailyGoal - « aujourd’hui » suit le fuseau de l’utilisateur', async () => {
      const user = await createUser()
      await setSettings(user, { dailyGoalExercises: 1, timezone: 'America/Los_Angeles' })
      const subject = await Subject.create({ name: `Fuseau ${user.userId}` })
      const test = await Test.create({ name: 'Fuseau', userId: user.userId, subjectId: subject.subjectId })
      // « Maintenant » = 02 h le 18 à Los Angeles (10 h UTC). Son jour local va du 18 à 08 h UTC au 19 à 08 h UTC.
      await TestResult.create({ userId: user.userId, testId: test.testId, score: 1, total: 1, completedAt: new Date('2026-11-18T07:00:00Z') }) // 23 h le 17 : veille locale
      await TestResult.create({ userId: user.userId, testId: test.testId, score: 1, total: 1, completedAt: new Date('2026-11-18T09:00:00Z') }) // 01 h le 18 : du jour

      const goal = await gamificationProfileService.getDailyGoal(user.userId, new Date('2026-11-18T10:00:00Z'))

      expect(goal.date).toBe('2026-11-18')
      expect(goal.exercises.done).toBe(1)
      expect(goal.achieved).toBe(true)
    })

    it('PATCH settings - fuseau valide enregistré, fuseau inconnu refusé (400)', async () => {
      const user = await createUser()

      const ok = await request(app).patch(`${BASE}/badges/me/settings`).set(auth(user)).send({ timezone: 'Europe/Paris' })
      const bad = await request(app).patch(`${BASE}/badges/me/settings`).set(auth(user)).send({ timezone: 'Mars/Olympus' })

      expect(ok.status).toBe(200)
      expect(ok.body.timezone).toBe('Europe/Paris')
      expect(bad.status).toBe(400)
      expect((await gamificationProfileService.getSettings(user.userId)).timezone).toBe('Europe/Paris')
    })
  })

  describe('GET /badges/me/session-feedback — bonus de première session', () => {
    const makeTest = async (user) => {
      const subject = await Subject.create({ name: `Bilan ${user.userId}` })
      return Test.create({ name: 'Bilan', userId: user.userId, subjectId: subject.subjectId })
    }
    const result = (user, test) => TestResult.create({ userId: user.userId, testId: test.testId, score: 1, total: 1, completedAt: new Date() })

    it('session-feedback - première pratique du jour - firstOfDay vrai', async () => {
      const user = await createUser()
      await result(user, await makeTest(user))

      const res = await request(app).get(`${BASE}/badges/me/session-feedback`).set(auth(user))

      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({ firstOfDay: true, practicesToday: 1, streakExtended: false, dailyGoalAchieved: false })
    })

    it('session-feedback - deuxième pratique du jour - firstOfDay faux', async () => {
      const user = await createUser()
      const test = await makeTest(user)
      await result(user, test)
      await result(user, test)

      const res = await request(app).get(`${BASE}/badges/me/session-feedback`).set(auth(user))

      expect(res.body).toMatchObject({ firstOfDay: false, practicesToday: 2, streakExtended: false })
    })

    it('session-feedback - première pratique après une série en cours - série prolongée', async () => {
      const user = await createUser()
      await practiceDays(user, 0, 1, 2)
      await result(user, await makeTest(user))

      const res = await request(app).get(`${BASE}/badges/me/session-feedback`).set(auth(user))

      expect(res.body).toMatchObject({ firstOfDay: true, streakCurrent: 3, streakExtended: true })
    })

    it('session-feedback - aucune pratique - rien à fêter', async () => {
      const user = await createUser()

      const res = await request(app).get(`${BASE}/badges/me/session-feedback`).set(auth(user))

      expect(res.body).toMatchObject({ firstOfDay: false, practicesToday: 0, streakCurrent: 0 })
    })

    it('session-feedback - sans jeton - 401', async () => {
      expect((await request(app).get(`${BASE}/badges/me/session-feedback`)).status).toBe(401)
    })
  })

  describe('GET /badges/me/summary — practicedToday', () => {
    it('summary - jour d’activité aujourd’hui - practicedToday vrai, sinon faux', async () => {
      const active = await createUser()
      await practiceDays(active, 0, 1)
      const idle = await createUser()
      await practiceDays(idle, 1)

      const a = await request(app).get(`${BASE}/badges/me/summary`).set(auth(active))
      const i = await request(app).get(`${BASE}/badges/me/summary`).set(auth(idle))

      expect(a.body.practicedToday).toBe(true)
      expect(i.body.practicedToday).toBe(false)
      expect(i.body.streakCurrent).toBe(1)
    })
  })

  describe('Gel de série (A3)', () => {
    const offsets = (from, to) => Array.from({ length: from - to + 1 }, (_, i) => from - i) // from → to (décroissant)
    const subjectTest = async (user) => {
      const subject = await Subject.create({ name: `Gel ${user.userId}` })
      return Test.create({ name: 'Gel', userId: user.userId, subjectId: subject.subjectId })
    }

    it('summary - 14 jours de série - un gel en réserve, cycle remis à zéro', async () => {
      const user = await createUser()
      await practiceDays(user, ...offsets(13, 0))

      const res = await request(app).get(`${BASE}/badges/me/summary`).set(auth(user))

      expect(res.body.streakCurrent).toBe(14)
      expect(res.body.freezes).toEqual({ available: 1, max: 2, progress: 0, every: 14 })
    })

    it('summary - 5 jours de série - aucun gel, progression 5/14', async () => {
      const user = await createUser()
      await practiceDays(user, ...offsets(4, 0))

      const res = await request(app).get(`${BASE}/badges/me/summary`).set(auth(user))

      expect(res.body.freezes).toEqual({ available: 0, max: 2, progress: 5, every: 14 })
    })

    it('session-feedback - le 14ᵉ jour de série - gel gagné aujourd’hui', async () => {
      const user = await createUser()
      await practiceDays(user, ...offsets(13, 0))
      await TestResult.create({ userId: user.userId, testId: (await subjectTest(user)).testId, score: 1, total: 1, completedAt: new Date() })

      const res = await request(app).get(`${BASE}/badges/me/session-feedback`).set(auth(user))

      expect(res.body).toMatchObject({ freezeEarned: true, freezeUsed: false, freezesAvailable: 1 })
    })

    it('session-feedback - reprise après deux jours manqués - le gel a protégé la série', async () => {
      const user = await createUser()
      // 14 jours de pratique, puis deux jours manqués (hier et avant-hier), reprise aujourd'hui
      await practiceDays(user, ...offsets(16, 3), 0)
      await TestResult.create({ userId: user.userId, testId: (await subjectTest(user)).testId, score: 1, total: 1, completedAt: new Date() })

      const res = await request(app).get(`${BASE}/badges/me/session-feedback`).set(auth(user))

      expect(res.body).toMatchObject({ freezeUsed: true, freezesAvailable: 0, streakCurrent: 15 })
    })

    it('session-feedback - série ordinaire - ni gel gagné ni gel utilisé', async () => {
      const user = await createUser()
      await practiceDays(user, 2, 1, 0)

      const res = await request(app).get(`${BASE}/badges/me/session-feedback`).set(auth(user))

      expect(res.body).toMatchObject({ freezeEarned: false, freezeUsed: false, freezesAvailable: 0 })
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

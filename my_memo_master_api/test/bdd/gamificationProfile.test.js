// Tests fonctionnels du profil gamifié : titre, vitrine, calendrier d'activité, réglages (C-06).
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
jest.mock('../../helpers/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }))

const request = require('supertest')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const dayjs = require('dayjs')
const app = require('../../app')
const gamificationProfileService = require('../../services/GamificationProfile.service')
const { syncModels, User, Role, UserBadge, UserActivityDay, UserGamificationSettings } = require('../../models')

const BASE = '/api/v1'
const makeToken = (userId) => jwt.sign({ id: userId }, 'test-secret', { expiresIn: '1d' })
const auth = (user) => ({ Authorization: `Bearer ${makeToken(user.userId)}` })
const day = (offset) => dayjs().subtract(offset, 'day').format('YYYY-MM-DD')

let role
let counter = 0
const createUser = async () => {
  counter++
  return User.create({
    name: `Profil Tester ${counter}`,
    email: `profil${counter}@test.fr`,
    password: await bcrypt.hash('Test1234!', 10),
    roleId: role.roleId,
    hasValidatedEmail: true,
    createdAt: new Date(),
    updatedAt: new Date()
  })
}
const earn = (user, ...codes) => UserBadge.bulkCreate(codes.map((badgeCode) => ({ userId: user.userId, badgeCode })))

describe('Profil gamifié — titre, vitrine, calendrier, réglages', () => {
  beforeAll(async () => {
    await syncModels({ force: true })
    role = await Role.create({ name: 'Étudiant' })
  })

  describe('GET/PUT /badges/me/profile', () => {
    it('GET profile - jamais modifié - aucun titre et vitrine vide', async () => {
      const user = await createUser()

      const res = await request(app).get(`${BASE}/badges/me/profile`).set(auth(user))

      expect(res.status).toBe(200)
      expect(res.body).toEqual({ titleCode: null, showcaseCodes: [] })
    })

    it('PUT profile - badges obtenus - enregistre titre et vitrine, relus par GET', async () => {
      const user = await createUser()
      await earn(user, 'streak3', 'firstExercise')

      const put = await request(app)
        .put(`${BASE}/badges/me/profile`)
        .set(auth(user))
        .send({ titleCode: 'streak3', showcaseCodes: ['firstExercise', 'streak3'] })
      const get = await request(app).get(`${BASE}/badges/me/profile`).set(auth(user))

      expect(put.status).toBe(200)
      expect(get.body).toEqual({ titleCode: 'streak3', showcaseCodes: ['firstExercise', 'streak3'] })
    })

    it('PUT profile - badge non obtenu en vitrine - 400 et rien d\'enregistré', async () => {
      const user = await createUser()
      await earn(user, 'streak3')

      const res = await request(app).put(`${BASE}/badges/me/profile`).set(auth(user)).send({ showcaseCodes: ['streak3', 'streak7'] })

      expect(res.status).toBe(400)
      expect(res.body.message).toMatch(/obtenu/)
      expect(await gamificationProfileService.getProfile(user.userId)).toEqual({ titleCode: null, showcaseCodes: [] })
    })

    it('PUT profile - code inconnu du catalogue comme titre - 400', async () => {
      const user = await createUser()
      await UserBadge.create({ userId: user.userId, badgeCode: 'badge-supprime' })

      const res = await request(app).put(`${BASE}/badges/me/profile`).set(auth(user)).send({ titleCode: 'badge-supprime' })

      expect(res.status).toBe(400)
    })

    it('PUT profile - badge obtenu par un autre utilisateur - 400', async () => {
      const owner = await createUser()
      const other = await createUser()
      await earn(owner, 'streak3')

      const res = await request(app).put(`${BASE}/badges/me/profile`).set(auth(other)).send({ titleCode: 'streak3' })

      expect(res.status).toBe(400)
    })

    it('PUT profile - plus de 3 badges en vitrine - 400', async () => {
      const user = await createUser()
      await earn(user, 'streak3', 'streak7', 'firstExercise', 'perfectScore')

      const res = await request(app)
        .put(`${BASE}/badges/me/profile`)
        .set(auth(user))
        .send({ showcaseCodes: ['streak3', 'streak7', 'firstExercise', 'perfectScore'] })

      expect(res.status).toBe(400)
    })

    it('PUT profile - doublons dans la vitrine - dédoublonnés', async () => {
      const user = await createUser()
      await earn(user, 'streak3')

      const res = await request(app).put(`${BASE}/badges/me/profile`).set(auth(user)).send({ showcaseCodes: ['streak3', 'streak3'] })

      expect(res.status).toBe(200)
      expect(res.body.showcaseCodes).toEqual(['streak3'])
    })

    it('PUT profile - titleCode null - retire le titre sans toucher la vitrine', async () => {
      const user = await createUser()
      await earn(user, 'streak3')
      await request(app).put(`${BASE}/badges/me/profile`).set(auth(user)).send({ titleCode: 'streak3', showcaseCodes: ['streak3'] })

      const res = await request(app).put(`${BASE}/badges/me/profile`).set(auth(user)).send({ titleCode: null })

      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({ titleCode: null, showcaseCodes: ['streak3'] })
    })

    it('PUT profile - showcaseCodes non tableau - 400', async () => {
      const user = await createUser()

      const res = await request(app).put(`${BASE}/badges/me/profile`).set(auth(user)).send({ showcaseCodes: 'streak3' })

      expect(res.status).toBe(400)
    })

    it('profile - sans authentification - 401', async () => {
      expect((await request(app).get(`${BASE}/badges/me/profile`)).status).toBe(401)
      expect((await request(app).put(`${BASE}/badges/me/profile`).send({})).status).toBe(401)
    })
  })

  describe('GET /badges/me/activity', () => {
    it('activity - aucun jour - grille de 12 semaines commençant un lundi, aucun jour actif', async () => {
      const user = await createUser()

      const res = await request(app).get(`${BASE}/badges/me/activity`).set(auth(user))

      expect(res.status).toBe(200)
      expect(res.body.weeks).toBe(12)
      expect(res.body.activeDates).toEqual([])
      expect(res.body.activeDaysLast30).toBe(0)
      expect(res.body.today).toBe(day(0))
      expect(dayjs(res.body.from).day()).toBe(1)
      expect(dayjs(res.body.today).diff(dayjs(res.body.from), 'day')).toBeGreaterThanOrEqual(11 * 7)
      expect(dayjs(res.body.today).diff(dayjs(res.body.from), 'day')).toBeLessThan(12 * 7)
    })

    it('activity - jours récents et ancien - ne renvoie que ceux de la fenêtre, compte les 30 derniers jours', async () => {
      const user = await createUser()
      await UserActivityDay.bulkCreate([day(0), day(1), day(2), day(20), day(200)].map((date) => ({ userId: user.userId, date })))

      const res = await request(app).get(`${BASE}/badges/me/activity?weeks=4`).set(auth(user))

      expect(res.status).toBe(200)
      expect(res.body.activeDates).toEqual(expect.arrayContaining([day(0), day(1), day(2)]))
      expect(res.body.activeDates).not.toContain(day(200))
      expect(res.body.activeDaysLast30).toBe(4)
      expect(res.body.streakCurrent).toBe(3)
    })

    it('activity - jours d\'un autre utilisateur - jamais renvoyés', async () => {
      const user = await createUser()
      const other = await createUser()
      await UserActivityDay.create({ userId: other.userId, date: day(1) })

      const res = await request(app).get(`${BASE}/badges/me/activity`).set(auth(user))

      expect(res.body.activeDates).toEqual([])
    })

    it('activity - weeks hors bornes - 400', async () => {
      const user = await createUser()

      expect((await request(app).get(`${BASE}/badges/me/activity?weeks=0`).set(auth(user))).status).toBe(400)
      expect((await request(app).get(`${BASE}/badges/me/activity?weeks=53`).set(auth(user))).status).toBe(400)
      expect((await request(app).get(`${BASE}/badges/me/activity?weeks=abc`).set(auth(user))).status).toBe(400)
    })

    it('getActivity - un lundi - la semaine en cours ne compte que ce lundi', async () => {
      const user = await createUser()
      const monday = new Date(2026, 10, 16, 12) // lundi 16 novembre 2026

      const result = await gamificationProfileService.getActivity(user.userId, 2, monday)

      expect(result.from).toBe('2026-11-09')
      expect(result.to).toBe('2026-11-16')
    })

    it('activity - sans authentification - 401', async () => {
      expect((await request(app).get(`${BASE}/badges/me/activity`)).status).toBe(401)
    })
  })

  describe('GET/PATCH /badges/me/settings', () => {
    it('GET settings - jamais modifiés - valeurs par défaut (tout désactivé sauf les animations)', async () => {
      const user = await createUser()

      const res = await request(app).get(`${BASE}/badges/me/settings`).set(auth(user))

      expect(res.status).toBe(200)
      expect(res.body).toEqual({
        dailyGoalCards: 0,
        dailyGoalExercises: 0,
        streakReminderEnabled: false,
        badgesVisibleToTeachers: false,
        animationsEnabled: true,
        zenMode: false
      })
      expect(await UserGamificationSettings.count({ where: { userId: user.userId } })).toBe(0)
    })

    it('PATCH settings - modification partielle - ne change que les clés envoyées', async () => {
      const user = await createUser()

      const res = await request(app).patch(`${BASE}/badges/me/settings`).set(auth(user)).send({ zenMode: true, dailyGoalCards: 10 })
      const second = await request(app).patch(`${BASE}/badges/me/settings`).set(auth(user)).send({ animationsEnabled: false })

      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({ zenMode: true, dailyGoalCards: 10, animationsEnabled: true })
      expect(second.body).toMatchObject({ zenMode: true, dailyGoalCards: 10, animationsEnabled: false })
      expect(await UserGamificationSettings.count({ where: { userId: user.userId } })).toBe(1)
    })

    it('PATCH settings - clé inconnue - ignorée', async () => {
      const user = await createUser()

      const res = await request(app).patch(`${BASE}/badges/me/settings`).set(auth(user)).send({ isAdmin: true, zenMode: true })

      expect(res.status).toBe(200)
      expect(res.body.isAdmin).toBeUndefined()
      expect(res.body.zenMode).toBe(true)
    })

    it('PATCH settings - valeurs invalides - 400', async () => {
      const user = await createUser()
      const send = (body) => request(app).patch(`${BASE}/badges/me/settings`).set(auth(user)).send(body)

      expect((await send({ dailyGoalCards: -1 })).status).toBe(400)
      expect((await send({ dailyGoalCards: 501 })).status).toBe(400)
      expect((await send({ dailyGoalExercises: 51 })).status).toBe(400)
      expect((await send({ zenMode: 'oui' })).status).toBe(400)
      expect((await send({ badgesVisibleToTeachers: 1 })).status).toBe(400)
    })

    it('PATCH settings - réglages de deux utilisateurs - indépendants', async () => {
      const a = await createUser()
      const b = await createUser()

      await request(app).patch(`${BASE}/badges/me/settings`).set(auth(a)).send({ zenMode: true })
      const res = await request(app).get(`${BASE}/badges/me/settings`).set(auth(b))

      expect(res.body.zenMode).toBe(false)
    })

    it('PATCH settings - deux écritures concurrentes sur un compte neuf - une seule ligne', async () => {
      const user = await createUser()

      await Promise.all([
        request(app).patch(`${BASE}/badges/me/settings`).set(auth(user)).send({ zenMode: true }),
        request(app).patch(`${BASE}/badges/me/settings`).set(auth(user)).send({ animationsEnabled: false })
      ])

      expect(await UserGamificationSettings.count({ where: { userId: user.userId } })).toBe(1)
    })

    it('areBadgesVisibleToTeachers - par défaut faux, vrai une fois activé', async () => {
      const user = await createUser()
      expect(await gamificationProfileService.areBadgesVisibleToTeachers(user.userId)).toBe(false)

      await gamificationProfileService.updateSettings(user.userId, { badgesVisibleToTeachers: true })

      expect(await gamificationProfileService.areBadgesVisibleToTeachers(user.userId)).toBe(true)
    })

    it('settings - sans authentification - 401', async () => {
      expect((await request(app).get(`${BASE}/badges/me/settings`)).status).toBe(401)
      expect((await request(app).patch(`${BASE}/badges/me/settings`).send({})).status).toBe(401)
    })
  })
})

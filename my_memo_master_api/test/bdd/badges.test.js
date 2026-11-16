// Tests fonctionnels du noyau gamification (C-06) : événement → jour d'activité → badge → API.
// Base SQLite en mémoire ; couches controller → service → model → DB réelles.

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
const badgeService = require('../../services/Badge.service')
const { emit } = require('../../helpers/badges/badgeEvents')
const {
  syncModels,
  User,
  Role,
  Subject,
  Test,
  TestResult,
  LeitnerSystem,
  LeitnerBox,
  LeitnerCard,
  Question,
  UserBadge,
  UserActivityDay,
  LeitnerReviewSession
} = require('../../models')

const BASE = '/api/v1'
const makeToken = (userId) => jwt.sign({ id: userId }, 'test-secret', { expiresIn: '1d' })
const day = (offset) => dayjs().subtract(offset, 'day').format('YYYY-MM-DD')

let role
let counter = 0
const createUser = async () => {
  counter++
  return User.create({
    name: `Badge Tester ${counter}`,
    email: `badge${counter}@test.fr`,
    password: await bcrypt.hash('Test1234!', 10),
    roleId: role.roleId,
    hasValidatedEmail: true,
    createdAt: new Date(),
    updatedAt: new Date()
  })
}
const codesOf = async (userId) => (await UserBadge.findAll({ where: { userId }, raw: true })).map((b) => b.badgeCode).sort()
const createSubject = (name) => Subject.create({ name })
const createResult = async (userId, subject, { score, total }) => {
  const test = await Test.create({ name: 'Série', subjectId: subject.subjectId, userId })
  return TestResult.create({ testId: test.testId, userId, score, total })
}

describe('Badges — noyau de gamification', () => {
  beforeAll(async () => {
    await syncModels({ force: true })
    role = await Role.create({ name: 'Étudiant' })
  })

  describe('moteur (événement → badge)', () => {
    it('handle - premier exercice soumis - enregistre le jour et attribue firstExercise', async () => {
      const user = await createUser()
      const subject = await createSubject('Maths')
      await createResult(user.userId, subject, { score: 2, total: 4 })

      const awarded = await emit('exercise.submitted', { userId: user.userId })

      expect(awarded).toEqual(['firstExercise'])
      expect(await UserActivityDay.count({ where: { userId: user.userId } })).toBe(1)
    })

    it('handle - même événement rejoué - aucun doublon (idempotence)', async () => {
      const user = await createUser()
      const subject = await createSubject('Maths')
      await createResult(user.userId, subject, { score: 2, total: 4 })

      await emit('exercise.submitted', { userId: user.userId })
      const second = await emit('exercise.submitted', { userId: user.userId })

      expect(second).toEqual([])
      expect(await UserBadge.count({ where: { userId: user.userId } })).toBe(1)
      expect(await UserActivityDay.count({ where: { userId: user.userId } })).toBe(1)
    })

    it('handle - deux évaluations concurrentes - un seul badge (contrainte d\'unicité)', async () => {
      const user = await createUser()
      const subject = await createSubject('Maths')
      await createResult(user.userId, subject, { score: 2, total: 4 })

      await Promise.all([emit('exercise.submitted', { userId: user.userId }), emit('exercise.submitted', { userId: user.userId })])

      expect(await UserBadge.count({ where: { userId: user.userId, badgeCode: 'firstExercise' } })).toBe(1)
    })

    it('handle - 100 % sur 2 questions - pas de perfectScore (plancher de 3 questions)', async () => {
      const user = await createUser()
      const subject = await createSubject('Maths')
      await createResult(user.userId, subject, { score: 2, total: 2 })

      await emit('exercise.submitted', { userId: user.userId })

      expect(await codesOf(user.userId)).not.toContain('perfectScore')
    })

    it('handle - 100 % sur 3 questions - attribue perfectScore', async () => {
      const user = await createUser()
      const subject = await createSubject('Maths')
      await createResult(user.userId, subject, { score: 3, total: 3 })

      await emit('exercise.submitted', { userId: user.userId })

      expect(await codesOf(user.userId)).toEqual(['firstExercise', 'perfectScore'])
    })

    it('handle - série de 3 jours d\'activité - attribue streak3 mais pas streak7', async () => {
      const user = await createUser()
      await UserActivityDay.bulkCreate([day(2), day(1)].map((date) => ({ userId: user.userId, date })))

      await emit('mindmap.viewed', { userId: user.userId })

      const codes = await codesOf(user.userId)
      expect(codes).toContain('streak3')
      expect(codes).not.toContain('streak7')
    })

    it('handle - série de 6 jours puis 7ᵉ jour - streak7 attribué au 7ᵉ jour seulement', async () => {
      const user = await createUser()
      await UserActivityDay.bulkCreate([6, 5, 4, 3, 2, 1].map((n) => ({ userId: user.userId, date: day(n) })))
      await UserBadge.create({ userId: user.userId, badgeCode: 'streak3' })
      expect(await badgeService.evaluate(user.userId, { eventType: 'mindmap.viewed' })).toEqual([])

      await emit('mindmap.viewed', { userId: user.userId })

      expect(await codesOf(user.userId)).toContain('streak7')
    })

    it('handle - badge déjà obtenu puis série cassée - le badge n\'est jamais retiré', async () => {
      const user = await createUser()
      await UserBadge.create({ userId: user.userId, badgeCode: 'streak7' })
      await UserActivityDay.create({ userId: user.userId, date: day(30) })

      await emit('mindmap.viewed', { userId: user.userId })

      expect(await codesOf(user.userId)).toContain('streak7')
    })

    it('handle - utilisateur absent du payload - ne fait rien', async () => {
      expect(await badgeService.handle('exercise.submitted', {})).toEqual([])
    })

    it('emit - le moteur échoue - ne lève jamais et retourne []', async () => {
      const spy = jest.spyOn(badgeService, 'handle').mockRejectedValueOnce(new Error('panne'))
      await expect(emit('exercise.submitted', { userId: 1 })).resolves.toEqual([])
      spy.mockRestore()
    })

    it('handle - exercice de groupe - compte pour l\'activité mais pas pour tenTests', async () => {
      const user = await createUser()
      const subject = await createSubject('Maths')
      const { ClassGroup, TestClassGroup } = require('../../models')
      const group = await ClassGroup.create({ name: 'Groupe', createdBy: user.userId })
      for (let i = 0; i < 10; i++) {
        const test = await Test.create({ name: `G${i}`, subjectId: subject.subjectId, userId: user.userId })
        await TestClassGroup.create({ testId: test.testId, classGroupId: group.id })
        await TestResult.create({ testId: test.testId, userId: user.userId, score: 1, total: 4 })
      }

      await emit('exercise.submitted', { userId: user.userId })

      const codes = await codesOf(user.userId)
      expect(codes).toContain('firstExercise')
      expect(codes).not.toContain('tenTests')
    })
  })

  describe('API', () => {
    it('GET /badges - sans token - 401', async () => {
      const res = await request(app).get(`${BASE}/badges`)
      expect(res.status).toBe(401)
    })

    it('POST /leitner-review-sessions - session réelle - crée le jour d\'activité, firstLeitner et le badge est non vu', async () => {
      const user = await createUser()
      const token = makeToken(user.userId)
      const system = await LeitnerSystem.create({ name: 'Sys', idUser: user.userId })

      const post = await request(app)
        .post(`${BASE}/leitner-review-sessions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ idSystem: system.idSystem, cardsReviewed: 5, durationSeconds: 120 })
      expect(post.status).toBe(201)

      const recent = await request(app).get(`${BASE}/badges/me/recent`).set('Authorization', `Bearer ${token}`)
      expect(recent.status).toBe(200)
      expect(recent.body.map((b) => b.code)).toEqual(['firstLeitner'])
      expect(recent.body[0].label).toBe('Première révision')
    })

    it('PATCH /badges/me/seen - badge obtenu - le marque comme vu et le retire de recent', async () => {
      const user = await createUser()
      const token = makeToken(user.userId)
      await UserBadge.create({ userId: user.userId, badgeCode: 'streak3' })

      const patch = await request(app)
        .patch(`${BASE}/badges/me/seen`)
        .set('Authorization', `Bearer ${token}`)
        .send({ codes: ['streak3', 'inconnu'] })
      expect(patch.status).toBe(200)
      expect(patch.body.updated).toBe(1)

      const recent = await request(app).get(`${BASE}/badges/me/recent`).set('Authorization', `Bearer ${token}`)
      expect(recent.body).toEqual([])
    })

    it('PATCH /badges/me/seen - badge d\'un autre utilisateur - n\'est pas modifié', async () => {
      const owner = await createUser()
      const other = await createUser()
      await UserBadge.create({ userId: owner.userId, badgeCode: 'streak3' })

      const patch = await request(app)
        .patch(`${BASE}/badges/me/seen`)
        .set('Authorization', `Bearer ${makeToken(other.userId)}`)
        .send({ codes: ['streak3'] })

      expect(patch.body.updated).toBe(0)
      expect((await UserBadge.findOne({ where: { userId: owner.userId } })).seenAt).toBeNull()
    })

    it.each([[{}], [{ codes: [] }], [{ codes: 'streak3' }], [{ codes: [42] }], [{ codes: ['x'.repeat(41)] }]])(
      'PATCH /badges/me/seen - corps invalide %j - 400',
      async (body) => {
        const user = await createUser()
        const res = await request(app)
          .patch(`${BASE}/badges/me/seen`)
          .set('Authorization', `Bearer ${makeToken(user.userId)}`)
          .send(body)
        expect(res.status).toBe(400)
      }
    )

    it('GET /badges - utilisateur sans activité - tout le catalogue verrouillé avec progression à 0', async () => {
      const user = await createUser()
      const res = await request(app).get(`${BASE}/badges`).set('Authorization', `Bearer ${makeToken(user.userId)}`)

      expect(res.status).toBe(200)
      expect(res.body.length).toBeGreaterThan(10)
      expect(res.body.every((b) => b.earned === false && b.progress.current === 0)).toBe(true)
      expect(res.body.find((b) => b.code === 'streak7').progress).toEqual({ current: 0, target: 7 })
    })

    it('GET /badges - badge obtenu - earned, date et progression pleine', async () => {
      const user = await createUser()
      await UserBadge.create({ userId: user.userId, badgeCode: 'streak7' })
      const res = await request(app).get(`${BASE}/badges`).set('Authorization', `Bearer ${makeToken(user.userId)}`)

      const badge = res.body.find((b) => b.code === 'streak7')
      expect(badge.earned).toBe(true)
      expect(badge.earnedAt).not.toBeNull()
      expect(badge.progress).toEqual({ current: 7, target: 7 })
    })

    it('GET /badges/me/summary - 5 badges et une série - niveau Apprenti', async () => {
      const user = await createUser()
      await UserBadge.bulkCreate(['streak3', 'firstExercise', 'firstLeitner', 'perfectScore', 'hundredCards'].map((badgeCode) => ({ userId: user.userId, badgeCode })))
      await UserActivityDay.bulkCreate([2, 1, 0].map((n) => ({ userId: user.userId, date: day(n) })))

      const res = await request(app).get(`${BASE}/badges/me/summary`).set('Authorization', `Bearer ${makeToken(user.userId)}`)

      expect(res.status).toBe(200)
      expect(res.body.level.name).toBe('Apprenti')
      expect(res.body.earnedCount).toBe(5)
      expect(res.body.streakCurrent).toBe(3)
    })
  })

  describe('rattrapage', () => {
    it('backfill - historique réel - reconstruit les jours, attribue les badges et les marque vus', async () => {
      const user = await createUser()
      const subject = await createSubject('Histoire')
      const system = await LeitnerSystem.create({ name: 'Sys', idUser: user.userId })
      for (const n of [3, 2, 1]) {
        const test = await Test.create({ name: `T${n}`, subjectId: subject.subjectId, userId: user.userId })
        await TestResult.create({ testId: test.testId, userId: user.userId, score: 1, total: 4, completedAt: dayjs().subtract(n, 'day').toDate() })
      }
      await LeitnerReviewSession.create({ userId: user.userId, idSystem: system.idSystem, cardsReviewed: 4, durationSeconds: 60 })

      const first = await badgeService.backfill(user.userId)

      expect(first.activityDaysAdded).toBe(4)
      expect(first.awarded).toEqual(expect.arrayContaining(['firstExercise', 'firstLeitner', 'streak3']))
      expect((await UserBadge.findAll({ where: { userId: user.userId } })).every((b) => b.seenAt !== null)).toBe(true)

      const second = await badgeService.backfill(user.userId)
      expect(second).toEqual({ activityDaysAdded: 0, awarded: [], subjectsRepaired: 0 })
    })

    it('backfill - créneau planifié coché sans pratique - n\'ouvre aucun jour d\'activité', async () => {
      const user = await createUser()
      const result = await badgeService.backfill(user.userId)
      expect(result).toEqual({ activityDaysAdded: 0, awarded: [], subjectsRepaired: 0 })
    })
  })

  describe('fusion avec kpis.badges', () => {
    it('listForKpi - badge obtenu - garde le format historique (id, unlocked) enrichi', async () => {
      const user = await createUser()
      await UserBadge.create({ userId: user.userId, badgeCode: 'streak3' })
      await UserActivityDay.create({ userId: user.userId, date: day(0) })

      const badges = await badgeService.listForKpi(user.userId)

      const streak3 = badges.find((b) => b.id === 'streak3')
      expect(streak3).toMatchObject({ id: 'streak3', code: 'streak3', unlocked: true, earned: true, icon: expect.any(String), label: 'Premier élan' })
      expect(streak3.earnedAt).not.toBeNull()
      expect(badges.find((b) => b.id === 'streak7').unlocked).toBe(false)
    })

    it('listForKpi - consentement global - chaque badge obtenu porte les noms de ses matières d\'obtention', async () => {
      const user = await createUser()
      const subject = await createSubject('Latin')
      await createResult(user.userId, subject, { score: 1, total: 4 })
      await emit('exercise.submitted', { userId: user.userId })

      const badges = await badgeService.listForKpi(user.userId)

      expect(badges.find((b) => b.id === 'firstExercise').earnedSubjects).toEqual([{ subjectId: subject.subjectId, name: 'Latin' }])
      // badge sans matière (série) ou non obtenu : liste vide, jamais absente
      expect(badges.find((b) => b.id === 'streak7').earnedSubjects).toEqual([])
    })

    it('withSubjectNames - aucun badge avec matière - ne fait aucune requête sur les matières', async () => {
      const { Subject: SubjectModel } = require('../../models')
      const spy = jest.spyOn(SubjectModel, 'findAll')

      const result = await badgeService.withSubjectNames([{ code: 'streak3', earnedSubjectIds: [] }])

      expect(spy).not.toHaveBeenCalled()
      expect(result[0].earnedSubjects).toEqual([])
      spy.mockRestore()
    })

    it('contributors - chaque badge restreignable - renvoie un tableau, les autres une liste vide', () => {
      const { CATALOG } = require('../../helpers/badges/catalog')
      const stats = badgeService.computeStats({ dates: [], testResults: [], leitnerSessions: [], systems: [] })
      CATALOG.forEach((badge) => {
        const subjects = badge.contributors(stats)
        expect(Array.isArray(subjects)).toBe(true)
        if (!badge.scopable) expect(subjects).toEqual([])
      })
    })

    it("listForKpi - compte antérieur au déploiement - rattrapé une fois depuis l'historique", async () => {
      const user = await createUser()
      const subject = await createSubject('Chimie')
      await createResult(user.userId, subject, { score: 1, total: 4 })
      expect(await UserBadge.count({ where: { userId: user.userId } })).toBe(0)

      const badges = await badgeService.listForKpi(user.userId)

      expect(badges.find((b) => b.id === 'firstExercise').unlocked).toBe(true)
      // rattrapage silencieux : pas d'animation à rejouer
      expect(await badgeService.findRecent(user.userId)).toEqual([])
    })

    it("listForKpi - utilisateur neuf sans historique - tout verrouillé, rien d'attribué", async () => {
      const user = await createUser()
      const badges = await badgeService.listForKpi(user.userId)
      expect(badges.every((b) => b.unlocked === false)).toBe(true)
      expect(await UserBadge.count({ where: { userId: user.userId } })).toBe(0)
    })

    it('GET /kpi/my - badges lus depuis UserBadge', async () => {
      const user = await createUser()
      await UserBadge.create({ userId: user.userId, badgeCode: 'streak7' })
      const res = await request(app).get(`${BASE}/kpi/my`).set('Authorization', `Bearer ${makeToken(user.userId)}`)
      expect(res.status).toBe(200)
      expect(res.body.badges.find((b) => b.id === 'streak7').unlocked).toBe(true)
    })
  })

  describe('critères Leitner', () => {
    it('leitnerMastery - 20 cartes dont 10 en boîte 4 ou 5 - attribué (50 %)', async () => {
      const user = await createUser()
      const system = await LeitnerSystem.create({ name: 'Maîtrise', idUser: user.userId })
      const boxes = await LeitnerBox.bulkCreate(
        [1, 4].map((level) => ({ level, intervall: 10, color: 111111, idSystem: system.idSystem }))
      )
      const question = await Question.create({ statement: 'Q', questionPosition: 1, type: 'text' })
      await LeitnerCard.bulkCreate(
        Array.from({ length: 20 }, (_, i) => ({ idQuestion: question.idQuestion, idBox: boxes[i < 10 ? 1 : 0].idBox }))
      )
      await LeitnerReviewSession.create({ userId: user.userId, idSystem: system.idSystem, cardsReviewed: 1, durationSeconds: 5 })

      await emit('leitner.session.completed', { userId: user.userId })

      expect(await codesOf(user.userId)).toContain('leitnerMastery')
    })

    it('leitnerMastery - 2 cartes toutes en boîte 5 - non attribué (plancher de 20 cartes)', async () => {
      const user = await createUser()
      const system = await LeitnerSystem.create({ name: 'Petit', idUser: user.userId })
      const box = await LeitnerBox.create({ level: 5, intervall: 10, color: 111111, idSystem: system.idSystem })
      const question = await Question.create({ statement: 'Q', questionPosition: 1, type: 'text' })
      await LeitnerCard.bulkCreate([1, 2].map(() => ({ idQuestion: question.idQuestion, idBox: box.idBox })))
      await LeitnerReviewSession.create({ userId: user.userId, idSystem: system.idSystem, cardsReviewed: 1, durationSeconds: 5 })

      await emit('leitner.session.completed', { userId: user.userId })

      expect(await codesOf(user.userId)).not.toContain('leitnerMastery')
    })
  })

  describe('consultation de carte mentale', () => {
    it('POST /mindmap-view-sessions - moins de 60 s - ne compte pas comme pratique', async () => {
      const user = await createUser()
      const { Diagramme } = require('../../models')
      const subject = await createSubject('Géo')
      const map = await Diagramme.create({ mmName: 'Carte', mindMapJson: {}, subjectId: subject.subjectId, userId: user.userId })

      const res = await request(app)
        .post(`${BASE}/mindmap-view-sessions`)
        .set('Authorization', `Bearer ${makeToken(user.userId)}`)
        .send({ idMindMap: map.idMindMap, durationSeconds: 30 })

      expect(res.status).toBe(201)
      expect(await UserActivityDay.count({ where: { userId: user.userId } })).toBe(0)
    })

    it('POST /mindmap-view-sessions - 60 s ou plus - enregistre le jour d\'activité', async () => {
      const user = await createUser()
      const { Diagramme } = require('../../models')
      const subject = await createSubject('Géo')
      const map = await Diagramme.create({ mmName: 'Carte', mindMapJson: {}, subjectId: subject.subjectId, userId: user.userId })

      await request(app)
        .post(`${BASE}/mindmap-view-sessions`)
        .set('Authorization', `Bearer ${makeToken(user.userId)}`)
        .send({ idMindMap: map.idMindMap, durationSeconds: 60 })

      expect(await UserActivityDay.count({ where: { userId: user.userId } })).toBe(1)
    })
  })

  describe('badges liés à des matières (many-to-many)', () => {
    const { BadgeSubject } = require('../../models')
    let studentToken
    let adminToken
    let maths
    let physique

    beforeAll(async () => {
      const studentRole = await Role.create({ name: 'Élève lié' })
      const student = await User.create({
        name: 'Élève lié',
        email: 'scoped-student@test.fr',
        password: await bcrypt.hash('Test1234!', 10),
        roleId: studentRole.roleId,
        hasValidatedEmail: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      studentToken = makeToken(student.userId)
      adminToken = makeToken((await createUser()).userId)
      maths = await createSubject('Maths liées')
      physique = await createSubject('Physique liée')
    })

    afterEach(async () => {
      await BadgeSubject.destroy({ where: {} })
    })

    const put = (token, code, body) =>
      request(app).put(`${BASE}/badges/${code}/subjects`).set('Authorization', `Bearer ${token}`).send(body)

    it('PUT /badges/:code/subjects - non administrateur - 403', async () => {
      const res = await put(studentToken, 'firstExercise', { subjectIds: [maths.subjectId] })
      expect(res.status).toBe(403)
    })

    it('PUT /badges/:code/subjects - badge inconnu - 404', async () => {
      const res = await put(adminToken, 'nexistepas', { subjectIds: [] })
      expect(res.status).toBe(404)
    })

    it('PUT /badges/:code/subjects - badge de série (non restreignable) - 400', async () => {
      const res = await put(adminToken, 'streak7', { subjectIds: [maths.subjectId] })
      expect(res.status).toBe(400)
      expect(res.body.message).toMatch(/matières/)
    })

    it('PUT /badges/:code/subjects - matière inconnue - 400', async () => {
      const res = await put(adminToken, 'firstExercise', { subjectIds: [999999] })
      expect(res.status).toBe(400)
    })

    it.each([[{}], [{ subjectIds: 'maths' }], [{ subjectIds: ['a'] }], [{ subjectIds: [0] }]])(
      'PUT /badges/:code/subjects - corps invalide %j - 400',
      async (body) => {
        const res = await put(adminToken, 'firstExercise', body)
        expect(res.status).toBe(400)
      }
    )

    it('PUT /badges/:code/subjects - plusieurs matières puis remplacement - many-to-many mis à jour', async () => {
      const first = await put(adminToken, 'tenTests', { subjectIds: [maths.subjectId, physique.subjectId, maths.subjectId] })
      expect(first.status).toBe(200)
      expect(first.body.subjectIds).toEqual([maths.subjectId, physique.subjectId])

      // un même badge pour plusieurs matières, et une matière pour plusieurs badges
      await put(adminToken, 'perfectScore', { subjectIds: [maths.subjectId] })
      expect(await BadgeSubject.count({ where: { subjectId: maths.subjectId } })).toBe(2)

      await put(adminToken, 'tenTests', { subjectIds: [physique.subjectId] })
      const list = await request(app).get(`${BASE}/badges`).set('Authorization', `Bearer ${studentToken}`)
      expect(list.body.find((b) => b.code === 'tenTests').linkedSubjectIds).toEqual([physique.subjectId])

      await put(adminToken, 'tenTests', { subjectIds: [] })
      expect(await BadgeSubject.count({ where: { badgeCode: 'tenTests' } })).toBe(0)
    })

    it('GET /badges - badge restreignable - expose scopable et les matières liées (linkedSubjectIds)', async () => {
      await put(adminToken, 'firstExercise', { subjectIds: [maths.subjectId] })
      const res = await request(app).get(`${BASE}/badges`).set('Authorization', `Bearer ${studentToken}`)
      expect(res.body.find((b) => b.code === 'firstExercise')).toMatchObject({ scopable: true, linkedSubjectIds: [maths.subjectId] })
      expect(res.body.find((b) => b.code === 'streak7')).toMatchObject({ scopable: false, linkedSubjectIds: [] })
    })

    it('handle - badge lié à Maths - un exercice de Physique ne le débloque pas, un exercice de Maths oui', async () => {
      const user = await createUser()
      await BadgeSubject.create({ badgeCode: 'firstExercise', subjectId: maths.subjectId })

      await createResult(user.userId, physique, { score: 1, total: 4 })
      expect(await emit('exercise.submitted', { userId: user.userId })).toEqual([])

      await createResult(user.userId, maths, { score: 1, total: 4 })
      expect(await emit('exercise.submitted', { userId: user.userId })).toEqual(['firstExercise'])
    })

    it('handle - badge lié à deux matières - le total cumule les deux et ignore les autres', async () => {
      const user = await createUser()
      const autre = await createSubject('Autre')
      await BadgeSubject.bulkCreate([
        { badgeCode: 'tenTests', subjectId: maths.subjectId },
        { badgeCode: 'tenTests', subjectId: physique.subjectId }
      ])
      for (let i = 0; i < 4; i++) await createResult(user.userId, maths, { score: 1, total: 4 })
      for (let i = 0; i < 4; i++) await createResult(user.userId, physique, { score: 1, total: 4 })
      for (let i = 0; i < 5; i++) await createResult(user.userId, autre, { score: 1, total: 4 })

      expect(await emit('exercise.submitted', { userId: user.userId })).not.toContain('tenTests')

      await createResult(user.userId, physique, { score: 1, total: 4 })
      await createResult(user.userId, maths, { score: 1, total: 4 })
      expect(await emit('exercise.submitted', { userId: user.userId })).toContain('tenTests')
    })

    it('list - badge lié non obtenu - la progression ne compte que les matières liées', async () => {
      const user = await createUser()
      await BadgeSubject.create({ badgeCode: 'tenTests', subjectId: maths.subjectId })
      for (let i = 0; i < 3; i++) await createResult(user.userId, maths, { score: 1, total: 4 })
      for (let i = 0; i < 6; i++) await createResult(user.userId, physique, { score: 1, total: 4 })

      const badge = (await badgeService.list(user.userId)).find((b) => b.code === 'tenTests')

      expect(badge.progress).toEqual({ current: 3, target: 10 })
    })

    it('handle - obtention - enregistre les matières avec lesquelles le badge a été obtenu', async () => {
      const user = await createUser()
      await createResult(user.userId, maths, { score: 3, total: 3 })
      await createResult(user.userId, physique, { score: 1, total: 4 })

      await emit('exercise.submitted', { userId: user.userId })

      const byCode = Object.fromEntries((await badgeService.list(user.userId)).map((b) => [b.code, b]))
      expect(byCode.firstExercise.earnedSubjectIds).toEqual([maths.subjectId, physique.subjectId].sort((a, b) => a - b))
      // 100 % uniquement en Maths : la Physique n'a pas contribué à ce badge
      expect(byCode.perfectScore.earnedSubjectIds).toEqual([maths.subjectId])
    })

    it('listForSubjects - badge obtenu avec Maths - visible avec le consentement Maths, sans lien administrateur', async () => {
      const user = await createUser()
      await createResult(user.userId, maths, { score: 3, total: 3 })
      await emit('exercise.submitted', { userId: user.userId })

      const visible = await badgeService.listForSubjects(user.userId, [maths.subjectId])

      expect(visible.map((b) => b.id).sort()).toEqual(['firstExercise', 'perfectScore'])
      expect(visible.every((b) => b.unlocked === true)).toBe(true)
    })

    it('listForSubjects - badge obtenu avec Physique seulement - invisible avec le consentement Maths', async () => {
      const user = await createUser()
      await createResult(user.userId, physique, { score: 3, total: 3 })
      await emit('exercise.submitted', { userId: user.userId })

      expect(await badgeService.listForSubjects(user.userId, [maths.subjectId])).toEqual([])
    })

    it('listForSubjects - badge obtenu avec deux matières - visible avec une seule consentie, sans révéler l\'autre', async () => {
      const user = await createUser()
      await createResult(user.userId, maths, { score: 1, total: 4 })
      await createResult(user.userId, physique, { score: 1, total: 4 })
      await emit('exercise.submitted', { userId: user.userId })

      const visible = await badgeService.listForSubjects(user.userId, [maths.subjectId])

      const first = visible.find((b) => b.id === 'firstExercise')
      expect(first.earnedSubjectIds).toEqual([maths.subjectId])
    })

    it('listForSubjects - lien administrateur sans contribution - ne rend pas le badge visible', async () => {
      const user = await createUser()
      await BadgeSubject.create({ badgeCode: 'firstExercise', subjectId: maths.subjectId })
      await UserBadge.create({ userId: user.userId, badgeCode: 'firstExercise', context: { value: 1, subjectIds: [physique.subjectId] } })

      expect(await badgeService.listForSubjects(user.userId, [maths.subjectId])).toEqual([])
    })

    it('listForSubjects - badge sans matière (série) ou obtenu avant l\'enregistrement des matières - jamais montré', async () => {
      const user = await createUser()
      await UserBadge.bulkCreate([
        { userId: user.userId, badgeCode: 'streak3', context: { value: 3, subjectIds: [] } },
        { userId: user.userId, badgeCode: 'firstExercise', context: { value: 1 } },
        { userId: user.userId, badgeCode: 'tenTests' }
      ])

      expect(await badgeService.listForSubjects(user.userId, [maths.subjectId])).toEqual([])
    })

    it('listForSubjects - badge visible - renvoie le nom des matières consenties pour l\'affichage enseignant', async () => {
      const user = await createUser()
      await createResult(user.userId, maths, { score: 1, total: 4 })
      await createResult(user.userId, physique, { score: 1, total: 4 })
      await emit('exercise.submitted', { userId: user.userId })

      const visible = await badgeService.listForSubjects(user.userId, [maths.subjectId])

      expect(visible.find((b) => b.id === 'firstExercise').earnedSubjects).toEqual([{ subjectId: maths.subjectId, name: 'Maths liées' }])
    })

    it('repairEarnedSubjects - badge obtenu sans matières enregistrées - reconstruit depuis l\'activité', async () => {
      const user = await createUser()
      await createResult(user.userId, maths, { score: 3, total: 3 })
      await UserBadge.bulkCreate([
        { userId: user.userId, badgeCode: 'firstExercise', context: { value: 1 } },
        { userId: user.userId, badgeCode: 'perfectScore' },
        { userId: user.userId, badgeCode: 'streak3', context: { value: 3 } }
      ])
      expect(await badgeService.listForSubjects(user.userId, [maths.subjectId])).toEqual([])

      expect(await badgeService.repairEarnedSubjects(user.userId)).toBe(3)

      const visible = await badgeService.listForSubjects(user.userId, [maths.subjectId])
      expect(visible.map((b) => b.id).sort()).toEqual(['firstExercise', 'perfectScore'])
      const streak = await UserBadge.findOne({ where: { userId: user.userId, badgeCode: 'streak3' } })
      expect(streak.context).toEqual({ value: 3, subjectIds: [] })
    })

    it('repairEarnedSubjects - rejoué - ne modifie rien la seconde fois', async () => {
      const user = await createUser()
      await createResult(user.userId, maths, { score: 1, total: 4 })
      await UserBadge.create({ userId: user.userId, badgeCode: 'firstExercise' })

      expect(await badgeService.repairEarnedSubjects(user.userId)).toBe(1)
      expect(await badgeService.repairEarnedSubjects(user.userId)).toBe(0)
    })

    it('backfill - badge ancien sans matières - les renseigne', async () => {
      const user = await createUser()
      await createResult(user.userId, maths, { score: 1, total: 4 })
      await UserBadge.create({ userId: user.userId, badgeCode: 'firstExercise' })

      const result = await badgeService.backfill(user.userId)

      expect(result.subjectsRepaired).toBeGreaterThanOrEqual(1)
      expect(await badgeService.listForSubjects(user.userId, [maths.subjectId])).toHaveLength(1)
    })

    it('listForSubjects - badge lié non obtenu - non montré', async () => {
      const user = await createUser()
      await BadgeSubject.create({ badgeCode: 'firstExercise', subjectId: maths.subjectId })

      expect(await badgeService.listForSubjects(user.userId, [maths.subjectId])).toEqual([])
    })
  })
})

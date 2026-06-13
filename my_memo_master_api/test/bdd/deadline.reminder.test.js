// Tests fonctionnels Deadline + Reminder (M-03.10)
// Base SQLite en mémoire — BullMQ mocké (pas de Redis en test).
// Les couches controller → service → model → DB sont réelles.

process.env.AUTH_JWT_SECRET = 'test-secret'
process.env.NODE_ENV = 'test'
process.env.VITE_FRONT_URL = 'http://localhost:5173'
process.env.DB_STORAGE = ':memory:'

jest.mock('../../jobs/fifo.cron', () => ({ startFifoCron: jest.fn() }))
jest.mock('../../helpers/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }))

// Mock BullMQ : aucune connexion Redis requise
const mockJob = { id: 'fake-job-1', remove: jest.fn() }
const mockQueue = {
  add: jest.fn().mockResolvedValue(mockJob),
  getJob: jest.fn().mockResolvedValue(mockJob)
}
jest.mock('../../jobs/reminder.queue', () => ({
  getReminderQueue: jest.fn(() => mockQueue)
}))
jest.mock('../../jobs/reminder.worker', () => ({
  startReminderWorker: jest.fn()
}))

const request = require('supertest')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const app = require('../../app')
const {
  syncModels,
  Role,
  User,
  ClassGroup,
  ClassGroupUsers,
  CalendarEvent,
  EventOccurrence
} = require('../../models')

const BASE = '/api/v1'
const makeToken = (userId) => jwt.sign({ id: userId }, 'test-secret', { expiresIn: '1d' })

// ─── État partagé ────────────────────────────────────────────────────────────
let teacherToken, studentToken
let teacherUserId, studentUserId
let occurrenceId
let deadlineId, reminderId

// ─── Setup ───────────────────────────────────────────────────────────────────
beforeAll(async () => {
  await syncModels({ force: true })

  const roleEtudiant = await Role.create({ name: 'Étudiant' })
  const roleEnseignant = await Role.create({ name: 'Enseignant' })

  const hash = await bcrypt.hash('Test1234!', 10)

  const teacher = await User.create({
    name: 'Prof BDD',
    email: 'prof.bdd@test.fr',
    password: hash,
    roleId: roleEnseignant.roleId,
    hasValidatedEmail: true,
    createdAt: new Date(),
    updatedAt: new Date()
  })
  teacherUserId = teacher.userId
  teacherToken = makeToken(teacherUserId)

  const student = await User.create({
    name: 'Etudiant BDD',
    email: 'etudiant.bdd@test.fr',
    password: hash,
    roleId: roleEtudiant.roleId,
    hasValidatedEmail: true,
    createdAt: new Date(),
    updatedAt: new Date()
  })
  studentUserId = student.userId
  studentToken = makeToken(studentUserId)

  // Groupe classe avec le prof comme enseignant
  const group = await ClassGroup.create({
    name: 'Terminale S',
    createdBy: teacherUserId,
    createdAt: new Date()
  })

  await ClassGroupUsers.create({
    classGroupId: group.id,
    userId: teacherUserId,
    role: 'teacher'
  })

  // Événement et occurrence
  const event = await CalendarEvent.create({
    name: 'Cours Thermodynamique',
    type: 'course',
    recurrenceMode: 'manual',
    classGroupId: group.id,
    createdBy: teacherUserId
  })

  // Date future (dans 30 jours) pour que les rappels soient valides
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + 30)
  const futureDateStr = futureDate.toISOString().slice(0, 10)

  const occurrence = await EventOccurrence.create({
    eventId: event.id,
    date: futureDateStr,
    startTime: '08:00',
    endTime: '10:00'
  })
  occurrenceId = occurrence.id
})

afterAll(async () => {
  const { instance } = require('../../models')
  await instance.close()
})

// ─── Scénarios ───────────────────────────────────────────────────────────────
describe('Flux fonctionnel Deadline + Reminder', () => {

  describe('POST /deadlines', () => {
    it("crée une échéance si l'utilisateur est enseignant dans le groupe", async () => {
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 35)

      const res = await request(app)
        .post(`${BASE}/deadlines`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          name: 'DM Thermodynamique ch.3',
          type: 'devoir',
          occurrenceId,
          dueDate: dueDate.toISOString().slice(0, 10),
          dueTime: '23:59'
        })

      expect(res.status).toBe(201)
      expect(res.body.data.name).toBe('DM Thermodynamique ch.3')
      deadlineId = res.body.data.id
    })

    it("retourne 403 si l'utilisateur n'est pas enseignant dans le groupe", async () => {
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 35)

      const res = await request(app)
        .post(`${BASE}/deadlines`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          name: 'DM Illicite',
          type: 'devoir',
          occurrenceId,
          dueDate: dueDate.toISOString().slice(0, 10),
          dueTime: '23:59'
        })

      expect(res.status).toBe(403)
    })

    it('retourne 401 sans token', async () => {
      const res = await request(app).post(`${BASE}/deadlines`).send({ name: 'X' })
      expect(res.status).toBe(401)
    })

    it('retourne 400 si les champs obligatoires sont manquants', async () => {
      const res = await request(app)
        .post(`${BASE}/deadlines`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ name: 'DM sans date' })

      expect(res.status).toBe(400)
    })
  })

  describe('GET /deadlines', () => {
    it("retourne les échéances des groupes de l'utilisateur", async () => {
      // Ajouter l'étudiant au groupe pour qu'il puisse voir les deadlines
      const { ClassGroupUsers: CGU, ClassGroup: CG } = require('../../models')
      const groups = await CG.findAll({ where: { name: 'Terminale S' } })
      await CGU.create({
        classGroupId: groups[0].id,
        userId: studentUserId,
        role: 'student'
      })

      const res = await request(app)
        .get(`${BASE}/deadlines`)
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBeGreaterThan(0)
      expect(res.body.data[0].name).toBe('DM Thermodynamique ch.3')
    })

    it('retourne [] si aucun groupe', async () => {
      // Créer un user sans groupe
      const { User: U, Role: R } = require('../../models')
      const role = await R.findOne({ where: { name: 'Étudiant' } })
      const loneUser = await U.create({
        name: 'Utilisateur seul',
        email: 'seul@test.fr',
        password: await bcrypt.hash('Test1234!', 10),
        roleId: role.roleId,
        hasValidatedEmail: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      const loneToken = makeToken(loneUser.userId)

      const res = await request(app)
        .get(`${BASE}/deadlines`)
        .set('Authorization', `Bearer ${loneToken}`)

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
    })
  })

  describe('POST /reminders — sur une deadline', () => {
    it('crée un rappel sur la deadline créée (BullMQ job planifié)', async () => {
      const res = await request(app)
        .post(`${BASE}/reminders`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          entityType: 'deadline',
          entityId: deadlineId,
          delayMinutes: 1440,
          message: 'Penser à corriger'
        })

      expect(res.status).toBe(201)
      expect(res.body.data.entityType).toBe('deadline')
      expect(res.body.data.entityId).toBe(deadlineId)
      expect(res.body.data.status).toBe('pending')
      expect(res.body.data.delayMinutes).toBe(1440)
      // Vérifie que le job BullMQ a été planifié
      expect(mockQueue.add).toHaveBeenCalled()
      reminderId = res.body.data.id
    })

    it('retourne 400 si la date de rappel est déjà passée (délai trop grand)', async () => {
      // Deadline dans 35 jours, délai de 99999 min ≈ 69 jours → reminderAt dans le passé
      const res = await request(app)
        .post(`${BASE}/reminders`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          entityType: 'deadline',
          entityId: deadlineId,
          delayMinutes: 99999
        })

      expect(res.status).toBe(400)
    })

    it('retourne 404 si la deadline est introuvable', async () => {
      const res = await request(app)
        .post(`${BASE}/reminders`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          entityType: 'deadline',
          entityId: 9999,
          delayMinutes: 60
        })

      expect(res.status).toBe(404)
    })

    it('retourne 400 si entityType est invalide', async () => {
      const res = await request(app)
        .post(`${BASE}/reminders`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          entityType: 'calendar_event',
          entityId: deadlineId,
          delayMinutes: 60
        })

      expect(res.status).toBe(400)
    })
  })

  describe('GET /reminders', () => {
    it('liste le rappel créé avec son statut pending', async () => {
      const res = await request(app)
        .get(`${BASE}/reminders`)
        .set('Authorization', `Bearer ${teacherToken}`)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      const found = res.body.data.find((r) => r.id === reminderId)
      expect(found).toBeDefined()
      expect(found.status).toBe('pending')
      expect(found.entityType).toBe('deadline')
    })

    it("ne retourne pas les rappels d'un autre utilisateur", async () => {
      const res = await request(app)
        .get(`${BASE}/reminders`)
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)
      const found = res.body.data.find((r) => r.id === reminderId)
      expect(found).toBeUndefined()
    })
  })

  describe('DELETE /reminders/:id', () => {
    it('supprime le rappel et annule le job BullMQ', async () => {
      const res = await request(app)
        .delete(`${BASE}/reminders/${reminderId}`)
        .set('Authorization', `Bearer ${teacherToken}`)

      expect(res.status).toBe(200)
      // Vérifie que le job a été cherché pour annulation
      expect(mockQueue.getJob).toHaveBeenCalled()
    })

    it('GET /reminders — liste vide après suppression', async () => {
      const res = await request(app)
        .get(`${BASE}/reminders`)
        .set('Authorization', `Bearer ${teacherToken}`)

      expect(res.status).toBe(200)
      const found = res.body.data.find((r) => r.id === reminderId)
      expect(found).toBeUndefined()
    })

    it('retourne 404 si le rappel est déjà supprimé', async () => {
      const res = await request(app)
        .delete(`${BASE}/reminders/${reminderId}`)
        .set('Authorization', `Bearer ${teacherToken}`)

      expect(res.status).toBe(404)
    })
  })
})

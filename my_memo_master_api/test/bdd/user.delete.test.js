// Test de non-régression : suppression d'un compte utilisateur (bug 500 en prod — FK MindMap.userId
// sans ON DELETE, réservée à PostgreSQL car NO ACTION n'y est pas enfreinte par une base vide en dev).
// Base SQLite in-memory, aucune couche mockée (controller → service → model → DB réelle).

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
const { syncModels, Diagramme, Subject, User, Role } = require('../../models')

const BASE = '/api/v1'
const makeToken = (userId) => jwt.sign({ id: userId }, 'test-secret', { expiresIn: '1d' })

describe('User — suppression de compte (test fonctionnel DB réelle)', () => {
  let role

  beforeAll(async () => {
    await syncModels({ force: true })
    role = await Role.create({ name: 'Étudiant' })
  })

  it("DELETE /users/:id — utilisateur sans carte mentale — supprime sans erreur 500", async () => {
    const user = await User.create({
      name: 'Sans Carte',
      email: 'sanscarte@test.fr',
      password: await bcrypt.hash('Test1234!', 10),
      roleId: role.roleId,
      hasValidatedEmail: true,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    const res = await request(app)
      .delete(`${BASE}/users/${user.userId}`)
      .set('Authorization', `Bearer ${makeToken(user.userId)}`)

    expect(res.status).toBe(200)
    expect(await User.findByPk(user.userId)).toBeNull()
  })

  it("DELETE /users/:id — utilisateur avec une carte mentale enregistrée — supprime sans erreur 500 et détache la carte (SET NULL, pas de perte de données)", async () => {
    const user = await User.create({
      name: 'Avec Carte',
      email: 'aveccarte@test.fr',
      password: await bcrypt.hash('Test1234!', 10),
      roleId: role.roleId,
      hasValidatedEmail: true,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    const subject = await Subject.create({ name: 'Matière test' })
    const mindMap = await Diagramme.create({
      mmName: 'Carte de test',
      mindMapJson: { nodes: [], edges: [] },
      userId: user.userId,
      subjectId: subject.subjectId
    })

    const res = await request(app)
      .delete(`${BASE}/users/${user.userId}`)
      .set('Authorization', `Bearer ${makeToken(user.userId)}`)

    expect(res.status).toBe(200)
    expect(await User.findByPk(user.userId)).toBeNull()

    // La carte mentale doit survivre, orpheline (SET NULL) — pas supprimée avec le compte
    const mindMapAfter = await Diagramme.findByPk(mindMap.idMindMap)
    expect(mindMapAfter).not.toBeNull()
    expect(mindMapAfter.userId).toBeNull()
  })
})

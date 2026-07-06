// Test de non-régression : suppression d'un système de Leitner (bug 500 — FK LeitnerBox sans ON DELETE CASCADE)
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
const { syncModels, LeitnerSystem, LeitnerBox, User, Role } = require('../../models')

const BASE = '/api/v1'
const makeToken = (userId) => jwt.sign({ id: userId }, 'test-secret', { expiresIn: '1d' })

describe('LeitnerSystem — suppression (test fonctionnel DB réelle)', () => {
  let token
  let userId

  beforeAll(async () => {
    await syncModels({ force: true })

    const role = await Role.create({ name: 'Étudiant' })
    const user = await User.create({
      name: 'Delete Tester',
      email: 'delete@test.fr',
      password: await bcrypt.hash('Test1234!', 10),
      roleId: role.roleId,
      hasValidatedEmail: true,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    userId = user.userId
    token = makeToken(userId)
  })

  it('DELETE /leitnersystems/:id — système avec ses 5 boîtes par défaut — supprime sans erreur 500 et cascade les boîtes', async () => {
    const createRes = await request(app)
      .post(`${BASE}/leitnersystems`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Système à supprimer' })

    expect(createRes.status).toBe(201)
    const systemId = createRes.body.idSystem

    const boxesBefore = await LeitnerBox.findAll({ where: { idSystem: systemId } })
    expect(boxesBefore).toHaveLength(5)
    const boxIds = boxesBefore.map((b) => b.idBox)

    const deleteRes = await request(app)
      .delete(`${BASE}/leitnersystems/${systemId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(deleteRes.status).toBe(200)

    const systemAfter = await LeitnerSystem.findByPk(systemId)
    expect(systemAfter).toBeNull()

    // Vérifie que les boîtes sont réellement supprimées (CASCADE), pas seulement détachées (SET NULL)
    const boxesAfter = await LeitnerBox.findAll({ where: { idBox: boxIds } })
    expect(boxesAfter).toHaveLength(0)
  })
})

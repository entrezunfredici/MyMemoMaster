jest.mock('../../models/index', () => ({
  instance: { sync: jest.fn() },
  sequelize: { transaction: jest.fn() },
  User: { findByPk: jest.fn() },
  Role: {},
  Subject: {},
  LeitnerSystem: {},
  LeitnerCard: {},
  LeitnerBox: {},
  LeitnerSystemsUsers: {},
  Unit: {},
  Response: {},
  Fields: {},
  FieldsType: {},
  Diagramme: {},
  Test: {},
  Question: {},
  Tutorials: {}
}))
jest.mock('../../jobs/fifo.cron', () => ({ startFifoCron: jest.fn() }))
jest.mock('../../helpers/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }))
jest.mock('../../helpers/sendEmail', () => jest.fn())
jest.mock('../../services/UserDataExport.service', () => {
  class ImportValidationError extends Error {}
  return { exportUserData: jest.fn(), importUserData: jest.fn(), ImportValidationError }
})

process.env.AUTH_JWT_SECRET = 'test-secret'
process.env.AUTH_JWT_EXPIRES_IN = '1d'
process.env.NODE_ENV = 'test'

const request = require('supertest')
const jwt = require('jsonwebtoken')
const app = require('../../app')
const exportService = require('../../services/UserDataExport.service')
const { User } = require('../../models/index')

const token = jwt.sign({ id: 1, name: 'Test', email: 't@example.com' }, 'test-secret', { expiresIn: '1d' })
const auth = { Authorization: `Bearer ${token}` }
const body = { format: 'mymemomaster-export', version: 1, leitnerSystems: [] }
const summary = { systems: 0, cards: 0, mindMaps: 0, skipped: [] }

describe('UserData Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    User.findByPk.mockResolvedValue({ roleId: 2 })
  })

  describe('GET /users/me/export', () => {
    it('200 — renvoie le JSON en pièce jointe', async () => {
      exportService.exportUserData.mockResolvedValue({ format: 'mymemomaster-export', version: 1 })
      const res = await request(app).get('/api/v1/users/me/export').set(auth)

      expect(res.status).toBe(200)
      expect(res.headers['content-disposition']).toMatch(
        /attachment; filename="mymemomaster-export-\d{4}-\d{2}-\d{2}\.json"/
      )
      expect(exportService.exportUserData).toHaveBeenCalledWith(1)
    })

    it('401 — sans jeton', async () => {
      const res = await request(app).get('/api/v1/users/me/export')
      expect(res.status).toBe(401)
    })

    it('404 — utilisateur introuvable', async () => {
      exportService.exportUserData.mockResolvedValue(null)
      const res = await request(app).get('/api/v1/users/me/export').set(auth)
      expect(res.status).toBe(404)
    })

    it('500 — erreur service', async () => {
      exportService.exportUserData.mockRejectedValue(new Error('boom'))
      const res = await request(app).get('/api/v1/users/me/export').set(auth)
      expect(res.status).toBe(500)
    })
  })

  describe('POST /users/me/import', () => {
    it('201 — import réussi', async () => {
      exportService.importUserData.mockResolvedValue(summary)
      const res = await request(app).post('/api/v1/users/me/import').set(auth).send(body)

      expect(res.status).toBe(201)
      expect(exportService.importUserData).toHaveBeenCalledWith(1, expect.objectContaining({ version: 1 }))
    })

    it('400 — enveloppe invalide', async () => {
      const res = await request(app).post('/api/v1/users/me/import').set(auth).send({ format: 'autre' })
      expect(res.status).toBe(400)
      expect(exportService.importUserData).not.toHaveBeenCalled()
    })

    it('400 — contenu refusé par le service', async () => {
      exportService.importUserData.mockRejectedValue(new exportService.ImportValidationError('Type invalide'))
      const res = await request(app).post('/api/v1/users/me/import').set(auth).send(body)
      expect(res.status).toBe(400)
      expect(res.body.message).toBe('Type invalide')
    })

    it('500 — erreur système', async () => {
      exportService.importUserData.mockRejectedValue(new Error('db'))
      const res = await request(app).post('/api/v1/users/me/import').set(auth).send(body)
      expect(res.status).toBe(500)
    })

    it('201 — accepte un corps supérieur à 10 Ko', async () => {
      exportService.importUserData.mockResolvedValue(summary)
      const big = { ...body, padding: 'a'.repeat(50 * 1024) }
      const res = await request(app).post('/api/v1/users/me/import').set(auth).send(big)
      expect(res.status).toBe(201)
    })
  })
})

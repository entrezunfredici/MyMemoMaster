jest.mock('../../models/index', () => ({
  instance: { sync: jest.fn() },
  sequelize: { transaction: jest.fn() },
  User: {},
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

process.env.AUTH_JWT_SECRET = 'test-secret'
process.env.VITE_FRONT_URL = 'http://localhost:5173'
process.env.NODE_ENV = 'test'

const request = require('supertest')
const app = require('../../app')

// FIX: err.type === 'entity.too.large' (levé par raw-body, status 413) tombait auparavant dans le
// cas générique de errorHandler.middleware.js et renvoyait "Erreur interne du serveur." — message
// trompeur pour une erreur client (payload trop volumineux). Voir DECISIONS.md.
describe('errorHandler.middleware — dépassement de plafond body-parser (413)', () => {
  it("413 — message français dédié sur une route JSON hors du plafond dédié à /diagrammes (plafond global 10kb)", async () => {
    const res = await request(app)
      .post('/api/v1/users/login')
      .send({ email: 'a@a.fr', password: 'x'.repeat(15000) })

    expect(res.status).toBe(413)
    expect(res.body.message).toBe('Le contenu envoyé dépasse la taille maximale autorisée.')
  })

  it("ne déclenche pas ce plafond sur /diagrammes en dessous de 100 Mo (plafond dédié)", async () => {
    // Aucun token fourni : la requête est de toute façon rejetée en 401 par Auth.middleware,
    // mais APRÈS le body-parser — un 401 (et non 413) prouve que le corps a bien été accepté et
    // parsé par le plafond dédié à 100 Mo posé sur /api/v1/diagrammes (app.js).
    const res = await request(app)
      .post('/api/v1/diagrammes')
      .send({ mmName: 'Grande carte', mindMapJson: JSON.stringify({ label: 'x'.repeat(15000) }) })

    expect(res.status).toBe(401)
  })
})

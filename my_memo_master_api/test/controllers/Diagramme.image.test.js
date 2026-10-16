// Route publique GET /diagrammes/image/* : ne doit servir QUE les images de cartes mentales.
// Le bucket contient aussi des fichiers privés (uploads/) et les sauvegardes de la base (backups/).
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
jest.mock('../../services/Diagramme.service', () => ({}))

const mockSend = jest.fn()
jest.mock('../../config/storage.config', () => ({
  s3Client: { send: (...args) => mockSend(...args) },
  bucket: 'test-bucket',
  publicUrl: 'https://s3.example.test',
  buildPublicUrl: (key) => `https://s3.example.test/test-bucket/${key}`
}))

process.env.AUTH_JWT_SECRET = 'test-secret'
process.env.VITE_FRONT_URL = 'http://localhost:5173'
process.env.NODE_ENV = 'test'

const request = require('supertest')
const { Readable } = require('stream')
const app = require('../../app')

const BASE = '/api/v1/diagrammes/image'

describe('GET /diagrammes/image/* — restriction aux images de cartes mentales', () => {
  const ORIGINAL = process.env.S3_KEY_PREFIX

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.S3_KEY_PREFIX = 'prod/'
    mockSend.mockResolvedValue({ Body: Readable.from(['img']), ContentType: 'image/png', ContentLength: 3 })
  })

  afterAll(() => {
    if (ORIGINAL === undefined) delete process.env.S3_KEY_PREFIX
    else process.env.S3_KEY_PREFIX = ORIGINAL
  })

  it('image de l\'environnement courant - 200 et lecture S3', async () => {
    const res = await request(app).get(`${BASE}/prod/mindmaps/1-ab.png`)
    expect(res.status).toBe(200)
    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(mockSend.mock.calls[0][0].input).toEqual({ Bucket: 'test-bucket', Key: 'prod/mindmaps/1-ab.png' })
  })

  it('image historique sans préfixe - 200 (objets créés avant S3_KEY_PREFIX)', async () => {
    const res = await request(app).get(`${BASE}/mindmaps/1-ab.png`)
    expect(res.status).toBe(200)
  })

  it('sauvegarde de la base (backups/prod/...) - 400 et AUCUN appel S3', async () => {
    const res = await request(app).get(`${BASE}/backups/prod/mmm-20261012T030000Z.dump`)
    expect(res.status).toBe(400)
    expect(res.body.message).toBe('Clé image invalide.')
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('fichier privé d\'un utilisateur (uploads/...) - 400 et AUCUN appel S3', async () => {
    const res = await request(app).get(`${BASE}/prod/uploads/42/1-ab.pdf`)
    expect(res.status).toBe(400)
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('image d\'un autre environnement (preprod/mindmaps/...) - 400 et AUCUN appel S3', async () => {
    const res = await request(app).get(`${BASE}/preprod/mindmaps/1-ab.png`)
    expect(res.status).toBe(400)
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('traversée "../" depuis mindmaps vers backups - 400 et AUCUN appel S3', async () => {
    const res = await request(app).get(`${BASE}/mindmaps/../backups/prod/mmm.dump`).redirects(0)
    expect([400, 404]).toContain(res.status)
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('traversée encodée (%2e%2e) - 400 et AUCUN appel S3', async () => {
    const res = await request(app).get(`${BASE}/mindmaps/%2e%2e/backups/prod/mmm.dump`)
    expect([400, 404]).toContain(res.status)
    expect(mockSend).not.toHaveBeenCalled()
  })
})

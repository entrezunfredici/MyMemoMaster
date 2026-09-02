// Tests fonctionnels de bout en bout (routes → controller → services → DB réelle SQLite en
// mémoire) pour la chaîne génération IA → stockage en attente (C-01.04/05/07 + branchement HTTP).
// Seul AiCardGenerationPipelineService est mocké (appels LLM/OCR réels déjà couverts par leurs
// propres tests unitaires et par une vérification manuelle documentée dans CHANGELOG_AGENT.md) —
// tout le reste (auth, upload, validation, droits, transaction, persistance) est réel.

process.env.AUTH_JWT_SECRET = 'test-secret'
process.env.NODE_ENV = 'test'
process.env.VITE_FRONT_URL = 'http://localhost:5173'
process.env.DB_STORAGE = ':memory:'

jest.mock('../../services/AiCardGenerationPipeline.service', () => ({
  generateCardsFromContent: jest.fn()
}))
jest.mock('../../jobs/fifo.cron', () => ({ startFifoCron: jest.fn() }))
jest.mock('../../jobs/reminder.worker', () => ({ startReminderWorker: jest.fn() }))
jest.mock('../../jobs/reminder.queue', () => ({ getReminderQueue: jest.fn(), closeReminderQueue: jest.fn() }))
jest.mock('../../jobs/kpiAlert.cron', () => ({ startKpiAlertCron: jest.fn() }))
jest.mock('../../helpers/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }))

const request = require('supertest')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const aiCardGenerationPipelineService = require('../../services/AiCardGenerationPipeline.service')
const app = require('../../app')
const { syncModels, Role, User, LeitnerSystem, AiUsageLog } = require('../../models')

const BASE = '/api/v1'
const makeToken = (userId) => jwt.sign({ id: userId }, 'test-secret', { expiresIn: '1d' })

const FAKE_PIPELINE_RESULT = {
  cards: [{ statement: 'Q1', type: 'open', answer: 'A1', acceptedAnswers: [], sourceExcerpt: 'E1' }],
  warnings: [],
  usage: { model: 'mistral-small-latest', promptTokens: 100, completionTokens: 50, ocrPagesProcessed: 0 }
}

describe('AiGenerationBatch — routes (tests fonctionnels)', () => {
  let token
  let userId
  let otherToken
  let system
  let otherUserSystem

  beforeAll(async () => {
    await syncModels({ force: true })

    const role = await Role.create({ name: 'Étudiant' })

    const user = await User.create({
      name: 'Batch Route Tester',
      email: 'batch-route@test.fr',
      password: await bcrypt.hash('Test1234!', 10),
      roleId: role.roleId,
      hasValidatedEmail: true,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    userId = user.userId
    token = makeToken(userId)
    system = await LeitnerSystem.create({ name: 'Système test', idUser: userId })

    const otherUser = await User.create({
      name: 'Autre utilisateur',
      email: 'autre-route@test.fr',
      password: await bcrypt.hash('Test1234!', 10),
      roleId: role.roleId,
      hasValidatedEmail: true,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    otherToken = makeToken(otherUser.userId)
    otherUserSystem = await LeitnerSystem.create({ name: 'Système autre', idUser: otherUser.userId })
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /ai-generation-batches', () => {
    it('POST — texte source, cas nominal — 201, crée le batch pending avec ses cartes', async () => {
      aiCardGenerationPipelineService.generateCardsFromContent.mockResolvedValue(FAKE_PIPELINE_RESULT)

      const res = await request(app)
        .post(`${BASE}/ai-generation-batches`)
        .set('Authorization', `Bearer ${token}`)
        .field('idSystem', String(system.idSystem))
        .field('cardCount', '1')
        .field('sourceText', 'Un texte source suffisant.')

      expect(res.status).toBe(201)
      expect(res.body.status).toBe('pending')
      expect(res.body.cards).toHaveLength(1)
      expect(aiCardGenerationPipelineService.generateCardsFromContent).toHaveBeenCalledWith(
        expect.objectContaining({ sourceText: 'Un texte source suffisant.', cardCount: 1 })
      )
    })

    it('POST — fichier PDF, cas nominal — 201, transmet un Buffer au pipeline', async () => {
      aiCardGenerationPipelineService.generateCardsFromContent.mockResolvedValue(FAKE_PIPELINE_RESULT)

      const res = await request(app)
        .post(`${BASE}/ai-generation-batches`)
        .set('Authorization', `Bearer ${token}`)
        .field('idSystem', String(system.idSystem))
        .field('cardCount', '1')
        .attach('pdf', Buffer.from('%PDF-1.4 contenu factice'), { filename: 'cours.pdf', contentType: 'application/pdf' })

      expect(res.status).toBe(201)
      const callArgs = aiCardGenerationPipelineService.generateCardsFromContent.mock.calls[0][0]
      expect(Buffer.isBuffer(callArgs.pdfBuffer)).toBe(true)
      expect(callArgs.sourceText).toBeFalsy()
    })

    it('POST — fichier dont le contenu ne correspond pas à un PDF — 400 (magic bytes)', async () => {
      const res = await request(app)
        .post(`${BASE}/ai-generation-batches`)
        .set('Authorization', `Bearer ${token}`)
        .field('idSystem', String(system.idSystem))
        .field('cardCount', '1')
        .attach('pdf', Buffer.from('ceci nest pas un pdf'), { filename: 'cours.pdf', contentType: 'application/pdf' })

      expect(res.status).toBe(400)
      expect(aiCardGenerationPipelineService.generateCardsFromContent).not.toHaveBeenCalled()
    })

    it('POST — ni texte ni PDF — 400', async () => {
      const res = await request(app)
        .post(`${BASE}/ai-generation-batches`)
        .set('Authorization', `Bearer ${token}`)
        .field('idSystem', String(system.idSystem))
        .field('cardCount', '1')

      expect(res.status).toBe(400)
    })

    it('POST — texte ET PDF fournis en même temps — 400', async () => {
      const res = await request(app)
        .post(`${BASE}/ai-generation-batches`)
        .set('Authorization', `Bearer ${token}`)
        .field('idSystem', String(system.idSystem))
        .field('cardCount', '1')
        .field('sourceText', 'Un texte.')
        .attach('pdf', Buffer.from('%PDF-1.4'), { filename: 'cours.pdf', contentType: 'application/pdf' })

      expect(res.status).toBe(400)
    })

    it('POST — cardCount hors bornes (0 ou > 30) — 400', async () => {
      const tooLow = await request(app)
        .post(`${BASE}/ai-generation-batches`)
        .set('Authorization', `Bearer ${token}`)
        .field('idSystem', String(system.idSystem))
        .field('cardCount', '0')
        .field('sourceText', 'Un texte.')
      expect(tooLow.status).toBe(400)

      const tooHigh = await request(app)
        .post(`${BASE}/ai-generation-batches`)
        .set('Authorization', `Bearer ${token}`)
        .field('idSystem', String(system.idSystem))
        .field('cardCount', '31')
        .field('sourceText', 'Un texte.')
      expect(tooHigh.status).toBe(400)
    })

    it('POST — sans token — 401', async () => {
      const res = await request(app)
        .post(`${BASE}/ai-generation-batches`)
        .field('idSystem', String(system.idSystem))
        .field('cardCount', '1')
        .field('sourceText', 'Un texte.')
      expect(res.status).toBe(401)
    })

    it('POST — système Leitner n\'appartenant pas à l\'utilisateur — 403', async () => {
      const res = await request(app)
        .post(`${BASE}/ai-generation-batches`)
        .set('Authorization', `Bearer ${token}`)
        .field('idSystem', String(otherUserSystem.idSystem))
        .field('cardCount', '1')
        .field('sourceText', 'Un texte.')

      expect(res.status).toBe(403)
      expect(aiCardGenerationPipelineService.generateCardsFromContent).not.toHaveBeenCalled()
    })

    it('POST — le pipeline échoue (ex. LLM indisponible) — relaie le statusCode et le message du service', async () => {
      aiCardGenerationPipelineService.generateCardsFromContent.mockRejectedValue(
        Object.assign(new Error('Le service de génération IA est indisponible pour le moment.'), { statusCode: 502 })
      )

      const res = await request(app)
        .post(`${BASE}/ai-generation-batches`)
        .set('Authorization', `Bearer ${token}`)
        .field('idSystem', String(system.idSystem))
        .field('cardCount', '1')
        .field('sourceText', 'Un texte.')

      expect(res.status).toBe(502)
      expect(res.body.message).toBe('Le service de génération IA est indisponible pour le moment.')
    })

    it('POST — le pipeline échoue MAIS a réellement facturé un usage — journalisé quand même, avec idBatch null', async () => {
      aiCardGenerationPipelineService.generateCardsFromContent.mockRejectedValue(
        Object.assign(new Error("La génération n'a pas produit un résultat exploitable. Réessayez."), {
          statusCode: 502,
          usage: { model: 'mistral-small-latest', promptTokens: 200, completionTokens: 100, ocrPagesProcessed: 0 }
        })
      )

      const res = await request(app)
        .post(`${BASE}/ai-generation-batches`)
        .set('Authorization', `Bearer ${token}`)
        .field('idSystem', String(system.idSystem))
        .field('cardCount', '1')
        .field('sourceText', 'Un texte.')

      expect(res.status).toBe(502)
      const log = await AiUsageLog.findOne({ where: { userId, idBatch: null }, order: [['id', 'DESC']] })
      expect(log).not.toBeNull()
      expect(log.promptTokens).toBe(200)
      expect(log.completionTokens).toBe(100)
    })

    it('POST — journalise l\'usage réel après une génération réussie (AiUsageLog)', async () => {
      aiCardGenerationPipelineService.generateCardsFromContent.mockResolvedValue(FAKE_PIPELINE_RESULT)

      const res = await request(app)
        .post(`${BASE}/ai-generation-batches`)
        .set('Authorization', `Bearer ${token}`)
        .field('idSystem', String(system.idSystem))
        .field('cardCount', '1')
        .field('sourceText', 'Un texte.')

      expect(res.status).toBe(201)
      const log = await AiUsageLog.findOne({ where: { idBatch: res.body.id } })
      expect(log).not.toBeNull()
      expect(log.model).toBe('mistral-small-latest')
      expect(log.promptTokens).toBe(100)
      expect(log.completionTokens).toBe(50)
      expect(log.estimatedCostUsd).toBeGreaterThan(0)
    })

    it('POST — quota quotidien atteint — 429, aucun appel au pipeline (pas de coût engagé)', async () => {
      process.env.AI_QUOTA_MAX_GENERATIONS_PER_DAY = '0'
      try {
        const res = await request(app)
          .post(`${BASE}/ai-generation-batches`)
          .set('Authorization', `Bearer ${token}`)
          .field('idSystem', String(system.idSystem))
          .field('cardCount', '1')
          .field('sourceText', 'Un texte.')

        expect(res.status).toBe(429)
        expect(aiCardGenerationPipelineService.generateCardsFromContent).not.toHaveBeenCalled()
      } finally {
        delete process.env.AI_QUOTA_MAX_GENERATIONS_PER_DAY
      }
    })

    it('POST — budget mensuel atteint — 429', async () => {
      process.env.AI_BUDGET_MAX_USD_PER_MONTH = '0'
      try {
        const res = await request(app)
          .post(`${BASE}/ai-generation-batches`)
          .set('Authorization', `Bearer ${token}`)
          .field('idSystem', String(system.idSystem))
          .field('cardCount', '1')
          .field('sourceText', 'Un texte.')

        expect(res.status).toBe(429)
      } finally {
        delete process.env.AI_BUDGET_MAX_USD_PER_MONTH
      }
    })
  })

  describe('Cycle de vie d\'un batch (GET / PATCH / DELETE)', () => {
    let batchId
    let cardId

    beforeAll(async () => {
      aiCardGenerationPipelineService.generateCardsFromContent.mockResolvedValue(FAKE_PIPELINE_RESULT)
      const res = await request(app)
        .post(`${BASE}/ai-generation-batches`)
        .set('Authorization', `Bearer ${token}`)
        .field('idSystem', String(system.idSystem))
        .field('cardCount', '1')
        .field('sourceText', 'Un texte.')
      batchId = res.body.id
      cardId = res.body.cards[0].id
    })

    it('GET /ai-generation-batches — liste les batches pending de l\'utilisateur connecté', async () => {
      const res = await request(app).get(`${BASE}/ai-generation-batches`).set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body.some((b) => b.id === batchId)).toBe(true)
    })

    it('GET /ai-generation-batches/:id — appartenant à l\'utilisateur — 200', async () => {
      const res = await request(app).get(`${BASE}/ai-generation-batches/${batchId}`).set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body.id).toBe(batchId)
    })

    it('GET /ai-generation-batches/:id — appartenant à un autre utilisateur — 404', async () => {
      const res = await request(app).get(`${BASE}/ai-generation-batches/${batchId}`).set('Authorization', `Bearer ${otherToken}`)
      expect(res.status).toBe(404)
    })

    it('PATCH /ai-generation-batches/cards/:cardId — met à jour une carte pending', async () => {
      const res = await request(app)
        .patch(`${BASE}/ai-generation-batches/cards/${cardId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ statement: 'Question modifiée', status: 'edited' })

      expect(res.status).toBe(200)
      expect(res.body.statement).toBe('Question modifiée')
      expect(res.body.status).toBe('edited')
    })

    it('PATCH /ai-generation-batches/cards/:cardId — statut invalide — 400', async () => {
      const res = await request(app)
        .patch(`${BASE}/ai-generation-batches/cards/${cardId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'archived' })
      expect(res.status).toBe(400)
    })

    it('PATCH /ai-generation-batches/:id/status — marque "validated"', async () => {
      const res = await request(app)
        .patch(`${BASE}/ai-generation-batches/${batchId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'validated' })
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('validated')
    })

    it('PATCH /ai-generation-batches/cards/:cardId — batch désormais validé — 404 (plus modifiable)', async () => {
      const res = await request(app)
        .patch(`${BASE}/ai-generation-batches/cards/${cardId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'accepted' })
      expect(res.status).toBe(404)
    })

    it('DELETE /ai-generation-batches/:id — supprime le batch, puis 404 sur une relecture', async () => {
      const del = await request(app).delete(`${BASE}/ai-generation-batches/${batchId}`).set('Authorization', `Bearer ${token}`)
      expect(del.status).toBe(204)

      const getAfter = await request(app).get(`${BASE}/ai-generation-batches/${batchId}`).set('Authorization', `Bearer ${token}`)
      expect(getAfter.status).toBe(404)
    })
  })
})

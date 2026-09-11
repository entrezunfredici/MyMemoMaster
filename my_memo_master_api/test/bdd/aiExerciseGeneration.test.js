// Tests fonctionnels de bout en bout (route → controller → AiExerciseDegradedMode.service.js →
// AiExerciseGenerationPipeline.service.js mocké) pour la route HTTP de génération d'exercices par IA
// (C-02.06, étendue à l'import PDF après C-02.07). Seul le pipeline est mocké (chunking/LLM/OCR déjà
// couverts par leurs propres tests unitaires) — auth, upload, validation, mode dégradé sont réels,
// même stratégie que test/bdd/aiGenerationBatch.test.js (C-01).

process.env.AUTH_JWT_SECRET = 'test-secret'
process.env.NODE_ENV = 'test'
process.env.VITE_FRONT_URL = 'http://localhost:5173'
process.env.DB_STORAGE = ':memory:'
process.env.MISTRAL_API_KEY = 'test-key'

jest.mock('../../services/AiExerciseGenerationPipeline.service', () => ({
  generateExercisesFromContent: jest.fn()
}))
jest.mock('../../jobs/fifo.cron', () => ({ startFifoCron: jest.fn() }))
jest.mock('../../jobs/reminder.worker', () => ({ startReminderWorker: jest.fn() }))
jest.mock('../../jobs/reminder.queue', () => ({ getReminderQueue: jest.fn(), closeReminderQueue: jest.fn() }))
jest.mock('../../jobs/kpiAlert.cron', () => ({ startKpiAlertCron: jest.fn() }))
jest.mock('../../helpers/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }))

const request = require('supertest')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const aiExerciseGenerationPipelineService = require('../../services/AiExerciseGenerationPipeline.service')
const app = require('../../app')
const { syncModels, Role, User } = require('../../models')

const BASE = '/api/v1'
const makeToken = (userId) => jwt.sign({ id: userId }, 'test-secret', { expiresIn: '1d' })

const VALID_QUESTION = {
  statement: 'Qu\'est-ce que la photosynthèse ?',
  type: 'open',
  content: { correct_answer: 'Un processus de conversion de lumière en énergie chimique.', accepted_answers: [] },
  sourceExcerpt: 'La photosynthèse est...'
}

const FAKE_PIPELINE_RESULT = {
  questions: [VALID_QUESTION],
  warnings: [],
  usage: { model: 'mistral-small-latest', promptTokens: 100, completionTokens: 50, ocrPagesProcessed: 0 }
}

describe('AiExerciseGeneration — POST /ai-exercise-generations (tests fonctionnels)', () => {
  let token

  beforeAll(async () => {
    await syncModels({ force: true })
    const role = await Role.create({ name: 'Étudiant' })
    const user = await User.create({
      name: 'Exercise Gen Tester',
      email: 'exercise-gen-route@test.fr',
      password: await bcrypt.hash('Test1234!', 10),
      roleId: role.roleId,
      hasValidatedEmail: true,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    token = makeToken(user.userId)
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('POST — texte source, cas nominal — 200, success true avec les questions générées (warnings)', async () => {
    aiExerciseGenerationPipelineService.generateExercisesFromContent.mockResolvedValue(FAKE_PIPELINE_RESULT)

    const res = await request(app)
      .post(`${BASE}/ai-exercise-generations`)
      .set('Authorization', `Bearer ${token}`)
      .field('sourceText', 'Un texte source suffisant.')
      .field('questionCount', '3')
      .field('questionType', 'mixed')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ success: true, ...FAKE_PIPELINE_RESULT })
    expect(aiExerciseGenerationPipelineService.generateExercisesFromContent).toHaveBeenCalledWith(
      expect.objectContaining({ sourceText: 'Un texte source suffisant.', questionCount: 3, questionType: 'mixed' })
    )
  })

  it('POST — fichier PDF, cas nominal — 200, transmet un Buffer au pipeline', async () => {
    aiExerciseGenerationPipelineService.generateExercisesFromContent.mockResolvedValue(FAKE_PIPELINE_RESULT)

    const res = await request(app)
      .post(`${BASE}/ai-exercise-generations`)
      .set('Authorization', `Bearer ${token}`)
      .field('questionCount', '3')
      .attach('pdf', Buffer.from('%PDF-1.4 contenu factice'), { filename: 'cours.pdf', contentType: 'application/pdf' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    const callArgs = aiExerciseGenerationPipelineService.generateExercisesFromContent.mock.calls[0][0]
    expect(Buffer.isBuffer(callArgs.pdfBuffer)).toBe(true)
    expect(callArgs.sourceText).toBeFalsy()
  })

  it('POST — fichier dont le contenu ne correspond pas à un PDF — 400 (magic bytes)', async () => {
    const res = await request(app)
      .post(`${BASE}/ai-exercise-generations`)
      .set('Authorization', `Bearer ${token}`)
      .field('questionCount', '3')
      .attach('pdf', Buffer.from('ceci nest pas un pdf'), { filename: 'cours.pdf', contentType: 'application/pdf' })

    expect(res.status).toBe(400)
    expect(aiExerciseGenerationPipelineService.generateExercisesFromContent).not.toHaveBeenCalled()
  })

  it('POST — ni texte ni PDF — 400', async () => {
    const res = await request(app)
      .post(`${BASE}/ai-exercise-generations`)
      .set('Authorization', `Bearer ${token}`)
      .field('questionCount', '3')

    expect(res.status).toBe(400)
  })

  it('POST — texte ET PDF fournis en même temps — 400', async () => {
    const res = await request(app)
      .post(`${BASE}/ai-exercise-generations`)
      .set('Authorization', `Bearer ${token}`)
      .field('questionCount', '3')
      .field('sourceText', 'Un texte.')
      .attach('pdf', Buffer.from('%PDF-1.4'), { filename: 'cours.pdf', contentType: 'application/pdf' })

    expect(res.status).toBe(400)
  })

  it('POST — sans authentification — 401', async () => {
    const res = await request(app)
      .post(`${BASE}/ai-exercise-generations`)
      .send({ sourceText: 'Un texte.', questionCount: 3 })

    expect(res.status).toBe(401)
  })

  it('POST — questionCount hors bornes — 400 (validators)', async () => {
    const res = await request(app)
      .post(`${BASE}/ai-exercise-generations`)
      .set('Authorization', `Bearer ${token}`)
      .send({ sourceText: 'Un texte.', questionCount: 31 })

    expect(res.status).toBe(400)
  })

  it('POST — questionType invalide — 400 (validators)', async () => {
    const res = await request(app)
      .post(`${BASE}/ai-exercise-generations`)
      .set('Authorization', `Bearer ${token}`)
      .send({ sourceText: 'Un texte.', questionCount: 3, questionType: 'true_false' })

    expect(res.status).toBe(400)
  })

  it('POST — sourceText dépassant 80 000 caractères — 400 (plafond hors du cap JSON global 10kb)', async () => {
    const res = await request(app)
      .post(`${BASE}/ai-exercise-generations`)
      .set('Authorization', `Bearer ${token}`)
      .field('sourceText', 'a'.repeat(80001))
      .field('questionCount', '3')

    expect(res.status).toBe(400)
    expect(aiExerciseGenerationPipelineService.generateExercisesFromContent).not.toHaveBeenCalled()
  })

  it('POST — sourceText/subjectContext avec balises HTML — nettoyés avant d\'atteindre le pipeline (sanitize sur route multipart)', async () => {
    aiExerciseGenerationPipelineService.generateExercisesFromContent.mockResolvedValue(FAKE_PIPELINE_RESULT)

    const res = await request(app)
      .post(`${BASE}/ai-exercise-generations`)
      .set('Authorization', `Bearer ${token}`)
      .field('questionCount', '3')
      .field('subjectContext', '<b>SVT</b>')
      .field('sourceText', 'Un texte <script>alert(1)</script> source.')

    expect(res.status).toBe(200)
    const callArgs = aiExerciseGenerationPipelineService.generateExercisesFromContent.mock.calls[0][0]
    expect(callArgs.sourceText).toBe('Un texte alert(1) source.')
    expect(callArgs.subjectContext).toBe('SVT')
  })

  it('POST — Service génération en échec (502, service indisponible) — 200, mode dégradé avec repli conseillé', async () => {
    const error = Object.assign(new Error('Le service de génération IA est indisponible pour le moment.'), { statusCode: 502 })
    aiExerciseGenerationPipelineService.generateExercisesFromContent.mockRejectedValue(error)

    const res = await request(app)
      .post(`${BASE}/ai-exercise-generations`)
      .set('Authorization', `Bearer ${token}`)
      .field('sourceText', 'Un texte source suffisant.')
      .field('questionCount', '3')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      success: false,
      degraded: true,
      code: 'service_unavailable',
      message: expect.stringContaining('manuellement'),
      suggestManualCreation: true
    })
  })

  it('POST — Service génération non configuré (500) — 200, mode dégradé "not_configured"', async () => {
    const error = Object.assign(new Error('Service de génération IA non configuré (clé API manquante).'), { statusCode: 500 })
    aiExerciseGenerationPipelineService.generateExercisesFromContent.mockRejectedValue(error)

    const res = await request(app)
      .post(`${BASE}/ai-exercise-generations`)
      .set('Authorization', `Bearer ${token}`)
      .field('sourceText', 'Un texte source suffisant.')
      .field('questionCount', '3')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(false)
    expect(res.body.code).toBe('not_configured')
  })

  // C-02.09 (revue de code) : le 422 remonte désormais tel quel (code `invalid_content`), conformément
  // au contrat déjà documenté dans le swagger de la route — voir DECISIONS.md
  // [2026-09-11] « 422 replié en mode dégradé "unknown" : corrigé en C-02.09 ».
  it('POST — contenu source vide/illisible (422 pipeline) — 422, pas un mode dégradé', async () => {
    const error = Object.assign(new Error("Aucun contenu exploitable n'a été trouvé dans la source fournie."), { statusCode: 422 })
    aiExerciseGenerationPipelineService.generateExercisesFromContent.mockRejectedValue(error)

    const res = await request(app)
      .post(`${BASE}/ai-exercise-generations`)
      .set('Authorization', `Bearer ${token}`)
      .field('sourceText', 'Un texte source suffisant.')
      .field('questionCount', '3')

    expect(res.status).toBe(422)
    expect(res.body.message).toBe("Aucun contenu exploitable n'a été trouvé dans la source fournie.")
  })
})

// C-02.09 (revue de code) : AiExerciseImportValidation.service.js (C-02.04) n'était appelé nulle
// part — ni ici, ni côté front — donc une question éditée en Interface de révision pouvait redevenir
// invalide au format et être persistée sans aucun contrôle serveur. Endpoint dédié plutôt que
// d'étendre validators/Question.validators.js (POST /tests + POST /questions restent inchangés).
describe('AiExerciseGeneration — POST /ai-exercise-generations/validate-import (tests fonctionnels)', () => {
  let token

  beforeAll(async () => {
    const role = await Role.create({ name: 'Étudiant validate-import' })
    const user = await User.create({
      name: 'Validate Import Tester',
      email: 'validate-import@test.fr',
      password: await bcrypt.hash('Test1234!', 10),
      roleId: role.roleId,
      hasValidatedEmail: true,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    token = makeToken(user.userId)
  })

  it('POST — lot valide — 200, tout dans importable, rejected vide', async () => {
    const res = await request(app)
      .post(`${BASE}/ai-exercise-generations/validate-import`)
      .set('Authorization', `Bearer ${token}`)
      .send({ questions: [VALID_QUESTION] })

    expect(res.status).toBe(200)
    expect(res.body.importable).toHaveLength(1)
    expect(res.body.rejected).toHaveLength(0)
  })

  it('POST — mcq éditée sans option "correct" — 200, échec partiel : rejetée avec le détail de l\'erreur, le reste importable', async () => {
    const brokenMcq = {
      statement: 'Capitale de la France ?',
      type: 'mcq',
      content: { options: [{ text: 'Paris', correct: false }, { text: 'Madrid', correct: false }, { text: 'Rome', correct: false }] }
    }

    const res = await request(app)
      .post(`${BASE}/ai-exercise-generations/validate-import`)
      .set('Authorization', `Bearer ${token}`)
      .send({ questions: [VALID_QUESTION, brokenMcq] })

    expect(res.status).toBe(200)
    expect(res.body.importable).toHaveLength(1)
    expect(res.body.importable[0].statement).toBe(VALID_QUESTION.statement)
    expect(res.body.rejected).toHaveLength(1)
    expect(res.body.rejected[0].index).toBe(1)
    expect(res.body.rejected[0].errors.join(' ')).toContain('correct')
  })

  it('POST — questions manquant — 400 (validators)', async () => {
    const res = await request(app)
      .post(`${BASE}/ai-exercise-generations/validate-import`)
      .set('Authorization', `Bearer ${token}`)
      .send({})

    expect(res.status).toBe(400)
  })

  it('POST — sans token — 401', async () => {
    const res = await request(app)
      .post(`${BASE}/ai-exercise-generations/validate-import`)
      .send({ questions: [VALID_QUESTION] })

    expect(res.status).toBe(401)
  })
})

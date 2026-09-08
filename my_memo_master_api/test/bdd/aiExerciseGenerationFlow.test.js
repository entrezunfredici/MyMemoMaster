// Tests fonctionnels du FLUX COMPLET de génération d'exercices par IA (C-02.08, feature `C-02`).
//
// Périmètre C-02.08 (« Tests fonctionnels flux génération ») : contrairement aux tests fonctionnels
// déjà existants — `test/bdd/aiExerciseGeneration.test.js` (C-02.06, la seule route HTTP, pipeline
// mocké) et les tests unitaires par service (C-02.03/04/05, ~120 tests, LLM et sous-services
// entièrement mockés) — ce fichier exerce la CHAÎNE ENTIÈRE en une seule fois, avec le minimum de
// mocks : seuls les deux vrais points de sortie du système (l'appel réseau Mistral et l'extraction
// PDF) sont mockés ; le reste tourne réellement — chunking (`helpers/textChunker.js`), construction
// du prompt et parsing/validation/dédoublonnage (`AiExerciseGeneration.service.js`), orchestration
// multi-chunks et circuit breaker (`AiExerciseGenerationPipeline.service.js`), classification du
// mode dégradé (`AiExerciseDegradedMode.service.js`), revalidation de format avant import
// (`AiExerciseImportValidation.service.js`), et la persistance réelle sur DB SQLite en mémoire via
// les endpoints déjà existants (`POST /tests` + `POST /questions`, mapping documenté depuis C-02.01
// §7 mais jamais exercé de bout en bout jusqu'ici — seule l'hypothèse était écrite, pas prouvée).
//
// Referme ainsi la boucle : Spécification types générables → Service génération → Validation format
// → Mode dégradé → (Interface de révision, ici simulée côté test — le vrai écran est front-end,
// C-02.07) → persistance réelle. Périmètre volontairement exclu (OUT du ticket, rappelé dans la
// demande) : correction officielle sans relecture, génération illimitée, banque publique automatique
// — aucun de ces trois n'est exercé ni requis ici.

process.env.AUTH_JWT_SECRET = 'test-secret'
process.env.NODE_ENV = 'test'
process.env.VITE_FRONT_URL = 'http://localhost:5173'
process.env.DB_STORAGE = ':memory:'
process.env.MISTRAL_API_KEY = 'test-key'

jest.mock('../../jobs/fifo.cron', () => ({ startFifoCron: jest.fn() }))
jest.mock('../../jobs/reminder.worker', () => ({ startReminderWorker: jest.fn() }))
jest.mock('../../jobs/reminder.queue', () => ({ getReminderQueue: jest.fn(), closeReminderQueue: jest.fn() }))
jest.mock('../../jobs/kpiAlert.cron', () => ({ startKpiAlertCron: jest.fn() }))
jest.mock('../../helpers/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }))

const request = require('supertest')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const app = require('../../app')
const { syncModels, Role, User, Subject } = require('../../models')
const aiExerciseGenerationService = require('../../services/AiExerciseGeneration.service')
const aiExerciseImportValidationService = require('../../services/AiExerciseImportValidation.service')
const pdfExtractionService = require('../../services/PdfExtraction.service')

const BASE = '/api/v1'
const makeToken = (userId) => jwt.sign({ id: userId }, 'test-secret', { expiresIn: '1d' })

/** Simule la réponse brute de l'API Mistral (mock du seul point réseau réel du flux). */
function mockLlmContent(payload) {
  return { content: JSON.stringify(payload), usage: { promptTokens: 100, completionTokens: 50 } }
}

const FOUR_TYPES_PAYLOAD = {
  questions: [
    { statement: 'Qu\'est-ce que la thermodynamique ?', type: 'open', content: { correct_answer: 'La branche de la physique étudiant les échanges d\'énergie thermique.' }, sourceExcerpt: 'E1' },
    { statement: 'Quelle grandeur est conservée sur un cycle thermodynamique ?', type: 'mcq', content: { options: [{ text: 'L\'énergie interne', correct: true }, { text: 'La chaleur', correct: false }, { text: 'Le travail', correct: false }] }, sourceExcerpt: 'E2' },
    { statement: 'Complétez : la transformation est {{0}}.', type: 'fill_blank', content: { template: 'La transformation est {{0}}.', blanks: ['isochore'] }, sourceExcerpt: 'E3' },
    { statement: 'Remettez les étapes dans l\'ordre.', type: 'reorder', content: { fragments: ['compression', 'combustion', 'détente'] }, sourceExcerpt: 'E4' }
  ],
  warning: null
}

/**
 * Reproduit le mapping de persistance documenté (`generation_ia_exercices_types.md` §7, jamais
 * appelé automatiquement côté API — c'est l'Interface de révision front-end, C-02.07, qui l'exécute
 * en pratique via `ExercisesPage.vue#submitCreate`) : crée le test puis chaque question importable,
 * sans transformation de `content`.
 */
async function persistImportableQuestions(token, { name, subjectId, questions }) {
  const testRes = await request(app)
    .post(`${BASE}/tests`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name, subjectId })
  if (testRes.status !== 201) return { testRes, questionResponses: [] }

  const testId = testRes.body.testId
  const questionResponses = []
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    questionResponses.push(
      await request(app)
        .post(`${BASE}/questions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ statement: q.statement, questionPosition: i, type: q.type, content: q.content, idTest: testId })
    )
  }
  return { testRes, questionResponses }
}

describe('Flux génération complet (C-02.08) — Spécification → Service → Validation → Mode dégradé → import réel', () => {
  let token
  let subjectId

  beforeAll(async () => {
    await syncModels({ force: true })
    const role = await Role.create({ name: 'Étudiant' })
    const user = await User.create({
      name: 'Flux Génération Tester',
      email: 'flux-generation@test.fr',
      password: await bcrypt.hash('Test1234!', 10),
      roleId: role.roleId,
      hasValidatedEmail: true,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    token = makeToken(user.userId)
    const subject = await Subject.create({ name: 'Physique' })
    subjectId = subject.subjectId
  })

  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it('parcours nominal — texte, mode "mixed", les 4 types — génération → validation format → persistance réelle des 4 questions', async () => {
    jest.spyOn(aiExerciseGenerationService, 'callModel').mockResolvedValue(mockLlmContent(FOUR_TYPES_PAYLOAD))

    const genRes = await request(app)
      .post(`${BASE}/ai-exercise-generations`)
      .set('Authorization', `Bearer ${token}`)
      .send({ sourceText: 'Un extrait suffisant sur la thermodynamique.', questionCount: 4, questionType: 'mixed' })

    expect(genRes.status).toBe(200)
    expect(genRes.body.success).toBe(true)
    expect(genRes.body.questions).toHaveLength(4)
    expect(genRes.body.warnings).toEqual([])

    // Interface de révision (C-02.07, front-end, simulée ici) : l'utilisateur accepte les 4
    // questions telles quelles → Validation format avant import (C-02.04), sur ce qui sera
    // réellement persisté (statement/type/content — pas sourceExcerpt).
    const { importable, rejected } = aiExerciseImportValidationService.validateBatchForImport(genRes.body.questions)
    expect(rejected).toHaveLength(0)
    expect(importable).toHaveLength(4)

    const { testRes, questionResponses } = await persistImportableQuestions(token, {
      name: 'Exercice généré par IA', subjectId, questions: importable
    })
    expect(testRes.status).toBe(201)
    questionResponses.forEach((r) => expect(r.status).toBe(201))

    const fetchRes = await request(app).get(`${BASE}/tests/${testRes.body.testId}`).set('Authorization', `Bearer ${token}`)
    expect(fetchRes.status).toBe(200)
    expect(fetchRes.body.question).toHaveLength(4)
    expect(fetchRes.body.question.map((q) => q.type).sort()).toEqual(['fill_blank', 'mcq', 'open', 'reorder'])
    // content déjà dans la forme attendue par POST /questions, sans reconstruction (§7) — vérifié
    // ici sur le type le plus structuré (fill_blank : template + blanks doivent survivre intacts).
    const fillBlank = fetchRes.body.question.find((q) => q.type === 'fill_blank')
    expect(fillBlank.content).toEqual({ template: 'La transformation est {{0}}.', blanks: ['isochore'] })
  })

  it('import PDF — extraction (mockée) + chunking réel + génération (LLM mocké) → persistance réelle', async () => {
    jest.spyOn(pdfExtractionService, 'extractText').mockResolvedValue({
      text: 'Un cours de thermodynamique extrait du PDF, suffisamment long pour être exploitable.',
      hasEmbeddedImages: false,
      ocrPagesProcessed: 0
    })
    jest.spyOn(aiExerciseGenerationService, 'callModel').mockResolvedValue(
      mockLlmContent({ questions: [FOUR_TYPES_PAYLOAD.questions[0]], warning: null })
    )

    const genRes = await request(app)
      .post(`${BASE}/ai-exercise-generations`)
      .set('Authorization', `Bearer ${token}`)
      .field('questionCount', '1')
      .field('questionType', 'open')
      .attach('pdf', Buffer.from('%PDF-1.4 contenu factice'), { filename: 'cours.pdf', contentType: 'application/pdf' })

    expect(genRes.status).toBe(200)
    expect(genRes.body.success).toBe(true)
    expect(genRes.body.questions).toHaveLength(1)
    expect(pdfExtractionService.extractText).toHaveBeenCalledTimes(1)

    const { importable } = aiExerciseImportValidationService.validateBatchForImport(genRes.body.questions)
    const { testRes, questionResponses } = await persistImportableQuestions(token, {
      name: 'Exercice généré depuis un PDF', subjectId, questions: importable
    })
    expect(testRes.status).toBe(201)
    expect(questionResponses).toHaveLength(1)
    expect(questionResponses[0].status).toBe(201)
  })

  it('mode dégradé — Service génération indisponible (LLM en panne) — réponse discriminée exploitable, rien à persister', async () => {
    jest.spyOn(aiExerciseGenerationService, 'callModel').mockRejectedValue(
      Object.assign(new Error('Le service de génération IA est indisponible pour le moment.'), { statusCode: 502 })
    )

    const genRes = await request(app)
      .post(`${BASE}/ai-exercise-generations`)
      .set('Authorization', `Bearer ${token}`)
      .send({ sourceText: 'Un extrait suffisant.', questionCount: 4, questionType: 'mixed' })

    expect(genRes.status).toBe(200)
    expect(genRes.body).toEqual({
      success: false,
      degraded: true,
      code: 'service_unavailable',
      message: expect.stringContaining('manuellement'),
      suggestManualCreation: true
    })
    // Rien n'est jamais persisté sur un échec de génération — aucune question à importer, aucun
    // appel à POST /tests/POST /questions n'a de sens ici (l'utilisateur bascule sur la création
    // manuelle, déjà la même modal — generation_ia_exercices_ui.md §8).
  })

  // TROUVÉ EN ÉCRIVANT CE TEST (pas une régression du PDF, comportement déjà partagé avec les cartes
  // Leitner, cf. AiCardGenerationPipelineService) : depuis que la route passe systématiquement par le
  // pipeline (import PDF, DECISIONS.md 2026-09-08), un chunk qui épuise son retry ("La génération n'a
  // pas produit un résultat exploitable. Réessayez.", classé "invalid_output" par
  // AiExerciseDegradedMode.service.js) est réattrapé par le pipeline, qui — puisque TOUS les chunks
  // ont échoué (ici il n'y en a qu'un) — relève sa propre erreur générique ("La génération a échoué
  // sur tous les passages du contenu fourni.") : le message précis du chunk est perdu, `describeFailure`
  // retombe donc sur "service_unavailable" plutôt que "invalid_output". Les deux codes restent
  // `degraded: true, suggestManualCreation: true` (seul le message affiché change) — dégradation du
  // signal assumée, pas une régression bloquante, symétrique à celle déjà acceptée côté cartes.
  it('mode dégradé — sortie non exploitable après retry (2 échecs de parsing, 1 seul chunk) — réponse dégradée "service_unavailable" (signal précis perdu par le pipeline, assumé)', async () => {
    jest.spyOn(aiExerciseGenerationService, 'callModel')
      .mockResolvedValueOnce(mockLlmContent({ notQuestions: [] })) // 1er essai : hors schéma
      .mockResolvedValueOnce(mockLlmContent({ notQuestions: [] })) // retry : toujours hors schéma

    const genRes = await request(app)
      .post(`${BASE}/ai-exercise-generations`)
      .set('Authorization', `Bearer ${token}`)
      .send({ sourceText: 'Un extrait suffisant.', questionCount: 2, questionType: 'mixed' })

    expect(genRes.status).toBe(200)
    expect(genRes.body.success).toBe(false)
    expect(genRes.body.code).toBe('service_unavailable')
    expect(genRes.body.suggestManualCreation).toBe(true)
    expect(aiExerciseGenerationService.callModel).toHaveBeenCalledTimes(2) // 1 essai + 1 retry, jamais plus
  })

  it('validation format avant import — une question éditée en Interface de révision redevient invalide — échec partiel toléré, seule la question valide est persistée', async () => {
    jest.spyOn(aiExerciseGenerationService, 'callModel').mockResolvedValue(mockLlmContent({
      questions: [FOUR_TYPES_PAYLOAD.questions[0], FOUR_TYPES_PAYLOAD.questions[1]],
      warning: null
    }))

    const genRes = await request(app)
      .post(`${BASE}/ai-exercise-generations`)
      .set('Authorization', `Bearer ${token}`)
      .send({ sourceText: 'Un extrait suffisant.', questionCount: 2, questionType: 'mixed' })

    // Simule une édition utilisateur en Interface de révision (C-02.07) qui casse le format de la
    // question mcq : plus aucune option marquée correcte (scénario cité en C-02.04, DECISIONS.md).
    const edited = genRes.body.questions.map((q) => ({ ...q }))
    edited[1] = { ...edited[1], content: { options: edited[1].content.options.map((o) => ({ ...o, correct: false })) } }

    const { importable, rejected } = aiExerciseImportValidationService.validateBatchForImport(edited)
    expect(importable).toHaveLength(1)
    expect(rejected).toHaveLength(1)
    expect(rejected[0].errors.join(' ')).toContain('correct')

    const { testRes, questionResponses } = await persistImportableQuestions(token, {
      name: 'Exercice avec une question corrigée à la main', subjectId, questions: importable
    })
    expect(testRes.status).toBe(201)
    expect(questionResponses).toHaveLength(1) // la question rejetée n'est jamais envoyée à l'import

    const fetchRes = await request(app).get(`${BASE}/tests/${testRes.body.testId}`).set('Authorization', `Bearer ${token}`)
    expect(fetchRes.body.question).toHaveLength(1)
    expect(fetchRes.body.question[0].type).toBe('open')
  })

  it('contenu source insuffisant — le modèle renvoie moins de questions que demandé avec un warning — sortie valide, aucune persistance forcée', async () => {
    jest.spyOn(aiExerciseGenerationService, 'callModel').mockResolvedValue(mockLlmContent({
      questions: [FOUR_TYPES_PAYLOAD.questions[0]],
      warning: 'Le contenu source ne permettait de justifier qu\'une seule question distincte.'
    }))

    const genRes = await request(app)
      .post(`${BASE}/ai-exercise-generations`)
      .set('Authorization', `Bearer ${token}`)
      .send({ sourceText: 'Un extrait court.', questionCount: 4, questionType: 'mixed' })

    expect(genRes.status).toBe(200)
    expect(genRes.body.success).toBe(true)
    expect(genRes.body.questions).toHaveLength(1)
    // Le warning du modèle (chunk unique) est bien remonté dans `warnings` (tableau), préfixé par le
    // pipeline ("Passage N/M : ...") même quand tout le contenu tient en un seul chunk — le pipeline
    // ne fait aucune distinction entre "un seul chunk" et "plusieurs chunks" pour ce comportement.
    expect(genRes.body.warnings).toEqual([
      'Passage 1/1 : Le contenu source ne permettait de justifier qu\'une seule question distincte.'
    ])

    const { importable, rejected } = aiExerciseImportValidationService.validateBatchForImport(genRes.body.questions)
    expect(importable).toHaveLength(1)
    expect(rejected).toHaveLength(0)
  })

  it('rejet de saisie (400) — questionCount invalide — jamais un mode dégradé, aucun appel au Service génération', async () => {
    const spy = jest.spyOn(aiExerciseGenerationService, 'callModel')

    const genRes = await request(app)
      .post(`${BASE}/ai-exercise-generations`)
      .set('Authorization', `Bearer ${token}`)
      .send({ sourceText: 'Un extrait.', questionCount: 0 })

    expect(genRes.status).toBe(400)
    expect(spy).not.toHaveBeenCalled()
  })
})

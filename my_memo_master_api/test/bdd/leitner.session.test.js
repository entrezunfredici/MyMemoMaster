// Tests fonctionnels session complète Leitner (M-01.11)
// Base SQLite en mémoire — seul Semantic.service est mocké (dépendance NLP externe ~30s).
// Les autres couches (controller → service → model → DB) sont réelles.

process.env.AUTH_JWT_SECRET = 'test-secret'
process.env.NODE_ENV = 'test'
process.env.VITE_FRONT_URL = 'http://localhost:5173'
// SQLite in-memory : DB isolée par fichier de test, aucune pollution entre runs
process.env.DB_STORAGE = ':memory:'

jest.mock('../../services/Semantic.service', () => ({ gradeSemantic: jest.fn() }))
jest.mock('../../jobs/fifo.cron', () => ({ startFifoCron: jest.fn() }))
jest.mock('../../helpers/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }))

const request = require('supertest')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const dayjs = require('dayjs')
const semanticService = require('../../services/Semantic.service')
const app = require('../../app')
const {
  syncModels,
  LeitnerSystem,
  LeitnerBox,
  LeitnerCard,
  Question,
  Response,
  User,
  Role
} = require('../../models')

const BASE = '/api/v1'
const makeToken = (userId) => jwt.sign({ id: userId }, 'test-secret', { expiresIn: '1d' })

// ─── État partagé entre scénarios (session séquentielle) ────────────────────
let token
let userId
let system
let boxes // { 1: LeitnerBox, 2: LeitnerBox, ... 5: LeitnerBox }
let card
let question

describe('Leitner — session complète (tests fonctionnels)', () => {
  // ── Initialisation : DB in-memory + données de référence ──────────────────
  beforeAll(async () => {
    await syncModels({ force: true })

    const role = await Role.create({ name: 'Étudiant' })

    const user = await User.create({
      name: 'Session Tester',
      email: 'session@test.fr',
      password: await bcrypt.hash('Test1234!', 10),
      roleId: role.roleId,
      hasValidatedEmail: true,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    userId = user.userId
    token = makeToken(userId)

    // Système possédé par l'utilisateur (resolveUserRights l'identifiera comme owner)
    system = await LeitnerSystem.create({ name: 'Test Leitner', idUser: userId })

    // 5 boîtes avec intervalles croissants (en secondes pour les tests)
    const boxDefs = [
      { level: 1, intervall: 10, color: 111111 },
      { level: 2, intervall: 30, color: 222222 },
      { level: 3, intervall: 60, color: 333333 },
      { level: 4, intervall: 120, color: 444444 },
      { level: 5, intervall: 300, color: 555555 }
    ]
    const created = await LeitnerBox.bulkCreate(
      boxDefs.map((b) => ({ ...b, idSystem: system.idSystem }))
    )
    boxes = Object.fromEntries(created.map((b) => [b.level, b]))

    // Question + réponse correcte
    question = await Question.create({
      statement: 'Quelle est la capitale de la France ?',
      questionPosition: 1,
      type: 'text'
    })
    await Response.create({
      content: 'Paris',
      correction: true,
      idQuestion: question.idQuestion
    })

    // Carte en boîte 1, jamais révisée
    card = await LeitnerCard.create({
      idQuestion: question.idQuestion,
      idBox: boxes[1].idBox,
      fifo: true,
      next_review_at: null,
      last_review_at: null,
      review_count: 0,
      correct_count: 0,
      incorrect_count: 0
    })
  })

  // ── Scénario 1 : Carte jamais révisée visible dans la session ────────────

  it('GET /due/:systemId — carte jamais révisée (next_review_at null) retournée', async () => {
    const res = await request(app)
      .get(`${BASE}/leitnercards/due/${system.idSystem}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].idCard).toBe(card.idCard)
    expect(res.body[0].idBox).toBe(boxes[1].idBox)
  })

  it('GET /due/:systemId — sans token — 401', async () => {
    const res = await request(app).get(`${BASE}/leitnercards/due/${system.idSystem}`)
    expect(res.status).toBe(401)
  })

  // ── Scénario 2 : Bonne réponse — avance en boîte 2 ──────────────────────

  it('POST /response — bonne réponse — carte avance en boîte 2, compteurs mis à jour', async () => {
    semanticService.gradeSemantic.mockResolvedValueOnce({
      is_correct: true,
      score: 0.95,
      explanation: 'Bonne réponse.',
      decision_zone: 'high'
    })

    const res = await request(app)
      .post(`${BASE}/leitnercards/response`)
      .set('Authorization', `Bearer ${token}`)
      .send({ cardId: card.idCard, studentAnswer: 'Paris' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.newLevel).toBe(2)
    expect(res.body.score).toBe(0.95)
    expect(res.body.correction).toBe('Paris')

    // Vérification directe en base
    await card.reload()
    expect(card.idBox).toBe(boxes[2].idBox)
    expect(card.review_count).toBe(1)
    expect(card.correct_count).toBe(1)
    expect(card.incorrect_count).toBe(0)
    expect(card.next_review_at).not.toBeNull()
    expect(card.last_review_at).not.toBeNull()
    // next_review_at ≈ now + intervall boîte 2 (30s)
    const expectedMin = dayjs().add(25, 'second').toDate()
    const expectedMax = dayjs().add(35, 'second').toDate()
    expect(new Date(card.next_review_at).getTime()).toBeGreaterThan(expectedMin.getTime())
    expect(new Date(card.next_review_at).getTime()).toBeLessThan(expectedMax.getTime())
  })

  // ── Scénario 3 : Session vide après révision récente ────────────────────

  it("GET /due/:systemId — session vide : carte vient d'être révisée", async () => {
    const res = await request(app)
      .get(`${BASE}/leitnercards/due/${system.idSystem}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(0)
  })

  // ── Scénario 4 : Carte redevient disponible après écoulement de l'intervalle

  it('GET /due/:systemId — carte redevient disponible après dépassement de next_review_at', async () => {
    // Simuler l'écoulement du temps en rétro-datant next_review_at
    await card.update({ next_review_at: dayjs().subtract(5, 'second').toDate() })

    const res = await request(app)
      .get(`${BASE}/leitnercards/due/${system.idSystem}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].idCard).toBe(card.idCard)
  })

  // ── Scénario 5 : Mauvaise réponse — retour boîte 1 ──────────────────────

  it('POST /response — mauvaise réponse — carte retourne en boîte 1, incorrect_count++', async () => {
    semanticService.gradeSemantic.mockResolvedValueOnce({
      is_correct: false,
      score: 0.1,
      explanation: 'Mauvaise réponse.',
      decision_zone: 'low'
    })

    const res = await request(app)
      .post(`${BASE}/leitnercards/response`)
      .set('Authorization', `Bearer ${token}`)
      .send({ cardId: card.idCard, studentAnswer: 'Lyon' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(false)
    expect(res.body.newLevel).toBe(1)

    await card.reload()
    expect(card.idBox).toBe(boxes[1].idBox) // retour boîte 1
    expect(card.review_count).toBe(2)
    expect(card.correct_count).toBe(1) // inchangé
    expect(card.incorrect_count).toBe(1) // +1
  })

  // ── Scénario 6 : Bonne réponse en boîte 5 — plafonnement ────────────────

  it('POST /response — bonne réponse en boîte 5 — reste en boîte 5, fifo=false', async () => {
    // Placer la carte directement en boîte 5
    await card.update({ idBox: boxes[5].idBox, next_review_at: null })

    semanticService.gradeSemantic.mockResolvedValueOnce({
      is_correct: true,
      score: 0.99,
      explanation: 'Excellent.',
      decision_zone: 'high'
    })

    const res = await request(app)
      .post(`${BASE}/leitnercards/response`)
      .set('Authorization', `Bearer ${token}`)
      .send({ cardId: card.idCard, studentAnswer: 'Paris' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.newLevel).toBe(5) // Math.min(5+1, 5) = 5

    await card.reload()
    expect(card.idBox).toBe(boxes[5].idBox) // reste boîte 5
    expect(card.fifo).toBe(false) // sortie de la file FIFO
    expect(card.correct_count).toBe(2)
  })

  // ── Scénario 7 : Historique de révision complet ──────────────────────────

  it("Historique — les compteurs reflètent l'ensemble des révisions de la session", async () => {
    await card.reload()
    // Révision 1 (scénario 2) : bonne → correct_count=1, review_count=1
    // Révision 2 (scénario 5) : mauvaise → incorrect_count=1, review_count=2
    // Révision 3 (scénario 6) : bonne → correct_count=2, review_count=3
    expect(card.review_count).toBe(3)
    expect(card.correct_count).toBe(2)
    expect(card.incorrect_count).toBe(1)
    expect(card.last_review_at).not.toBeNull()
  })

  // ── Scénario 8 : Session multi-cartes ───────────────────────────────────

  it('Session multi-cartes — plusieurs cartes dues retournées ensemble', async () => {
    // Créer une 2e question + réponse + carte
    const q2 = await Question.create({
      statement: "Capitale de l'Espagne ?",
      questionPosition: 2,
      type: 'text'
    })
    await Response.create({ content: 'Madrid', correction: true, idQuestion: q2.idQuestion })
    await LeitnerCard.create({
      idQuestion: q2.idQuestion,
      idBox: boxes[1].idBox,
      fifo: true,
      next_review_at: null,
      last_review_at: null,
      review_count: 0,
      correct_count: 0,
      incorrect_count: 0
    })

    // Remettre la carte principale disponible
    await card.update({ next_review_at: dayjs().subtract(1, 'second').toDate() })

    const res = await request(app)
      .get(`${BASE}/leitnercards/due/${system.idSystem}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.length).toBeGreaterThanOrEqual(2)
  })

  // ── Scénario 9 : Cas d'erreur — carte inexistante ───────────────────────

  it('POST /response — carte inexistante — 404', async () => {
    semanticService.gradeSemantic.mockResolvedValueOnce({
      is_correct: true,
      score: 1,
      explanation: '',
      decision_zone: 'high'
    })

    const res = await request(app)
      .post(`${BASE}/leitnercards/response`)
      .set('Authorization', `Bearer ${token}`)
      .send({ cardId: 99999, studentAnswer: 'Réponse' })

    expect(res.status).toBe(404)
  })

  it('POST /response — sans token — 401', async () => {
    const res = await request(app)
      .post(`${BASE}/leitnercards/response`)
      .send({ cardId: card.idCard, studentAnswer: 'Paris' })

    expect(res.status).toBe(401)
  })

  it('POST /response — corps invalide (cardId manquant) — 400', async () => {
    const res = await request(app)
      .post(`${BASE}/leitnercards/response`)
      .set('Authorization', `Bearer ${token}`)
      .send({ studentAnswer: 'Paris' })

    expect(res.status).toBe(400)
  })
})

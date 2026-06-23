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

jest.mock('../../services/User.service', () => ({
  findByEmail: jest.fn(),
  create: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn().mockResolvedValue(true),
  verifyPassword: jest.fn(),
  updateLoginDate: jest.fn(),
  setRefreshToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
  clearRefreshToken: jest.fn(),
  setResetPasswordCode: jest.fn(),
  setValidEmailCode: jest.fn().mockResolvedValue('123456'),
  setPassword: jest.fn(),
  setRole: jest.fn(),
  deleteRole: jest.fn(),
  verifyValidEmailCode: jest.fn(),
  verifyResetPasswordCode: jest.fn(),
  setEmailValidated: jest.fn().mockResolvedValue(true)
}))

jest.mock('../../services/Role.service', () => ({ findOne: jest.fn() }))

process.env.AUTH_JWT_SECRET = 'test-secret'
process.env.AUTH_JWT_EXPIRES_IN = '1d'
process.env.VITE_FRONT_URL = 'http://localhost:5173'
process.env.NODE_ENV = 'test'

const request = require('supertest')
const jwt = require('jsonwebtoken')
const app = require('../../app')
const userService = require('../../services/User.service')
const roleService = require('../../services/Role.service')
const sendEmail = require('../../helpers/sendEmail')
const { User } = require('../../models/index')

const makeToken = (payload = { id: 1, name: 'Test', email: 'test@example.com' }) =>
  jwt.sign(payload, 'test-secret', { expiresIn: '1d' })

describe('User Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    User.findByPk.mockResolvedValue({ roleId: 1 })
  })

  // ── POST /users/register ───────────────────────────────────────────────────
  describe('POST /users/register', () => {
    it('201 — crée un utilisateur', async () => {
      userService.create.mockResolvedValue({ userId: 1, name: 'Bob', email: 'bob@example.com' })

      const res = await request(app)
        .post('/api/v1/users/register')
        .send({ name: 'Bob', email: 'bob@example.com', password: 'Password123' })

      expect(res.status).toBe(201)
      expect(userService.create).toHaveBeenCalledTimes(1)
    })

    it('400 — email invalide', async () => {
      const res = await request(app)
        .post('/api/v1/users/register')
        .send({ name: 'Bob', email: 'not-an-email', password: 'Password123' })

      expect(res.status).toBe(400)
      expect(res.body.errors).toBeDefined()
    })

    it('400 — mot de passe trop court', async () => {
      const res = await request(app)
        .post('/api/v1/users/register')
        .send({ name: 'Bob', email: 'bob@example.com', password: 'short' })

      expect(res.status).toBe(400)
    })

    it('400 — mot de passe sans majuscule', async () => {
      const res = await request(app)
        .post('/api/v1/users/register')
        .send({ name: 'Bob', email: 'bob@example.com', password: 'alllower123' })

      expect(res.status).toBe(400)
    })

    it('400 — nom trop court', async () => {
      const res = await request(app)
        .post('/api/v1/users/register')
        .send({ name: 'B', email: 'bob@example.com', password: 'Password123' })

      expect(res.status).toBe(400)
    })

    it('500 — le service échoue', async () => {
      userService.create.mockRejectedValue(new Error('Email déjà utilisé'))

      const res = await request(app)
        .post('/api/v1/users/register')
        .send({ name: 'Bob', email: 'bob@example.com', password: 'Password123' })

      expect(res.status).toBe(500)
    })
  })

  // ── POST /users/login ──────────────────────────────────────────────────────
  describe('POST /users/login', () => {
    it('200 — retourne un token JWT et un refresh token', async () => {
      const mockUser = { userId: 1, name: 'Bob', email: 'bob@example.com', role: 'user', hasValidatedEmail: true }
      userService.findByEmail.mockResolvedValue(mockUser)
      userService.verifyPassword.mockResolvedValue(true)
      userService.setRefreshToken.mockResolvedValue()
      userService.updateLoginDate.mockResolvedValue()

      const res = await request(app)
        .post('/api/v1/users/login')
        .send({ email: 'bob@example.com', password: 'Password123' })

      expect(res.status).toBe(200)
      expect(res.body.token).toBeDefined()
      expect(res.body.refreshToken).toBeDefined()
    })

    it('401 — utilisateur introuvable (identifiants invalides)', async () => {
      userService.findByEmail.mockResolvedValue(null)

      const res = await request(app)
        .post('/api/v1/users/login')
        .send({ email: 'unknown@example.com', password: 'Password123' })

      expect(res.status).toBe(401)
    })

    it('401 — mauvais mot de passe', async () => {
      userService.findByEmail.mockResolvedValue({ userId: 1 })
      userService.verifyPassword.mockResolvedValue(false)

      const res = await request(app)
        .post('/api/v1/users/login')
        .send({ email: 'bob@example.com', password: 'WrongPass1' })

      expect(res.status).toBe(401)
    })

    it('403 — email non vérifié', async () => {
      userService.findByEmail.mockResolvedValue({ userId: 1, hasValidatedEmail: false })
      userService.verifyPassword.mockResolvedValue(true)

      const res = await request(app)
        .post('/api/v1/users/login')
        .send({ email: 'bob@example.com', password: 'Password123' })

      expect(res.status).toBe(403)
      expect(res.body.message).toMatch(/email/i)
    })

    it('400 — mot de passe manquant', async () => {
      const res = await request(app).post('/api/v1/users/login').send({ email: 'bob@example.com' })

      expect(res.status).toBe(400)
    })

    it('400 — email invalide', async () => {
      const res = await request(app)
        .post('/api/v1/users/login')
        .send({ email: 'bad-email', password: 'Password123' })

      expect(res.status).toBe(400)
    })
  })

  // ── POST /users/refresh-token ─────────────────────────────────────────────
  describe('POST /users/refresh-token', () => {
    const FAKE_RT = 'a'.repeat(128)

    it('200 — retourne un nouveau token JWT et un nouveau refresh token', async () => {
      userService.verifyRefreshToken.mockResolvedValue({ userId: 1 })
      userService.setRefreshToken.mockResolvedValue()

      const res = await request(app)
        .post('/api/v1/users/refresh-token')
        .send({ refreshToken: FAKE_RT })

      expect(res.status).toBe(200)
      expect(res.body.token).toBeDefined()
      expect(res.body.refreshToken).toBeDefined()
      expect(userService.setRefreshToken).toHaveBeenCalledTimes(1)
    })

    it('401 — refresh token invalide ou expiré', async () => {
      userService.verifyRefreshToken.mockResolvedValue(null)

      const res = await request(app)
        .post('/api/v1/users/refresh-token')
        .send({ refreshToken: FAKE_RT })

      expect(res.status).toBe(401)
      expect(userService.setRefreshToken).not.toHaveBeenCalled()
    })

    it('400 — refreshToken absent du body', async () => {
      const res = await request(app).post('/api/v1/users/refresh-token').send({})

      expect(res.status).toBe(400)
      expect(res.body.errors).toBeDefined()
    })

    it('500 — le service échoue', async () => {
      userService.verifyRefreshToken.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .post('/api/v1/users/refresh-token')
        .send({ refreshToken: FAKE_RT })

      expect(res.status).toBe(500)
    })
  })

  // ── POST /users/logout ────────────────────────────────────────────────────
  describe('POST /users/logout', () => {
    const FAKE_RT = 'b'.repeat(128)

    it('200 — révoque le refresh token en base', async () => {
      userService.verifyRefreshToken.mockResolvedValue({ userId: 1 })
      userService.clearRefreshToken.mockResolvedValue()

      const res = await request(app)
        .post('/api/v1/users/logout')
        .send({ refreshToken: FAKE_RT })

      expect(res.status).toBe(200)
      expect(userService.clearRefreshToken).toHaveBeenCalledWith(1)
    })

    it('200 — idempotent si le token est inconnu (pas de clearRefreshToken)', async () => {
      userService.verifyRefreshToken.mockResolvedValue(null)

      const res = await request(app)
        .post('/api/v1/users/logout')
        .send({ refreshToken: FAKE_RT })

      expect(res.status).toBe(200)
      expect(userService.clearRefreshToken).not.toHaveBeenCalled()
    })

    it('400 — refreshToken absent du body', async () => {
      const res = await request(app).post('/api/v1/users/logout').send({})

      expect(res.status).toBe(400)
      expect(res.body.errors).toBeDefined()
    })

    it('500 — le service échoue', async () => {
      userService.verifyRefreshToken.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .post('/api/v1/users/logout')
        .send({ refreshToken: FAKE_RT })

      expect(res.status).toBe(500)
    })
  })

  // ── GET /users/:id ─────────────────────────────────────────────────────────
  describe('GET /users/:id', () => {
    it("200 — retourne l'utilisateur", async () => {
      const mockUser = { userId: 1, name: 'Bob', email: 'bob@example.com', roleId: 1 }
      userService.findOne.mockResolvedValue(mockUser)
      roleService.findOne.mockResolvedValue({ roleId: 1, name: 'admin' })

      const res = await request(app)
        .get('/api/v1/users/1')
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body.userId).toBe(1)
    })

    it('401 — pas de token', async () => {
      const res = await request(app).get('/api/v1/users/1')
      expect(res.status).toBe(401)
    })

    it('401 — token invalide', async () => {
      const res = await request(app)
        .get('/api/v1/users/1')
        .set('Authorization', 'Bearer invalid.token.here')
      expect(res.status).toBe(401)
    })

    it('404 — utilisateur introuvable', async () => {
      userService.findOne.mockResolvedValue(null)

      // Le token doit avoir id=1 et le param doit être 1 pour passer la vérif d'ownership
      const res = await request(app)
        .get('/api/v1/users/1')
        .set('Authorization', `Bearer ${makeToken({ id: 1 })}`)

      expect(res.status).toBe(404)
    })
  })

  // ── POST /users/forgot-password ────────────────────────────────────────────
  describe('POST /users/forgot-password', () => {
    const FAKE_TOKEN = 'a'.repeat(64)

    it("200 — envoie l'email avec le token (réponse générique)", async () => {
      userService.findByEmail.mockResolvedValue({ userId: 1, email: 'bob@example.com' })
      userService.setResetPasswordCode.mockResolvedValue(FAKE_TOKEN)
      sendEmail.mockResolvedValue()

      const res = await request(app)
        .post('/api/v1/users/forgot-password')
        .send({ email: 'bob@example.com' })

      expect(res.status).toBe(200)
      expect(sendEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining(FAKE_TOKEN),
        'bob@example.com'
      )
    })

    it('200 — réponse générique si utilisateur introuvable (anti-énumération)', async () => {
      userService.findByEmail.mockResolvedValue(null)

      const res = await request(app)
        .post('/api/v1/users/forgot-password')
        .send({ email: 'unknown@example.com' })

      expect(res.status).toBe(200)
      expect(sendEmail).not.toHaveBeenCalled()
    })

    it('400 — email invalide', async () => {
      const res = await request(app).post('/api/v1/users/forgot-password').send({ email: 'bad' })

      expect(res.status).toBe(400)
    })
  })

  // ── POST /users/reset-password ─────────────────────────────────────────────
  describe('POST /users/reset-password', () => {
    const VALID_TOKEN = 'a'.repeat(64)
    const WRONG_TOKEN = 'b'.repeat(64)

    it('201 — réinitialise le mot de passe', async () => {
      userService.findByEmail.mockResolvedValue({ userId: 1 })
      userService.verifyResetPasswordCode.mockResolvedValue(true)
      userService.setPassword.mockResolvedValue()

      const res = await request(app)
        .post('/api/v1/users/reset-password')
        .send({ email: 'bob@example.com', code: VALID_TOKEN, newPassword: 'NewPass123' })

      expect(res.status).toBe(201)
    })

    it('401 — token invalide (ne correspond pas)', async () => {
      userService.findByEmail.mockResolvedValue({ userId: 1 })
      userService.verifyResetPasswordCode.mockResolvedValue(false)

      const res = await request(app)
        .post('/api/v1/users/reset-password')
        .send({ email: 'bob@example.com', code: WRONG_TOKEN, newPassword: 'NewPass123' })

      expect(res.status).toBe(401)
    })

    it('400 — token absent', async () => {
      const res = await request(app)
        .post('/api/v1/users/reset-password')
        .send({ email: 'bob@example.com', newPassword: 'NewPass123' })

      expect(res.status).toBe(400)
    })

    it('400 — token format invalide (trop court)', async () => {
      const res = await request(app)
        .post('/api/v1/users/reset-password')
        .send({ email: 'bob@example.com', code: 'abc123', newPassword: 'NewPass123' })

      expect(res.status).toBe(400)
    })
  })

  // ── PUT /users/:id/change-password ─────────────────────────────────────────
  describe('PUT /users/:id/change-password', () => {
    it('200 — change le mot de passe', async () => {
      userService.findOne.mockResolvedValue({ userId: 1 })
      userService.verifyPassword.mockResolvedValue(true)
      userService.setPassword.mockResolvedValue()

      const res = await request(app)
        .put('/api/v1/users/1/change-password')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ id: 1, oldPassword: 'OldPass123', newPassword: 'NewPass123' })

      expect(res.status).toBe(200)
    })

    it('401 — ancien mot de passe incorrect', async () => {
      userService.findOne.mockResolvedValue({ userId: 1 })
      userService.verifyPassword.mockResolvedValue(false)

      const res = await request(app)
        .put('/api/v1/users/1/change-password')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ id: 1, oldPassword: 'WrongOld1', newPassword: 'NewPass123' })

      expect(res.status).toBe(401)
    })

    it('401 — pas de token', async () => {
      const res = await request(app)
        .put('/api/v1/users/1/change-password')
        .send({ id: 1, oldPassword: 'OldPass123', newPassword: 'NewPass123' })

      expect(res.status).toBe(401)
    })

    it('400 — id invalide', async () => {
      const res = await request(app)
        .put('/api/v1/users/1/change-password')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ id: 'not-an-int', oldPassword: 'OldPass123', newPassword: 'NewPass123' })

      expect(res.status).toBe(400)
    })
  })

  // ── DELETE /users/:id ──────────────────────────────────────────────────────
  describe('DELETE /users/:id', () => {
    it("200 — supprime l'utilisateur", async () => {
      userService.delete.mockResolvedValue()

      const res = await request(app)
        .delete('/api/v1/users/1')
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
    })

    it('401 — pas de token', async () => {
      const res = await request(app).delete('/api/v1/users/1')
      expect(res.status).toBe(401)
    })
  })

  // ── POST /users/:id/role ───────────────────────────────────────────────────
  describe('POST /users/:id/role', () => {
    it("200 — assigne un rôle à l'utilisateur (admin)", async () => {
      userService.setRole.mockResolvedValue()

      const res = await request(app)
        .post('/api/v1/users/2/role')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ roleId: 3 })

      expect(res.status).toBe(200)
      expect(userService.setRole).toHaveBeenCalledTimes(1)
    })

    it('403 — rôle non autorisé (étudiant)', async () => {
      User.findByPk.mockResolvedValueOnce({ roleId: 2 })

      const res = await request(app)
        .post('/api/v1/users/2/role')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ roleId: 3 })

      expect(res.status).toBe(403)
      expect(userService.setRole).not.toHaveBeenCalled()
    })

    it('401 — pas de token', async () => {
      const res = await request(app).post('/api/v1/users/2/role').send({ roleId: 3 })
      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      userService.setRole.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .post('/api/v1/users/2/role')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ roleId: 3 })

      expect(res.status).toBe(500)
    })
  })

  // ── PUT /users/:id/role ────────────────────────────────────────────────────
  describe('PUT /users/:id/role', () => {
    it("200 — met à jour le rôle de l'utilisateur (admin)", async () => {
      userService.setRole.mockResolvedValue()

      const res = await request(app)
        .put('/api/v1/users/2/role')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ roleId: 3 })

      expect(res.status).toBe(200)
      expect(userService.setRole).toHaveBeenCalledTimes(1)
    })

    it('403 — rôle non autorisé (étudiant)', async () => {
      User.findByPk.mockResolvedValueOnce({ roleId: 2 })

      const res = await request(app)
        .put('/api/v1/users/2/role')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ roleId: 3 })

      expect(res.status).toBe(403)
      expect(userService.setRole).not.toHaveBeenCalled()
    })

    it('401 — pas de token', async () => {
      const res = await request(app).put('/api/v1/users/2/role').send({ roleId: 3 })
      expect(res.status).toBe(401)
    })
  })

  // ── DELETE /users/:id/role ─────────────────────────────────────────────────
  describe('DELETE /users/:id/role', () => {
    it("200 — supprime le rôle de l'utilisateur (admin)", async () => {
      userService.deleteRole.mockResolvedValue()

      const res = await request(app)
        .delete('/api/v1/users/2/role')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ roleId: 3 })

      expect(res.status).toBe(200)
      expect(userService.deleteRole).toHaveBeenCalledTimes(1)
    })

    it('403 — rôle non autorisé (étudiant)', async () => {
      User.findByPk.mockResolvedValueOnce({ roleId: 2 })

      const res = await request(app)
        .delete('/api/v1/users/2/role')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ roleId: 3 })

      expect(res.status).toBe(403)
      expect(userService.deleteRole).not.toHaveBeenCalled()
    })

    it('401 — pas de token', async () => {
      const res = await request(app).delete('/api/v1/users/2/role').send({ roleId: 3 })
      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      userService.deleteRole.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .delete('/api/v1/users/2/role')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ roleId: 3 })

      expect(res.status).toBe(500)
    })
  })
})

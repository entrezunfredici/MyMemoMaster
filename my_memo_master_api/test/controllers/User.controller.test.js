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
  search: jest.fn(),
  create: jest.fn(),
  isRegistrationOpen: jest.fn().mockResolvedValue(true),
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
  setActive: jest.fn(),
  verifyValidEmailCode: jest.fn(),
  verifyResetPasswordCode: jest.fn(),
  setEmailValidated: jest.fn().mockResolvedValue(true),
  setTwoFactorCode: jest.fn(),
  verifyTwoFactorCode: jest.fn(),
  setTwoFactorEnabled: jest.fn()
}))

jest.mock('../../services/Role.service', () => ({ findOne: jest.fn() }))

jest.mock('../../helpers/tokenBlacklist', () => ({
  revokeUserTokens: jest.fn().mockResolvedValue(undefined),
  isTokenRevoked: jest.fn().mockResolvedValue(false)
}))

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
const tokenBlacklist = require('../../helpers/tokenBlacklist')
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
        .send({ name: 'Bob', email: 'bob@example.com', password: 'Password123!' })

      expect(res.status).toBe(201)
      expect(userService.create).toHaveBeenCalledTimes(1)
    })

    it('400 — email invalide', async () => {
      const res = await request(app)
        .post('/api/v1/users/register')
        .send({ name: 'Bob', email: 'not-an-email', password: 'Password123!' })

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
        .send({ name: 'Bob', email: 'bob@example.com', password: 'alllower123!' })

      expect(res.status).toBe(400)
    })

    it('400 — mot de passe sans caractère spécial', async () => {
      const res = await request(app)
        .post('/api/v1/users/register')
        .send({ name: 'Bob', email: 'bob@example.com', password: 'Password123' })

      expect(res.status).toBe(400)
    })

    it('400 — nom trop court', async () => {
      const res = await request(app)
        .post('/api/v1/users/register')
        .send({ name: 'B', email: 'bob@example.com', password: 'Password123!' })

      expect(res.status).toBe(400)
    })

    it('400 — email déjà utilisé (pré-check du service)', async () => {
      userService.create.mockRejectedValue(new Error('Email déjà utilisé'))

      const res = await request(app)
        .post('/api/v1/users/register')
        .send({ name: 'Bob', email: 'bob@example.com', password: 'Password123!' })

      expect(res.status).toBe(400)
      expect(res.body.message).toBe('Cet email est déjà utilisé.')
    })

    it('400 — email déjà utilisé (race condition, contrainte UNIQUE)', async () => {
      const uniqueError = new Error('Validation error')
      uniqueError.name = 'SequelizeUniqueConstraintError'
      userService.create.mockRejectedValue(uniqueError)

      const res = await request(app)
        .post('/api/v1/users/register')
        .send({ name: 'Bob', email: 'bob@example.com', password: 'Password123!' })

      expect(res.status).toBe(400)
      expect(res.body.message).toBe('Cet email est déjà utilisé.')
    })

    it('500 — le service échoue (erreur interne)', async () => {
      userService.create.mockRejectedValue(new Error('Connexion base perdue'))

      const res = await request(app)
        .post('/api/v1/users/register')
        .send({ name: 'Bob', email: 'bob@example.com', password: 'Password123!' })

      expect(res.status).toBe(500)
    })

    it("403 — limite d'utilisateurs atteinte (MAX_USERS)", async () => {
      userService.create.mockRejectedValue(new Error("Limite d'utilisateurs atteinte"))

      const res = await request(app)
        .post('/api/v1/users/register')
        .send({ name: 'Bob', email: 'bob@example.com', password: 'Password123!' })

      expect(res.status).toBe(403)
      expect(res.body.message).toBe("Le nombre maximal d'utilisateurs a été atteint. Les inscriptions sont temporairement fermées.")
    })
  })

  // ── GET /users/registration-status ─────────────────────────────────────────
  describe('GET /users/registration-status', () => {
    it('200 — inscriptions ouvertes', async () => {
      userService.isRegistrationOpen.mockResolvedValue(true)

      const res = await request(app).get('/api/v1/users/registration-status')

      expect(res.status).toBe(200)
      expect(res.body).toEqual({ open: true })
    })

    it('200 — inscriptions fermées (limite atteinte)', async () => {
      userService.isRegistrationOpen.mockResolvedValue(false)

      const res = await request(app).get('/api/v1/users/registration-status')

      expect(res.status).toBe(200)
      expect(res.body).toEqual({ open: false })
    })

    it('500 — le service échoue', async () => {
      userService.isRegistrationOpen.mockRejectedValue(new Error('DB down'))

      const res = await request(app).get('/api/v1/users/registration-status')

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

  // ── Double authentification par email ──────────────────────────────────────
  describe('POST /users/login — double authentification', () => {
    const login = () =>
      request(app).post('/api/v1/users/login').send({ email: 'bob@example.com', password: 'Password123' })

    beforeEach(() => {
      userService.verifyPassword.mockResolvedValue(true)
      userService.setRefreshToken.mockResolvedValue()
      userService.updateLoginDate.mockResolvedValue()
      userService.setTwoFactorCode.mockResolvedValue('654321')
    })

    it('200 — utilisateur ayant activé la 2FA : envoie le code par email et ne renvoie aucune session', async () => {
      userService.findByEmail.mockResolvedValue({
        userId: 1, name: 'Bob', email: 'bob@example.com', roleId: 2, hasValidatedEmail: true, twoFactorEnabled: true
      })

      const res = await login()

      expect(res.status).toBe(200)
      expect(res.body.twoFactorRequired).toBe(true)
      expect(res.body.challengeToken).toBeDefined()
      expect(res.body.token).toBeUndefined()
      expect(res.body.refreshToken).toBeUndefined()
      expect(userService.setRefreshToken).not.toHaveBeenCalled()
      expect(sendEmail).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('654321'), 'bob@example.com')
    })

    it.each([1, 4])('200 — administrateur (rôle %i) sans activation volontaire : 2FA exigée', async (roleId) => {
      userService.findByEmail.mockResolvedValue({
        userId: 1, name: 'Admin', email: 'admin@example.com', roleId, hasValidatedEmail: true, twoFactorEnabled: false
      })

      const res = await login()

      expect(res.body.twoFactorRequired).toBe(true)
      expect(res.body.token).toBeUndefined()
    })

    it('200 — utilisateur standard sans 2FA : session ouverte directement', async () => {
      userService.findByEmail.mockResolvedValue({
        userId: 1, name: 'Bob', email: 'bob@example.com', roleId: 2, hasValidatedEmail: true, twoFactorEnabled: false
      })

      const res = await login()

      expect(res.body.token).toBeDefined()
      expect(res.body.twoFactorRequired).toBeUndefined()
      expect(sendEmail).not.toHaveBeenCalled()
    })

    it('200 — code déjà envoyé il y a moins d\'une minute : défi renvoyé sans second email', async () => {
      userService.setTwoFactorCode.mockResolvedValue(null)
      userService.findByEmail.mockResolvedValue({
        userId: 1, name: 'Bob', email: 'bob@example.com', roleId: 2, hasValidatedEmail: true, twoFactorEnabled: true
      })

      const res = await login()

      expect(res.body.twoFactorRequired).toBe(true)
      expect(sendEmail).not.toHaveBeenCalled()
    })

    it('401 — mauvais mot de passe : aucun code n\'est envoyé', async () => {
      userService.findByEmail.mockResolvedValue({ userId: 1, roleId: 1, twoFactorEnabled: true })
      userService.verifyPassword.mockResolvedValue(false)

      const res = await login()

      expect(res.status).toBe(401)
      expect(sendEmail).not.toHaveBeenCalled()
    })
  })

  describe('POST /users/login/2fa', () => {
    const { signChallengeToken } = require('../../helpers/twoFactor')
    const verify = (body) => request(app).post('/api/v1/users/login/2fa').send(body)

    beforeEach(() => {
      userService.findOne.mockResolvedValue({ userId: 1, isActive: true })
      userService.setRefreshToken.mockResolvedValue()
      userService.updateLoginDate.mockResolvedValue()
    })

    it('200 — bon code : ouvre la session', async () => {
      userService.verifyTwoFactorCode.mockResolvedValue(true)

      const res = await verify({ challengeToken: signChallengeToken(1), code: '123456' })

      expect(res.status).toBe(200)
      expect(res.body.token).toBeDefined()
      expect(res.body.refreshToken).toBeDefined()
      expect(userService.verifyTwoFactorCode).toHaveBeenCalledWith(1, '123456')
      expect(userService.updateLoginDate).toHaveBeenCalledWith(1)
    })

    it('401 — mauvais code', async () => {
      userService.verifyTwoFactorCode.mockResolvedValue(false)

      const res = await verify({ challengeToken: signChallengeToken(1), code: '000000' })

      expect(res.status).toBe(401)
      expect(res.body.token).toBeUndefined()
      expect(userService.setRefreshToken).not.toHaveBeenCalled()
    })

    it('401 — jeton de défi invalide', async () => {
      const res = await verify({ challengeToken: 'faux', code: '123456' })

      expect(res.status).toBe(401)
      expect(userService.verifyTwoFactorCode).not.toHaveBeenCalled()
    })

    it('401 — un jeton d\'accès ne peut pas servir de jeton de défi', async () => {
      const res = await verify({ challengeToken: makeToken({ id: 1 }), code: '123456' })

      expect(res.status).toBe(401)
    })

    it('403 — compte désactivé entre-temps', async () => {
      userService.findOne.mockResolvedValue({ userId: 1, isActive: false })
      userService.verifyTwoFactorCode.mockResolvedValue(true)

      const res = await verify({ challengeToken: signChallengeToken(1), code: '123456' })

      expect(res.status).toBe(403)
      expect(userService.verifyTwoFactorCode).not.toHaveBeenCalled()
    })

    it('400 — code qui n\'a pas 6 chiffres', async () => {
      const res = await verify({ challengeToken: signChallengeToken(1), code: '12ab' })

      expect(res.status).toBe(400)
    })

    it('400 — jeton de défi manquant', async () => {
      const res = await verify({ code: '123456' })

      expect(res.status).toBe(400)
    })
  })

  describe('POST /users/login/2fa/resend', () => {
    const { signChallengeToken } = require('../../helpers/twoFactor')
    const resend = (body) => request(app).post('/api/v1/users/login/2fa/resend').send(body)

    beforeEach(() => {
      userService.findOne.mockResolvedValue({ userId: 1, name: 'Bob', email: 'bob@example.com', isActive: true })
    })

    it('200 — renvoie un code par email', async () => {
      userService.setTwoFactorCode.mockResolvedValue('111222')

      const res = await resend({ challengeToken: signChallengeToken(1) })

      expect(res.status).toBe(200)
      expect(sendEmail).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('111222'), 'bob@example.com')
    })

    it('429 — un code vient d\'être envoyé', async () => {
      userService.setTwoFactorCode.mockResolvedValue(null)

      const res = await resend({ challengeToken: signChallengeToken(1) })

      expect(res.status).toBe(429)
      expect(sendEmail).not.toHaveBeenCalled()
    })

    it('401 — jeton de défi invalide', async () => {
      const res = await resend({ challengeToken: 'faux' })

      expect(res.status).toBe(401)
      expect(sendEmail).not.toHaveBeenCalled()
    })

    it('403 — compte désactivé', async () => {
      userService.findOne.mockResolvedValue({ userId: 1, isActive: false })

      const res = await resend({ challengeToken: signChallengeToken(1) })

      expect(res.status).toBe(403)
    })
  })

  describe('PUT /users/two-factor', () => {
    const put = (body, token = makeToken({ id: 1 })) =>
      request(app).put('/api/v1/users/two-factor').set('Authorization', `Bearer ${token}`).send(body)

    beforeEach(() => {
      userService.verifyPassword.mockResolvedValue(true)
      userService.setTwoFactorEnabled.mockResolvedValue()
    })

    it('200 — un utilisateur standard active la 2FA', async () => {
      userService.findOne.mockResolvedValue({ userId: 1, roleId: 2 })

      const res = await put({ enabled: true, password: 'Password123' })

      expect(res.status).toBe(200)
      expect(res.body.twoFactorEnabled).toBe(true)
      expect(userService.setTwoFactorEnabled).toHaveBeenCalledWith(1, true)
    })

    it('200 — un utilisateur standard désactive la 2FA', async () => {
      userService.findOne.mockResolvedValue({ userId: 1, roleId: 2, twoFactorEnabled: true })

      const res = await put({ enabled: false, password: 'Password123' })

      expect(res.status).toBe(200)
      expect(res.body.twoFactorEnabled).toBe(false)
      expect(userService.setTwoFactorEnabled).toHaveBeenCalledWith(1, false)
    })

    it('200 — la chaîne "false" est bien traitée comme un booléen faux', async () => {
      userService.findOne.mockResolvedValue({ userId: 1, roleId: 2 })

      const res = await put({ enabled: 'false', password: 'Password123' })

      expect(res.status).toBe(200)
      expect(userService.setTwoFactorEnabled).toHaveBeenCalledWith(1, false)
    })

    it.each([1, 4])('403 — un administrateur (rôle %i) ne peut pas la désactiver', async (roleId) => {
      userService.findOne.mockResolvedValue({ userId: 1, roleId })

      const res = await put({ enabled: false, password: 'Password123' })

      expect(res.status).toBe(403)
      expect(userService.setTwoFactorEnabled).not.toHaveBeenCalled()
    })

    it('401 — mot de passe incorrect', async () => {
      userService.findOne.mockResolvedValue({ userId: 1, roleId: 2 })
      userService.verifyPassword.mockResolvedValue(false)

      const res = await put({ enabled: true, password: 'Mauvais1!' })

      expect(res.status).toBe(401)
      expect(userService.setTwoFactorEnabled).not.toHaveBeenCalled()
    })

    it('400 — enabled non booléen', async () => {
      const res = await put({ enabled: 'peut-être', password: 'Password123' })

      expect(res.status).toBe(400)
    })

    it('400 — mot de passe manquant', async () => {
      const res = await put({ enabled: true })

      expect(res.status).toBe(400)
    })

    it('401 — sans authentification', async () => {
      const res = await request(app).put('/api/v1/users/two-factor').send({ enabled: true, password: 'x' })

      expect(res.status).toBe(401)
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

    it('200 — révoque le refresh token en base et le token d\'accès en cours (A07-M1)', async () => {
      userService.verifyRefreshToken.mockResolvedValue({ userId: 1 })
      userService.clearRefreshToken.mockResolvedValue()

      const res = await request(app)
        .post('/api/v1/users/logout')
        .send({ refreshToken: FAKE_RT })

      expect(res.status).toBe(200)
      expect(userService.clearRefreshToken).toHaveBeenCalledWith(1)
      expect(tokenBlacklist.revokeUserTokens).toHaveBeenCalledWith(1)
    })

    it('200 — idempotent si le token est inconnu (pas de clearRefreshToken ni de révocation)', async () => {
      userService.verifyRefreshToken.mockResolvedValue(null)

      const res = await request(app)
        .post('/api/v1/users/logout')
        .send({ refreshToken: FAKE_RT })

      expect(res.status).toBe(200)
      expect(userService.clearRefreshToken).not.toHaveBeenCalled()
      expect(tokenBlacklist.revokeUserTokens).not.toHaveBeenCalled()
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

  // ── POST /users/reset-password ────────────────────────────────────────────
  describe('POST /users/reset-password', () => {
    const VALID_BODY = { email: 'test@example.com', code: '123456', newPassword: 'NewPassw0rd!' }

    it('201 — révoque le refresh token et le token d\'accès en cours (A07-M1)', async () => {
      userService.findByEmail.mockResolvedValue({ userId: 1, email: VALID_BODY.email })
      userService.verifyResetPasswordCode.mockResolvedValue(true)
      userService.setPassword.mockResolvedValue()
      userService.clearRefreshToken.mockResolvedValue()

      const res = await request(app).post('/api/v1/users/reset-password').send(VALID_BODY)

      expect(res.status).toBe(201)
      expect(userService.clearRefreshToken).toHaveBeenCalledWith(1)
      expect(tokenBlacklist.revokeUserTokens).toHaveBeenCalledWith(1)
    })

    it('401 — code invalide, aucune révocation', async () => {
      userService.findByEmail.mockResolvedValue({ userId: 1, email: VALID_BODY.email })
      userService.verifyResetPasswordCode.mockResolvedValue(false)

      const res = await request(app).post('/api/v1/users/reset-password').send(VALID_BODY)

      expect(res.status).toBe(401)
      expect(tokenBlacklist.revokeUserTokens).not.toHaveBeenCalled()
    })
  })

  // ── PUT /users/:id/change-password ────────────────────────────────────────
  describe('PUT /users/:id/change-password', () => {
    const VALID_BODY = { oldPassword: 'OldPassw0rd!', newPassword: 'NewPassw0rd!' }

    it('200 — révoque le token d\'accès en cours (A07-M1), sans toucher au refresh token', async () => {
      userService.findOne.mockResolvedValue({ userId: 1, email: 'test@example.com' })
      userService.verifyPassword.mockResolvedValue(true)
      userService.setPassword.mockResolvedValue()

      const res = await request(app)
        .put('/api/v1/users/1/change-password')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send(VALID_BODY)

      expect(res.status).toBe(200)
      expect(tokenBlacklist.revokeUserTokens).toHaveBeenCalledWith(1)
      expect(userService.clearRefreshToken).not.toHaveBeenCalled()
    })

    it('401 — ancien mot de passe incorrect, aucune révocation', async () => {
      userService.findOne.mockResolvedValue({ userId: 1, email: 'test@example.com' })
      userService.verifyPassword.mockResolvedValue(false)

      const res = await request(app)
        .put('/api/v1/users/1/change-password')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send(VALID_BODY)

      expect(res.status).toBe(401)
      expect(tokenBlacklist.revokeUserTokens).not.toHaveBeenCalled()
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
    const FAKE_CODE = '123456'

    it("200 — envoie l'email avec le code à 6 chiffres (réponse générique)", async () => {
      userService.findByEmail.mockResolvedValue({ userId: 1, name: 'Bob', email: 'bob@example.com' })
      userService.setResetPasswordCode.mockResolvedValue(FAKE_CODE)
      sendEmail.mockResolvedValue()

      const res = await request(app)
        .post('/api/v1/users/forgot-password')
        .send({ email: 'bob@example.com' })

      expect(res.status).toBe(200)
      expect(sendEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining(FAKE_CODE),
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
    const VALID_CODE = '123456'
    const WRONG_CODE = '654321'

    it('201 — réinitialise le mot de passe et révoque le refresh token', async () => {
      userService.findByEmail.mockResolvedValue({ userId: 1 })
      userService.verifyResetPasswordCode.mockResolvedValue(true)
      userService.setPassword.mockResolvedValue()
      userService.clearRefreshToken.mockResolvedValue()

      const res = await request(app)
        .post('/api/v1/users/reset-password')
        .send({ email: 'bob@example.com', code: VALID_CODE, newPassword: 'NewPass123!' })

      expect(res.status).toBe(201)
      expect(userService.clearRefreshToken).toHaveBeenCalledWith(1)
    })

    it('401 — code invalide (ne correspond pas)', async () => {
      userService.findByEmail.mockResolvedValue({ userId: 1 })
      userService.verifyResetPasswordCode.mockResolvedValue(false)

      const res = await request(app)
        .post('/api/v1/users/reset-password')
        .send({ email: 'bob@example.com', code: WRONG_CODE, newPassword: 'NewPass123!' })

      expect(res.status).toBe(401)
    })

    it('401 — email inconnu (anti-énumération : pas de 404)', async () => {
      userService.findByEmail.mockResolvedValue(null)

      const res = await request(app)
        .post('/api/v1/users/reset-password')
        .send({ email: 'unknown@example.com', code: VALID_CODE, newPassword: 'NewPass123!' })

      expect(res.status).toBe(401)
      expect(userService.verifyResetPasswordCode).not.toHaveBeenCalled()
    })

    it('400 — code absent', async () => {
      const res = await request(app)
        .post('/api/v1/users/reset-password')
        .send({ email: 'bob@example.com', newPassword: 'NewPass123!' })

      expect(res.status).toBe(400)
    })

    it('400 — code format invalide (pas 6 chiffres)', async () => {
      const res = await request(app)
        .post('/api/v1/users/reset-password')
        .send({ email: 'bob@example.com', code: 'abc123', newPassword: 'NewPass123!' })

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
        .send({ id: 1, oldPassword: 'OldPass123', newPassword: 'NewPass123!' })

      expect(res.status).toBe(200)
    })

    it('401 — ancien mot de passe incorrect', async () => {
      userService.findOne.mockResolvedValue({ userId: 1 })
      userService.verifyPassword.mockResolvedValue(false)

      const res = await request(app)
        .put('/api/v1/users/1/change-password')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ id: 1, oldPassword: 'WrongOld1', newPassword: 'NewPass123!' })

      expect(res.status).toBe(401)
    })

    it('401 — pas de token', async () => {
      const res = await request(app)
        .put('/api/v1/users/1/change-password')
        .send({ id: 1, oldPassword: 'OldPass123', newPassword: 'NewPass123!' })

      expect(res.status).toBe(401)
    })

    it('400 — nouveau mot de passe sans caractère spécial', async () => {
      const res = await request(app)
        .put('/api/v1/users/1/change-password')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ oldPassword: 'OldPass123', newPassword: 'NewPass123' })

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

  // ── GET /users (administration) ────────────────────────────────────────────
  describe('GET /users', () => {
    const PAGE = { users: [{ userId: 2, name: 'Alice', email: 'a@x.fr', roleId: 2, isActive: true }], total: 1, page: 1, limit: 20 }

    it('200 — renvoie la page de comptes et transmet les filtres', async () => {
      userService.search.mockResolvedValue(PAGE)

      const res = await request(app)
        .get('/api/v1/users?search=ali&roleId=2&page=3&limit=10')
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual(PAGE)
      expect(userService.search).toHaveBeenCalledWith({ search: 'ali', roleId: '2', page: '3', limit: '10' })
    })

    it('200 — sans filtre', async () => {
      userService.search.mockResolvedValue(PAGE)
      const res = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${makeToken()}`)
      expect(res.status).toBe(200)
      expect(userService.search).toHaveBeenCalledWith({ search: undefined, roleId: undefined, page: undefined, limit: undefined })
    })

    it('401 — pas de token', async () => {
      const res = await request(app).get('/api/v1/users')
      expect(res.status).toBe(401)
    })

    it.each([2, 3, 4, 5])('403 — rôle %i non autorisé', async (roleId) => {
      User.findByPk.mockResolvedValueOnce({ roleId })
      const res = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${makeToken()}`)
      expect(res.status).toBe(403)
      expect(userService.search).not.toHaveBeenCalled()
    })

    it('500 — le service échoue', async () => {
      userService.search.mockRejectedValue(new Error('DB error'))
      const res = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${makeToken()}`)
      expect(res.status).toBe(500)
      expect(res.body.message).toBe('Erreur lors de la récupération des comptes.')
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

  // ── Garde-fous sur les rôles de compte ─────────────────────────────────────
  describe('rôle de compte — garde-fous', () => {
    const asAdmin = (req) => req.set('Authorization', `Bearer ${makeToken({ id: 1 })}`)

    it.each([['post'], ['put']])('%s /users/:id/role — 400 sans rôle valide', async (method) => {
      for (const body of [{}, { roleId: '' }, { roleId: null }, { roleId: 'abc' }, { roleId: 1.5 }]) {
        const res = await asAdmin(request(app)[method]('/api/v1/users/2/role')).send(body)
        expect(res.status).toBe(400)
        expect(res.body.message).toBe('Le rôle est requis.')
      }
      expect(userService.setRole).not.toHaveBeenCalled()
    })

    it.each([['post'], ['put']])('%s /users/:id/role — 403 : un administrateur ne peut pas quitter son propre rôle', async (method) => {
      const res = await asAdmin(request(app)[method]('/api/v1/users/1/role')).send({ roleId: 2 })
      expect(res.status).toBe(403)
      expect(res.body.message).toBe("Vous ne pouvez pas retirer votre propre rôle d'administrateur.")
      expect(userService.setRole).not.toHaveBeenCalled()
    })

    it('PUT /users/:id/role — se réattribuer le rôle administrateur reste permis', async () => {
      userService.setRole.mockResolvedValue()
      const res = await asAdmin(request(app).put('/api/v1/users/1/role')).send({ roleId: 1 })
      expect(res.status).toBe(200)
      expect(userService.setRole).toHaveBeenCalledWith('1', 1, 1)
    })

    it('PUT /users/:id/role — changer le rôle d’un autre compte reste permis', async () => {
      userService.setRole.mockResolvedValue()
      const res = await asAdmin(request(app).put('/api/v1/users/2/role')).send({ roleId: 4 })
      expect(res.status).toBe(200)
      expect(userService.setRole).toHaveBeenCalledWith('2', 4, 1)
    })

    it('DELETE /users/:id/role — 403 sur son propre compte', async () => {
      const res = await asAdmin(request(app).delete('/api/v1/users/1/role'))
      expect(res.status).toBe(403)
      expect(res.body.message).toBe("Vous ne pouvez pas retirer votre propre rôle d'administrateur.")
      expect(userService.deleteRole).not.toHaveBeenCalled()
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

  // ── PATCH /users/:id/activate ─────────────────────────────────────────────
  describe('PATCH /users/:id/activate', () => {
    it('200 — compte activé', async () => {
      userService.setActive.mockResolvedValue({ userId: 2, isActive: true })

      const res = await request(app)
        .patch('/api/v1/users/2/activate')
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(userService.setActive).toHaveBeenCalledTimes(1)
    })

    it('404 — utilisateur introuvable (service retourne null)', async () => {
      userService.setActive.mockResolvedValue(null)

      const res = await request(app)
        .patch('/api/v1/users/999/activate')
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(404)
    })

    it('403 — admin étab ne peut pas agir sur admin plateforme (service retourne false)', async () => {
      userService.setActive.mockResolvedValue(false)

      const res = await request(app)
        .patch('/api/v1/users/1/activate')
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(403)
    })

    it('403 — rôle non autorisé (étudiant)', async () => {
      User.findByPk.mockResolvedValueOnce({ roleId: 2 })

      const res = await request(app)
        .patch('/api/v1/users/2/activate')
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(403)
      expect(userService.setActive).not.toHaveBeenCalled()
    })

    it('401 — pas de token', async () => {
      const res = await request(app).patch('/api/v1/users/2/activate')
      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      userService.setActive.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .patch('/api/v1/users/2/activate')
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
    })
  })

  // ── PATCH /users/:id/deactivate ───────────────────────────────────────────
  describe('PATCH /users/:id/deactivate', () => {
    it('200 — compte désactivé', async () => {
      userService.setActive.mockResolvedValue({ userId: 2, isActive: false })

      const res = await request(app)
        .patch('/api/v1/users/2/deactivate')
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(200)
      expect(userService.setActive).toHaveBeenCalledTimes(1)
    })

    it('404 — utilisateur introuvable (service retourne null)', async () => {
      userService.setActive.mockResolvedValue(null)

      const res = await request(app)
        .patch('/api/v1/users/999/deactivate')
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(404)
    })

    it('403 — admin étab ne peut pas désactiver un admin plateforme (service retourne false)', async () => {
      userService.setActive.mockResolvedValue(false)

      const res = await request(app)
        .patch('/api/v1/users/1/deactivate')
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(403)
    })

    it('403 — rôle non autorisé (étudiant)', async () => {
      User.findByPk.mockResolvedValueOnce({ roleId: 2 })

      const res = await request(app)
        .patch('/api/v1/users/2/deactivate')
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(403)
      expect(userService.setActive).not.toHaveBeenCalled()
    })

    it('401 — pas de token', async () => {
      const res = await request(app).patch('/api/v1/users/2/deactivate')
      expect(res.status).toBe(401)
    })

    it('500 — le service échoue', async () => {
      userService.setActive.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .patch('/api/v1/users/2/deactivate')
        .set('Authorization', `Bearer ${makeToken()}`)

      expect(res.status).toBe(500)
    })
  })
})

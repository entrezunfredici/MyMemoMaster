jest.mock('../../models/index', () => ({
  User: { findOne: jest.fn(), findByPk: jest.fn() },
  UserOAuthAccount: { findOne: jest.fn(), create: jest.fn(), destroy: jest.fn() }
}))
jest.mock('../../services/User.service', () => ({
  create: jest.fn(),
  updateLoginDate: jest.fn().mockResolvedValue(undefined)
}))
jest.mock('../../helpers/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }))
jest.mock('../../helpers/frontUrl', () => () => 'https://front.test')

const mockGetToken = jest.fn()
const mockVerifyIdToken = jest.fn()
const mockGenerateAuthUrl = jest.fn()
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    getToken: mockGetToken,
    verifyIdToken: mockVerifyIdToken,
    generateAuthUrl: mockGenerateAuthUrl
  }))
}))

process.env.AUTH_JWT_SECRET = 'test-secret'

const jwt = require('jsonwebtoken')
const { User, UserOAuthAccount } = require('../../models/index')
const userService = require('../../services/User.service')
const oauthService = require('../../services/OAuth.service')

const ENV_KEYS = [
  'OAUTH_GOOGLE_CLIENT_ID',
  'OAUTH_GOOGLE_CLIENT_SECRET',
  'OAUTH_GITHUB_CLIENT_ID',
  'OAUTH_GITHUB_CLIENT_SECRET',
  'OAUTH_MICROSOFT_CLIENT_ID',
  'OAUTH_MICROSOFT_CLIENT_SECRET'
]

const enableAll = () => {
  ENV_KEYS.forEach((key) => {
    process.env[key] = 'x'
  })
}

const jsonResponse = (body, ok = true, status = 200) => ({ ok, status, json: async () => body })

describe('OAuth.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ENV_KEYS.forEach((key) => delete process.env[key])
    global.fetch = jest.fn()
  })

  describe('getEnabledProviders', () => {
    test('getEnabledProviders - aucune variable définie - retourne une liste vide', () => {
      expect(oauthService.getEnabledProviders()).toEqual([])
    })

    test('getEnabledProviders - identifiant sans secret - le fournisseur reste désactivé', () => {
      process.env.OAUTH_GOOGLE_CLIENT_ID = 'id'
      expect(oauthService.getEnabledProviders()).toEqual([])
    })

    test('getEnabledProviders - tous configurés - retourne les trois fournisseurs', () => {
      enableAll()
      expect(oauthService.getEnabledProviders().map((p) => p.id)).toEqual(['google', 'github', 'microsoft'])
    })
  })

  describe('buildAuthorizeUrl', () => {
    test('buildAuthorizeUrl - fournisseur non configuré - lève une erreur 404', () => {
      expect(() => oauthService.buildAuthorizeUrl('github')).toThrow(expect.objectContaining({ status: 404 }))
    })

    test('buildAuthorizeUrl - fournisseur inconnu - lève une erreur 404', () => {
      enableAll()
      expect(() => oauthService.buildAuthorizeUrl('facebook')).toThrow(expect.objectContaining({ status: 404 }))
    })

    test('buildAuthorizeUrl - github - URL avec redirect_uri du front et state signé', () => {
      enableAll()
      const { url, state } = oauthService.buildAuthorizeUrl('github')
      const parsed = new URL(url)
      expect(parsed.origin + parsed.pathname).toBe('https://github.com/login/oauth/authorize')
      expect(parsed.searchParams.get('redirect_uri')).toBe('https://front.test/oauth/callback/github')
      expect(parsed.searchParams.get('state')).toBe(state)
      expect(jwt.decode(state).provider).toBe('github')
    })

    test('buildAuthorizeUrl - google - délègue à google-auth-library avec le state', () => {
      enableAll()
      mockGenerateAuthUrl.mockReturnValue('https://accounts.google.com/auth')
      const { url, state } = oauthService.buildAuthorizeUrl('google')
      expect(url).toBe('https://accounts.google.com/auth')
      expect(mockGenerateAuthUrl).toHaveBeenCalledWith(expect.objectContaining({ state }))
    })

    test('buildAuthorizeUrl - microsoft - utilise le tenant configuré', () => {
      enableAll()
      process.env.OAUTH_MICROSOFT_TENANT = 'mon-tenant'
      const { url } = oauthService.buildAuthorizeUrl('microsoft')
      delete process.env.OAUTH_MICROSOFT_TENANT
      expect(url.startsWith('https://login.microsoftonline.com/mon-tenant/oauth2/v2.0/authorize?')).toBe(true)
    })
  })

  describe('verifyState', () => {
    test('verifyState - state valide du bon fournisseur - ne lève pas', () => {
      enableAll()
      const { state } = oauthService.buildAuthorizeUrl('github')
      expect(() => oauthService.verifyState(state, 'github')).not.toThrow()
    })

    test('verifyState - state émis pour un autre fournisseur - lève une erreur 400', () => {
      enableAll()
      const { state } = oauthService.buildAuthorizeUrl('github')
      expect(() => oauthService.verifyState(state, 'microsoft')).toThrow(expect.objectContaining({ status: 400 }))
    })

    test('verifyState - state falsifié - lève une erreur 400', () => {
      expect(() => oauthService.verifyState('abc.def.ghi', 'github')).toThrow(expect.objectContaining({ status: 400 }))
    })

    test("verifyState - jeton d'accès utilisé comme state - lève une erreur 400", () => {
      const accessToken = jwt.sign({ id: 1, provider: 'github' }, process.env.AUTH_JWT_SECRET)
      expect(() => oauthService.verifyState(accessToken, 'github')).toThrow(expect.objectContaining({ status: 400 }))
    })
  })

  describe('fetchProfile', () => {
    beforeEach(enableAll)

    test('fetchProfile - google valide - retourne le profil vérifié', async () => {
      mockGetToken.mockResolvedValue({ tokens: { id_token: 'tok' } })
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({ sub: '123', email: 'a@b.fr', email_verified: true, name: 'Alice' })
      })
      await expect(oauthService.fetchProfile('google', 'code')).resolves.toEqual({
        providerUserId: '123',
        email: 'a@b.fr',
        emailVerified: true,
        name: 'Alice'
      })
    })

    test('fetchProfile - google refuse le code - lève une erreur 401', async () => {
      mockGetToken.mockRejectedValue(new Error('invalid_grant'))
      await expect(oauthService.fetchProfile('google', 'bad')).rejects.toMatchObject({ status: 401 })
    })

    test('fetchProfile - github - retient uniquement l’email principal vérifié', async () => {
      global.fetch
        .mockResolvedValueOnce(jsonResponse({ access_token: 'gh' }))
        .mockResolvedValueOnce(jsonResponse({ id: 42, login: 'alice', name: null }))
        .mockResolvedValueOnce(
          jsonResponse([
            { email: 'old@b.fr', primary: false, verified: true },
            { email: 'main@b.fr', primary: true, verified: true }
          ])
        )
      await expect(oauthService.fetchProfile('github', 'code')).resolves.toEqual({
        providerUserId: '42',
        email: 'main@b.fr',
        emailVerified: true,
        name: 'alice'
      })
    })

    test('fetchProfile - github sans email vérifié - email nul et non vérifié', async () => {
      global.fetch
        .mockResolvedValueOnce(jsonResponse({ access_token: 'gh' }))
        .mockResolvedValueOnce(jsonResponse({ id: 42, login: 'alice' }))
        .mockResolvedValueOnce(jsonResponse([{ email: 'x@b.fr', primary: true, verified: false }]))
      const profile = await oauthService.fetchProfile('github', 'code')
      expect(profile.email).toBeNull()
      expect(profile.emailVerified).toBe(false)
    })

    test('fetchProfile - github code invalide (200 avec error) - lève une erreur 401', async () => {
      global.fetch.mockResolvedValueOnce(jsonResponse({ error: 'bad_verification_code' }))
      await expect(oauthService.fetchProfile('github', 'bad')).rejects.toMatchObject({ status: 401 })
    })

    test('fetchProfile - fournisseur injoignable - lève une erreur 502', async () => {
      global.fetch.mockRejectedValueOnce(new Error('timeout'))
      await expect(oauthService.fetchProfile('github', 'code')).rejects.toMatchObject({ status: 502 })
    })

    const msIdToken = (claims) => jwt.sign(claims, 'peu-importe')
    const MS_CONSUMER_TID = '9188040d-6c67-4c5b-b112-36a304b66dad'

    test('fetchProfile - microsoft tenant Entra - email non vérifié', async () => {
      global.fetch
        .mockResolvedValueOnce(jsonResponse({ access_token: 'ms', id_token: msIdToken({ tid: 'tenant-corp' }) }))
        .mockResolvedValueOnce(jsonResponse({ sub: 'abc', email: 'a@corp.fr', name: 'Alice' }))
      await expect(oauthService.fetchProfile('microsoft', 'code')).resolves.toMatchObject({
        providerUserId: 'abc',
        email: 'a@corp.fr',
        emailVerified: false
      })
    })

    test('fetchProfile - microsoft compte personnel - email vérifié', async () => {
      global.fetch
        .mockResolvedValueOnce(jsonResponse({ access_token: 'ms', id_token: msIdToken({ tid: MS_CONSUMER_TID }) }))
        .mockResolvedValueOnce(jsonResponse({ sub: 'abc', email: 'a@outlook.fr', name: 'Alice' }))
      await expect(oauthService.fetchProfile('microsoft', 'code')).resolves.toMatchObject({
        providerUserId: 'abc',
        email: 'a@outlook.fr',
        emailVerified: true
      })
    })

    test('fetchProfile - microsoft Entra avec xms_edov et même email - email vérifié', async () => {
      global.fetch
        .mockResolvedValueOnce(
          jsonResponse({ access_token: 'ms', id_token: msIdToken({ tid: 'tenant-corp', email: 'A@Corp.fr', xms_edov: 1 }) })
        )
        .mockResolvedValueOnce(jsonResponse({ sub: 'abc', email: 'a@corp.fr', name: 'Alice' }))
      await expect(oauthService.fetchProfile('microsoft', 'code')).resolves.toMatchObject({ emailVerified: true })
    })

    test('fetchProfile - microsoft Entra avec xms_edov faux - email non vérifié', async () => {
      global.fetch
        .mockResolvedValueOnce(
          jsonResponse({ access_token: 'ms', id_token: msIdToken({ tid: 'tenant-corp', email: 'a@corp.fr', xms_edov: 0 }) })
        )
        .mockResolvedValueOnce(jsonResponse({ sub: 'abc', email: 'a@corp.fr' }))
      await expect(oauthService.fetchProfile('microsoft', 'code')).resolves.toMatchObject({ emailVerified: false })
    })

    test('fetchProfile - microsoft Entra avec xms_edov mais email différent - email non vérifié', async () => {
      global.fetch
        .mockResolvedValueOnce(
          jsonResponse({ access_token: 'ms', id_token: msIdToken({ tid: 'tenant-corp', email: 'a@corp.fr', xms_edov: 1 }) })
        )
        .mockResolvedValueOnce(jsonResponse({ sub: 'abc', email: 'victime@autre.fr' }))
      await expect(oauthService.fetchProfile('microsoft', 'code')).resolves.toMatchObject({ emailVerified: false })
    })

    test('fetchProfile - microsoft sans id_token ou id_token illisible - email non vérifié', async () => {
      global.fetch
        .mockResolvedValueOnce(jsonResponse({ access_token: 'ms' }))
        .mockResolvedValueOnce(jsonResponse({ sub: 'abc', email: 'a@outlook.fr' }))
      await expect(oauthService.fetchProfile('microsoft', 'code')).resolves.toMatchObject({ emailVerified: false })

      global.fetch
        .mockResolvedValueOnce(jsonResponse({ access_token: 'ms', id_token: 'pas-un-jwt' }))
        .mockResolvedValueOnce(jsonResponse({ sub: 'abc', email: 'a@outlook.fr' }))
      await expect(oauthService.fetchProfile('microsoft', 'code')).resolves.toMatchObject({ emailVerified: false })
    })
  })

  describe('findOrCreateUser', () => {
    const profile = { providerUserId: 'p1', email: 'Alice@Example.com', emailVerified: true, name: 'Alice' }

    test('findOrCreateUser - identité déjà liée - retourne le compte sans mot de passe', async () => {
      UserOAuthAccount.findOne.mockResolvedValue({ userId: 7 })
      User.findByPk.mockResolvedValue({ userId: 7, isActive: true, password: 'hash', dataValues: { userId: 7, isActive: true, password: 'hash' } })
      const user = await oauthService.findOrCreateUser('google', profile)
      expect(user).toEqual({ userId: 7, isActive: true })
      expect(userService.updateLoginDate).toHaveBeenCalledWith(7)
      expect(User.findOne).not.toHaveBeenCalled()
    })

    test('findOrCreateUser - identité liée à un compte désactivé - lève une erreur 403', async () => {
      UserOAuthAccount.findOne.mockResolvedValue({ userId: 7 })
      User.findByPk.mockResolvedValue({ userId: 7, isActive: false })
      await expect(oauthService.findOrCreateUser('google', profile)).rejects.toMatchObject({ status: 403 })
    })

    test('findOrCreateUser - aucun email - lève une erreur 400', async () => {
      UserOAuthAccount.findOne.mockResolvedValue(null)
      await expect(
        oauthService.findOrCreateUser('github', { ...profile, email: null, emailVerified: false })
      ).rejects.toMatchObject({ status: 400 })
    })

    test('findOrCreateUser - email vérifié d’un compte existant validé - lie le compte sans le modifier', async () => {
      UserOAuthAccount.findOne.mockResolvedValue(null)
      const existing = { userId: 3, isActive: true, hasValidatedEmail: true, save: jest.fn(), dataValues: { userId: 3, isActive: true, password: 'h' } }
      User.findOne.mockResolvedValue(existing)
      const user = await oauthService.findOrCreateUser('google', profile)
      expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'alice@example.com' } })
      expect(UserOAuthAccount.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 3, provider: 'google', providerUserId: 'p1' })
      )
      expect(existing.save).not.toHaveBeenCalled()
      expect(user).toEqual({ userId: 3, isActive: true })
    })

    test('findOrCreateUser - compte existant au mail jamais vérifié - mot de passe remplacé avant liaison', async () => {
      UserOAuthAccount.findOne.mockResolvedValue(null)
      const existing = {
        userId: 4,
        isActive: true,
        hasValidatedEmail: false,
        password: 'mot-de-passe-du-pirate',
        refreshToken: 'r',
        save: jest.fn(),
        dataValues: { userId: 4, isActive: true }
      }
      User.findOne.mockResolvedValue(existing)
      await oauthService.findOrCreateUser('google', profile)
      expect(existing.password).not.toBe('mot-de-passe-du-pirate')
      expect(existing.hasValidatedEmail).toBe(true)
      expect(existing.refreshToken).toBeNull()
      expect(existing.save).toHaveBeenCalled()
    })

    test('findOrCreateUser - compte jamais vérifié repris - anciennes identités OAuth supprimées avant la nouvelle liaison', async () => {
      UserOAuthAccount.findOne.mockResolvedValue(null)
      const order = []
      UserOAuthAccount.destroy.mockImplementation(async () => order.push('destroy'))
      UserOAuthAccount.create.mockImplementation(async () => order.push('create'))
      const existing = { userId: 4, isActive: true, hasValidatedEmail: false, password: 'x', save: jest.fn(), dataValues: { userId: 4, isActive: true } }
      User.findOne.mockResolvedValue(existing)

      await oauthService.findOrCreateUser('google', profile)

      expect(UserOAuthAccount.destroy).toHaveBeenCalledWith({ where: { userId: 4 } })
      expect(order).toEqual(['destroy', 'create'])
    })

    test('findOrCreateUser - compte déjà vérifié - identités OAuth conservées', async () => {
      UserOAuthAccount.findOne.mockResolvedValue(null)
      UserOAuthAccount.destroy.mockClear()
      User.findOne.mockResolvedValue({ userId: 5, isActive: true, hasValidatedEmail: true, dataValues: { userId: 5, isActive: true } })

      await oauthService.findOrCreateUser('google', profile)

      expect(UserOAuthAccount.destroy).not.toHaveBeenCalled()
    })

    test('findOrCreateUser - email non prouvé (Microsoft) sur un compte existant - lève une erreur 409', async () => {
      UserOAuthAccount.findOne.mockResolvedValue(null)
      User.findOne.mockResolvedValue({ userId: 3, isActive: true, hasValidatedEmail: true })
      await expect(
        oauthService.findOrCreateUser('microsoft', { ...profile, emailVerified: false })
      ).rejects.toMatchObject({ status: 409 })
      expect(UserOAuthAccount.create).not.toHaveBeenCalled()
    })

    test('findOrCreateUser - nouvel email - crée le compte avec mot de passe aléatoire et le lie', async () => {
      UserOAuthAccount.findOne.mockResolvedValue(null)
      User.findOne.mockResolvedValue(null)
      userService.create.mockResolvedValue({ userId: 9 })
      User.findByPk.mockResolvedValue({ userId: 9, isActive: true, dataValues: { userId: 9, isActive: true } })
      await oauthService.findOrCreateUser('google', profile)
      const payload = userService.create.mock.calls[0][0]
      expect(payload).toMatchObject({ name: 'Alice', email: 'alice@example.com', hasValidatedEmail: true })
      expect(payload.password).toHaveLength(64)
      expect(UserOAuthAccount.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 9, provider: 'google' }))
    })

    test('findOrCreateUser - nouvel email non prouvé (Microsoft) - refusé en 403, aucun compte créé', async () => {
      UserOAuthAccount.findOne.mockResolvedValue(null)
      User.findOne.mockResolvedValue(null)
      userService.create.mockClear()
      UserOAuthAccount.create.mockClear()
      await expect(
        oauthService.findOrCreateUser('microsoft', { ...profile, emailVerified: false })
      ).rejects.toMatchObject({ status: 403 })
      expect(userService.create).not.toHaveBeenCalled()
      expect(UserOAuthAccount.create).not.toHaveBeenCalled()
    })

    test('findOrCreateUser - Microsoft déjà lié - connexion toujours possible sans email prouvé', async () => {
      UserOAuthAccount.findOne.mockResolvedValue({ userId: 12 })
      User.findByPk.mockResolvedValue({ userId: 12, isActive: true, dataValues: { userId: 12, isActive: true } })
      const user = await oauthService.findOrCreateUser('microsoft', { ...profile, emailVerified: false })
      expect(user).toEqual({ userId: 12, isActive: true })
    })

    test('findOrCreateUser - nom absent - utilise la partie locale de l’email', async () => {
      UserOAuthAccount.findOne.mockResolvedValue(null)
      User.findOne.mockResolvedValue(null)
      userService.create.mockResolvedValue({ userId: 11 })
      User.findByPk.mockResolvedValue({ userId: 11, isActive: true, dataValues: { userId: 11, isActive: true } })
      await oauthService.findOrCreateUser('github', { ...profile, name: null })
      expect(userService.create.mock.calls[0][0].name).toBe('alice')
    })

    test('findOrCreateUser - inscriptions fermées - lève une erreur 403', async () => {
      UserOAuthAccount.findOne.mockResolvedValue(null)
      User.findOne.mockResolvedValue(null)
      userService.create.mockRejectedValue(new Error("Limite d'utilisateurs atteinte"))
      await expect(oauthService.findOrCreateUser('google', profile)).rejects.toMatchObject({ status: 403 })
      expect(UserOAuthAccount.create).not.toHaveBeenCalled()
    })
  })

  describe('login', () => {
    test('login - state invalide - lève une erreur 400 sans appeler le fournisseur', async () => {
      enableAll()
      await expect(oauthService.login('github', 'code', 'faux')).rejects.toMatchObject({ status: 400 })
      expect(global.fetch).not.toHaveBeenCalled()
    })

    test('login - fournisseur non configuré - lève une erreur 404', async () => {
      await expect(oauthService.login('github', 'code', 'state')).rejects.toMatchObject({ status: 404 })
    })
  })
})

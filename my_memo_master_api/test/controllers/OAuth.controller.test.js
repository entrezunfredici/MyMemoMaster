jest.mock('../../services/OAuth.service', () => ({
  getEnabledProviders: jest.fn(),
  buildAuthorizeUrl: jest.fn(),
  login: jest.fn()
}))
jest.mock('../../helpers/authSession', () => ({
  issueSession: jest.fn(),
  sendTwoFactorCode: jest.fn().mockResolvedValue(true)
}))
jest.mock('../../helpers/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }))

process.env.AUTH_JWT_SECRET = 'test-secret'

const oauthService = require('../../services/OAuth.service')
const { issueSession, sendTwoFactorCode } = require('../../helpers/authSession')
const controller = require('../../controllers/OAuth.controller')

const makeRes = () => {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.send = jest.fn().mockReturnValue(res)
  return res
}

const oauthError = (message, status) => Object.assign(new Error(message), { name: 'OAuthError', status })

describe('OAuth.controller', () => {
  beforeEach(() => jest.clearAllMocks())

  test('providers - cas nominal - retourne la liste en 200', async () => {
    oauthService.getEnabledProviders.mockReturnValue([{ id: 'google', label: 'Google' }])
    const res = makeRes()
    await controller.providers({}, res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.send).toHaveBeenCalledWith({ providers: [{ id: 'google', label: 'Google' }] })
  })

  test('authorizeUrl - cas nominal - retourne url et state', async () => {
    oauthService.buildAuthorizeUrl.mockReturnValue({ url: 'https://x', state: 's' })
    const res = makeRes()
    await controller.authorizeUrl({ params: { provider: 'google' } }, res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.send).toHaveBeenCalledWith({ url: 'https://x', state: 's' })
  })

  test('authorizeUrl - fournisseur non configuré - répond 404 avec le message', async () => {
    oauthService.buildAuthorizeUrl.mockImplementation(() => {
      throw oauthError("Ce mode de connexion n'est pas disponible.", 404)
    })
    const res = makeRes()
    await controller.authorizeUrl({ params: { provider: 'github' } }, res)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.send).toHaveBeenCalledWith({ message: "Ce mode de connexion n'est pas disponible." })
  })

  test('login - utilisateur standard - ouvre la session sans code email', async () => {
    oauthService.login.mockResolvedValue({ userId: 1, roleId: 2, email: 'a@b.fr', name: 'A' })
    issueSession.mockResolvedValue({ token: 't', refreshToken: 'r' })
    const res = makeRes()
    await controller.login({ params: { provider: 'google' }, body: { code: 'c', state: 's' } }, res)
    expect(sendTwoFactorCode).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.send).toHaveBeenCalledWith({ token: 't', refreshToken: 'r' })
  })

  test('login - administrateur - envoie le code email et retourne un challengeToken sans session', async () => {
    oauthService.login.mockResolvedValue({ userId: 1, roleId: 1, email: 'a@b.fr', name: 'A' })
    const res = makeRes()
    await controller.login({ params: { provider: 'google' }, body: { code: 'c', state: 's' } }, res)
    expect(issueSession).not.toHaveBeenCalled()
    expect(sendTwoFactorCode).toHaveBeenCalled()
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ twoFactorRequired: true, challengeToken: expect.any(String) })
    )
  })

  test('login - email déjà pris par un compte non prouvable - répond 409', async () => {
    oauthService.login.mockRejectedValue(oauthError('Un compte existe déjà avec cette adresse email.', 409))
    const res = makeRes()
    await controller.login({ params: { provider: 'microsoft' }, body: { code: 'c', state: 's' }, ip: '::1' }, res)
    expect(res.status).toHaveBeenCalledWith(409)
    expect(issueSession).not.toHaveBeenCalled()
  })

  test('login - erreur inattendue - répond 500 générique sans fuite du message interne', async () => {
    oauthService.login.mockRejectedValue(new Error('SQLITE_ERROR secret interne'))
    const res = makeRes()
    await controller.login({ params: { provider: 'google' }, body: { code: 'c', state: 's' } }, res)
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.send).toHaveBeenCalledWith({ message: 'Erreur lors de la connexion.' })
  })
})

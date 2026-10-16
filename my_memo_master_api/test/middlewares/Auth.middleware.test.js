jest.mock('../../helpers/logger', () => ({ error: jest.fn() }))
jest.mock('../../helpers/tokenBlacklist', () => ({
  isTokenRevoked: jest.fn().mockResolvedValue(false)
}))

process.env.AUTH_JWT_SECRET = 'test-secret'

const jwt = require('jsonwebtoken')
const AuthMiddleware = require('../../middlewares/Auth.middleware')
const tokenBlacklist = require('../../helpers/tokenBlacklist')

describe('Auth.middleware — vérification JWT', () => {
  let req, res, next

  beforeEach(() => {
    jest.clearAllMocks()
    tokenBlacklist.isTokenRevoked.mockResolvedValue(false)
    req = { headers: {} }
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    }
    next = jest.fn()
  })

  // ── Absence de header ──────────────────────────────────────────────────────

  it('header Authorization absent → 401 "Authentification requise."', async () => {
    await AuthMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.send).toHaveBeenCalledWith({ message: 'Authentification requise.' })
    expect(next).not.toHaveBeenCalled()
  })

  // ── Token invalide / malformé ──────────────────────────────────────────────

  it('token malformé → 401 "Token invalide ou expiré."', async () => {
    req.headers['authorization'] = 'Bearer not.a.valid.jwt'

    await AuthMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.send).toHaveBeenCalledWith({ message: 'Token invalide ou expiré.' })
    expect(next).not.toHaveBeenCalled()
  })

  it('token signé avec une mauvaise clé secrète → 401 "Token invalide ou expiré."', async () => {
    const tokenBadSecret = jwt.sign({ id: 1 }, 'wrong-secret', { expiresIn: '1h' })
    req.headers['authorization'] = `Bearer ${tokenBadSecret}`

    await AuthMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.send).toHaveBeenCalledWith({ message: 'Token invalide ou expiré.' })
    expect(next).not.toHaveBeenCalled()
  })

  // ── Token expiré ───────────────────────────────────────────────────────────

  it('token expiré → 401 "Token invalide ou expiré."', async () => {
    const expiredToken = jwt.sign({ id: 1 }, 'test-secret', { expiresIn: '-1s' })
    req.headers['authorization'] = `Bearer ${expiredToken}`

    await AuthMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.send).toHaveBeenCalledWith({ message: 'Token invalide ou expiré.' })
    expect(next).not.toHaveBeenCalled()
  })

  // ── Token valide ───────────────────────────────────────────────────────────

  it('token valide avec préfixe "Bearer" → next() appelé et req.user peuplé', async () => {
    const payload = { id: 1, name: 'Bob', email: 'bob@example.com' }
    const token = jwt.sign(payload, 'test-secret', { expiresIn: '1h' })
    req.headers['authorization'] = `Bearer ${token}`

    await AuthMiddleware(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(req.user).toBeDefined()
    expect(req.user.id).toBe(1)
    expect(req.user.email).toBe('bob@example.com')
    expect(res.status).not.toHaveBeenCalled()
  })

  it('token valide sans préfixe "Bearer" → 401 "Token manquant." (RFC 6750 : schéma requis)', async () => {
    const payload = { id: 2, name: 'Alice', email: 'alice@example.com' }
    const token = jwt.sign(payload, 'test-secret', { expiresIn: '1h' })
    req.headers['authorization'] = token

    await AuthMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.send).toHaveBeenCalledWith({ message: 'Token manquant.' })
    expect(next).not.toHaveBeenCalled()
  })

  it('schéma "Bearer" avec segments surnuméraires → 401 "Token manquant."', async () => {
    const token = jwt.sign({ id: 3 }, 'test-secret', { expiresIn: '1h' })
    req.headers['authorization'] = `Bearer ${token} extra`

    await AuthMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.send).toHaveBeenCalledWith({ message: 'Token manquant.' })
    expect(next).not.toHaveBeenCalled()
  })

  it('req.user contient exactement le payload encodé (sans créer de champs parasites)', async () => {
    const payload = { id: 42, name: 'Charlie', email: 'charlie@example.com', roleId: 2 }
    const token = jwt.sign(payload, 'test-secret', { expiresIn: '1h' })
    req.headers['authorization'] = `Bearer ${token}`

    await AuthMiddleware(req, res, next)

    expect(req.user.id).toBe(42)
    expect(req.user.roleId).toBe(2)
  })

  // ── Révocation (A07-M1) ──────────────────────────────────────────────────────

  it('token révoqué (tokenBlacklist.isTokenRevoked → true) → 401 "Session révoquée."', async () => {
    tokenBlacklist.isTokenRevoked.mockResolvedValue(true)
    const token = jwt.sign({ id: 1 }, 'test-secret', { expiresIn: '1h' })
    req.headers['authorization'] = `Bearer ${token}`

    await AuthMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.send).toHaveBeenCalledWith({ message: 'Session révoquée. Merci de vous reconnecter.' })
    expect(next).not.toHaveBeenCalled()
  })

  it('interroge la blacklist avec le userId et le claim iat du token décodé', async () => {
    const token = jwt.sign({ id: 7 }, 'test-secret', { expiresIn: '1h' })
    req.headers['authorization'] = `Bearer ${token}`

    await AuthMiddleware(req, res, next)

    expect(tokenBlacklist.isTokenRevoked).toHaveBeenCalledWith(7, expect.any(Number))
  })
})

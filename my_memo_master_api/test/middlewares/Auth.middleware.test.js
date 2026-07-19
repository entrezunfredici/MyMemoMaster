jest.mock('../../helpers/logger', () => ({ error: jest.fn() }))

process.env.AUTH_JWT_SECRET = 'test-secret'

const jwt = require('jsonwebtoken')
const AuthMiddleware = require('../../middlewares/Auth.middleware')

describe('Auth.middleware — vérification JWT', () => {
  let req, res, next

  beforeEach(() => {
    jest.clearAllMocks()
    req = { headers: {} }
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    }
    next = jest.fn()
  })

  // ── Absence de header ──────────────────────────────────────────────────────

  it('header Authorization absent → 401 "Authentification requise."', () => {
    AuthMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.send).toHaveBeenCalledWith({ message: 'Authentification requise.' })
    expect(next).not.toHaveBeenCalled()
  })

  // ── Token invalide / malformé ──────────────────────────────────────────────

  it('token malformé → 401 "Token invalide ou expiré."', () => {
    req.headers['authorization'] = 'Bearer not.a.valid.jwt'

    AuthMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.send).toHaveBeenCalledWith({ message: 'Token invalide ou expiré.' })
    expect(next).not.toHaveBeenCalled()
  })

  it('token signé avec une mauvaise clé secrète → 401 "Token invalide ou expiré."', () => {
    const tokenBadSecret = jwt.sign({ id: 1 }, 'wrong-secret', { expiresIn: '1h' })
    req.headers['authorization'] = `Bearer ${tokenBadSecret}`

    AuthMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.send).toHaveBeenCalledWith({ message: 'Token invalide ou expiré.' })
    expect(next).not.toHaveBeenCalled()
  })

  // ── Token expiré ───────────────────────────────────────────────────────────

  it('token expiré → 401 "Token invalide ou expiré."', () => {
    const expiredToken = jwt.sign({ id: 1 }, 'test-secret', { expiresIn: '-1s' })
    req.headers['authorization'] = `Bearer ${expiredToken}`

    AuthMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.send).toHaveBeenCalledWith({ message: 'Token invalide ou expiré.' })
    expect(next).not.toHaveBeenCalled()
  })

  // ── Token valide ───────────────────────────────────────────────────────────

  it('token valide avec préfixe "Bearer" → next() appelé et req.user peuplé', () => {
    const payload = { id: 1, name: 'Bob', email: 'bob@example.com' }
    const token = jwt.sign(payload, 'test-secret', { expiresIn: '1h' })
    req.headers['authorization'] = `Bearer ${token}`

    AuthMiddleware(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(req.user).toBeDefined()
    expect(req.user.id).toBe(1)
    expect(req.user.email).toBe('bob@example.com')
    expect(res.status).not.toHaveBeenCalled()
  })

  it('token valide sans préfixe "Bearer" → 401 "Token manquant." (RFC 6750 : schéma requis)', () => {
    const payload = { id: 2, name: 'Alice', email: 'alice@example.com' }
    const token = jwt.sign(payload, 'test-secret', { expiresIn: '1h' })
    req.headers['authorization'] = token

    AuthMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.send).toHaveBeenCalledWith({ message: 'Token manquant.' })
    expect(next).not.toHaveBeenCalled()
  })

  it('schéma "Bearer" avec segments surnuméraires → 401 "Token manquant."', () => {
    const token = jwt.sign({ id: 3 }, 'test-secret', { expiresIn: '1h' })
    req.headers['authorization'] = `Bearer ${token} extra`

    AuthMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.send).toHaveBeenCalledWith({ message: 'Token manquant.' })
    expect(next).not.toHaveBeenCalled()
  })

  it('req.user contient exactement le payload encodé (sans créer de champs parasites)', () => {
    const payload = { id: 42, name: 'Charlie', email: 'charlie@example.com', roleId: 2 }
    const token = jwt.sign(payload, 'test-secret', { expiresIn: '1h' })
    req.headers['authorization'] = `Bearer ${token}`

    AuthMiddleware(req, res, next)

    expect(req.user.id).toBe(42)
    expect(req.user.roleId).toBe(2)
  })
})

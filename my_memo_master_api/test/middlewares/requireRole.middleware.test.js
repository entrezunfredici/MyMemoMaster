jest.mock('../../models/index', () => ({
  User: { findByPk: jest.fn() }
}))

jest.mock('../../helpers/logger', () => ({ error: jest.fn(), warn: jest.fn() }))

const requireRole = require('../../middlewares/requireRole.middleware')
const { User } = require('../../models/index')
const logger = require('../../helpers/logger')

describe('requireRole middleware', () => {
  let req, res, next

  beforeEach(() => {
    jest.clearAllMocks()
    req = { user: { id: 1 } }
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    }
    next = jest.fn()
  })

  it('appelle next() si le rôle est dans la liste autorisée', async () => {
    User.findByPk.mockResolvedValue({ roleId: 1 })

    await requireRole(1)(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  it("injecte req.user.roleId pour les handlers suivants", async () => {
    User.findByPk.mockResolvedValue({ roleId: 1 })

    await requireRole(1)(req, res, next)

    expect(req.user.roleId).toBe(1)
  })

  it('accepte plusieurs rôles autorisés — premier rôle valide', async () => {
    User.findByPk.mockResolvedValue({ roleId: 1 })

    await requireRole(1, 4)(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
  })

  it('accepte plusieurs rôles autorisés — deuxième rôle valide', async () => {
    User.findByPk.mockResolvedValue({ roleId: 4 })

    await requireRole(1, 4)(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
  })

  it('retourne 403 si le rôle de l\'utilisateur n\'est pas autorisé', async () => {
    User.findByPk.mockResolvedValue({ roleId: 2 })

    await requireRole(1)(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ message: 'Accès refusé. Permissions insuffisantes.' })
    expect(next).not.toHaveBeenCalled()
  })

  it('retourne 403 si l\'utilisateur est introuvable en base', async () => {
    User.findByPk.mockResolvedValue(null)

    await requireRole(1)(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ message: 'Accès refusé. Permissions insuffisantes.' })
    expect(next).not.toHaveBeenCalled()
  })

  it('journalise le refus RBAC en warn (OWASP F-M8)', async () => {
    User.findByPk.mockResolvedValue({ roleId: 2 })
    req.method = 'DELETE'
    req.originalUrl = '/api/v1/roles/1'
    req.ip = '10.0.0.1'

    await requireRole(1)(req, res, next)

    expect(logger.warn).toHaveBeenCalledTimes(1)
    expect(logger.warn.mock.calls[0][0]).toContain('userId 1')
    expect(logger.warn.mock.calls[0][0]).toContain('DELETE /api/v1/roles/1')
  })

  it('retourne 500 si la requête DB échoue', async () => {
    User.findByPk.mockRejectedValue(new Error('DB error'))

    await requireRole(1)(req, res, next)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ message: 'Erreur lors de la vérification des permissions.' })
    expect(next).not.toHaveBeenCalled()
  })

  it('retourne 401 si le compte est désactivé (isActive=false)', async () => {
    User.findByPk.mockResolvedValue({ roleId: 1, isActive: false })

    await requireRole(1)(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ message: 'Compte désactivé.' })
    expect(next).not.toHaveBeenCalled()
  })

  it('vérifie le bon userId depuis req.user.id', async () => {
    req.user.id = 42
    User.findByPk.mockResolvedValue({ roleId: 1 })

    await requireRole(1)(req, res, next)

    expect(User.findByPk).toHaveBeenCalledWith(42, { attributes: ['roleId', 'isActive'] })
  })
})

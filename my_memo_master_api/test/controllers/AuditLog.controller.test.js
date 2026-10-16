const AuditLogService = require('../../services/AuditLog.service')
const logger = require('../../helpers/logger')

jest.mock('../../services/AuditLog.service', () => ({
  findAll: jest.fn()
}))
jest.mock('../../helpers/logger', () => ({ error: jest.fn() }))

const { findAll } = require('../../controllers/AuditLog.controller')

const mockRes = () => {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

describe('AuditLog.controller', () => {
  let req, res

  beforeEach(() => {
    jest.clearAllMocks()
    req = { query: {} }
    res = mockRes()
  })

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('retourne 200 avec la liste des journaux', async () => {
      const entries = [{ id: 1, action: 'USER_ACCOUNT_ACTIVATED' }]
      AuditLogService.findAll.mockResolvedValue(entries)

      await findAll(req, res)

      expect(AuditLogService.findAll).toHaveBeenCalledWith({})
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: entries }))
    })

    it('transmet les filtres de la query au service', async () => {
      req.query = { actorId: '5', entityType: 'User', entityId: '10' }
      AuditLogService.findAll.mockResolvedValue([])

      await findAll(req, res)

      expect(AuditLogService.findAll).toHaveBeenCalledWith({ actorId: '5', entityType: 'User', entityId: '10' })
    })

    it('retourne 500 en cas d\'erreur service', async () => {
      AuditLogService.findAll.mockRejectedValue(new Error('DB error'))

      await findAll(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(logger.error).toHaveBeenCalled()
    })
  })
})

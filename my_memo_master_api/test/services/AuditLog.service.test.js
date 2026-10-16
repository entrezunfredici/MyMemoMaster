jest.mock('../../models/index', () => ({
  AuditLog: {
    create: jest.fn(),
    findAll: jest.fn()
  },
  User: {}
}))

const { AuditLog } = require('../../models/index')
const AuditLogService = require('../../services/AuditLog.service')

describe('AuditLogService', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── log ───────────────────────────────────────────────────────────────────

  describe('log', () => {
    it('crée une entrée avec les champs fournis', async () => {
      const entry = { id: 1, actorId: 5, action: 'USER_ACCOUNT_ACTIVATED', entityType: 'User', entityId: 10 }
      AuditLog.create.mockResolvedValue(entry)

      const result = await AuditLogService.log(5, 'USER_ACCOUNT_ACTIVATED', 'User', 10, { previousIsActive: false })

      expect(AuditLog.create).toHaveBeenCalledWith({
        actorId: 5,
        action: 'USER_ACCOUNT_ACTIVATED',
        entityType: 'User',
        entityId: 10,
        metadata: { previousIsActive: false }
      })
      expect(result).toEqual(entry)
    })

    it('accepte entityId et metadata à null', async () => {
      AuditLog.create.mockResolvedValue({})

      await AuditLogService.log(1, 'LOGIN_SUCCESS', 'User')

      expect(AuditLog.create).toHaveBeenCalledWith({
        actorId: 1,
        action: 'LOGIN_SUCCESS',
        entityType: 'User',
        entityId: null,
        metadata: null
      })
    })

    it('accepte actorId null (action système)', async () => {
      AuditLog.create.mockResolvedValue({})

      await AuditLogService.log(null, 'USER_INVITED', 'Invitation', 3)

      expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ actorId: null }))
    })
  })

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('retourne toutes les entrées sans filtre', async () => {
      AuditLog.findAll.mockResolvedValue([{ id: 1 }])

      const result = await AuditLogService.findAll()

      expect(AuditLog.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: {}, order: [['createdAt', 'DESC']] })
      )
      expect(result).toEqual([{ id: 1 }])
    })

    it('filtre par actorId', async () => {
      AuditLog.findAll.mockResolvedValue([])

      await AuditLogService.findAll({ actorId: '5' })

      expect(AuditLog.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { actorId: 5 } })
      )
    })

    it('filtre par entityType', async () => {
      AuditLog.findAll.mockResolvedValue([])

      await AuditLogService.findAll({ entityType: 'User' })

      expect(AuditLog.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { entityType: 'User' } })
      )
    })

    it('filtre par entityType et entityId combinés', async () => {
      AuditLog.findAll.mockResolvedValue([])

      await AuditLogService.findAll({ entityType: 'User', entityId: '10' })

      expect(AuditLog.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { entityType: 'User', entityId: 10 } })
      )
    })
  })
})

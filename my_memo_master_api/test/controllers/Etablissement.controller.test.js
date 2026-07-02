const EtablissementService = require('../../services/Etablissement.service')
const logger = require('../../helpers/logger')

jest.mock('../../services/Etablissement.service', () => ({
  findAll: jest.fn(),
  findOne: jest.fn(),
  findByAdmin: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  getStats: jest.fn(),
  getAuditLogs: jest.fn(),
  getContent: jest.fn(),
  deleteContent: jest.fn(),
}))
jest.mock('../../helpers/logger', () => ({ error: jest.fn() }))

const {
  findAll,
  findOne,
  findMine,
  create,
  update,
  destroy,
  getStats,
  getAuditLogs,
  getContent,
  deleteContent
} = require('../../controllers/Etablissement.controller')

const mockRes = () => {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

const mockEtab = { id: 1, name: 'Lycée Test', code: 'LT01', adminId: null }

describe('Etablissement.controller', () => {
  let req, res

  beforeEach(() => {
    jest.clearAllMocks()
    req = { params: {}, body: {}, user: { id: 1, roleId: 1 } }
    res = mockRes()
  })

  // ── findMine ──────────────────────────────────────────────────────────────

  describe('findMine', () => {
    it('retourne 200 avec l\'établissement de l\'admin connecté', async () => {
      req.user = { id: 10, roleId: 4 }
      EtablissementService.findByAdmin.mockResolvedValue(mockEtab)

      await findMine(req, res)

      expect(EtablissementService.findByAdmin).toHaveBeenCalledWith(10)
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockEtab }))
    })

    it('retourne 404 si aucun établissement trouvé', async () => {
      req.user = { id: 99, roleId: 4 }
      EtablissementService.findByAdmin.mockResolvedValue(null)

      await findMine(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('retourne 500 en cas d\'erreur', async () => {
      EtablissementService.findByAdmin.mockRejectedValue(new Error('DB error'))

      await findMine(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('retourne 200 avec la liste', async () => {
      EtablissementService.findAll.mockResolvedValue([mockEtab])

      await findAll(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: [mockEtab] }))
    })

    it('retourne 500 en cas d\'erreur', async () => {
      EtablissementService.findAll.mockRejectedValue(new Error('DB error'))

      await findAll(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('roleId=1 — retourne 200 si trouvé', async () => {
      req.params.id = '1'
      EtablissementService.findOne.mockResolvedValue(mockEtab)

      await findOne(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockEtab }))
    })

    it('roleId=1 — retourne 404 si non trouvé', async () => {
      req.params.id = '999'
      EtablissementService.findOne.mockResolvedValue(null)

      await findOne(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('roleId=4 — retourne 200 si c\'est bien son établissement', async () => {
      req.user = { id: 10, roleId: 4 }
      req.params.id = '1'
      EtablissementService.findByAdmin.mockResolvedValue(mockEtab)

      await findOne(req, res)

      expect(EtablissementService.findByAdmin).toHaveBeenCalledWith(10)
      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('roleId=4 — retourne 403 si l\'id ne correspond pas à son établissement', async () => {
      req.user = { id: 10, roleId: 4 }
      req.params.id = '99'
      EtablissementService.findByAdmin.mockResolvedValue(mockEtab) // id=1 ≠ 99

      await findOne(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('roleId=4 — retourne 404 si aucun établissement trouvé pour cet admin', async () => {
      req.user = { id: 10, roleId: 4 }
      req.params.id = '1'
      EtablissementService.findByAdmin.mockResolvedValue(null)

      await findOne(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('retourne 201 à la création', async () => {
      req.body = { name: 'Lycée Test', code: 'LT01' }
      EtablissementService.create.mockResolvedValue(mockEtab)

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockEtab }))
    })

    it('retourne 409 si le code est déjà utilisé', async () => {
      req.body = { name: 'Test', code: 'LT01' }
      const err = new Error('unique')
      err.name = 'SequelizeUniqueConstraintError'
      EtablissementService.create.mockRejectedValue(err)

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(409)
    })

    it('retourne 500 en cas d\'erreur inattendue', async () => {
      EtablissementService.create.mockRejectedValue(new Error('crash'))

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('retourne 200 si mis à jour', async () => {
      req.params.id = '1'
      req.body = { name: 'Nouveau nom' }
      EtablissementService.update.mockResolvedValue({ ...mockEtab, name: 'Nouveau nom' })

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('retourne 404 si non trouvé', async () => {
      req.params.id = '999'
      EtablissementService.update.mockResolvedValue(null)

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('retourne 409 si code dupliqué', async () => {
      req.params.id = '1'
      const err = new Error('unique')
      err.name = 'SequelizeUniqueConstraintError'
      EtablissementService.update.mockRejectedValue(err)

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(409)
    })
  })

  // ── destroy ────────────────────────────────────────────────────────────────

  describe('destroy', () => {
    it('retourne 200 si supprimé', async () => {
      req.params.id = '1'
      EtablissementService.delete.mockResolvedValue(true)

      await destroy(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('retourne 404 si non trouvé', async () => {
      req.params.id = '999'
      EtablissementService.delete.mockResolvedValue(null)

      await destroy(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  // ── getStats ───────────────────────────────────────────────────────────────

  describe('getStats', () => {
    const mockStats = {
      groupCount: 3,
      totalMembers: 47,
      activeMembers: 44,
      inactiveMembers: 3,
      validatedAccounts: 42,
      pendingInvitations: 5,
      roleBreakdown: { students: 38, teachers: 9 },
      recentActivity: []
    }

    it('retourne 200 avec les stats (roleId=1)', async () => {
      req.params.id = '1'
      req.user = { id: 1, roleId: 1 }
      EtablissementService.getStats.mockResolvedValue(mockStats)

      await getStats(req, res)

      expect(EtablissementService.getStats).toHaveBeenCalledWith('1', 1, 1)
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockStats }))
    })

    it('retourne 200 avec les stats (roleId=4, son établissement)', async () => {
      req.params.id = '1'
      req.user = { id: 10, roleId: 4 }
      EtablissementService.getStats.mockResolvedValue(mockStats)

      await getStats(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('retourne 404 si établissement introuvable', async () => {
      req.params.id = '999'
      req.user = { id: 1, roleId: 1 }
      EtablissementService.getStats.mockResolvedValue(null)

      await getStats(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('retourne 403 si roleId=4 accède à un autre établissement', async () => {
      req.params.id = '1'
      req.user = { id: 99, roleId: 4 }
      EtablissementService.getStats.mockResolvedValue(false)

      await getStats(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('retourne 500 en cas d\'erreur service', async () => {
      req.params.id = '1'
      req.user = { id: 1, roleId: 1 }
      EtablissementService.getStats.mockRejectedValue(new Error('DB error'))

      await getStats(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  // ── getContent ─────────────────────────────────────────────────────────────

  describe('getContent', () => {
    const mockContent = {
      resources: [{ id: 1, title: 'Cours', classGroupId: 11 }],
      sections: [{ id: 2, title: 'Devoir', classGroupId: 11 }]
    }

    it('retourne 200 avec resources et sections', async () => {
      req.params.id = '1'
      req.user = { id: 1, roleId: 1 }
      EtablissementService.getContent.mockResolvedValue(mockContent)

      await getContent(req, res)

      expect(EtablissementService.getContent).toHaveBeenCalledWith('1', 1, 1)
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockContent }))
    })

    it('retourne 404 si établissement introuvable', async () => {
      req.params.id = '999'
      req.user = { id: 1, roleId: 1 }
      EtablissementService.getContent.mockResolvedValue(null)

      await getContent(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('retourne 403 si roleId=4 accède à un autre établissement', async () => {
      req.params.id = '1'
      req.user = { id: 99, roleId: 4 }
      EtablissementService.getContent.mockResolvedValue(false)

      await getContent(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('retourne 500 en cas d\'erreur service', async () => {
      req.params.id = '1'
      req.user = { id: 1, roleId: 1 }
      EtablissementService.getContent.mockRejectedValue(new Error('DB error'))

      await getContent(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  // ── deleteContent ──────────────────────────────────────────────────────────

  describe('deleteContent', () => {
    it('retourne 200 si contenu supprimé', async () => {
      req.params = { id: '1', contentType: 'resource', contentId: '5' }
      req.user = { id: 1, roleId: 1 }
      EtablissementService.deleteContent.mockResolvedValue(true)

      await deleteContent(req, res)

      expect(EtablissementService.deleteContent).toHaveBeenCalledWith('1', 'resource', '5', 1, 1)
      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('retourne 404 si établissement introuvable', async () => {
      req.params = { id: '999', contentType: 'resource', contentId: '5' }
      req.user = { id: 1, roleId: 1 }
      EtablissementService.deleteContent.mockResolvedValue(null)

      await deleteContent(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('retourne 403 si accès refusé', async () => {
      req.params = { id: '1', contentType: 'section', contentId: '6' }
      req.user = { id: 99, roleId: 4 }
      EtablissementService.deleteContent.mockResolvedValue(false)

      await deleteContent(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('retourne 404 si contenu introuvable', async () => {
      req.params = { id: '1', contentType: 'resource', contentId: '999' }
      req.user = { id: 1, roleId: 1 }
      EtablissementService.deleteContent.mockResolvedValue('not_found')

      await deleteContent(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('retourne 500 en cas d\'erreur service', async () => {
      req.params = { id: '1', contentType: 'resource', contentId: '5' }
      req.user = { id: 1, roleId: 1 }
      EtablissementService.deleteContent.mockRejectedValue(new Error('DB error'))

      await deleteContent(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  // ── getAuditLogs ───────────────────────────────────────────────────────────

  describe('getAuditLogs', () => {
    const mockLogs = [
      { id: 1, action: 'USER_INVITED', entityType: 'Invitation', createdAt: new Date() }
    ]

    it('retourne 200 avec les logs (roleId=1)', async () => {
      req.params.id = '1'
      req.user = { id: 1, roleId: 1 }
      req.query = {}
      EtablissementService.getAuditLogs.mockResolvedValue(mockLogs)

      await getAuditLogs(req, res)

      expect(EtablissementService.getAuditLogs).toHaveBeenCalledWith('1', 1, 1, {
        action: undefined, entityType: undefined, entityId: undefined, limit: undefined
      })
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockLogs }))
    })

    it('transmet les filtres query au service', async () => {
      req.params.id = '1'
      req.user = { id: 1, roleId: 1 }
      req.query = { action: 'USER_INVITED', entityType: 'Invitation', entityId: '3', limit: '20' }
      EtablissementService.getAuditLogs.mockResolvedValue([])

      await getAuditLogs(req, res)

      expect(EtablissementService.getAuditLogs).toHaveBeenCalledWith('1', 1, 1, {
        action: 'USER_INVITED', entityType: 'Invitation', entityId: '3', limit: '20'
      })
    })

    it('retourne 404 si établissement introuvable', async () => {
      req.params.id = '999'
      req.user = { id: 1, roleId: 1 }
      req.query = {}
      EtablissementService.getAuditLogs.mockResolvedValue(null)

      await getAuditLogs(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('retourne 403 si roleId=4 accède à un autre établissement', async () => {
      req.params.id = '1'
      req.user = { id: 99, roleId: 4 }
      req.query = {}
      EtablissementService.getAuditLogs.mockResolvedValue(false)

      await getAuditLogs(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('retourne 500 en cas d\'erreur service', async () => {
      req.params.id = '1'
      req.user = { id: 1, roleId: 1 }
      req.query = {}
      EtablissementService.getAuditLogs.mockRejectedValue(new Error('DB error'))

      await getAuditLogs(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })
})

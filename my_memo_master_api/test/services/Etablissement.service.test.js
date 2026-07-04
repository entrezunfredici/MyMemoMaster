const { Etablissement, User, ClassGroup, ClassGroupUsers, Invitation, AuditLog, ClassGroupResource, ClassGroupSection } = require('../../models/index')
const sendEmail = require('../../helpers/sendEmail')
const EtablissementService = require('../../services/Etablissement.service')

jest.mock('../../models/index', () => ({
  Etablissement: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn()
  },
  User: { findOne: jest.fn() },
  ClassGroup: { findAll: jest.fn() },
  ClassGroupUsers: { findAll: jest.fn() },
  Invitation: { findAll: jest.fn(), findOrCreate: jest.fn() },
  AuditLog: { findAll: jest.fn() },
  ClassGroupResource: { findAll: jest.fn(), findByPk: jest.fn() },
  ClassGroupSection: { findAll: jest.fn(), findByPk: jest.fn() }
}))

jest.mock('../../helpers/sendEmail', () => jest.fn().mockResolvedValue())

jest.mock('../../services/AuditLog.service', () => ({ log: jest.fn().mockResolvedValue({}) }))
jest.mock('../../helpers/logger', () => ({ warn: jest.fn(), error: jest.fn() }))

const mockEtab = { id: 1, name: 'Lycée Victor Hugo', code: 'LVH', adminId: 10 }
const mockEtabInstance = { ...mockEtab, update: jest.fn(), destroy: jest.fn() }

describe('EtablissementService', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('retourne tous les établissements', async () => {
      Etablissement.findAll.mockResolvedValue([mockEtab])

      const result = await EtablissementService.findAll()

      expect(Etablissement.findAll).toHaveBeenCalledWith(expect.objectContaining({
        order: [['name', 'ASC']]
      }))
      expect(result).toEqual([mockEtab])
    })
  })

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('retourne un établissement par id', async () => {
      Etablissement.findByPk.mockResolvedValue(mockEtab)

      const result = await EtablissementService.findOne(1)

      expect(Etablissement.findByPk).toHaveBeenCalledWith(1, expect.any(Object))
      expect(result).toEqual(mockEtab)
    })

    it('retourne null si non trouvé', async () => {
      Etablissement.findByPk.mockResolvedValue(null)

      const result = await EtablissementService.findOne(999)

      expect(result).toBeNull()
    })
  })

  // ── findByAdmin ────────────────────────────────────────────────────────────

  describe('findByAdmin', () => {
    it('retourne l\'établissement dont l\'adminId correspond', async () => {
      Etablissement.findOne.mockResolvedValue(mockEtab)

      const result = await EtablissementService.findByAdmin(10)

      expect(Etablissement.findOne).toHaveBeenCalledWith(expect.objectContaining({
        where: { adminId: 10 }
      }))
      expect(result).toEqual(mockEtab)
    })

    it('retourne null si aucun établissement pour cet admin', async () => {
      Etablissement.findOne.mockResolvedValue(null)

      const result = await EtablissementService.findByAdmin(99)

      expect(result).toBeNull()
    })
  })

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('crée et retourne le nouvel établissement', async () => {
      Etablissement.create.mockResolvedValue(mockEtab)

      const result = await EtablissementService.create({ name: 'Lycée Victor Hugo', code: 'LVH' })

      expect(Etablissement.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Lycée Victor Hugo',
        code: 'LVH'
      }))
      expect(result).toEqual(mockEtab)
    })

    it('adminId est null par défaut', async () => {
      Etablissement.create.mockResolvedValue({ ...mockEtab, adminId: null })

      await EtablissementService.create({ name: 'Test', code: 'TST' })

      expect(Etablissement.create).toHaveBeenCalledWith(expect.objectContaining({
        adminId: null
      }))
    })
  })

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('met à jour et retourne l\'établissement', async () => {
      const updated = { ...mockEtab, name: 'Nouveau nom' }
      mockEtabInstance.update.mockResolvedValue(updated)
      Etablissement.findByPk.mockResolvedValue(mockEtabInstance)

      const result = await EtablissementService.update(1, { name: 'Nouveau nom' })

      expect(mockEtabInstance.update).toHaveBeenCalledWith({ name: 'Nouveau nom' })
      expect(result).toEqual(updated)
    })

    it('retourne null si non trouvé', async () => {
      Etablissement.findByPk.mockResolvedValue(null)

      const result = await EtablissementService.update(999, { name: 'X' })

      expect(result).toBeNull()
    })

    it('ignore les champs undefined dans le patch', async () => {
      mockEtabInstance.update.mockResolvedValue(mockEtabInstance)
      Etablissement.findByPk.mockResolvedValue(mockEtabInstance)

      await EtablissementService.update(1, { name: 'Test' })

      const callArg = mockEtabInstance.update.mock.calls[0][0]
      expect(callArg).not.toHaveProperty('code')
      expect(callArg).not.toHaveProperty('adminId')
    })
  })

  // ── delete ─────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('supprime et retourne true', async () => {
      mockEtabInstance.destroy.mockResolvedValue()
      Etablissement.findByPk.mockResolvedValue(mockEtabInstance)

      const result = await EtablissementService.delete(1)

      expect(mockEtabInstance.destroy).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('retourne null si non trouvé', async () => {
      Etablissement.findByPk.mockResolvedValue(null)

      const result = await EtablissementService.delete(999)

      expect(result).toBeNull()
    })
  })

  // ── getStats ───────────────────────────────────────────────────────────────

  describe('getStats', () => {
    const mockUser1 = { userId: 101, isActive: true, hasValidatedEmail: true }
    const mockUser2 = { userId: 102, isActive: false, hasValidatedEmail: true }
    const mockUser3 = { userId: 103, isActive: true, hasValidatedEmail: false }

    const mockMemberships = [
      { user: mockUser1, role: 'student' },
      { user: mockUser2, role: 'teacher' },
      { user: mockUser3, role: 'student' }
    ]

    const mockInvitations = [
      { status: 'pending' },
      { status: 'pending' },
      { status: 'accepted' }
    ]

    const mockActivity = [{ id: 5, action: 'USER_ACCOUNT_ACTIVATED', actor: { userId: 10 } }]

    beforeEach(() => {
      Etablissement.findByPk.mockResolvedValue({ id: 1, adminId: 10 })
      ClassGroup.findAll.mockResolvedValue([{ id: 11 }, { id: 12 }])
      ClassGroupUsers.findAll.mockResolvedValue(mockMemberships)
      Invitation.findAll.mockResolvedValue(mockInvitations)
      AuditLog.findAll.mockResolvedValue(mockActivity)
    })

    it('retourne les stats complètes pour roleId=1', async () => {
      const result = await EtablissementService.getStats(1, 99, 1)

      expect(result).toMatchObject({
        groupCount: 2,
        totalMembers: 3,
        activeMembers: 2,
        inactiveMembers: 1,
        validatedAccounts: 2,
        pendingInvitations: 2,
        roleBreakdown: { students: 2, teachers: 1 },
        recentActivity: mockActivity
      })
    })

    it('retourne les stats pour roleId=4 sur son propre établissement', async () => {
      const result = await EtablissementService.getStats(1, 10, 4)

      expect(result.groupCount).toBe(2)
      expect(result.totalMembers).toBe(3)
    })

    it('retourne null si l\'établissement est introuvable', async () => {
      Etablissement.findByPk.mockResolvedValue(null)

      const result = await EtablissementService.getStats(999, 10, 1)

      expect(result).toBeNull()
    })

    it('retourne false si roleId=4 accède à un autre établissement', async () => {
      // etab.adminId=10, requesterId=99 (différent)
      const result = await EtablissementService.getStats(1, 99, 4)

      expect(result).toBe(false)
    })

    it('retourne des stats vides si adminId est null', async () => {
      Etablissement.findByPk.mockResolvedValue({ id: 1, adminId: null })

      const result = await EtablissementService.getStats(1, 99, 1)

      expect(result).toMatchObject({
        groupCount: 0,
        totalMembers: 0,
        pendingInvitations: 0,
        roleBreakdown: { students: 0, teachers: 0 },
        recentActivity: []
      })
      expect(ClassGroup.findAll).not.toHaveBeenCalled()
    })

    it('déduplique les membres présents dans plusieurs groupes', async () => {
      // Le même user apparaît 2 fois (2 groupes différents)
      ClassGroupUsers.findAll.mockResolvedValue([
        { user: mockUser1, role: 'student' },
        { user: mockUser1, role: 'student' } // même userId
      ])

      const result = await EtablissementService.getStats(1, 10, 1)

      expect(result.totalMembers).toBe(1)
    })

    it('retourne 0 membres si aucun groupe', async () => {
      ClassGroup.findAll.mockResolvedValue([])

      const result = await EtablissementService.getStats(1, 10, 1)

      expect(result.groupCount).toBe(0)
      expect(result.totalMembers).toBe(0)
      expect(ClassGroupUsers.findAll).not.toHaveBeenCalled()
    })
  })

  // ── getContent ─────────────────────────────────────────────────────────────

  describe('getContent', () => {
    const mockResources = [{ id: 1, title: 'Cours de maths', classGroupId: 11 }]
    const mockSections = [{ id: 2, title: 'Devoir maison', classGroupId: 11 }]

    beforeEach(() => {
      Etablissement.findByPk.mockResolvedValue({ id: 1, adminId: 10 })
      ClassGroup.findAll.mockResolvedValue([{ id: 11 }, { id: 12 }])
      ClassGroupResource.findAll.mockResolvedValue(mockResources)
      ClassGroupSection.findAll.mockResolvedValue(mockSections)
    })

    it('retourne les ressources et sections pour roleId=1', async () => {
      const result = await EtablissementService.getContent(1, 99, 1)

      expect(result).toEqual({ resources: mockResources, sections: mockSections })
      expect(ClassGroupResource.findAll).toHaveBeenCalled()
      expect(ClassGroupSection.findAll).toHaveBeenCalled()
    })

    it('retourne le contenu pour roleId=4 sur son établissement', async () => {
      const result = await EtablissementService.getContent(1, 10, 4)

      expect(result.resources).toEqual(mockResources)
      expect(result.sections).toEqual(mockSections)
    })

    it('retourne null si établissement introuvable', async () => {
      Etablissement.findByPk.mockResolvedValue(null)

      const result = await EtablissementService.getContent(999, 99, 1)

      expect(result).toBeNull()
    })

    it('retourne false si roleId=4 accède à un autre établissement', async () => {
      const result = await EtablissementService.getContent(1, 99, 4)

      expect(result).toBe(false)
    })

    it('retourne des listes vides si adminId est null', async () => {
      Etablissement.findByPk.mockResolvedValue({ id: 1, adminId: null })

      const result = await EtablissementService.getContent(1, 99, 1)

      expect(result).toEqual({ resources: [], sections: [] })
      expect(ClassGroup.findAll).not.toHaveBeenCalled()
    })

    it('retourne des listes vides si aucun groupe', async () => {
      ClassGroup.findAll.mockResolvedValue([])

      const result = await EtablissementService.getContent(1, 99, 1)

      expect(result).toEqual({ resources: [], sections: [] })
      expect(ClassGroupResource.findAll).not.toHaveBeenCalled()
    })
  })

  // ── deleteContent ──────────────────────────────────────────────────────────

  describe('deleteContent', () => {
    const mockResource = { id: 5, classGroupId: 11, destroy: jest.fn() }
    const mockSection = { id: 6, classGroupId: 12, destroy: jest.fn() }

    beforeEach(() => {
      Etablissement.findByPk.mockResolvedValue({ id: 1, adminId: 10 })
      ClassGroup.findAll.mockResolvedValue([{ id: 11 }, { id: 12 }])
      mockResource.destroy.mockResolvedValue()
      mockSection.destroy.mockResolvedValue()
    })

    it('supprime une ressource et retourne true', async () => {
      ClassGroupResource.findByPk.mockResolvedValue(mockResource)

      const result = await EtablissementService.deleteContent(1, 'resource', 5, 10, 4)

      expect(mockResource.destroy).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('supprime une section et retourne true', async () => {
      ClassGroupSection.findByPk.mockResolvedValue(mockSection)

      const result = await EtablissementService.deleteContent(1, 'section', 6, 1, 1)

      expect(mockSection.destroy).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('retourne null si établissement introuvable', async () => {
      Etablissement.findByPk.mockResolvedValue(null)

      const result = await EtablissementService.deleteContent(999, 'resource', 5, 1, 1)

      expect(result).toBeNull()
    })

    it('retourne false si roleId=4 accède à un autre établissement', async () => {
      const result = await EtablissementService.deleteContent(1, 'resource', 5, 99, 4)

      expect(result).toBe(false)
    })

    it('retourne not_found si la ressource est introuvable', async () => {
      ClassGroupResource.findByPk.mockResolvedValue(null)

      const result = await EtablissementService.deleteContent(1, 'resource', 999, 10, 1)

      expect(result).toBe('not_found')
    })

    it('retourne not_found si le contenu appartient à un autre établissement', async () => {
      ClassGroupResource.findByPk.mockResolvedValue({ id: 5, classGroupId: 99 }) // groupId 99 pas dans l'établissement

      const result = await EtablissementService.deleteContent(1, 'resource', 5, 10, 1)

      expect(result).toBe('not_found')
    })
  })

  // ── assignAdmin ────────────────────────────────────────────────────────────

  describe('assignAdmin', () => {
    const mockUserInstance = {
      userId: 5,
      name: 'Gérant',
      email: 'gerant@exemple.fr',
      update: jest.fn()
    }
    const mockEtabInstance = {
      id: 1,
      name: 'Lycée Test',
      adminId: null,
      update: jest.fn()
    }
    const mockInvitation = { id: 20 }

    beforeEach(() => {
      Etablissement.findByPk.mockResolvedValue(mockEtabInstance)
      mockEtabInstance.update.mockResolvedValue()
      mockUserInstance.update.mockResolvedValue()
      sendEmail.mockResolvedValue()
    })

    it('retourne null si l\'établissement est introuvable', async () => {
      Etablissement.findByPk.mockResolvedValue(null)

      const result = await EtablissementService.assignAdmin(99, 'gerant@exemple.fr', 1)

      expect(result).toBeNull()
      expect(User.findOne).not.toHaveBeenCalled()
    })

    it('assigne directement le gérant si le compte existe', async () => {
      User.findOne.mockResolvedValue(mockUserInstance)
      Etablissement.findByPk
        .mockResolvedValueOnce(mockEtabInstance)  // premier appel (findByPk au début)
        .mockResolvedValueOnce({ ...mockEtabInstance, adminId: 5 }) // second appel (rechargement)

      const result = await EtablissementService.assignAdmin(1, 'gerant@exemple.fr', 1)

      expect(mockUserInstance.update).toHaveBeenCalledWith({ roleId: 4 })
      expect(mockEtabInstance.update).toHaveBeenCalledWith({ adminId: mockUserInstance.userId })
      expect(result.directlyAssigned).toBe(true)
      expect(result.user.email).toBe('gerant@exemple.fr')
    })

    it('normalise l\'email en minuscule avant la recherche', async () => {
      User.findOne.mockResolvedValue(mockUserInstance)
      Etablissement.findByPk.mockResolvedValue(mockEtabInstance)

      await EtablissementService.assignAdmin(1, 'GERANT@EXEMPLE.FR', 1)

      expect(User.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'gerant@exemple.fr' } })
      )
    })

    it('crée une invitation et envoie un email si le compte n\'existe pas', async () => {
      User.findOne.mockResolvedValue(null)
      Invitation.findOrCreate.mockResolvedValue([mockInvitation, true])

      const result = await EtablissementService.assignAdmin(1, 'nouveau@exemple.fr', 1)

      expect(Invitation.findOrCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            targetEmail: 'nouveau@exemple.fr',
            role: 'admin_etablissement',
            status: 'pending'
          })
        })
      )
      expect(sendEmail).toHaveBeenCalled()
      expect(result.directlyAssigned).toBe(false)
      expect(result.email).toBe('nouveau@exemple.fr')
    })

    it('n\'échoue pas si l\'envoi d\'email plante (invitation déjà créée)', async () => {
      User.findOne.mockResolvedValue(null)
      Invitation.findOrCreate.mockResolvedValue([mockInvitation, false])
      sendEmail.mockRejectedValue(new Error('SMTP timeout'))

      const result = await EtablissementService.assignAdmin(1, 'nouveau@exemple.fr', 1)

      expect(result.directlyAssigned).toBe(false)
    })
  })

  // ── getAuditLogs ───────────────────────────────────────────────────────────

  describe('getAuditLogs', () => {
    const mockLogs = [
      { id: 1, action: 'USER_INVITED', entityType: 'Invitation', actorId: 10 },
      { id: 2, action: 'USER_ACCOUNT_ACTIVATED', entityType: 'User', actorId: 10 }
    ]

    beforeEach(() => {
      Etablissement.findByPk.mockResolvedValue({ id: 1, adminId: 10 })
      AuditLog.findAll.mockResolvedValue(mockLogs)
    })

    it('retourne les logs de l\'établissement pour roleId=1', async () => {
      const result = await EtablissementService.getAuditLogs(1, 99, 1)

      expect(AuditLog.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ actorId: 10 }) })
      )
      expect(result).toEqual(mockLogs)
    })

    it('retourne les logs pour roleId=4 sur son établissement', async () => {
      const result = await EtablissementService.getAuditLogs(1, 10, 4)

      expect(result).toEqual(mockLogs)
    })

    it('retourne null si établissement introuvable', async () => {
      Etablissement.findByPk.mockResolvedValue(null)

      const result = await EtablissementService.getAuditLogs(999, 10, 1)

      expect(result).toBeNull()
      expect(AuditLog.findAll).not.toHaveBeenCalled()
    })

    it('retourne false si roleId=4 accède à un autre établissement', async () => {
      // adminId=10, requesterId=99
      const result = await EtablissementService.getAuditLogs(1, 99, 4)

      expect(result).toBe(false)
      expect(AuditLog.findAll).not.toHaveBeenCalled()
    })

    it('retourne un tableau vide si adminId est null', async () => {
      Etablissement.findByPk.mockResolvedValue({ id: 1, adminId: null })

      const result = await EtablissementService.getAuditLogs(1, 99, 1)

      expect(result).toEqual([])
      expect(AuditLog.findAll).not.toHaveBeenCalled()
    })

    it('applique le filtre action quand fourni', async () => {
      AuditLog.findAll.mockResolvedValue([mockLogs[0]])

      const result = await EtablissementService.getAuditLogs(1, 99, 1, { action: 'USER_INVITED' })

      expect(AuditLog.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ action: 'USER_INVITED' }) })
      )
      expect(result).toHaveLength(1)
    })

    it('applique le filtre entityType + entityId quand fournis', async () => {
      AuditLog.findAll.mockResolvedValue([mockLogs[1]])

      await EtablissementService.getAuditLogs(1, 99, 1, { entityType: 'User', entityId: '5' })

      expect(AuditLog.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ entityType: 'User', entityId: 5 })
        })
      )
    })

    it('applique la limite personnalisée', async () => {
      AuditLog.findAll.mockResolvedValue([])

      await EtablissementService.getAuditLogs(1, 99, 1, { limit: '10' })

      expect(AuditLog.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10 })
      )
    })
  })
})

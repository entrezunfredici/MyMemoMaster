const { Invitation, ClassGroup, ClassGroupUsers, User } = require('../../models/index')
const InvitationService = require('../../services/Invitation.service')

jest.mock('../../models/index', () => ({
  Invitation: { findOrCreate: jest.fn(), findAll: jest.fn(), update: jest.fn() },
  ClassGroup: { findByPk: jest.fn() },
  ClassGroupUsers: { findOne: jest.fn(), findOrCreate: jest.fn() },
  User: { findByPk: jest.fn(), findOne: jest.fn() }
}))

jest.mock('../../helpers/sendEmail', () => jest.fn().mockResolvedValue(true))
jest.mock('../../helpers/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }))
jest.mock('../../services/AuditLog.service', () => ({ log: jest.fn().mockResolvedValue({}) }))

const adminUser   = { roleId: 1 }
const teacherUser = { roleId: 3 }

const mockGroup = { id: 1, name: 'MP2I A' }

describe('InvitationService', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── invite ──────────────────────────────────────────────────────────────────

  describe('invite', () => {
    it('admin — peut inviter avec rôle teacher', async () => {
      User.findByPk.mockResolvedValue(adminUser)
      ClassGroup.findByPk.mockResolvedValue(mockGroup)
      User.findOne.mockResolvedValue(null) // pas de compte existant
      Invitation.findOrCreate.mockResolvedValue([{ id: 1, status: 'pending' }, true])

      const result = await InvitationService.invite(1, 1, { targetEmail: 'prof@test.com', role: 'teacher' })

      expect(result).toHaveProperty('directlyAdded', false)
    })

    it('admin — peut inviter avec rôle student', async () => {
      User.findByPk.mockResolvedValue(adminUser)
      ClassGroup.findByPk.mockResolvedValue(mockGroup)
      User.findOne.mockResolvedValue(null)
      Invitation.findOrCreate.mockResolvedValue([{ id: 2, status: 'pending' }, true])

      const result = await InvitationService.invite(1, 1, { targetEmail: 'etudiant@test.com', role: 'student' })

      expect(result).toHaveProperty('directlyAdded', false)
    })

    it('enseignant du groupe — peut inviter avec rôle student', async () => {
      User.findByPk.mockResolvedValue(teacherUser)
      ClassGroupUsers.findOne.mockResolvedValue({ role: 'teacher' }) // est teacher dans ce groupe
      ClassGroup.findByPk.mockResolvedValue(mockGroup)
      User.findOne.mockResolvedValue(null)
      Invitation.findOrCreate.mockResolvedValue([{ id: 3, status: 'pending' }, true])

      const result = await InvitationService.invite(1, 2, { targetEmail: 'eleve@test.com', role: 'student' })

      expect(result).toHaveProperty('directlyAdded', false)
    })

    it('enseignant du groupe — ne peut PAS inviter avec rôle teacher', async () => {
      User.findByPk.mockResolvedValue(teacherUser)
      ClassGroupUsers.findOne.mockResolvedValue({ role: 'teacher' }) // est teacher dans ce groupe

      const result = await InvitationService.invite(1, 2, { targetEmail: 'collegue@test.com', role: 'teacher' })

      expect(result).toBe(false)
      expect(ClassGroup.findByPk).not.toHaveBeenCalled()
    })

    it('non-membre — retourne false', async () => {
      User.findByPk.mockResolvedValue(teacherUser)
      ClassGroupUsers.findOne.mockResolvedValue(null) // pas membre du groupe

      const result = await InvitationService.invite(1, 99, { targetEmail: 'eleve@test.com', role: 'student' })

      expect(result).toBe(false)
    })

    it('groupe inexistant — retourne null', async () => {
      User.findByPk.mockResolvedValue(adminUser)
      ClassGroup.findByPk.mockResolvedValue(null)

      const result = await InvitationService.invite(99, 1, { targetEmail: 'eleve@test.com', role: 'student' })

      expect(result).toBeNull()
    })

    it('utilisateur déjà inscrit — ajout direct dans le groupe', async () => {
      const existingUser = { userId: 5, name: 'Alice', email: 'alice@test.com' }
      User.findByPk.mockResolvedValue(adminUser)
      ClassGroup.findByPk.mockResolvedValue(mockGroup)
      User.findOne.mockResolvedValue(existingUser)
      ClassGroupUsers.findOrCreate.mockResolvedValue([{ role: 'student' }, true])
      Invitation.update.mockResolvedValue([0])

      const result = await InvitationService.invite(1, 1, { targetEmail: 'alice@test.com', role: 'student' })

      expect(result).toHaveProperty('directlyAdded', true)
      expect(result.user.email).toBe('alice@test.com')
      expect(ClassGroupUsers.findOrCreate).toHaveBeenCalled()
    })
  })
})

const { ClassGroupSection, ClassGroupUsers, User } = require('../../models/index')
const ClassGroupSectionService = require('../../services/ClassGroupSection.service')

jest.mock('../../models/index', () => ({
  ClassGroupSection: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn()
  },
  ClassGroupUsers: {
    findOne: jest.fn()
  },
  User: {
    findByPk: jest.fn()
  }
}))

jest.mock('../../helpers/logger', () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }))

const adminUser = { roleId: 1 }
const superAdminUser = { roleId: 4 }
const studentUser = { roleId: 2 }

describe('ClassGroupSectionService', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── _canWrite ─────────────────────────────────────────────────────────────────

  describe('_canWrite', () => {
    it('_canWrite — admin (roleId 1) — retourne true', async () => {
      User.findByPk.mockResolvedValue(adminUser)
      expect(await ClassGroupSectionService._canWrite(1, 1)).toBe(true)
    })

    it('_canWrite — superAdmin (roleId 4) — retourne true', async () => {
      User.findByPk.mockResolvedValue(superAdminUser)
      expect(await ClassGroupSectionService._canWrite(1, 4)).toBe(true)
    })

    it('_canWrite — enseignant du groupe — retourne true', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue({ role: 'teacher' })
      expect(await ClassGroupSectionService._canWrite(1, 2)).toBe(true)
    })

    it('_canWrite — étudiant sans rôle teacher — retourne false', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue(null)
      expect(await ClassGroupSectionService._canWrite(1, 2)).toBe(false)
    })

    it('_canWrite — utilisateur non trouvé — retourne false', async () => {
      User.findByPk.mockResolvedValue(null)
      expect(await ClassGroupSectionService._canWrite(1, 99)).toBe(false)
    })
  })

  // ── _isMember ────────────────────────────────────────────────────────────────

  describe('_isMember', () => {
    it('_isMember — admin — retourne true sans vérifier ClassGroupUsers', async () => {
      User.findByPk.mockResolvedValue(adminUser)
      expect(await ClassGroupSectionService._isMember(1, 1)).toBe(true)
      expect(ClassGroupUsers.findOne).not.toHaveBeenCalled()
    })

    it('_isMember — membre du groupe — retourne true', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue({ userId: 2 })
      expect(await ClassGroupSectionService._isMember(1, 2)).toBe(true)
    })

    it('_isMember — non-membre — retourne false', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue(null)
      expect(await ClassGroupSectionService._isMember(1, 2)).toBe(false)
    })
  })

  // ── findAll ───────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('findAll — membre — retourne les sections du groupe', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue({ userId: 2 })
      const sections = [{ id: 1, title: 'Chapitre 1', type: 'section' }]
      ClassGroupSection.findAll.mockResolvedValue(sections)

      const result = await ClassGroupSectionService.findAll(1, 2)
      expect(result).toEqual(sections)
    })

    it('findAll — non-membre — retourne false', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue(null)

      const result = await ClassGroupSectionService.findAll(1, 2)
      expect(result).toBe(false)
      expect(ClassGroupSection.findAll).not.toHaveBeenCalled()
    })
  })

  // ── create ────────────────────────────────────────────────────────────────────

  describe('create', () => {
    const data = { title: 'Chapitre 1', type: 'section' }

    it('create — enseignant — crée et retourne la section', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue({ role: 'teacher' })
      const created = { id: 1, ...data, classGroupId: 1, createdBy: 2 }
      ClassGroupSection.create.mockResolvedValue(created)

      const result = await ClassGroupSectionService.create(1, 2, data)
      expect(result).toEqual(created)
      expect(ClassGroupSection.create).toHaveBeenCalledWith({ ...data, classGroupId: 1, createdBy: 2 })
    })

    it('create — non-enseignant — retourne false', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue(null)

      const result = await ClassGroupSectionService.create(1, 2, data)
      expect(result).toBe(false)
      expect(ClassGroupSection.create).not.toHaveBeenCalled()
    })
  })

  // ── update ────────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('update — enseignant + section existe — met à jour et retourne la section', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue({ role: 'teacher' })
      const mockSection = { id: 1, title: 'Ancien titre', update: jest.fn().mockResolvedValue(undefined) }
      ClassGroupSection.findOne.mockResolvedValue(mockSection)

      const result = await ClassGroupSectionService.update(1, 1, 2, { title: 'Nouveau titre' })
      expect(mockSection.update).toHaveBeenCalledWith({ title: 'Nouveau titre' })
      expect(result).toBe(mockSection)
    })

    it('update — non-enseignant — retourne false', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue(null)

      const result = await ClassGroupSectionService.update(1, 1, 2, {})
      expect(result).toBe(false)
      expect(ClassGroupSection.findOne).not.toHaveBeenCalled()
    })

    it('update — section introuvable — retourne null', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue({ role: 'teacher' })
      ClassGroupSection.findOne.mockResolvedValue(null)

      const result = await ClassGroupSectionService.update(1, 99, 2, {})
      expect(result).toBeNull()
    })
  })

  // ── delete ────────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('delete — enseignant + section existe — supprime et retourne true', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue({ role: 'teacher' })
      const mockSection = { id: 1, destroy: jest.fn().mockResolvedValue(undefined) }
      ClassGroupSection.findOne.mockResolvedValue(mockSection)

      const result = await ClassGroupSectionService.delete(1, 1, 2)
      expect(result).toBe(true)
      expect(mockSection.destroy).toHaveBeenCalled()
    })

    it('delete — non-enseignant — retourne false', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue(null)

      const result = await ClassGroupSectionService.delete(1, 1, 2)
      expect(result).toBe(false)
    })

    it('delete — section introuvable — retourne null', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue({ role: 'teacher' })
      ClassGroupSection.findOne.mockResolvedValue(null)

      const result = await ClassGroupSectionService.delete(1, 99, 2)
      expect(result).toBeNull()
    })
  })
})

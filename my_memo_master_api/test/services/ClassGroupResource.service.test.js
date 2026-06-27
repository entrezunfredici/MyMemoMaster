const { ClassGroupResource, ClassGroupUsers, User } = require('../../models/index')
const ClassGroupResourceService = require('../../services/ClassGroupResource.service')

jest.mock('../../models/index', () => ({
  ClassGroupResource: {
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

jest.mock('@aws-sdk/client-s3', () => ({
  DeleteObjectCommand: jest.fn()
}))

jest.mock('../../config/storage.config', () => ({
  s3Client: { send: jest.fn() },
  bucket: 'test-bucket'
}))

jest.mock('../../helpers/logger', () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }))

const adminUser = { roleId: 1 }
const superAdminUser = { roleId: 4 }
const studentUser = { roleId: 2 }

describe('ClassGroupResourceService', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── _canWrite ─────────────────────────────────────────────────────────────────

  describe('_canWrite', () => {
    it('_canWrite — admin (roleId 1) — retourne true', async () => {
      User.findByPk.mockResolvedValue(adminUser)
      expect(await ClassGroupResourceService._canWrite(1, 1)).toBe(true)
    })

    it('_canWrite — superAdmin (roleId 4) — retourne true', async () => {
      User.findByPk.mockResolvedValue(superAdminUser)
      expect(await ClassGroupResourceService._canWrite(1, 4)).toBe(true)
    })

    it('_canWrite — enseignant du groupe — retourne true', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue({ role: 'teacher' })
      expect(await ClassGroupResourceService._canWrite(1, 2)).toBe(true)
    })

    it('_canWrite — étudiant sans rôle teacher — retourne false', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue(null)
      expect(await ClassGroupResourceService._canWrite(1, 2)).toBe(false)
    })

    it('_canWrite — utilisateur non trouvé — retourne false', async () => {
      User.findByPk.mockResolvedValue(null)
      expect(await ClassGroupResourceService._canWrite(1, 99)).toBe(false)
    })
  })

  // ── _isMember ────────────────────────────────────────────────────────────────

  describe('_isMember', () => {
    it('_isMember — admin — retourne true sans vérifier ClassGroupUsers', async () => {
      User.findByPk.mockResolvedValue(adminUser)
      expect(await ClassGroupResourceService._isMember(1, 1)).toBe(true)
      expect(ClassGroupUsers.findOne).not.toHaveBeenCalled()
    })

    it('_isMember — membre du groupe — retourne true', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue({ userId: 2 })
      expect(await ClassGroupResourceService._isMember(1, 2)).toBe(true)
    })

    it('_isMember — non-membre — retourne false', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue(null)
      expect(await ClassGroupResourceService._isMember(1, 2)).toBe(false)
    })
  })

  // ── findAll ───────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('findAll — membre — retourne les ressources du groupe', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue({ userId: 2 })
      const resources = [{ id: 1, title: 'Cours Maths' }]
      ClassGroupResource.findAll.mockResolvedValue(resources)

      const result = await ClassGroupResourceService.findAll(1, 2)
      expect(result).toEqual(resources)
    })

    it('findAll — non-membre — retourne false', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue(null)

      const result = await ClassGroupResourceService.findAll(1, 2)
      expect(result).toBe(false)
      expect(ClassGroupResource.findAll).not.toHaveBeenCalled()
    })
  })

  // ── create ────────────────────────────────────────────────────────────────────

  describe('create', () => {
    const data = { title: 'Cours Maths', type: 'cours' }

    it('create — enseignant — crée et retourne la ressource', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue({ role: 'teacher' })
      const created = { id: 1, ...data, classGroupId: 1, createdBy: 2 }
      ClassGroupResource.create.mockResolvedValue(created)

      const result = await ClassGroupResourceService.create(1, 2, data)
      expect(result).toEqual(created)
      expect(ClassGroupResource.create).toHaveBeenCalledWith({ ...data, classGroupId: 1, createdBy: 2 })
    })

    it('create — non-enseignant — retourne false', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue(null)

      const result = await ClassGroupResourceService.create(1, 2, data)
      expect(result).toBe(false)
      expect(ClassGroupResource.create).not.toHaveBeenCalled()
    })
  })

  // ── update ────────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('update — enseignant + ressource existe — met à jour et retourne la ressource', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue({ role: 'teacher' })
      const mockResource = { id: 1, title: 'Ancien titre', update: jest.fn().mockResolvedValue(undefined) }
      ClassGroupResource.findOne.mockResolvedValue(mockResource)

      const result = await ClassGroupResourceService.update(1, 1, 2, { title: 'Nouveau titre' })
      expect(mockResource.update).toHaveBeenCalledWith({ title: 'Nouveau titre' })
      expect(result).toBe(mockResource)
    })

    it('update — non-enseignant — retourne false', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue(null)

      const result = await ClassGroupResourceService.update(1, 1, 2, {})
      expect(result).toBe(false)
      expect(ClassGroupResource.findOne).not.toHaveBeenCalled()
    })

    it('update — ressource introuvable — retourne null', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue({ role: 'teacher' })
      ClassGroupResource.findOne.mockResolvedValue(null)

      const result = await ClassGroupResourceService.update(1, 99, 2, {})
      expect(result).toBeNull()
    })
  })

  // ── delete ────────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('delete — enseignant + ressource sans fileKey — supprime et retourne true', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue({ role: 'teacher' })
      const mockResource = { id: 1, fileKey: null, destroy: jest.fn().mockResolvedValue(undefined) }
      ClassGroupResource.findOne.mockResolvedValue(mockResource)

      const result = await ClassGroupResourceService.delete(1, 1, 2)
      expect(result).toBe(true)
      expect(mockResource.destroy).toHaveBeenCalled()
    })

    it('delete — enseignant + ressource avec fileKey — tente suppression S3 puis supprime en BDD', async () => {
      const { s3Client } = require('../../config/storage.config')
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue({ role: 'teacher' })
      const mockResource = { id: 1, fileKey: 'uploads/file.pdf', destroy: jest.fn().mockResolvedValue(undefined) }
      ClassGroupResource.findOne.mockResolvedValue(mockResource)
      s3Client.send.mockResolvedValue({})

      const result = await ClassGroupResourceService.delete(1, 1, 2)
      expect(s3Client.send).toHaveBeenCalled()
      expect(mockResource.destroy).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('delete — erreur S3 ignorée — supprime quand même en BDD', async () => {
      const { s3Client } = require('../../config/storage.config')
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue({ role: 'teacher' })
      const mockResource = { id: 1, fileKey: 'uploads/file.pdf', destroy: jest.fn().mockResolvedValue(undefined) }
      ClassGroupResource.findOne.mockResolvedValue(mockResource)
      s3Client.send.mockRejectedValue(new Error('S3 error'))

      const result = await ClassGroupResourceService.delete(1, 1, 2)
      expect(mockResource.destroy).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('delete — non-enseignant — retourne false', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue(null)

      const result = await ClassGroupResourceService.delete(1, 1, 2)
      expect(result).toBe(false)
    })

    it('delete — ressource introuvable — retourne null', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue({ role: 'teacher' })
      ClassGroupResource.findOne.mockResolvedValue(null)

      const result = await ClassGroupResourceService.delete(1, 99, 2)
      expect(result).toBeNull()
    })
  })
})

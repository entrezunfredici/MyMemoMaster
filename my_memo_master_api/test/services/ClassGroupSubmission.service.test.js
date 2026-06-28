const { ClassGroupSubmission, ClassGroupSection, ClassGroupUsers, User } = require('../../models/index')
const ClassGroupSubmissionService = require('../../services/ClassGroupSubmission.service')

jest.mock('../../models/index', () => ({
  ClassGroupSubmission: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn()
  },
  ClassGroupSection: {
    findOne: jest.fn()
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
const studentUser = { roleId: 2 }
const teacherMembership = { role: 'teacher' }
const studentMembership = { role: 'student' }

describe('ClassGroupSubmissionService', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── _isMember ────────────────────────────────────────────────────────────────

  describe('_isMember', () => {
    it('_isMember — admin — retourne true sans vérifier ClassGroupUsers', async () => {
      User.findByPk.mockResolvedValue(adminUser)
      expect(await ClassGroupSubmissionService._isMember(1, 1)).toBe(true)
      expect(ClassGroupUsers.findOne).not.toHaveBeenCalled()
    })

    it('_isMember — membre du groupe — retourne true', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue(studentMembership)
      expect(await ClassGroupSubmissionService._isMember(1, 2)).toBe(true)
    })

    it('_isMember — non-membre — retourne false', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue(null)
      expect(await ClassGroupSubmissionService._isMember(1, 2)).toBe(false)
    })
  })

  // ── _isTeacher ───────────────────────────────────────────────────────────────

  describe('_isTeacher', () => {
    it('_isTeacher — admin — retourne true sans vérifier ClassGroupUsers', async () => {
      User.findByPk.mockResolvedValue(adminUser)
      expect(await ClassGroupSubmissionService._isTeacher(1, 1)).toBe(true)
      expect(ClassGroupUsers.findOne).not.toHaveBeenCalled()
    })

    it('_isTeacher — enseignant du groupe — retourne true', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue(teacherMembership)
      expect(await ClassGroupSubmissionService._isTeacher(1, 2)).toBe(true)
    })

    it('_isTeacher — étudiant — retourne false', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue(null)
      expect(await ClassGroupSubmissionService._isTeacher(1, 2)).toBe(false)
    })
  })

  // ── _sectionBelongsToGroup ───────────────────────────────────────────────────

  describe('_sectionBelongsToGroup', () => {
    it('_sectionBelongsToGroup — section de type rendu dans le groupe — retourne true', async () => {
      ClassGroupSection.findOne.mockResolvedValue({ id: 1, type: 'rendu' })
      expect(await ClassGroupSubmissionService._sectionBelongsToGroup(1, 1)).toBe(true)
    })

    it('_sectionBelongsToGroup — section absente ou mauvais type — retourne false', async () => {
      ClassGroupSection.findOne.mockResolvedValue(null)
      expect(await ClassGroupSubmissionService._sectionBelongsToGroup(1, 99)).toBe(false)
    })
  })

  // ── findBySection ─────────────────────────────────────────────────────────────

  describe('findBySection', () => {
    it('findBySection — non-membre — retourne false', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue(null)

      const result = await ClassGroupSubmissionService.findBySection(1, 1, 2)
      expect(result).toBe(false)
      expect(ClassGroupSubmission.findAll).not.toHaveBeenCalled()
    })

    it('findBySection — enseignant — retourne toutes les soumissions de la section', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne
        .mockResolvedValueOnce(studentMembership) // _isMember
        .mockResolvedValueOnce(teacherMembership) // _isTeacher
      const subs = [{ id: 1, studentId: 2 }, { id: 2, studentId: 3 }]
      ClassGroupSubmission.findAll.mockResolvedValue(subs)

      const result = await ClassGroupSubmissionService.findBySection(1, 1, 2)
      expect(result).toEqual(subs)
      expect(ClassGroupSubmission.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ sectionId: 1, classGroupId: 1 }) })
      )
    })

    it('findBySection — étudiant — ne retourne que ses propres soumissions', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne
        .mockResolvedValueOnce(studentMembership) // _isMember
        .mockResolvedValueOnce(null)              // _isTeacher (non enseignant)
      const subs = [{ id: 1, studentId: 2 }]
      ClassGroupSubmission.findAll.mockResolvedValue(subs)

      const result = await ClassGroupSubmissionService.findBySection(1, 1, 2)
      expect(result).toEqual(subs)
      expect(ClassGroupSubmission.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ sectionId: 1, classGroupId: 1, studentId: 2 }) })
      )
    })
  })

  // ── upsert ────────────────────────────────────────────────────────────────────

  describe('upsert', () => {
    it('upsert — non-membre — retourne false', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue(null)

      const result = await ClassGroupSubmissionService.upsert(1, 1, 2, {})
      expect(result).toBe(false)
    })

    it('upsert — enseignant du groupe — retourne false', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne
        .mockResolvedValueOnce(studentMembership) // _isMember → membre
        .mockResolvedValueOnce(teacherMembership) // _isTeacher → est enseignant

      const result = await ClassGroupSubmissionService.upsert(1, 1, 2, {})
      expect(result).toBe(false)
      expect(ClassGroupSection.findOne).not.toHaveBeenCalled()
    })

    it('upsert — section absente ou pas de type rendu — retourne null', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne
        .mockResolvedValueOnce(studentMembership) // _isMember
        .mockResolvedValueOnce(null)              // _isTeacher (étudiant)
      ClassGroupSection.findOne.mockResolvedValue(null)

      const result = await ClassGroupSubmissionService.upsert(1, 1, 2, {})
      expect(result).toBeNull()
    })

    it('upsert — nouvelle soumission — crée et retourne la soumission', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne
        .mockResolvedValueOnce(studentMembership) // _isMember
        .mockResolvedValueOnce(null)              // _isTeacher (étudiant)
      ClassGroupSection.findOne.mockResolvedValue({ id: 1, type: 'rendu' })
      ClassGroupSubmission.findOne.mockResolvedValue(null) // pas de soumission existante
      const created = { id: 1, sectionId: 1, classGroupId: 1, studentId: 2, url: 'https://example.com' }
      ClassGroupSubmission.create.mockResolvedValue(created)

      const result = await ClassGroupSubmissionService.upsert(1, 1, 2, { url: 'https://example.com' })
      expect(result).toEqual(created)
      expect(ClassGroupSubmission.create).toHaveBeenCalledWith(
        expect.objectContaining({ sectionId: 1, classGroupId: 1, studentId: 2, url: 'https://example.com' })
      )
    })

    it('upsert — soumission existante sans changement de fileKey — met à jour', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne
        .mockResolvedValueOnce(studentMembership) // _isMember
        .mockResolvedValueOnce(null)              // _isTeacher (étudiant)
      ClassGroupSection.findOne.mockResolvedValue({ id: 1, type: 'rendu' })
      const existing = {
        id: 1, fileKey: null,
        update: jest.fn().mockResolvedValue(undefined)
      }
      ClassGroupSubmission.findOne.mockResolvedValue(existing)

      const result = await ClassGroupSubmissionService.upsert(1, 1, 2, { url: 'https://new.com' })
      expect(existing.update).toHaveBeenCalled()
      expect(result).toBe(existing)
    })

    it('upsert — soumission existante avec nouveau fileKey — supprime ancien S3 et met à jour', async () => {
      const { s3Client } = require('../../config/storage.config')
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne
        .mockResolvedValueOnce(studentMembership) // _isMember
        .mockResolvedValueOnce(null)              // _isTeacher (étudiant)
      ClassGroupSection.findOne.mockResolvedValue({ id: 1, type: 'rendu' })
      const existing = {
        id: 1, fileKey: 'uploads/old-file.pdf',
        update: jest.fn().mockResolvedValue(undefined)
      }
      ClassGroupSubmission.findOne.mockResolvedValue(existing)
      s3Client.send.mockResolvedValue({})

      const result = await ClassGroupSubmissionService.upsert(1, 1, 2, { fileKey: 'uploads/new-file.pdf' })
      expect(s3Client.send).toHaveBeenCalled()
      expect(existing.update).toHaveBeenCalled()
      expect(result).toBe(existing)
    })
  })

  // ── delete ────────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('delete — non-membre — retourne false', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue(null)

      const result = await ClassGroupSubmissionService.delete(1, 1, 1, 2)
      expect(result).toBe(false)
    })

    it('delete — soumission introuvable — retourne null', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne.mockResolvedValue(studentMembership)
      ClassGroupSubmission.findOne.mockResolvedValue(null)

      const result = await ClassGroupSubmissionService.delete(1, 1, 99, 2)
      expect(result).toBeNull()
    })

    it('delete — enseignant — peut supprimer la soumission de n\'importe quel étudiant', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne
        .mockResolvedValueOnce(teacherMembership) // _isMember
        .mockResolvedValueOnce(teacherMembership) // _isTeacher
      const sub = { id: 1, studentId: 3, fileKey: null, destroy: jest.fn().mockResolvedValue(undefined) }
      ClassGroupSubmission.findOne.mockResolvedValue(sub)

      const result = await ClassGroupSubmissionService.delete(1, 1, 1, 2)
      expect(sub.destroy).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('delete — étudiant supprime sa propre soumission — retourne true', async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne
        .mockResolvedValueOnce(studentMembership) // _isMember
        .mockResolvedValueOnce(null)              // _isTeacher
      const sub = { id: 1, studentId: 2, fileKey: null, destroy: jest.fn().mockResolvedValue(undefined) }
      ClassGroupSubmission.findOne.mockResolvedValue(sub)

      const result = await ClassGroupSubmissionService.delete(1, 1, 1, 2)
      expect(sub.destroy).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it("delete — étudiant tente de supprimer la soumission d'un autre — retourne false", async () => {
      User.findByPk.mockResolvedValue(studentUser)
      ClassGroupUsers.findOne
        .mockResolvedValueOnce(studentMembership) // _isMember
        .mockResolvedValueOnce(null)              // _isTeacher
      const sub = { id: 1, studentId: 3, fileKey: null, destroy: jest.fn() } // studentId différent
      ClassGroupSubmission.findOne.mockResolvedValue(sub)

      const result = await ClassGroupSubmissionService.delete(1, 1, 1, 2)
      expect(sub.destroy).not.toHaveBeenCalled()
      expect(result).toBe(false)
    })
  })
})

const { KpiConsent, ClassGroupUsers, User, ClassGroup, Subject } = require('../../models/index')
const KpiConsentService = require('../../services/KpiConsent.service')

jest.mock('../../models/index', () => ({
  KpiConsent: {
    findOrCreate: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    destroy: jest.fn()
  },
  ClassGroupUsers: {
    findOne: jest.fn()
  },
  User: {
    findByPk: jest.fn()
  },
  ClassGroup: {},
  Subject: {}
}))

jest.mock('../../services/Kpi.service', () => ({
  getMyKpis: jest.fn(),
  getPersonalKpisForSubjects: jest.fn()
}))

jest.mock('../../helpers/logger', () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }))

const KpiService = require('../../services/Kpi.service')

describe('KpiConsentService', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── _isTeacherInGroup ─────────────────────────────────────────────────────────

  describe('_isTeacherInGroup', () => {
    it('enseignant du groupe — retourne true', async () => {
      ClassGroupUsers.findOne.mockResolvedValue({ role: 'teacher' })
      expect(await KpiConsentService._isTeacherInGroup(1, 3)).toBe(true)
    })

    it('non enseignant (étudiant du groupe) — retourne false', async () => {
      ClassGroupUsers.findOne.mockResolvedValue(null)
      expect(await KpiConsentService._isTeacherInGroup(1, 2)).toBe(false)
    })

    it('admin global non membre du groupe — retourne false', async () => {
      ClassGroupUsers.findOne.mockResolvedValue(null)
      expect(await KpiConsentService._isTeacherInGroup(1, 1)).toBe(false)
      expect(User.findByPk).not.toHaveBeenCalled()
    })
  })

  // ── _isStudentInGroup ─────────────────────────────────────────────────────────

  describe('_isStudentInGroup', () => {
    it('étudiant du groupe — retourne true', async () => {
      ClassGroupUsers.findOne.mockResolvedValue({ userId: 2, role: 'student' })
      expect(await KpiConsentService._isStudentInGroup(1, 2)).toBe(true)
    })

    it('non membre — retourne false', async () => {
      ClassGroupUsers.findOne.mockResolvedValue(null)
      expect(await KpiConsentService._isStudentInGroup(1, 2)).toBe(false)
    })
  })

  // ── grantConsent ──────────────────────────────────────────────────────────────

  describe('grantConsent', () => {
    it('consentement global (sans sujet) — crée et retourne le consentement', async () => {
      ClassGroupUsers.findOne
        .mockResolvedValueOnce({ role: 'student' })
        .mockResolvedValueOnce({ role: 'teacher' })
      const mockConsent = { id: 1, studentId: 2, teacherId: 3, classGroupId: 1, subjectId: null }
      KpiConsent.findOrCreate.mockResolvedValue([mockConsent, true])

      const result = await KpiConsentService.grantConsent(2, 3, 1, null)
      expect(result).toEqual(mockConsent)
      expect(KpiConsent.findOrCreate).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ subjectId: null }) }))
    })

    it('consentement par matière (subjectId renseigné) — crée et retourne', async () => {
      ClassGroupUsers.findOne
        .mockResolvedValueOnce({ role: 'student' })
        .mockResolvedValueOnce({ role: 'teacher' })
      const mockConsent = { id: 2, studentId: 2, teacherId: 3, classGroupId: 1, subjectId: 5 }
      KpiConsent.findOrCreate.mockResolvedValue([mockConsent, true])

      const result = await KpiConsentService.grantConsent(2, 3, 1, 5)
      expect(result).toEqual(mockConsent)
      expect(KpiConsent.findOrCreate).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ subjectId: 5 }) }))
    })

    it('consentement déjà existant — retourne le consentement existant (idempotent)', async () => {
      ClassGroupUsers.findOne
        .mockResolvedValueOnce({ role: 'student' })
        .mockResolvedValueOnce({ role: 'teacher' })
      const mockConsent = { id: 1, studentId: 2, teacherId: 3, classGroupId: 1, subjectId: null }
      KpiConsent.findOrCreate.mockResolvedValue([mockConsent, false])

      const result = await KpiConsentService.grantConsent(2, 3, 1)
      expect(result).toEqual(mockConsent)
    })

    it('studentId non étudiant dans ce groupe — retourne not_student', async () => {
      ClassGroupUsers.findOne.mockResolvedValueOnce(null)

      const result = await KpiConsentService.grantConsent(2, 3, 1)
      expect(result).toBe('not_student')
      expect(KpiConsent.findOrCreate).not.toHaveBeenCalled()
    })

    it('teacherId non enseignant dans ce groupe — retourne not_teacher', async () => {
      ClassGroupUsers.findOne
        .mockResolvedValueOnce({ role: 'student' })
        .mockResolvedValueOnce(null)

      const result = await KpiConsentService.grantConsent(2, 99, 1)
      expect(result).toBe('not_teacher')
      expect(KpiConsent.findOrCreate).not.toHaveBeenCalled()
    })
  })

  // ── revokeConsent ─────────────────────────────────────────────────────────────

  describe('revokeConsent', () => {
    it('révocation globale (sans subjectId) — supprime tous les consentements pour ce couple', async () => {
      KpiConsent.destroy.mockResolvedValue(2)

      const result = await KpiConsentService.revokeConsent(2, 3, 1, null)
      expect(KpiConsent.destroy).toHaveBeenCalledWith({ where: { studentId: 2, teacherId: 3, classGroupId: 1 } })
      expect(result).toBe(true)
    })

    it('révocation globale — aucun consentement existant — retourne null', async () => {
      KpiConsent.destroy.mockResolvedValue(0)

      const result = await KpiConsentService.revokeConsent(2, 3, 1, null)
      expect(result).toBeNull()
    })

    it('révocation par matière (subjectId renseigné) — supprime le consentement spécifique', async () => {
      const mockConsent = { id: 2, destroy: jest.fn().mockResolvedValue(undefined) }
      KpiConsent.findOne.mockResolvedValue(mockConsent)

      const result = await KpiConsentService.revokeConsent(2, 3, 1, 5)
      expect(KpiConsent.findOne).toHaveBeenCalledWith({ where: { studentId: 2, teacherId: 3, classGroupId: 1, subjectId: 5 } })
      expect(mockConsent.destroy).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('révocation par matière — consentement introuvable — retourne null', async () => {
      KpiConsent.findOne.mockResolvedValue(null)

      const result = await KpiConsentService.revokeConsent(2, 3, 1, 5)
      expect(result).toBeNull()
    })
  })

  // ── getMyConsents ─────────────────────────────────────────────────────────────

  describe('getMyConsents', () => {
    it('retourne la liste des consentements avec enseignant, groupe et matière', async () => {
      const consents = [
        { id: 1, studentId: 2, teacher: { userId: 3, name: 'Prof Martin' }, subject: { subjectId: 5, name: 'Physique' } },
        { id: 2, studentId: 2, teacher: { userId: 3, name: 'Prof Martin' }, subject: null }
      ]
      KpiConsent.findAll.mockResolvedValue(consents)

      const result = await KpiConsentService.getMyConsents(2)
      expect(result).toEqual(consents)
      expect(KpiConsent.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { studentId: 2 } }))
    })

    it('aucun consentement — retourne tableau vide', async () => {
      KpiConsent.findAll.mockResolvedValue([])
      const result = await KpiConsentService.getMyConsents(2)
      expect(result).toEqual([])
    })
  })

  // ── getStudentKpis ────────────────────────────────────────────────────────────

  describe('getStudentKpis', () => {
    it('consentement global (subjectId null) — retourne tous les KPI via getMyKpis', async () => {
      ClassGroupUsers.findOne.mockResolvedValue({ role: 'teacher' })
      KpiConsent.findAll.mockResolvedValue([{ id: 1, subjectId: null }])
      const mockKpis = { revision: {}, exercises: {}, leitner: {} }
      KpiService.getMyKpis.mockResolvedValue(mockKpis)

      const result = await KpiConsentService.getStudentKpis(3, 2, 1)
      expect(KpiService.getMyKpis).toHaveBeenCalledWith(2)
      expect(KpiService.getPersonalKpisForSubjects).not.toHaveBeenCalled()
      expect(result).toEqual(mockKpis)
    })

    it('consentements filtrés par matières — retourne KPI filtrés via getPersonalKpisForSubjects', async () => {
      ClassGroupUsers.findOne.mockResolvedValue({ role: 'teacher' })
      KpiConsent.findAll.mockResolvedValue([{ id: 2, subjectId: 5 }, { id: 3, subjectId: 7 }])
      const mockKpis = { exercises: {}, leitner: {} }
      KpiService.getPersonalKpisForSubjects.mockResolvedValue(mockKpis)

      const result = await KpiConsentService.getStudentKpis(3, 2, 1)
      expect(KpiService.getPersonalKpisForSubjects).toHaveBeenCalledWith(2, [5, 7])
      expect(KpiService.getMyKpis).not.toHaveBeenCalled()
      expect(result).toEqual(mockKpis)
    })

    it('un consentement global parmi des consentements par matière — retourne tous les KPI', async () => {
      ClassGroupUsers.findOne.mockResolvedValue({ role: 'teacher' })
      KpiConsent.findAll.mockResolvedValue([{ id: 1, subjectId: null }, { id: 2, subjectId: 5 }])
      KpiService.getMyKpis.mockResolvedValue({ revision: {} })

      await KpiConsentService.getStudentKpis(3, 2, 1)
      expect(KpiService.getMyKpis).toHaveBeenCalledWith(2)
      expect(KpiService.getPersonalKpisForSubjects).not.toHaveBeenCalled()
    })

    it('non enseignant du groupe — retourne not_teacher', async () => {
      ClassGroupUsers.findOne.mockResolvedValue(null)

      const result = await KpiConsentService.getStudentKpis(99, 2, 1)
      expect(result).toBe('not_teacher')
      expect(KpiService.getMyKpis).not.toHaveBeenCalled()
    })

    it('admin non membre du groupe — retourne not_teacher', async () => {
      ClassGroupUsers.findOne.mockResolvedValue(null)

      const result = await KpiConsentService.getStudentKpis(1, 2, 1)
      expect(result).toBe('not_teacher')
    })

    it('enseignant du groupe sans aucun consentement — retourne no_consent', async () => {
      ClassGroupUsers.findOne.mockResolvedValue({ role: 'teacher' })
      KpiConsent.findAll.mockResolvedValue([])

      const result = await KpiConsentService.getStudentKpis(3, 2, 1)
      expect(result).toBe('no_consent')
      expect(KpiService.getMyKpis).not.toHaveBeenCalled()
    })
  })
})

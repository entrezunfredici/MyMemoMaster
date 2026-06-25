const { ClassGroup, ClassGroupUsers, User, Invitation, TestResult, RevisionSession, Deadline } = require('../../models/index')
const ClassGroupService = require('../../services/ClassGroup.service')

jest.mock('../../models/index', () => ({
  ClassGroup: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn()
  },
  ClassGroupUsers: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findOrCreate: jest.fn(),
    count: jest.fn()
  },
  User: {
    findByPk: jest.fn(),
    findAll: jest.fn()
  },
  Invitation: {
    count: jest.fn()
  },
  TestResult: {
    findAll: jest.fn()
  },
  RevisionSession: {
    findAll: jest.fn()
  },
  Deadline: {
    findAll: jest.fn()
  }
}))

// Date fixe pour les tests de décrochage : 2026-06-25
const FIXED_NOW = new Date('2026-06-25T12:00:00.000Z')

const adminUser    = { roleId: 1 }
const studentUser  = { roleId: 2 }
const teacherUser  = { roleId: 3 }
const mockGroup    = { id: 1, name: 'Terminale S1', update: jest.fn(), destroy: jest.fn() }

describe('ClassGroupService', () => {
  beforeEach(() => jest.clearAllMocks())

  beforeAll(() => {
    jest.useFakeTimers()
    jest.setSystemTime(FIXED_NOW)
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  // ── findAll ──────────────────────────────────────────────────────────────────

  it('findAll — admin — retourne tous les groupes', async () => {
    User.findByPk.mockResolvedValue(adminUser)
    ClassGroup.findAll.mockResolvedValue([mockGroup])

    const result = await ClassGroupService.findAll(1)

    expect(result).toHaveLength(1)
    expect(ClassGroup.findAll).toHaveBeenCalledWith(expect.objectContaining({ include: expect.any(Array) }))
  })

  it('findAll — non-admin sans groupes — retourne []', async () => {
    User.findByPk.mockResolvedValue(studentUser)
    ClassGroupUsers.findAll.mockResolvedValue([])

    const result = await ClassGroupService.findAll(2)

    expect(result).toEqual([])
    expect(ClassGroup.findAll).not.toHaveBeenCalled()
  })

  it('findAll — membre — filtre par ses groupes', async () => {
    User.findByPk.mockResolvedValue(studentUser)
    ClassGroupUsers.findAll.mockResolvedValue([{ classGroupId: 1 }])
    ClassGroup.findAll.mockResolvedValue([mockGroup])

    const result = await ClassGroupService.findAll(2)

    expect(result).toHaveLength(1)
    expect(ClassGroup.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: [1] } })
    )
  })

  // ── findOne ───────────────────────────────────────────────────────────────────

  it('findOne — retourne le groupe avec ses membres', async () => {
    ClassGroup.findByPk.mockResolvedValue(mockGroup)

    const result = await ClassGroupService.findOne(1)

    expect(ClassGroup.findByPk).toHaveBeenCalledWith(1, expect.objectContaining({ include: expect.any(Array) }))
    expect(result).toBe(mockGroup)
  })

  it('findOne — groupe inexistant — retourne null', async () => {
    ClassGroup.findByPk.mockResolvedValue(null)
    const result = await ClassGroupService.findOne(99)
    expect(result).toBeNull()
  })

  // ── create ────────────────────────────────────────────────────────────────────

  it('create — admin — crée le groupe', async () => {
    User.findByPk.mockResolvedValue(adminUser)
    ClassGroup.create.mockResolvedValue(mockGroup)

    const result = await ClassGroupService.create(1, { name: 'Terminale S1' })

    expect(ClassGroup.create).toHaveBeenCalledWith({ name: 'Terminale S1', createdBy: 1 })
    expect(result).toBe(mockGroup)
  })

  it('create — non-admin — retourne false', async () => {
    User.findByPk.mockResolvedValue(studentUser)

    const result = await ClassGroupService.create(2, { name: 'Test' })

    expect(result).toBe(false)
    expect(ClassGroup.create).not.toHaveBeenCalled()
  })

  // ── update ────────────────────────────────────────────────────────────────────

  it('update — admin — met à jour le groupe', async () => {
    User.findByPk.mockResolvedValue(adminUser)
    ClassGroup.findByPk.mockResolvedValue(mockGroup)
    mockGroup.update.mockResolvedValue(mockGroup)

    const result = await ClassGroupService.update(1, 1, { name: 'Nouveau nom' })

    expect(mockGroup.update).toHaveBeenCalledWith({ name: 'Nouveau nom' })
    expect(result).toBe(mockGroup)
  })

  it('update — groupe inexistant — retourne null', async () => {
    User.findByPk.mockResolvedValue(adminUser)
    ClassGroup.findByPk.mockResolvedValue(null)

    const result = await ClassGroupService.update(99, 1, { name: 'X' })

    expect(result).toBeNull()
  })

  it('update — non-admin — retourne false', async () => {
    User.findByPk.mockResolvedValue(studentUser)

    const result = await ClassGroupService.update(1, 2, { name: 'X' })

    expect(result).toBe(false)
    expect(ClassGroup.findByPk).not.toHaveBeenCalled()
  })

  // ── delete ────────────────────────────────────────────────────────────────────

  it('delete — admin — supprime le groupe', async () => {
    User.findByPk.mockResolvedValue(adminUser)
    ClassGroup.findByPk.mockResolvedValue(mockGroup)
    mockGroup.destroy.mockResolvedValue()

    const result = await ClassGroupService.delete(1, 1)

    expect(mockGroup.destroy).toHaveBeenCalled()
    expect(result).toBe(true)
  })

  it('delete — groupe inexistant — retourne null', async () => {
    User.findByPk.mockResolvedValue(adminUser)
    ClassGroup.findByPk.mockResolvedValue(null)

    const result = await ClassGroupService.delete(99, 1)

    expect(result).toBeNull()
  })

  it('delete — non-admin — retourne false', async () => {
    User.findByPk.mockResolvedValue(studentUser)

    const result = await ClassGroupService.delete(1, 2)

    expect(result).toBe(false)
  })

  // ── addMember ─────────────────────────────────────────────────────────────────

  it('addMember — admin — ajoute le membre', async () => {
    User.findByPk.mockResolvedValue(adminUser)
    ClassGroup.findByPk.mockResolvedValue(mockGroup)
    const mockMembership = { classGroupId: 1, userId: 5, role: 'student', update: jest.fn() }
    ClassGroupUsers.findOrCreate.mockResolvedValue([mockMembership, true])

    const result = await ClassGroupService.addMember(1, 1, { userId: 5, role: 'student' })

    expect(ClassGroupUsers.findOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { classGroupId: 1, userId: 5 }, defaults: { role: 'student' } })
    )
    expect(result).toBe(mockMembership)
  })

  it('addMember — non-admin (enseignant, roleId 3) — retourne false', async () => {
    User.findByPk.mockResolvedValue(teacherUser)

    const result = await ClassGroupService.addMember(1, 2, { userId: 5, role: 'student' })

    expect(result).toBe(false)
  })

  it('addMember — groupe inexistant — retourne null', async () => {
    User.findByPk.mockResolvedValue(adminUser)
    ClassGroup.findByPk.mockResolvedValue(null)

    const result = await ClassGroupService.addMember(99, 1, { userId: 5, role: 'student' })

    expect(result).toBeNull()
  })

  // ── removeMember ──────────────────────────────────────────────────────────────

  it('removeMember — admin — retire le membre', async () => {
    User.findByPk.mockResolvedValue(adminUser)
    const mockMembership = { destroy: jest.fn().mockResolvedValue() }
    ClassGroupUsers.findOne.mockResolvedValue(mockMembership)

    const result = await ClassGroupService.removeMember(1, 5, 1)

    expect(mockMembership.destroy).toHaveBeenCalled()
    expect(result).toBe(true)
  })

  it('removeMember — membre introuvable — retourne null', async () => {
    User.findByPk.mockResolvedValue(adminUser)
    ClassGroupUsers.findOne.mockResolvedValue(null)

    const result = await ClassGroupService.removeMember(1, 99, 1)

    expect(result).toBeNull()
  })

  // ── getKpi ────────────────────────────────────────────────────────────────────

  it('getKpi — admin — retourne les KPI calculés', async () => {
    User.findByPk.mockResolvedValue(adminUser)
    ClassGroup.findByPk.mockResolvedValue(mockGroup)
    ClassGroupUsers.findAll.mockResolvedValue([
      { role: 'teacher', userId: 1 },
      { role: 'student', userId: 2 },
      { role: 'student', userId: 3 }
    ])
    TestResult.findAll.mockResolvedValue([
      { score: 8, total: 10 },
      { score: 6, total: 10 }
    ])
    Invitation.count.mockResolvedValue(2)

    const kpi = await ClassGroupService.getKpi(1, 1)

    expect(kpi.memberCount).toBe(3)
    expect(kpi.studentCount).toBe(2)
    expect(kpi.teacherCount).toBe(1)
    expect(kpi.pendingInvitations).toBe(2)
    expect(kpi.avgScore).toBe(70)
  })

  it('getKpi — aucun résultat de test — avgScore null', async () => {
    User.findByPk.mockResolvedValue(adminUser)
    ClassGroup.findByPk.mockResolvedValue(mockGroup)
    ClassGroupUsers.findAll.mockResolvedValue([{ role: 'student', userId: 2 }])
    TestResult.findAll.mockResolvedValue([])
    Invitation.count.mockResolvedValue(0)

    const kpi = await ClassGroupService.getKpi(1, 1)

    expect(kpi.avgScore).toBeNull()
  })

  it('getKpi — groupe inexistant — retourne null', async () => {
    User.findByPk.mockResolvedValue(adminUser)
    ClassGroup.findByPk.mockResolvedValue(null)

    const result = await ClassGroupService.getKpi(99, 1)

    expect(result).toBeNull()
  })

  it('getKpi — non-admin non-enseignant — retourne false', async () => {
    User.findByPk.mockResolvedValue(studentUser)
    ClassGroupUsers.findOne.mockResolvedValue(null)

    const result = await ClassGroupService.getKpi(1, 2)

    expect(result).toBe(false)
  })

  // ── getStudentAnalytics ───────────────────────────────────────────────────────

  it('getStudentAnalytics — admin — retourne structure complète avec 2 étudiants', async () => {
    User.findByPk.mockResolvedValue(adminUser)
    ClassGroup.findByPk.mockResolvedValue(mockGroup)
    ClassGroupUsers.findAll.mockResolvedValue([
      { classGroupId: 1, userId: 1, role: 'teacher' },
      { classGroupId: 1, userId: 2, role: 'student' },
      { classGroupId: 1, userId: 3, role: 'student' }
    ])
    Deadline.findAll.mockResolvedValue([{ testId: 10 }])
    User.findAll.mockResolvedValue([
      { userId: 2, name: 'Alice', email: 'alice@test.com' },
      { userId: 3, name: 'Bob', email: 'bob@test.com' }
    ])
    RevisionSession.findAll.mockResolvedValue([
      { userId: 2, date: '2026-06-23' },
      { userId: 3, date: '2026-06-10' }
    ])
    TestResult.findAll.mockResolvedValue([
      { userId: 2, testId: 10, score: 8, total: 10, completedAt: new Date('2026-06-20') },
      { userId: 3, testId: 10, score: 5, total: 10, completedAt: new Date('2026-06-05') }
    ])

    const result = await ClassGroupService.getStudentAnalytics(1, 1)

    expect(result).toHaveProperty('students')
    expect(result.students).toHaveLength(2)
    expect(result).toHaveProperty('activeStudentsCount')
    expect(result).toHaveProperty('atRiskCount')
    expect(result.scoreWeeklyTrend).toHaveLength(4)
    const alice = result.students.find((s) => s.userId === 2)
    expect(alice.name).toBe('Alice')
    expect(alice.avgScore).toBe(80)
    expect(alice.atRisk).toBe(false)
  })

  it('getStudentAnalytics — étudiant inactif > 7j — atRisk = true avec raison inactivité', async () => {
    User.findByPk.mockResolvedValue(adminUser)
    ClassGroup.findByPk.mockResolvedValue(mockGroup)
    ClassGroupUsers.findAll.mockResolvedValue([
      { classGroupId: 1, userId: 1, role: 'teacher' },
      { classGroupId: 1, userId: 2, role: 'student' }
    ])
    Deadline.findAll.mockResolvedValue([])
    User.findAll.mockResolvedValue([{ userId: 2, name: 'Alice', email: 'alice@test.com' }])
    // Dernière session il y a 15 jours (NOW fixe = 2026-06-25)
    RevisionSession.findAll.mockResolvedValue([{ userId: 2, date: '2026-06-10' }])

    const result = await ClassGroupService.getStudentAnalytics(1, 1)

    const student = result.students[0]
    expect(student.daysInactive).toBe(15)
    expect(student.atRisk).toBe(true)
    expect(student.atRiskReasons.some((r) => r.includes('Inactif depuis'))).toBe(true)
  })

  it('getStudentAnalytics — aucune session — atRisk = true avec raison "Aucune session"', async () => {
    User.findByPk.mockResolvedValue(adminUser)
    ClassGroup.findByPk.mockResolvedValue(mockGroup)
    ClassGroupUsers.findAll.mockResolvedValue([
      { classGroupId: 1, userId: 1, role: 'teacher' },
      { classGroupId: 1, userId: 2, role: 'student' }
    ])
    Deadline.findAll.mockResolvedValue([])
    User.findAll.mockResolvedValue([{ userId: 2, name: 'Alice', email: 'alice@test.com' }])
    RevisionSession.findAll.mockResolvedValue([])

    const result = await ClassGroupService.getStudentAnalytics(1, 1)

    const student = result.students[0]
    expect(student.lastActivityAt).toBeNull()
    expect(student.atRisk).toBe(true)
    expect(student.atRiskReasons[0]).toMatch(/Aucune session/)
  })

  it('getStudentAnalytics — baisse de score > 20% — atRisk = true avec raison baisse', async () => {
    User.findByPk.mockResolvedValue(adminUser)
    ClassGroup.findByPk.mockResolvedValue(mockGroup)
    ClassGroupUsers.findAll.mockResolvedValue([
      { classGroupId: 1, userId: 1, role: 'teacher' },
      { classGroupId: 1, userId: 2, role: 'student' }
    ])
    Deadline.findAll.mockResolvedValue([{ testId: 10 }])
    User.findAll.mockResolvedValue([{ userId: 2, name: 'Alice', email: 'alice@test.com' }])
    RevisionSession.findAll.mockResolvedValue([{ userId: 2, date: '2026-06-24' }])
    // Score : 80 % → 56 % (baisse de 30%)
    TestResult.findAll.mockResolvedValue([
      { userId: 2, testId: 10, score: 8, total: 10, completedAt: new Date('2026-06-15') },
      { userId: 2, testId: 10, score: 5.6, total: 10, completedAt: new Date('2026-06-22') }
    ])

    const result = await ClassGroupService.getStudentAnalytics(1, 1)

    const student = result.students[0]
    expect(student.atRisk).toBe(true)
    expect(student.atRiskReasons.some((r) => r.includes('Baisse de score'))).toBe(true)
  })

  it('getStudentAnalytics — aucun test enseignant assigné — avgScore null et résultats vides', async () => {
    User.findByPk.mockResolvedValue(adminUser)
    ClassGroup.findByPk.mockResolvedValue(mockGroup)
    ClassGroupUsers.findAll.mockResolvedValue([
      { classGroupId: 1, userId: 1, role: 'teacher' },
      { classGroupId: 1, userId: 2, role: 'student' }
    ])
    // Pas de deadline avec testId → teacherTestIds vide → TestResult non appelé
    Deadline.findAll.mockResolvedValue([])
    User.findAll.mockResolvedValue([{ userId: 2, name: 'Alice', email: 'alice@test.com' }])
    RevisionSession.findAll.mockResolvedValue([{ userId: 2, date: '2026-06-24' }])

    const result = await ClassGroupService.getStudentAnalytics(1, 1)

    expect(TestResult.findAll).not.toHaveBeenCalled()
    const student = result.students[0]
    expect(student.avgScore).toBeNull()
    expect(student.scoreTrend).toHaveLength(0)
  })

  it('getStudentAnalytics — non autorisé (étudiant non enseignant) — retourne false', async () => {
    User.findByPk.mockResolvedValue(studentUser)
    ClassGroupUsers.findOne.mockResolvedValue(null)

    const result = await ClassGroupService.getStudentAnalytics(1, 2)

    expect(result).toBe(false)
  })

  it('getStudentAnalytics — groupe inexistant — retourne null', async () => {
    User.findByPk.mockResolvedValue(adminUser)
    ClassGroup.findByPk.mockResolvedValue(null)

    const result = await ClassGroupService.getStudentAnalytics(99, 1)

    expect(result).toBeNull()
  })
})

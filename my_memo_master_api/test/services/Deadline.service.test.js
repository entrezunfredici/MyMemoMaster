jest.mock('../../models/index', () => ({
  Deadline: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn()
  },
  EventOccurrence: { findByPk: jest.fn() },
  CalendarEvent: {},
  ClassGroupUsers: {
    findAll: jest.fn(),
    findOne: jest.fn()
  },
  Test: {}
}))

jest.mock('../../helpers/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }))

const models = require('../../models/index')
const DeadlineService = require('../../services/Deadline.service')

const makeDeadline = (overrides = {}) => ({
  id: 1,
  name: 'DM Maths',
  type: 'homework',
  dueDate: '2026-07-20',
  dueTime: '23:59',
  createdBy: 1,
  update: jest.fn().mockResolvedValue(true),
  destroy: jest.fn().mockResolvedValue(true),
  ...overrides
})

const makeOccurrence = (overrides = {}) => ({
  id: 5,
  date: '2026-07-15',
  calendarEvent: { classGroupId: 10 },
  ...overrides
})

describe('DeadlineService', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── findAll ──────────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it("retourne les échéances des groupes de l'utilisateur", async () => {
      models.ClassGroupUsers.findAll.mockResolvedValue([
        { classGroupId: 10 },
        { classGroupId: 20 }
      ])
      models.Deadline.findAll.mockResolvedValue([makeDeadline()])

      const result = await DeadlineService.findAll(1)

      expect(models.ClassGroupUsers.findAll).toHaveBeenCalledWith({ where: { userId: 1 } })
      expect(models.Deadline.findAll).toHaveBeenCalled()
      expect(result).toHaveLength(1)
    })

    it("retourne [] si l'utilisateur n'appartient à aucun groupe", async () => {
      models.ClassGroupUsers.findAll.mockResolvedValue([])

      const result = await DeadlineService.findAll(1)

      expect(models.Deadline.findAll).not.toHaveBeenCalled()
      expect(result).toEqual([])
    })
  })

  // ── findOne ──────────────────────────────────────────────────────────────────
  describe('findOne', () => {
    it('retourne la deadline avec ses associations si trouvée', async () => {
      models.Deadline.findByPk.mockResolvedValue(makeDeadline())

      const result = await DeadlineService.findOne(1)

      expect(models.Deadline.findByPk).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ include: expect.any(Array) })
      )
      expect(result.id).toBe(1)
    })

    it('retourne null si introuvable', async () => {
      models.Deadline.findByPk.mockResolvedValue(null)

      const result = await DeadlineService.findOne(99)

      expect(result).toBeNull()
    })
  })

  // ── create ───────────────────────────────────────────────────────────────────
  describe('create', () => {
    it("crée la deadline si l'utilisateur est enseignant dans le groupe de l'occurrence", async () => {
      models.EventOccurrence.findByPk.mockResolvedValue(makeOccurrence())
      models.ClassGroupUsers.findOne.mockResolvedValue({ classGroupId: 10, userId: 1, role: 'teacher' })
      models.Deadline.create.mockResolvedValue(makeDeadline())

      const result = await DeadlineService.create(1, {
        name: 'DM Maths',
        occurrenceId: 5,
        dueDate: '2026-07-20'
      })

      expect(models.Deadline.create).toHaveBeenCalledWith(
        expect.objectContaining({ createdBy: 1, name: 'DM Maths' })
      )
      expect(result.name).toBe('DM Maths')
    })

    it("retourne false si l'utilisateur n'est pas enseignant dans le groupe", async () => {
      models.EventOccurrence.findByPk.mockResolvedValue(makeOccurrence())
      models.ClassGroupUsers.findOne.mockResolvedValue(null)

      const result = await DeadlineService.create(2, {
        name: 'DM Maths',
        occurrenceId: 5,
        dueDate: '2026-07-20'
      })

      expect(models.Deadline.create).not.toHaveBeenCalled()
      expect(result).toBe(false)
    })

    it("retourne false si l'occurrence est introuvable", async () => {
      models.EventOccurrence.findByPk.mockResolvedValue(null)

      const result = await DeadlineService.create(1, {
        name: 'DM Maths',
        occurrenceId: 999,
        dueDate: '2026-07-20'
      })

      expect(models.Deadline.create).not.toHaveBeenCalled()
      expect(result).toBe(false)
    })
  })

  // ── update ───────────────────────────────────────────────────────────────────
  describe('update', () => {
    it("met à jour la deadline et retourne l'objet mis à jour", async () => {
      const dl = makeDeadline()
      // Premier appel : findByPk sans includes (dans update)
      // Deuxième appel : findByPk avec includes (dans findOne appelé à la fin)
      models.Deadline.findByPk.mockResolvedValueOnce(dl).mockResolvedValueOnce(makeDeadline({ name: 'DM Physique' }))

      const result = await DeadlineService.update(1, 1, { name: 'DM Physique' })

      expect(dl.update).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'DM Physique' })
      )
      expect(result).toBeTruthy()
    })

    it('retourne null si la deadline est introuvable', async () => {
      models.Deadline.findByPk.mockResolvedValue(null)

      const result = await DeadlineService.update(99, 1, { name: 'X' })

      expect(result).toBeNull()
    })

    it("retourne false si l'utilisateur n'est pas le créateur", async () => {
      models.Deadline.findByPk.mockResolvedValue(makeDeadline({ createdBy: 2 }))

      const result = await DeadlineService.update(1, 1, { name: 'X' })

      expect(result).toBe(false)
    })
  })

  // ── findByTest ───────────────────────────────────────────────────────────────
  describe('findByTest', () => {
    it("retourne les échéances liées à un test pour les groupes de l'utilisateur", async () => {
      models.ClassGroupUsers.findAll.mockResolvedValue([{ classGroupId: 10 }])
      models.Deadline.findAll.mockResolvedValue([makeDeadline()])

      const result = await DeadlineService.findByTest(42, 1)

      expect(models.ClassGroupUsers.findAll).toHaveBeenCalledWith({ where: { userId: 1 } })
      expect(models.Deadline.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { testId: 42 } })
      )
      expect(result).toHaveLength(1)
    })

    it("retourne [] si l'utilisateur n'appartient à aucun groupe", async () => {
      models.ClassGroupUsers.findAll.mockResolvedValue([])

      const result = await DeadlineService.findByTest(42, 1)

      expect(models.Deadline.findAll).not.toHaveBeenCalled()
      expect(result).toEqual([])
    })

    it('retourne [] si aucune échéance liée au test', async () => {
      models.ClassGroupUsers.findAll.mockResolvedValue([{ classGroupId: 10 }])
      models.Deadline.findAll.mockResolvedValue([])

      const result = await DeadlineService.findByTest(99, 1)

      expect(result).toEqual([])
    })
  })

  // ── delete ───────────────────────────────────────────────────────────────────
  describe('delete', () => {
    it("supprime la deadline si l'utilisateur en est le créateur", async () => {
      const dl = makeDeadline()
      models.Deadline.findByPk.mockResolvedValue(dl)

      const result = await DeadlineService.delete(1, 1)

      expect(dl.destroy).toHaveBeenCalledTimes(1)
      expect(result).toBe(true)
    })

    it('retourne null si la deadline est introuvable', async () => {
      models.Deadline.findByPk.mockResolvedValue(null)

      const result = await DeadlineService.delete(99, 1)

      expect(result).toBeNull()
    })

    it("retourne false si l'utilisateur n'est pas le créateur", async () => {
      models.Deadline.findByPk.mockResolvedValue(makeDeadline({ createdBy: 2 }))

      const result = await DeadlineService.delete(1, 1)

      expect(result).toBe(false)
    })
  })
})

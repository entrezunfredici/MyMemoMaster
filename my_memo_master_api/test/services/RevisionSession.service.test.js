jest.mock('../../models/index', () => ({
  instance: { sync: jest.fn() },
  User: {},
  LeitnerSystem: {},
  Test: {},
  RevisionSession: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  }
}))

jest.mock('../../helpers/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }))

const dayjs = require('dayjs')
const models = require('../../models/index')
const RevisionSessionService = require('../../services/RevisionSession.service')

const TODAY = dayjs().format('YYYY-MM-DD')

const mockSession = {
  id: 1,
  name: 'Révision maths',
  date: TODAY,
  startTime: '09:00',
  endTime: '11:00',
  userId: 1,
  update: jest.fn(),
  destroy: jest.fn(),
  reload: jest.fn().mockResolvedValue({ id: 1, name: 'Révision maths', leitnerSystem: null, test: null })
}

describe('RevisionSession Service', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── findAll ───────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it("retourne les séances de l'utilisateur triées par date", async () => {
      models.RevisionSession.findAll.mockResolvedValue([mockSession])

      const result = await RevisionSessionService.findAll(1)

      expect(models.RevisionSession.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 1 } })
      )
      expect(result).toHaveLength(1)
    })

    it('retourne une liste vide si aucune séance', async () => {
      models.RevisionSession.findAll.mockResolvedValue([])

      const result = await RevisionSessionService.findAll(1)

      expect(result).toEqual([])
    })
  })

  // ── findToday ─────────────────────────────────────────────────────────────
  describe('findToday', () => {
    it('retourne uniquement les séances du jour', async () => {
      models.RevisionSession.findAll.mockResolvedValue([mockSession])

      const result = await RevisionSessionService.findToday(1)

      expect(models.RevisionSession.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 1, date: TODAY })
        })
      )
      expect(result).toHaveLength(1)
    })

    it("retourne une liste vide si aucune séance aujourd'hui", async () => {
      models.RevisionSession.findAll.mockResolvedValue([])

      const result = await RevisionSessionService.findToday(1)

      expect(result).toEqual([])
    })
  })

  // ── findOne ───────────────────────────────────────────────────────────────
  describe('findOne', () => {
    it("retourne la séance si elle appartient à l'utilisateur", async () => {
      models.RevisionSession.findOne.mockResolvedValue(mockSession)

      const result = await RevisionSessionService.findOne(1, 1)

      expect(models.RevisionSession.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1, userId: 1 } })
      )
      expect(result).toEqual(mockSession)
    })

    it("retourne null si la séance n'appartient pas à l'utilisateur", async () => {
      models.RevisionSession.findOne.mockResolvedValue(null)

      const result = await RevisionSessionService.findOne(1, 99)

      expect(result).toBeNull()
    })
  })

  // ── create ────────────────────────────────────────────────────────────────
  describe('create', () => {
    it("crée la séance avec l'userId attaché automatiquement", async () => {
      models.RevisionSession.create.mockResolvedValue(mockSession)

      const result = await RevisionSessionService.create(1, {
        name: 'Révision maths',
        date: TODAY,
        startTime: '09:00',
        endTime: '11:00'
      })

      expect(models.RevisionSession.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 1 })
      )
      expect(result).toEqual(mockSession)
    })
  })

  // ── update ────────────────────────────────────────────────────────────────
  describe('update', () => {
    it("met à jour la séance si elle appartient à l'utilisateur", async () => {
      mockSession.update.mockResolvedValue(mockSession)
      models.RevisionSession.findOne.mockResolvedValue(mockSession)

      const result = await RevisionSessionService.update(1, 1, { name: 'Révision physique' })

      expect(mockSession.update).toHaveBeenCalledWith({ name: 'Révision physique' })
      expect(result).toBeTruthy()
    })

    it('retourne null si la séance est introuvable ou non propriétaire', async () => {
      models.RevisionSession.findOne.mockResolvedValue(null)

      const result = await RevisionSessionService.update(99, 1, { name: 'X' })

      expect(result).toBeNull()
    })
  })

  // ── delete ────────────────────────────────────────────────────────────────
  describe('delete', () => {
    it("supprime la séance si elle appartient à l'utilisateur", async () => {
      mockSession.destroy.mockResolvedValue()
      models.RevisionSession.findOne.mockResolvedValue(mockSession)

      const result = await RevisionSessionService.delete(1, 1)

      expect(mockSession.destroy).toHaveBeenCalledTimes(1)
      expect(result).toBe(true)
    })

    it('retourne false si la séance est introuvable ou non propriétaire', async () => {
      models.RevisionSession.findOne.mockResolvedValue(null)

      const result = await RevisionSessionService.delete(99, 1)

      expect(result).toBe(false)
    })
  })

  // ── validateMatchingSessions ─────────────────────────────────────────────────
  // Auto-validation d'une séance planifiée par une pratique réelle correspondante
  // (2026-09-04, demande explicite de l'utilisateur).
  describe('validateMatchingSessions', () => {
    it('idSystem fourni — valide les séances du jour non faites liées à ce système', async () => {
      models.RevisionSession.update.mockResolvedValue([2])

      const count = await RevisionSessionService.validateMatchingSessions({ userId: 1, idSystem: 5 })

      expect(models.RevisionSession.update).toHaveBeenCalledWith(
        { isDone: true },
        { where: { userId: 1, date: TODAY, isDone: false, idSystem: 5 } }
      )
      expect(count).toBe(2)
    })

    it('idTest fourni — valide les séances du jour non faites liées à ce test', async () => {
      models.RevisionSession.update.mockResolvedValue([1])

      const count = await RevisionSessionService.validateMatchingSessions({ userId: 1, idTest: 7 })

      expect(models.RevisionSession.update).toHaveBeenCalledWith(
        { isDone: true },
        { where: { userId: 1, date: TODAY, isDone: false, idTest: 7 } }
      )
      expect(count).toBe(1)
    })

    it('ni idSystem ni idTest — ne fait aucune requête, retourne 0', async () => {
      const count = await RevisionSessionService.validateMatchingSessions({ userId: 1 })

      expect(models.RevisionSession.update).not.toHaveBeenCalled()
      expect(count).toBe(0)
    })

    it('aucune séance correspondante — retourne 0', async () => {
      models.RevisionSession.update.mockResolvedValue([0])

      const count = await RevisionSessionService.validateMatchingSessions({ userId: 1, idSystem: 99 })

      expect(count).toBe(0)
    })
  })
})

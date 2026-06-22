const { LeitnerSystem, LeitnerBox, Subject, instance } = require('../../models/index')
const LeitnerSystemService = require('../../services/LeitnerSystem.service')

const mockTransaction = { commit: jest.fn(), rollback: jest.fn() }

const mockSubject = { subjectId: 1, name: 'Maths' }

jest.mock('../../models/index', () => ({
  LeitnerSystem: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  },
  LeitnerBox: {
    bulkCreate: jest.fn()
  },
  LeitnerSystemsUsers: {},
  Subject: {},
  instance: {
    transaction: jest.fn()
  }
}))

const SUBJECT_INCLUDE = { model: Subject, as: 'subject', attributes: ['subjectId', 'name'] }

describe('LeitnerSystemService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockTransaction.commit.mockResolvedValue()
    mockTransaction.rollback.mockResolvedValue()
  })

  test('findAll - userId valide - retourne les systèmes de l\'utilisateur', async () => {
    const mockSystems = [
      { idSystem: 1, name: 'Système Leitner Mathématiques', idUser: 1, subject: mockSubject },
      { idSystem: 2, name: 'Système Leitner Physique', idUser: 1, subject: null }
    ]
    LeitnerSystem.findAll.mockResolvedValue(mockSystems)

    const systems = await LeitnerSystemService.findAll(1)

    expect(LeitnerSystem.findAll).toHaveBeenCalledWith({
      where: { idUser: 1 },
      include: [SUBJECT_INCLUDE]
    })
    expect(systems).toEqual(mockSystems)
  })

  test('findBySubject - subjectId + userId valides - retourne les systèmes filtrés', async () => {
    const mockSystems = [
      { idSystem: 1, name: 'Système Leitner Mathématiques', idUser: 1, subject: mockSubject }
    ]
    LeitnerSystem.findAll.mockResolvedValue(mockSystems)

    const systems = await LeitnerSystemService.findBySubject(1, 1)

    expect(LeitnerSystem.findAll).toHaveBeenCalledWith({
      where: { subjectId: 1, idUser: 1 },
      include: [SUBJECT_INCLUDE]
    })
    expect(systems).toEqual(mockSystems)
  })

  test('findOne - id valide - retourne le système avec le sujet inclus', async () => {
    const mockSystem = { idSystem: 1, name: 'Système Leitner Mathématiques', subject: mockSubject }
    LeitnerSystem.findByPk.mockResolvedValue(mockSystem)

    const system = await LeitnerSystemService.findOne(1)

    expect(LeitnerSystem.findByPk).toHaveBeenCalledWith(1, { include: [SUBJECT_INCLUDE] })
    expect(system).toEqual(mockSystem)
  })

  test('findOne - id inexistant - retourne null', async () => {
    LeitnerSystem.findByPk.mockResolvedValue(null)

    const system = await LeitnerSystemService.findOne(99)

    expect(LeitnerSystem.findByPk).toHaveBeenCalledWith(99, { include: [SUBJECT_INCLUDE] })
    expect(system).toBeNull()
  })

  test('create - données valides - crée le système avec 5 boîtes par défaut et retourne avec sujet', async () => {
    const mockCreated = { idSystem: 3, name: 'Système Leitner Chimie', idUser: 3, subjectId: 1 }
    const mockWithSubject = { ...mockCreated, subject: mockSubject }

    instance.transaction.mockResolvedValue(mockTransaction)
    LeitnerSystem.create.mockResolvedValue(mockCreated)
    LeitnerBox.bulkCreate.mockResolvedValue([])
    LeitnerSystem.findByPk.mockResolvedValue(mockWithSubject)

    const system = await LeitnerSystemService.create({
      name: 'Système Leitner Chimie',
      idUser: 3,
      subjectId: 1
    })

    expect(instance.transaction).toHaveBeenCalled()
    expect(LeitnerSystem.create).toHaveBeenCalledWith(
      { name: 'Système Leitner Chimie', idUser: 3, subjectId: 1 },
      { transaction: mockTransaction }
    )
    expect(LeitnerBox.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ idSystem: 3, level: 1 })]),
      { transaction: mockTransaction }
    )
    expect(LeitnerBox.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ level: 5 })]),
      expect.anything()
    )
    expect(mockTransaction.commit).toHaveBeenCalled()
    expect(LeitnerSystem.findByPk).toHaveBeenCalledWith(3, { include: [SUBJECT_INCLUDE] })
    expect(system).toEqual(mockWithSubject)
  })

  test('create - erreur DB - rollback et propage l\'erreur', async () => {
    instance.transaction.mockResolvedValue(mockTransaction)
    LeitnerSystem.create.mockRejectedValue(new Error('DB error'))

    await expect(
      LeitnerSystemService.create({ name: 'Test', idUser: 1, subjectId: null })
    ).rejects.toThrow('DB error')

    expect(mockTransaction.rollback).toHaveBeenCalled()
    expect(mockTransaction.commit).not.toHaveBeenCalled()
  })

  test('update - utilisateur propriétaire - met à jour et retourne true', async () => {
    const mockSystem = { idSystem: 1, idUser: 2, update: jest.fn() }
    LeitnerSystem.findByPk.mockResolvedValue(mockSystem)

    const result = await LeitnerSystemService.update({
      idSystem: 1,
      idUser: 2,
      name: 'Système mis à jour',
      subjectId: 1
    })

    expect(LeitnerSystem.findByPk).toHaveBeenCalledWith(1)
    expect(mockSystem.update).toHaveBeenCalledWith({ name: 'Système mis à jour', subjectId: 1 })
    expect(result).toBe(true)
  })

  test('update - utilisateur non propriétaire - ne met pas à jour et retourne false', async () => {
    const mockSystem = { idSystem: 1, idUser: 3, update: jest.fn() }
    LeitnerSystem.findByPk.mockResolvedValue(mockSystem)

    const result = await LeitnerSystemService.update({
      idSystem: 1,
      idUser: 2,
      name: 'Système mis à jour'
    })

    expect(LeitnerSystem.findByPk).toHaveBeenCalledWith(1)
    expect(mockSystem.update).not.toHaveBeenCalled()
    expect(result).toBe(false)
  })

  test('delete - utilisateur propriétaire - supprime et retourne true', async () => {
    const mockSystem = { idSystem: 1, idUser: 2, destroy: jest.fn() }
    LeitnerSystem.findByPk.mockResolvedValue(mockSystem)

    const result = await LeitnerSystemService.delete(1, 2)

    expect(LeitnerSystem.findByPk).toHaveBeenCalledWith(1)
    expect(mockSystem.destroy).toHaveBeenCalledTimes(1)
    expect(result).toBe(true)
  })

  test('delete - utilisateur non propriétaire - ne supprime pas et retourne false', async () => {
    const mockSystem = { idSystem: 1, idUser: 3, destroy: jest.fn() }
    LeitnerSystem.findByPk.mockResolvedValue(mockSystem)

    const result = await LeitnerSystemService.delete(1, 2)

    expect(LeitnerSystem.findByPk).toHaveBeenCalledWith(1)
    expect(mockSystem.destroy).not.toHaveBeenCalled()
    expect(result).toBe(false)
  })
})

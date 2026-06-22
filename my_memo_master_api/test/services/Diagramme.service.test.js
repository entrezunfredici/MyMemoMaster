const { Diagramme } = require('../../models/index')
const DiagrammeService = require('../../services/Diagramme.service')

const { Subject } = require('../../models/index')

jest.mock('../../models/index', () => ({
  Diagramme: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  },
  Subject: {
    findByPk: jest.fn(),
    findOrCreate: jest.fn()
  }
}))

describe('DiagrammeService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('findByUser — retourne tous les diagrammes d\'un utilisateur', async () => {
    const mockDiagrammes = [{ idMindMap: 1, userId: 1, mmName: 'Carte 1' }]
    Diagramme.findAll.mockResolvedValue(mockDiagrammes)

    const result = await DiagrammeService.findByUser(1)

    expect(Diagramme.findAll).toHaveBeenCalledWith({ where: { userId: 1 } })
    expect(result).toEqual(mockDiagrammes)
  })

  test('findByUser — filtre par subjectId quand fourni', async () => {
    const mockDiagrammes = [{ idMindMap: 2, userId: 1, subjectId: 3, mmName: 'Carte Maths' }]
    Diagramme.findAll.mockResolvedValue(mockDiagrammes)

    const result = await DiagrammeService.findByUser(1, { subjectId: 3 })

    expect(Diagramme.findAll).toHaveBeenCalledWith({ where: { userId: 1, subjectId: 3 } })
    expect(result).toEqual(mockDiagrammes)
  })

  test('should retrieve all mind maps', async () => {
    const mockDiagrammes = [
      { idDiagramme: 1, mmName: 'Diagramme 1', DiagrammeJson: '{}', idUser: 1 },
      { idDiagramme: 2, mmName: 'Diagramme 2', DiagrammeJson: '{}', idUser: 2 }
    ]
    Diagramme.findAll.mockResolvedValue(mockDiagrammes)

    const diagrammes = await DiagrammeService.findAll()

    expect(Diagramme.findAll).toHaveBeenCalledTimes(1)
    expect(diagrammes).toEqual(mockDiagrammes)
  })

  test('should retrieve a mind map by ID', async () => {
    const mockDiagramme = { idDiagramme: 1, mmName: 'Diagramme 1', DiagrammeJson: '{}', idUser: 1 }
    Diagramme.findByPk.mockResolvedValue(mockDiagramme)

    const diagramme = await DiagrammeService.findOne(1)

    expect(Diagramme.findByPk).toHaveBeenCalledWith(1)
    expect(diagramme).toEqual(mockDiagramme)
  })

  test('should create a new mind map', async () => {
    const newDiagramme = { mmName: 'New Diagramme', DiagrammeJson: '{}', idUser: 1 }
    const mockDiagramme = { idDiagramme: 1, ...newDiagramme }
    Diagramme.create.mockResolvedValue(mockDiagramme)

    const createdDiagramme = await DiagrammeService.create(newDiagramme)

    expect(Diagramme.create).toHaveBeenCalledWith(newDiagramme)
    expect(createdDiagramme).toEqual(mockDiagramme)
  })

  test('should update an existing mind map', async () => {
    const mockDiagramme = {
      idDiagramme: 1,
      mmName: 'Old Diagramme',
      DiagrammeJson: '{}',
      idUser: 1,
      update: jest.fn().mockImplementation(function (newData) {
        Object.assign(this, newData)
        return this
      })
    }
    const updatedData = { mmName: 'Updated Diagramme', DiagrammeJson: '{}', idUser: 1 }

    Diagramme.findByPk.mockResolvedValue(mockDiagramme)

    const updatedDiagramme = await DiagrammeService.update(1, updatedData)

    expect(Diagramme.findByPk).toHaveBeenCalledWith(1)
    expect(mockDiagramme.update).toHaveBeenCalledWith(updatedData)
    expect(updatedDiagramme).toMatchObject({
      idDiagramme: 1,
      mmName: 'Updated Diagramme',
      DiagrammeJson: '{}',
      idUser: 1
    })
  })

  test('should throw an error when updating a non-existing mind map', async () => {
    Diagramme.findByPk.mockResolvedValue(null)

    await expect(
      DiagrammeService.update(999, { mmName: 'Non-existing Diagramme' })
    ).rejects.toThrow('Diagramme not found')
    expect(Diagramme.findByPk).toHaveBeenCalledWith(999)
  })

  test('should delete a mind map by ID', async () => {
    Diagramme.findByPk.mockResolvedValue({
      destroy: jest.fn().mockResolvedValue(true)
    })

    const result = await DiagrammeService.delete(1)

    expect(Diagramme.findByPk).toHaveBeenCalledWith(1)
    expect(result).toBe(true)
  })

  test('should throw an error when deleting a non-existing mind map', async () => {
    Diagramme.findByPk.mockResolvedValue(null)

    await expect(DiagrammeService.delete(999)).rejects.toThrow('Diagramme not found')
    expect(Diagramme.findByPk).toHaveBeenCalledWith(999)
  })

  describe('resolveSubject', () => {
    test('retourne le subjectId existant quand il est valide', async () => {
      Subject.findByPk.mockResolvedValue({ subjectId: 5 })

      const result = await DiagrammeService.resolveSubject(5)

      expect(Subject.findByPk).toHaveBeenCalledWith(5)
      expect(result).toBe(5)
    })

    test('crée et retourne le sujet par défaut quand subjectId est null', async () => {
      Subject.findOrCreate.mockResolvedValue([{ subjectId: 1 }, true])

      const result = await DiagrammeService.resolveSubject(null)

      expect(Subject.findOrCreate).toHaveBeenCalledWith({
        where: { name: 'Sujet par défaut' },
        defaults: { name: 'Sujet par défaut' }
      })
      expect(result).toBe(1)
    })

    test('crée le sujet par défaut quand le subjectId fourni n\'existe pas en base', async () => {
      Subject.findByPk.mockResolvedValue(null)
      Subject.findOrCreate.mockResolvedValue([{ subjectId: 1 }, false])

      const result = await DiagrammeService.resolveSubject(99)

      expect(Subject.findByPk).toHaveBeenCalledWith(99)
      expect(result).toBe(1)
    })
  })
})

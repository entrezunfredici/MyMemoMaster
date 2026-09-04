const { MindMapViewSession } = require('../../models/index')
const MindMapViewSessionService = require('../../services/MindMapViewSession.service')

jest.mock('../../models/index', () => ({
  MindMapViewSession: { create: jest.fn(), findAll: jest.fn() },
  Diagramme: {}
}))

describe('MindMapViewSessionService', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('create', () => {
    it('journalise une consultation avec les bons champs', async () => {
      const mockSession = { id: 1, userId: 1, idMindMap: 2, durationSeconds: 120 }
      MindMapViewSession.create.mockResolvedValue(mockSession)

      const session = await MindMapViewSessionService.create({ userId: 1, idMindMap: 2, durationSeconds: 120 })

      expect(MindMapViewSession.create).toHaveBeenCalledWith({ userId: 1, idMindMap: 2, durationSeconds: 120 })
      expect(session).toEqual(mockSession)
    })
  })

  describe('findByUser', () => {
    it('sans subjectIds — interroge uniquement par userId, carte requise mais non filtrée', async () => {
      MindMapViewSession.findAll.mockResolvedValue([])

      await MindMapViewSessionService.findByUser(1)

      expect(MindMapViewSession.findAll).toHaveBeenCalledWith({
        where: { userId: 1 },
        include: [expect.objectContaining({ as: 'mindMap', required: true })]
      })
      // Pas de clause where sur l'association quand aucune matière n'est fournie
      const call = MindMapViewSession.findAll.mock.calls[0][0]
      expect(call.include[0].where).toBeUndefined()
    })

    it('avec subjectIds — restreint via la carte mentale consultée', async () => {
      MindMapViewSession.findAll.mockResolvedValue([])

      await MindMapViewSessionService.findByUser(1, [3, 4])

      const call = MindMapViewSession.findAll.mock.calls[0][0]
      expect(call.include[0].where).toEqual({ subjectId: [3, 4] })
    })
  })
})

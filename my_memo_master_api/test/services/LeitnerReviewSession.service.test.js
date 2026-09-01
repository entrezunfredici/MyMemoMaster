const { LeitnerReviewSession } = require('../../models/index')
const LeitnerReviewSessionService = require('../../services/LeitnerReviewSession.service')

jest.mock('../../models/index', () => ({
  LeitnerReviewSession: { create: jest.fn(), findAll: jest.fn() },
  LeitnerSystem: {}
}))

describe('LeitnerReviewSessionService', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('create', () => {
    it('journalise une session avec les bons champs', async () => {
      const mockSession = { id: 1, userId: 1, idSystem: 2, cardsReviewed: 5, durationSeconds: 120 }
      LeitnerReviewSession.create.mockResolvedValue(mockSession)

      const session = await LeitnerReviewSessionService.create({ userId: 1, idSystem: 2, cardsReviewed: 5, durationSeconds: 120 })

      expect(LeitnerReviewSession.create).toHaveBeenCalledWith({ userId: 1, idSystem: 2, cardsReviewed: 5, durationSeconds: 120 })
      expect(session).toEqual(mockSession)
    })
  })

  describe('findByUser', () => {
    it('sans subjectIds — interroge uniquement par userId, système requis mais non filtré', async () => {
      LeitnerReviewSession.findAll.mockResolvedValue([])

      await LeitnerReviewSessionService.findByUser(1)

      expect(LeitnerReviewSession.findAll).toHaveBeenCalledWith({
        where: { userId: 1 },
        include: [expect.objectContaining({ as: 'system', required: true })]
      })
      // Pas de clause where sur l'association quand aucune matière n'est fournie
      const call = LeitnerReviewSession.findAll.mock.calls[0][0]
      expect(call.include[0].where).toBeUndefined()
    })

    it('avec subjectIds — restreint via le système Leitner rattaché', async () => {
      LeitnerReviewSession.findAll.mockResolvedValue([])

      await LeitnerReviewSessionService.findByUser(1, [3, 4])

      const call = LeitnerReviewSession.findAll.mock.calls[0][0]
      expect(call.include[0].where).toEqual({ subjectId: [3, 4] })
    })
  })
})

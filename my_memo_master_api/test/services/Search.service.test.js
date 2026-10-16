const { Diagramme, LeitnerSystem, Test } = require('../../models/index')
const { Op } = require('sequelize')
const searchService = require('../../services/Search.service')

jest.mock('../../models/index', () => ({
  Diagramme:     { findAll: jest.fn() },
  LeitnerSystem: { findAll: jest.fn() },
  Test:          { findAll: jest.fn() },
  Subject:       {},
  Tag:           {},
  instance:      { getDialect: jest.fn().mockReturnValue('sqlite') }
}))

const MIND_MAP     = { idMindMap: 1, mmName: 'Algèbre', subjectId: 1 }
const LEITNER      = { idSystem: 2,  name: 'Leitner Maths', subjectId: 1 }
const TEST_ITEM    = { testId: 3,    name: 'Test Maths', subjectId: 1 }

describe('SearchService', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── searchAll — sans filtre ────────────────────────────────────────────────

  describe('searchAll — sans filtre', () => {
    it('retourne les trois collections de l\'utilisateur', async () => {
      Diagramme.findAll.mockResolvedValue([MIND_MAP])
      LeitnerSystem.findAll.mockResolvedValue([LEITNER])
      Test.findAll.mockResolvedValue([TEST_ITEM])

      const result = await searchService.searchAll(1)

      expect(result).toEqual({
        mindMaps:      [MIND_MAP],
        leitnerSystems:[LEITNER],
        tests:         [TEST_ITEM]
      })
    })

    it('passe userId dans le where de Diagramme, LeitnerSystem et Test', async () => {
      Diagramme.findAll.mockResolvedValue([])
      LeitnerSystem.findAll.mockResolvedValue([])
      Test.findAll.mockResolvedValue([])

      await searchService.searchAll(7)

      expect(Diagramme.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: 7 }) })
      )
      expect(LeitnerSystem.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ idUser: 7 }) })
      )
      expect(Test.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: 7 }) })
      )
    })

    it('retourne des listes vides si aucun contenu', async () => {
      Diagramme.findAll.mockResolvedValue([])
      LeitnerSystem.findAll.mockResolvedValue([])
      Test.findAll.mockResolvedValue([])

      const result = await searchService.searchAll(1)

      expect(result.mindMaps).toHaveLength(0)
      expect(result.leitnerSystems).toHaveLength(0)
      expect(result.tests).toHaveLength(0)
    })

    it('exécute les trois requêtes en parallèle (Promise.all)', async () => {
      Diagramme.findAll.mockResolvedValue([])
      LeitnerSystem.findAll.mockResolvedValue([])
      Test.findAll.mockResolvedValue([])

      await searchService.searchAll(1)

      expect(Diagramme.findAll).toHaveBeenCalledTimes(1)
      expect(LeitnerSystem.findAll).toHaveBeenCalledTimes(1)
      expect(Test.findAll).toHaveBeenCalledTimes(1)
    })
  })

  // ── searchAll — filtre subjectId ──────────────────────────────────────────

  describe('searchAll — filtre subjectId', () => {
    it('passe subjectId dans le where de toutes les requêtes', async () => {
      Diagramme.findAll.mockResolvedValue([MIND_MAP])
      LeitnerSystem.findAll.mockResolvedValue([LEITNER])
      Test.findAll.mockResolvedValue([TEST_ITEM])

      await searchService.searchAll(1, { subjectId: 2 })

      expect(Diagramme.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ subjectId: 2 }) })
      )
      expect(LeitnerSystem.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ subjectId: 2 }) })
      )
      expect(Test.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ subjectId: 2 }) })
      )
    })

    it('n\'ajoute pas subjectId si null', async () => {
      Diagramme.findAll.mockResolvedValue([])
      LeitnerSystem.findAll.mockResolvedValue([])
      Test.findAll.mockResolvedValue([])

      await searchService.searchAll(1, { subjectId: null })

      const diagrammeCall = Diagramme.findAll.mock.calls[0][0]
      expect(diagrammeCall.where).not.toHaveProperty('subjectId')
    })
  })

  // ── searchAll — filtre texte q ────────────────────────────────────────────

  describe('searchAll — filtre texte q', () => {
    it('ajoute un filtre Op.like sur mmName pour Diagramme', async () => {
      Diagramme.findAll.mockResolvedValue([])
      LeitnerSystem.findAll.mockResolvedValue([])
      Test.findAll.mockResolvedValue([])

      await searchService.searchAll(1, { q: 'algèbre' })

      const diagrammeWhere = Diagramme.findAll.mock.calls[0][0].where
      expect(diagrammeWhere).toHaveProperty('mmName')
      expect(diagrammeWhere.mmName[Op.like]).toBe('%algèbre%')
    })

    it('ajoute un filtre Op.like sur name pour LeitnerSystem', async () => {
      Diagramme.findAll.mockResolvedValue([])
      LeitnerSystem.findAll.mockResolvedValue([])
      Test.findAll.mockResolvedValue([])

      await searchService.searchAll(1, { q: 'maths' })

      const leitnerWhere = LeitnerSystem.findAll.mock.calls[0][0].where
      expect(leitnerWhere.name[Op.like]).toBe('%maths%')
    })

    it('ajoute un filtre Op.like sur name pour Test', async () => {
      Diagramme.findAll.mockResolvedValue([])
      LeitnerSystem.findAll.mockResolvedValue([])
      Test.findAll.mockResolvedValue([])

      await searchService.searchAll(1, { q: 'révision' })

      const testWhere = Test.findAll.mock.calls[0][0].where
      expect(testWhere.name[Op.like]).toBe('%révision%')
    })

    it('n\'ajoute pas de filtre texte si q est null/undefined', async () => {
      Diagramme.findAll.mockResolvedValue([])
      LeitnerSystem.findAll.mockResolvedValue([])
      Test.findAll.mockResolvedValue([])

      await searchService.searchAll(1, { q: null })

      const diagrammeWhere = Diagramme.findAll.mock.calls[0][0].where
      expect(diagrammeWhere).not.toHaveProperty('mmName')
    })
  })

  // ── searchAll — filtre combiné ────────────────────────────────────────────

  describe('searchAll — filtre combiné subjectId + q', () => {
    it('combine les deux filtres dans une même requête', async () => {
      Diagramme.findAll.mockResolvedValue([MIND_MAP])
      LeitnerSystem.findAll.mockResolvedValue([])
      Test.findAll.mockResolvedValue([])

      await searchService.searchAll(1, { subjectId: 3, q: 'algebre' })

      const diagrammeWhere = Diagramme.findAll.mock.calls[0][0].where
      expect(diagrammeWhere).toHaveProperty('userId', 1)
      expect(diagrammeWhere).toHaveProperty('subjectId', 3)
      expect(diagrammeWhere).toHaveProperty('mmName')
    })
  })
})

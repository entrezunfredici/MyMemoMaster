const { Tag, Diagramme, LeitnerSystem, Test } = require('../../models/index')
const tagService = require('../../services/Tag.service')

jest.mock('../../models/index', () => ({
  Tag: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn()
  },
  Diagramme:      { findByPk: jest.fn() },
  LeitnerSystem:  { findByPk: jest.fn() },
  Test:           { findByPk: jest.fn() }
}))

describe('TagService', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('retourne tous les tags triés par nom', async () => {
      const mockTags = [{ tagId: 1, name: 'maths', color: '#EF4444' }, { tagId: 2, name: 'révision', color: '#6366F1' }]
      Tag.findAll.mockResolvedValue(mockTags)

      const result = await tagService.findAll()

      expect(Tag.findAll).toHaveBeenCalledWith({
        attributes: ['tagId', 'name', 'color'],
        order: [['name', 'ASC']]
      })
      expect(result).toEqual(mockTags)
    })

    it('retourne une liste vide s\'il n\'y a pas de tags', async () => {
      Tag.findAll.mockResolvedValue([])
      expect(await tagService.findAll()).toEqual([])
    })
  })

  // ── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('retourne le tag par ID', async () => {
      const mockTag = { tagId: 1, name: 'maths', color: '#EF4444' }
      Tag.findByPk.mockResolvedValue(mockTag)

      const result = await tagService.findOne(1)

      expect(Tag.findByPk).toHaveBeenCalledWith(1, { attributes: ['tagId', 'name', 'color'] })
      expect(result).toEqual(mockTag)
    })

    it('retourne null si le tag n\'existe pas', async () => {
      Tag.findByPk.mockResolvedValue(null)
      expect(await tagService.findOne(99)).toBeNull()
    })
  })

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('crée un tag avec la couleur spécifiée', async () => {
      const mockTag = { tagId: 1, name: 'maths', color: '#EF4444' }
      Tag.create.mockResolvedValue(mockTag)

      const result = await tagService.create({ name: 'maths', color: '#EF4444' })

      expect(Tag.create).toHaveBeenCalledWith({ name: 'maths', color: '#EF4444' })
      expect(result).toEqual(mockTag)
    })

    it('utilise la couleur par défaut (#6366F1) si aucune couleur fournie', async () => {
      Tag.create.mockResolvedValue({ tagId: 1, name: 'maths', color: '#6366F1' })

      await tagService.create({ name: 'maths' })

      expect(Tag.create).toHaveBeenCalledWith({ name: 'maths', color: '#6366F1' })
    })
  })

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('met à jour le nom et la couleur', async () => {
      const mockTag = { tagId: 1, name: 'ancien', color: '#EF4444', update: jest.fn().mockResolvedValue(undefined) }
      Tag.findByPk.mockResolvedValue(mockTag)

      const result = await tagService.update(1, { name: 'nouveau', color: '#3B82F6' })

      expect(mockTag.update).toHaveBeenCalledWith({ name: 'nouveau', color: '#3B82F6' })
      expect(result).toBe(mockTag)
    })

    it('met à jour uniquement la couleur', async () => {
      const mockTag = { tagId: 1, name: 'maths', update: jest.fn().mockResolvedValue(undefined) }
      Tag.findByPk.mockResolvedValue(mockTag)

      await tagService.update(1, { color: '#3B82F6' })

      expect(mockTag.update).toHaveBeenCalledWith({ color: '#3B82F6' })
    })

    it('n\'inclut pas les champs undefined dans la mise à jour', async () => {
      const mockTag = { tagId: 1, name: 'maths', color: '#EF4444', update: jest.fn().mockResolvedValue(undefined) }
      Tag.findByPk.mockResolvedValue(mockTag)

      await tagService.update(1, { name: 'physique' })

      expect(mockTag.update).toHaveBeenCalledWith({ name: 'physique' })
    })

    it('retourne null si le tag n\'existe pas', async () => {
      Tag.findByPk.mockResolvedValue(null)
      expect(await tagService.update(99, { name: 'X' })).toBeNull()
    })
  })

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('supprime le tag et retourne true', async () => {
      const mockTag = { destroy: jest.fn().mockResolvedValue(undefined) }
      Tag.findByPk.mockResolvedValue(mockTag)

      const result = await tagService.delete(1)

      expect(mockTag.destroy).toHaveBeenCalledTimes(1)
      expect(result).toBe(true)
    })

    it('retourne false si le tag n\'existe pas', async () => {
      Tag.findByPk.mockResolvedValue(null)
      expect(await tagService.delete(99)).toBe(false)
    })
  })

  // ── setTagsForMindMap ─────────────────────────────────────────────────────

  describe('setTagsForMindMap', () => {
    it('associe les tags à la carte mentale et retourne les tags', async () => {
      const mockTags = [{ tagId: 1 }, { tagId: 2 }]
      const mockMindMap = { setTags: jest.fn().mockResolvedValue(undefined) }
      Diagramme.findByPk.mockResolvedValue(mockMindMap)
      Tag.findAll.mockResolvedValue(mockTags)

      const result = await tagService.setTagsForMindMap(1, [1, 2])

      expect(Diagramme.findByPk).toHaveBeenCalledWith(1)
      expect(mockMindMap.setTags).toHaveBeenCalledWith(mockTags)
      expect(result).toEqual(mockTags)
    })

    it('retire tous les tags si tagIds est vide (sans appel findAll)', async () => {
      const mockMindMap = { setTags: jest.fn().mockResolvedValue(undefined) }
      Diagramme.findByPk.mockResolvedValue(mockMindMap)

      const result = await tagService.setTagsForMindMap(1, [])

      expect(Tag.findAll).not.toHaveBeenCalled()
      expect(mockMindMap.setTags).toHaveBeenCalledWith([])
      expect(result).toEqual([])
    })

    it('retourne null si la carte mentale n\'existe pas', async () => {
      Diagramme.findByPk.mockResolvedValue(null)
      expect(await tagService.setTagsForMindMap(99, [1])).toBeNull()
    })
  })

  // ── setTagsForLeitnerSystem ───────────────────────────────────────────────

  describe('setTagsForLeitnerSystem', () => {
    it('associe les tags au système Leitner et retourne les tags', async () => {
      const mockTags = [{ tagId: 1 }]
      const mockSystem = { setTags: jest.fn().mockResolvedValue(undefined) }
      LeitnerSystem.findByPk.mockResolvedValue(mockSystem)
      Tag.findAll.mockResolvedValue(mockTags)

      const result = await tagService.setTagsForLeitnerSystem(1, [1])

      expect(LeitnerSystem.findByPk).toHaveBeenCalledWith(1)
      expect(mockSystem.setTags).toHaveBeenCalledWith(mockTags)
      expect(result).toEqual(mockTags)
    })

    it('retourne null si le système n\'existe pas', async () => {
      LeitnerSystem.findByPk.mockResolvedValue(null)
      expect(await tagService.setTagsForLeitnerSystem(99, [1])).toBeNull()
    })
  })

  // ── setTagsForTest ────────────────────────────────────────────────────────

  describe('setTagsForTest', () => {
    it('associe les tags à l\'exercice et retourne les tags', async () => {
      const mockTags = [{ tagId: 2 }]
      const mockTest = { setTags: jest.fn().mockResolvedValue(undefined) }
      Test.findByPk.mockResolvedValue(mockTest)
      Tag.findAll.mockResolvedValue(mockTags)

      const result = await tagService.setTagsForTest(3, [2])

      expect(Test.findByPk).toHaveBeenCalledWith(3)
      expect(mockTest.setTags).toHaveBeenCalledWith(mockTags)
      expect(result).toEqual(mockTags)
    })

    it('retourne null si l\'exercice n\'existe pas', async () => {
      Test.findByPk.mockResolvedValue(null)
      expect(await tagService.setTagsForTest(99, [1])).toBeNull()
    })
  })
})

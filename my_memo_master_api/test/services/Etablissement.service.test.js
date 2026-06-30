const { Etablissement, User } = require('../../models/index')
const EtablissementService = require('../../services/Etablissement.service')

jest.mock('../../models/index', () => ({
  Etablissement: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn()
  },
  User: {}
}))

const mockEtab = { id: 1, name: 'Lycée Victor Hugo', code: 'LVH', adminId: 10 }
const mockEtabInstance = { ...mockEtab, update: jest.fn(), destroy: jest.fn() }

describe('EtablissementService', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('retourne tous les établissements', async () => {
      Etablissement.findAll.mockResolvedValue([mockEtab])

      const result = await EtablissementService.findAll()

      expect(Etablissement.findAll).toHaveBeenCalledWith(expect.objectContaining({
        order: [['name', 'ASC']]
      }))
      expect(result).toEqual([mockEtab])
    })
  })

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('retourne un établissement par id', async () => {
      Etablissement.findByPk.mockResolvedValue(mockEtab)

      const result = await EtablissementService.findOne(1)

      expect(Etablissement.findByPk).toHaveBeenCalledWith(1, expect.any(Object))
      expect(result).toEqual(mockEtab)
    })

    it('retourne null si non trouvé', async () => {
      Etablissement.findByPk.mockResolvedValue(null)

      const result = await EtablissementService.findOne(999)

      expect(result).toBeNull()
    })
  })

  // ── findByAdmin ────────────────────────────────────────────────────────────

  describe('findByAdmin', () => {
    it('retourne l\'établissement dont l\'adminId correspond', async () => {
      Etablissement.findOne.mockResolvedValue(mockEtab)

      const result = await EtablissementService.findByAdmin(10)

      expect(Etablissement.findOne).toHaveBeenCalledWith(expect.objectContaining({
        where: { adminId: 10 }
      }))
      expect(result).toEqual(mockEtab)
    })

    it('retourne null si aucun établissement pour cet admin', async () => {
      Etablissement.findOne.mockResolvedValue(null)

      const result = await EtablissementService.findByAdmin(99)

      expect(result).toBeNull()
    })
  })

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('crée et retourne le nouvel établissement', async () => {
      Etablissement.create.mockResolvedValue(mockEtab)

      const result = await EtablissementService.create({ name: 'Lycée Victor Hugo', code: 'LVH' })

      expect(Etablissement.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Lycée Victor Hugo',
        code: 'LVH'
      }))
      expect(result).toEqual(mockEtab)
    })

    it('adminId est null par défaut', async () => {
      Etablissement.create.mockResolvedValue({ ...mockEtab, adminId: null })

      await EtablissementService.create({ name: 'Test', code: 'TST' })

      expect(Etablissement.create).toHaveBeenCalledWith(expect.objectContaining({
        adminId: null
      }))
    })
  })

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('met à jour et retourne l\'établissement', async () => {
      const updated = { ...mockEtab, name: 'Nouveau nom' }
      mockEtabInstance.update.mockResolvedValue(updated)
      Etablissement.findByPk.mockResolvedValue(mockEtabInstance)

      const result = await EtablissementService.update(1, { name: 'Nouveau nom' })

      expect(mockEtabInstance.update).toHaveBeenCalledWith({ name: 'Nouveau nom' })
      expect(result).toEqual(updated)
    })

    it('retourne null si non trouvé', async () => {
      Etablissement.findByPk.mockResolvedValue(null)

      const result = await EtablissementService.update(999, { name: 'X' })

      expect(result).toBeNull()
    })

    it('ignore les champs undefined dans le patch', async () => {
      mockEtabInstance.update.mockResolvedValue(mockEtabInstance)
      Etablissement.findByPk.mockResolvedValue(mockEtabInstance)

      await EtablissementService.update(1, { name: 'Test' })

      const callArg = mockEtabInstance.update.mock.calls[0][0]
      expect(callArg).not.toHaveProperty('code')
      expect(callArg).not.toHaveProperty('adminId')
    })
  })

  // ── delete ─────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('supprime et retourne true', async () => {
      mockEtabInstance.destroy.mockResolvedValue()
      Etablissement.findByPk.mockResolvedValue(mockEtabInstance)

      const result = await EtablissementService.delete(1)

      expect(mockEtabInstance.destroy).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('retourne null si non trouvé', async () => {
      Etablissement.findByPk.mockResolvedValue(null)

      const result = await EtablissementService.delete(999)

      expect(result).toBeNull()
    })
  })
})

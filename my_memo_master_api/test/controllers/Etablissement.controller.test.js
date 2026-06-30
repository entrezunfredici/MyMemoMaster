const EtablissementService = require('../../services/Etablissement.service')
const logger = require('../../helpers/logger')

jest.mock('../../services/Etablissement.service', () => ({
  findAll: jest.fn(),
  findOne: jest.fn(),
  findByAdmin: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
}))
jest.mock('../../helpers/logger', () => ({ error: jest.fn() }))

const {
  findAll,
  findOne,
  create,
  update,
  destroy
} = require('../../controllers/Etablissement.controller')

const mockRes = () => {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

const mockEtab = { id: 1, name: 'Lycée Test', code: 'LT01', adminId: null }

describe('Etablissement.controller', () => {
  let req, res

  beforeEach(() => {
    jest.clearAllMocks()
    req = { params: {}, body: {}, user: { id: 1, roleId: 1 } }
    res = mockRes()
  })

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('retourne 200 avec la liste', async () => {
      EtablissementService.findAll.mockResolvedValue([mockEtab])

      await findAll(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: [mockEtab] }))
    })

    it('retourne 500 en cas d\'erreur', async () => {
      EtablissementService.findAll.mockRejectedValue(new Error('DB error'))

      await findAll(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('roleId=1 — retourne 200 si trouvé', async () => {
      req.params.id = '1'
      EtablissementService.findOne.mockResolvedValue(mockEtab)

      await findOne(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockEtab }))
    })

    it('roleId=1 — retourne 404 si non trouvé', async () => {
      req.params.id = '999'
      EtablissementService.findOne.mockResolvedValue(null)

      await findOne(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('roleId=4 — retourne 200 si c\'est bien son établissement', async () => {
      req.user = { id: 10, roleId: 4 }
      req.params.id = '1'
      EtablissementService.findByAdmin.mockResolvedValue(mockEtab)

      await findOne(req, res)

      expect(EtablissementService.findByAdmin).toHaveBeenCalledWith(10)
      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('roleId=4 — retourne 403 si l\'id ne correspond pas à son établissement', async () => {
      req.user = { id: 10, roleId: 4 }
      req.params.id = '99'
      EtablissementService.findByAdmin.mockResolvedValue(mockEtab) // id=1 ≠ 99

      await findOne(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('roleId=4 — retourne 404 si aucun établissement trouvé pour cet admin', async () => {
      req.user = { id: 10, roleId: 4 }
      req.params.id = '1'
      EtablissementService.findByAdmin.mockResolvedValue(null)

      await findOne(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('retourne 201 à la création', async () => {
      req.body = { name: 'Lycée Test', code: 'LT01' }
      EtablissementService.create.mockResolvedValue(mockEtab)

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockEtab }))
    })

    it('retourne 409 si le code est déjà utilisé', async () => {
      req.body = { name: 'Test', code: 'LT01' }
      const err = new Error('unique')
      err.name = 'SequelizeUniqueConstraintError'
      EtablissementService.create.mockRejectedValue(err)

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(409)
    })

    it('retourne 500 en cas d\'erreur inattendue', async () => {
      EtablissementService.create.mockRejectedValue(new Error('crash'))

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('retourne 200 si mis à jour', async () => {
      req.params.id = '1'
      req.body = { name: 'Nouveau nom' }
      EtablissementService.update.mockResolvedValue({ ...mockEtab, name: 'Nouveau nom' })

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('retourne 404 si non trouvé', async () => {
      req.params.id = '999'
      EtablissementService.update.mockResolvedValue(null)

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('retourne 409 si code dupliqué', async () => {
      req.params.id = '1'
      const err = new Error('unique')
      err.name = 'SequelizeUniqueConstraintError'
      EtablissementService.update.mockRejectedValue(err)

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(409)
    })
  })

  // ── destroy ────────────────────────────────────────────────────────────────

  describe('destroy', () => {
    it('retourne 200 si supprimé', async () => {
      req.params.id = '1'
      EtablissementService.delete.mockResolvedValue(true)

      await destroy(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('retourne 404 si non trouvé', async () => {
      req.params.id = '999'
      EtablissementService.delete.mockResolvedValue(null)

      await destroy(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })
})

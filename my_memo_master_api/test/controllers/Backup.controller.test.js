const BackupService = require('../../services/Backup.service')
const logger = require('../../helpers/logger')

jest.mock('../../services/Backup.service', () => ({
  getStatus: jest.fn(),
  findAll: jest.fn(),
  startManual: jest.fn()
}))
jest.mock('../../helpers/logger', () => ({ error: jest.fn() }))

const { findAll, create } = require('../../controllers/Backup.controller')

const mockRes = () => {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

describe('Backup.controller', () => {
  let req, res

  beforeEach(() => {
    jest.clearAllMocks()
    req = { query: {}, user: { id: 9 } }
    res = mockRes()
  })

  describe('findAll', () => {
    it('retourne 200 avec l\'état et l\'historique', async () => {
      BackupService.getStatus.mockResolvedValue({ supported: true })
      BackupService.findAll.mockResolvedValue([{ id: 1 }])
      req.query = { limit: '10' }

      await findAll(req, res)

      expect(BackupService.findAll).toHaveBeenCalledWith('10')
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: { status: { supported: true }, runs: [{ id: 1 }] } }))
    })

    it('retourne 500 en cas d\'erreur service', async () => {
      BackupService.getStatus.mockRejectedValue(new Error('DB error'))

      await findAll(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(logger.error).toHaveBeenCalled()
    })
  })

  describe('create', () => {
    it('retourne 201 avec l\'exécution lancée par l\'utilisateur connecté', async () => {
      BackupService.startManual.mockResolvedValue({ id: 4, status: 'running' })

      await create(req, res)

      expect(BackupService.startManual).toHaveBeenCalledWith(9)
      expect(res.status).toHaveBeenCalledWith(201)
    })

    it.each(['UNSUPPORTED', 'ALREADY_RUNNING'])('retourne 400 pour l\'erreur attendue %s', async (code) => {
      BackupService.startManual.mockRejectedValue(Object.assign(new Error('Refusée.'), { code }))

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ message: 'Refusée.' })
      expect(logger.error).not.toHaveBeenCalled()
    })

    it('retourne 500 pour une erreur inattendue', async () => {
      BackupService.startManual.mockRejectedValue(new Error('boom'))

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(logger.error).toHaveBeenCalled()
    })
  })
})

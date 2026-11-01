const ContentReportService = require('../../services/ContentReport.service')

jest.mock('../../services/ContentReport.service', () => ({
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  claim: jest.fn(),
  dismiss: jest.fn(),
  hide: jest.fn(),
  restore: jest.fn(),
  removeContent: jest.fn()
}))
jest.mock('../../helpers/logger', () => ({ error: jest.fn() }))

const controller = require('../../controllers/ContentReport.controller')

const mockRes = () => {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}
const mockReq = (extra = {}) => ({ user: { id: 7, roleId: 5 }, params: { id: '3' }, body: {}, query: {}, ...extra })

describe('ContentReport.controller', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('create', () => {
    it('create — signalement accepté — répond 201 avec le dossier', async () => {
      ContentReportService.create.mockResolvedValue({ data: { id: 1 } })
      const res = mockRes()

      await controller.create(mockReq({ body: { contentType: 'resource', contentId: 4, reason: 'spam' } }), res)

      expect(ContentReportService.create).toHaveBeenCalledWith(7, { contentType: 'resource', contentId: 4, reason: 'spam' })
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: { id: 1 } }))
    })

    it.each([
      ['not_found', 404],
      ['forbidden', 403],
      ['own_content', 400],
      ['duplicate', 409],
      ['already_hidden', 409],
      ['rate_limited', 429]
    ])('create — erreur %s — répond %i avec un message en français', async (error, status) => {
      ContentReportService.create.mockResolvedValue({ error })
      const res = mockRes()

      await controller.create(mockReq(), res)

      expect(res.status).toHaveBeenCalledWith(status)
      expect(res.json).toHaveBeenCalledWith({ message: expect.any(String) })
    })

    it('create — exception du service — répond 500', async () => {
      ContentReportService.create.mockRejectedValue(new Error('boom'))
      const res = mockRes()

      await controller.create(mockReq(), res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('findAll', () => {
    it('findAll — transmet le demandeur et les filtres — répond 200', async () => {
      ContentReportService.findAll.mockResolvedValue({ items: [], total: 0 })
      const res = mockRes()

      await controller.findAll(mockReq({ query: { status: 'hidden' } }), res)

      expect(ContentReportService.findAll).toHaveBeenCalledWith({ id: 7, roleId: 5 }, { status: 'hidden' })
      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('findAll — exception du service — répond 500', async () => {
      ContentReportService.findAll.mockRejectedValue(new Error('boom'))
      const res = mockRes()

      await controller.findAll(mockReq(), res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('findOne', () => {
    it('findOne — hors périmètre — répond 404', async () => {
      ContentReportService.findOne.mockResolvedValue({ error: 'not_found' })
      const res = mockRes()

      await controller.findOne(mockReq(), res)

      expect(ContentReportService.findOne).toHaveBeenCalledWith(3, { id: 7, roleId: 5 })
      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('findOne — signalement visant son propre contenu — répond 403', async () => {
      ContentReportService.findOne.mockResolvedValue({ error: 'own_report' })
      const res = mockRes()

      await controller.findOne(mockReq(), res)

      expect(res.status).toHaveBeenCalledWith(403)
    })
  })

  describe.each([
    ['claim', 'Signalement pris en charge.', false],
    ['dismiss', 'Signalement rejeté.', true],
    ['hide', 'Contenu masqué pour 30 jours au maximum.', true],
    ['restore', 'Contenu rétabli.', false],
    ['removeContent', 'Contenu supprimé définitivement.', true]
  ])('%s', (action, message, takesNote) => {
    it(`${action} — action réussie — répond 200`, async () => {
      ContentReportService[action].mockResolvedValue({ data: { id: 3 } })
      const res = mockRes()

      await controller[action](mockReq({ body: { decisionNote: 'Motif' } }), res)

      const expected = takesNote ? [3, { id: 7, roleId: 5 }, 'Motif'] : [3, { id: 7, roleId: 5 }]
      expect(ContentReportService[action]).toHaveBeenCalledWith(...expected)
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({ message, data: { id: 3 } })
    })

    it(`${action} — statut incompatible — répond 409`, async () => {
      ContentReportService[action].mockResolvedValue({ error: 'conflict' })
      const res = mockRes()

      await controller[action](mockReq({ body: { decisionNote: 'Motif' } }), res)

      expect(res.status).toHaveBeenCalledWith(409)
    })

    it(`${action} — exception du service — répond 500`, async () => {
      ContentReportService[action].mockRejectedValue(new Error('boom'))
      const res = mockRes()

      await controller[action](mockReq({ body: { decisionNote: 'Motif' } }), res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })
})

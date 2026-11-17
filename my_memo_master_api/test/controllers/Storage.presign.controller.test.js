const storage = require('../../controllers/Storage.controller')
const ClassGroupResourceService = require('../../services/ClassGroupResource.service')
const ContentReportService = require('../../services/ContentReport.service')

jest.mock('../../services/ClassGroupResource.service', () => ({ canAccessFile: jest.fn() }))
jest.mock('../../services/ContentReport.service', () => ({ canAccessFile: jest.fn() }))
jest.mock('@aws-sdk/client-s3', () => ({ GetObjectCommand: jest.fn(), DeleteObjectCommand: jest.fn() }))
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://signed.example/cours.pdf')
}))
jest.mock('../../config/storage.config', () => ({ s3Client: {}, bucket: 'test-bucket', publicUrl: '' }))
jest.mock('../../helpers/logger', () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }))

const mockRes = () => {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.send = jest.fn().mockReturnValue(res)
  return res
}
const req = (key) => ({ query: { key }, user: { id: 2 } })

describe('Storage.presignFile — contrôle d’accès', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ClassGroupResourceService.canAccessFile.mockResolvedValue(true)
    ContentReportService.canAccessFile.mockResolvedValue(true)
  })

  it('accès autorisé — 200 avec URL signée', async () => {
    const res = mockRes()
    await storage.presignFile(req('uploads/7/cours.pdf'), res)

    expect(ClassGroupResourceService.canAccessFile).toHaveBeenCalledWith('uploads/7/cours.pdf', 2)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.send).toHaveBeenCalledWith({ url: 'https://signed.example/cours.pdf' })
  })

  it('non-membre du groupe — 404 sans URL signée', async () => {
    ClassGroupResourceService.canAccessFile.mockResolvedValue(false)
    const res = mockRes()
    await storage.presignFile(req('uploads/7/cours.pdf'), res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.send).toHaveBeenCalledWith({ message: 'Fichier introuvable.' })
  })

  it('ressource masquée par la modération — 404', async () => {
    ContentReportService.canAccessFile.mockResolvedValue(false)
    const res = mockRes()
    await storage.presignFile(req('uploads/7/cours.pdf'), res)

    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('clé hors zone uploads — 400 sans contrôle de groupe', async () => {
    const res = mockRes()
    await storage.presignFile(req('backups/prod/db.sql'), res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(ClassGroupResourceService.canAccessFile).not.toHaveBeenCalled()
  })
})

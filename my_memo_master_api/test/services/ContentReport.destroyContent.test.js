const { ClassGroupResource } = require('../../models/index')
const { s3Client } = require('../../config/storage.config')
const ContentReportService = require('../../services/ContentReport.service')

jest.mock('../../models/index', () => ({
  ClassGroupResource: { count: jest.fn() }
}))
jest.mock('../../config/storage.config', () => ({ s3Client: { send: jest.fn() }, bucket: 'bucket' }))
jest.mock('@aws-sdk/client-s3', () => ({ DeleteObjectCommand: jest.fn((input) => input) }))
jest.mock('../../helpers/logger', () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }))

describe('ContentReportService._destroyContent — fichier partagé entre groupes', () => {
  const makeResource = () => ({ id: 1, fileKey: 'uploads/2/cours.pdf', destroy: jest.fn().mockResolvedValue() })

  beforeEach(() => jest.clearAllMocks())

  it('ressource seule sur ce fichier — fichier supprimé du stockage puis ressource détruite', async () => {
    ClassGroupResource.count.mockResolvedValue(0)
    const resource = makeResource()
    await ContentReportService._destroyContent('resource', resource)
    expect(s3Client.send).toHaveBeenCalledTimes(1)
    expect(resource.destroy).toHaveBeenCalled()
  })

  it('fichier encore référencé dans un autre groupe — conservé, ressource détruite', async () => {
    ClassGroupResource.count.mockResolvedValue(1)
    const resource = makeResource()
    await ContentReportService._destroyContent('resource', resource)
    expect(s3Client.send).not.toHaveBeenCalled()
    expect(resource.destroy).toHaveBeenCalled()
  })

  it('section (pas de fichier) — aucune requête de comptage', async () => {
    const section = { id: 3, destroy: jest.fn().mockResolvedValue() }
    await ContentReportService._destroyContent('section', section)
    expect(ClassGroupResource.count).not.toHaveBeenCalled()
    expect(section.destroy).toHaveBeenCalled()
  })
})

const getUploadConfig = require('../../helpers/uploadConfig')

describe('getUploadConfig', () => {
  const ENV_KEY = 'MAX_UPLOAD_SIZE_MB'
  let savedEnv

  beforeEach(() => {
    savedEnv = process.env[ENV_KEY]
    delete process.env[ENV_KEY]
  })

  afterEach(() => {
    if (savedEnv === undefined) delete process.env[ENV_KEY]
    else process.env[ENV_KEY] = savedEnv
  })

  it('getUploadConfig - aucune variable d\'environnement - retourne le défaut (20 Mo)', () => {
    expect(getUploadConfig()).toEqual({
      maxFileSizeMb: 20,
      maxFileSizeBytes: 20 * 1024 * 1024
    })
  })

  it('getUploadConfig - variable renseignée - la reprend telle quelle', () => {
    process.env.MAX_UPLOAD_SIZE_MB = '50'

    expect(getUploadConfig()).toEqual({
      maxFileSizeMb: 50,
      maxFileSizeBytes: 50 * 1024 * 1024
    })
  })

  it('getUploadConfig - variable non numérique - retombe sur le défaut', () => {
    process.env.MAX_UPLOAD_SIZE_MB = 'abc'

    expect(getUploadConfig().maxFileSizeMb).toBe(20)
  })

  it('getUploadConfig - appelée deux fois avec un changement d\'environnement entre les deux - reflète le changement', () => {
    expect(getUploadConfig().maxFileSizeMb).toBe(20)
    process.env.MAX_UPLOAD_SIZE_MB = '100'
    expect(getUploadConfig().maxFileSizeMb).toBe(100)
  })
})

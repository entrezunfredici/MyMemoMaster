const getMistralConfig = require('../../helpers/mistralConfig')

describe('getMistralConfig', () => {
  const ENV_KEYS = ['MISTRAL_API_KEY', 'MISTRAL_API_URL', 'MISTRAL_MODEL', 'MISTRAL_TIMEOUT_MS']
  let savedEnv

  beforeEach(() => {
    savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))
    ENV_KEYS.forEach((key) => delete process.env[key])
  })

  afterEach(() => {
    ENV_KEYS.forEach((key) => {
      if (savedEnv[key] === undefined) delete process.env[key]
      else process.env[key] = savedEnv[key]
    })
  })

  it('getMistralConfig - aucune variable d\'environnement - retourne les valeurs par défaut', () => {
    expect(getMistralConfig()).toEqual({
      apiKey: '',
      apiUrl: 'https://api.mistral.ai/v1/chat/completions',
      model: 'mistral-small-latest',
      timeoutMs: 30000
    })
  })

  it('getMistralConfig - variables renseignées - les reprend telles quelles', () => {
    process.env.MISTRAL_API_KEY = 'sk-test'
    process.env.MISTRAL_API_URL = 'https://example.test/v1/chat'
    process.env.MISTRAL_MODEL = 'mistral-medium-latest'
    process.env.MISTRAL_TIMEOUT_MS = '5000'

    expect(getMistralConfig()).toEqual({
      apiKey: 'sk-test',
      apiUrl: 'https://example.test/v1/chat',
      model: 'mistral-medium-latest',
      timeoutMs: 5000
    })
  })

  it('getMistralConfig - appelée deux fois avec un changement d\'environnement entre les deux - reflète le changement', () => {
    expect(getMistralConfig().model).toBe('mistral-small-latest')
    process.env.MISTRAL_MODEL = 'mistral-large-latest'
    expect(getMistralConfig().model).toBe('mistral-large-latest')
  })
})

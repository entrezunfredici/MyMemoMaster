jest.mock('../../helpers/logger', () => ({
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn()
}))

const logger = require('../../helpers/logger')

const ENV_KEYS = ['APP_FRONT_URL', 'VITE_FRONT_URL', 'CORS_ORIGIN', 'VITE_PORT', 'NODE_ENV']

// Le helper mémorise les logs déjà émis (une fois par processus) → on recharge le
// module à chaque test pour repartir d'un état propre.
const loadHelper = () => {
  let helper
  jest.isolateModules(() => {
    helper = require('../../helpers/frontUrl')
  })
  return helper
}

describe('frontUrl helper', () => {
  let saved

  beforeEach(() => {
    saved = {}
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key]
      delete process.env[key]
    }
    jest.clearAllMocks()
  })

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key]
      else process.env[key] = saved[key]
    }
  })

  it('APP_FRONT_URL définie - retourne cette URL', () => {
    process.env.APP_FRONT_URL = 'https://app.my-memo-master.com'
    expect(loadHelper()()).toBe('https://app.my-memo-master.com')
    expect(logger.warn).not.toHaveBeenCalled()
    expect(logger.error).not.toHaveBeenCalled()
  })

  it('APP_FRONT_URL avec slash final - le slash est retiré', () => {
    process.env.APP_FRONT_URL = 'https://preprod.my-memo-master.com/'
    expect(loadHelper()()).toBe('https://preprod.my-memo-master.com')
  })

  it('APP_FRONT_URL vide - repli sur VITE_FRONT_URL', () => {
    process.env.APP_FRONT_URL = '   '
    process.env.VITE_FRONT_URL = 'https://preprod.my-memo-master.com'
    expect(loadHelper()()).toBe('https://preprod.my-memo-master.com')
  })

  it('seule CORS_ORIGIN définie - repli sur la 1re origine et log un avertissement', () => {
    process.env.CORS_ORIGIN = 'https://app.my-memo-master.com, https://autre.example.com'
    expect(loadHelper()()).toBe('https://app.my-memo-master.com')
    expect(logger.warn).toHaveBeenCalledTimes(1)
  })

  it('repli CORS - le log n avertit qu une seule fois par processus', () => {
    process.env.CORS_ORIGIN = 'https://app.my-memo-master.com'
    const getFrontUrl = loadHelper()
    getFrontUrl()
    getFrontUrl()
    getFrontUrl()
    expect(logger.warn).toHaveBeenCalledTimes(1)
  })

  it('aucune variable en production - retourne localhost et log une erreur', () => {
    process.env.NODE_ENV = 'production'
    expect(loadHelper()()).toBe('http://localhost')
    expect(logger.error).toHaveBeenCalledTimes(1)
  })

  it('aucune variable en dev avec VITE_PORT - retourne localhost:PORT sans log d erreur', () => {
    process.env.NODE_ENV = 'development'
    process.env.VITE_PORT = '5173'
    expect(loadHelper()()).toBe('http://localhost:5173')
    expect(logger.error).not.toHaveBeenCalled()
  })

  it('aucune variable en dev avec VITE_PORT=80 - retourne localhost sans port', () => {
    process.env.NODE_ENV = 'development'
    process.env.VITE_PORT = '80'
    expect(loadHelper()()).toBe('http://localhost')
  })

  it('priorité APP_FRONT_URL > VITE_FRONT_URL > CORS_ORIGIN', () => {
    process.env.APP_FRONT_URL = 'https://app.example.com'
    process.env.VITE_FRONT_URL = 'https://vite.example.com'
    process.env.CORS_ORIGIN = 'https://cors.example.com'
    expect(loadHelper()()).toBe('https://app.example.com')

    delete process.env.APP_FRONT_URL
    expect(loadHelper()()).toBe('https://vite.example.com')

    delete process.env.VITE_FRONT_URL
    expect(loadHelper()()).toBe('https://cors.example.com')
  })
})

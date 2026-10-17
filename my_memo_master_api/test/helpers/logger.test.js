// Le format texte (hors production) ne doit pas laisser une donnée utilisateur forger une ligne de journal.

describe('logger — injection de journaux', () => {
  const loadLogger = (env) => {
    jest.resetModules()
    const previous = process.env.NODE_ENV
    process.env.NODE_ENV = env
    const lines = []
    jest.doMock('winston', () => {
      const actual = jest.requireActual('winston')
      class Capture extends actual.transports.Console {
        log(info, cb) { lines.push(info[Symbol.for('message')]); cb() }
      }
      return { ...actual, transports: { ...actual.transports, Console: Capture } }
    })
    const logger = require('../../helpers/logger')
    process.env.NODE_ENV = previous
    return { logger, lines }
  }

  afterEach(() => jest.dontMock('winston'))

  test('hors production : un saut de ligne dans le message ne crée pas une seconde ligne', () => {
    const { logger, lines } = loadLogger('development')
    logger.error('connexion échouée pour bob\n12:00:00 [info] admin connecté')
    expect(lines).toHaveLength(1)
    expect(lines[0]).not.toMatch(/[\r\n]/)
    expect(lines[0]).toContain('connexion échouée pour bob')
  })

  test('en production : JSON, les sauts de ligne sont échappés', () => {
    const { logger, lines } = loadLogger('production')
    logger.error('a\nb')
    expect(lines).toHaveLength(1)
    expect(lines[0]).not.toMatch(/\n/)
    expect(JSON.parse(lines[0]).message).toBe('a\nb')
  })
})

const sanitizeLog = require('../../helpers/sanitizeLog')
const { getProvider } = require('../../config/oauth.config')

describe('sanitizeLog', () => {
  test('sanitizeLog - texte simple - inchangé', () => {
    expect(sanitizeLog('google')).toBe('google')
  })

  test('sanitizeLog - retours à la ligne et tabulations - remplacés par une espace (pas de fausse entrée de log)', () => {
    expect(sanitizeLog('google\nWARN faux message\r\ninjecté\t!')).toBe('google WARN faux message injecté !')
  })

  test('sanitizeLog - caractères de contrôle - supprimés', () => {
    expect(sanitizeLog('a\u0000b\u001bc\u007fd')).toBe('a b c d')
  })

  test('sanitizeLog - valeur très longue - tronquée à 200 caractères', () => {
    expect(sanitizeLog('x'.repeat(500))).toHaveLength(200)
  })

  test('sanitizeLog - valeur non texte - convertie en chaîne', () => {
    expect(sanitizeLog(undefined)).toBe('undefined')
    expect(sanitizeLog(42)).toBe('42')
  })
})

describe('getProvider', () => {
  test('getProvider - fournisseur connu - renvoie sa configuration avec son identifiant', () => {
    expect(getProvider('github')).toMatchObject({ id: 'github' })
  })

  test('getProvider - identifiant inconnu ou hérité de Object - null', () => {
    expect(getProvider('inconnu')).toBeNull()
    expect(getProvider('constructor')).toBeNull()
    expect(getProvider('__proto__')).toBeNull()
    expect(getProvider(undefined)).toBeNull()
  })
})

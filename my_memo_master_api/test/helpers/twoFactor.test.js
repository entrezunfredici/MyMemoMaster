const jwt = require('jsonwebtoken')
const {
  isTwoFactorMandatory,
  isTwoFactorRequired,
  signChallengeToken,
  verifyChallengeToken
} = require('../../helpers/twoFactor')

describe('twoFactor helper', () => {
  beforeAll(() => {
    process.env.AUTH_JWT_SECRET = 'test-secret'
  })

  describe('isTwoFactorMandatory', () => {
    it.each([1, 4])('rôle %i (administrateur) - obligatoire', (roleId) => {
      expect(isTwoFactorMandatory({ roleId })).toBe(true)
    })

    it.each([2, 3, 5, null, undefined])('rôle %s - non obligatoire', (roleId) => {
      expect(isTwoFactorMandatory({ roleId })).toBe(false)
    })

    it('utilisateur absent - non obligatoire', () => {
      expect(isTwoFactorMandatory(undefined)).toBe(false)
    })
  })

  describe('isTwoFactorRequired', () => {
    it('utilisateur standard sans activation - non requis', () => {
      expect(isTwoFactorRequired({ roleId: 2, twoFactorEnabled: false })).toBe(false)
    })

    it('utilisateur standard ayant activé la 2FA - requis', () => {
      expect(isTwoFactorRequired({ roleId: 2, twoFactorEnabled: true })).toBe(true)
    })

    it('administrateur sans activation volontaire - requis quand même', () => {
      expect(isTwoFactorRequired({ roleId: 1, twoFactorEnabled: false })).toBe(true)
    })
  })

  describe('interrupteur de test TWO_FACTOR_DISABLED', () => {
    const originalDisabled = process.env.TWO_FACTOR_DISABLED
    const originalNodeEnv = process.env.NODE_ENV

    afterEach(() => {
      if (originalDisabled === undefined) delete process.env.TWO_FACTOR_DISABLED
      else process.env.TWO_FACTOR_DISABLED = originalDisabled
      process.env.NODE_ENV = originalNodeEnv
    })

    it('TWO_FACTOR_DISABLED=true hors production - la 2FA n\'est plus requise, même pour un admin', () => {
      process.env.TWO_FACTOR_DISABLED = 'true'
      process.env.NODE_ENV = 'development'
      expect(isTwoFactorRequired({ roleId: 2, twoFactorEnabled: true })).toBe(false)
      expect(isTwoFactorRequired({ roleId: 1, twoFactorEnabled: true })).toBe(false)
    })

    it('TWO_FACTOR_DISABLED=true en production - ignoré, la 2FA reste requise', () => {
      process.env.TWO_FACTOR_DISABLED = 'true'
      process.env.NODE_ENV = 'production'
      expect(isTwoFactorRequired({ roleId: 2, twoFactorEnabled: true })).toBe(true)
      expect(isTwoFactorRequired({ roleId: 1, twoFactorEnabled: false })).toBe(true)
    })

    it.each(['false', '1', 'TRUE', ''])('valeur "%s" - ne désactive rien (seul "true" exact compte)', (value) => {
      process.env.TWO_FACTOR_DISABLED = value
      process.env.NODE_ENV = 'development'
      expect(isTwoFactorRequired({ roleId: 2, twoFactorEnabled: true })).toBe(true)
    })

    it('ne change pas le caractère obligatoire d\'un rôle (affichage du profil, refus de désactivation)', () => {
      process.env.TWO_FACTOR_DISABLED = 'true'
      process.env.NODE_ENV = 'development'
      expect(isTwoFactorMandatory({ roleId: 1 })).toBe(true)
    })
  })

  describe('jeton de défi', () => {
    it('signChallengeToken puis verifyChallengeToken - retourne l\'ID utilisateur', () => {
      expect(verifyChallengeToken(signChallengeToken(42))).toBe(42)
    })

    it('verifyChallengeToken - jeton invalide - retourne null', () => {
      expect(verifyChallengeToken('pas-un-jwt')).toBeNull()
      expect(verifyChallengeToken(undefined)).toBeNull()
    })

    it('verifyChallengeToken - jeton expiré - retourne null', () => {
      const expired = jwt.sign({ id: 1 }, `${process.env.AUTH_JWT_SECRET}:two-factor`, { expiresIn: -10 })
      expect(verifyChallengeToken(expired)).toBeNull()
    })

    it('un jeton d\'accès ne passe pas pour un jeton de défi', () => {
      const accessToken = jwt.sign({ id: 1 }, process.env.AUTH_JWT_SECRET, { expiresIn: '15m' })
      expect(verifyChallengeToken(accessToken)).toBeNull()
    })

    it('un jeton de défi ne passe pas pour un jeton d\'accès', () => {
      const challenge = signChallengeToken(1)
      expect(() => jwt.verify(challenge, process.env.AUTH_JWT_SECRET)).toThrow()
    })
  })
})

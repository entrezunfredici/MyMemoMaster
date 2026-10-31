jest.mock('../../helpers/logger', () => ({
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn()
}))
jest.mock('nodemailer', () => ({ createTransport: jest.fn() }))

const nodemailer = require('nodemailer')
const logger = require('../../helpers/logger')
const sendEmail = require('../../helpers/sendEmail')

const ENV_KEYS = [
  'EMAIL_FROM', 'SMTP_PROVIDERS', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASS',
  'SMTP_TIMEOUT_MS', 'SMTP_BREAKER_THRESHOLD', 'SMTP_BREAKER_COOLDOWN_MS',
  'SMTP_PRIMARY_HOST', 'SMTP_PRIMARY_PORT', 'SMTP_PRIMARY_SECURE', 'SMTP_PRIMARY_USER', 'SMTP_PRIMARY_PASS',
  'SMTP_SECONDARY_HOST', 'SMTP_SECONDARY_USER', 'SMTP_SECONDARY_PASS',
  'SMTP_MY_RELAY_HOST', 'SMTP_GHOST_USER'
]

const smtpError = (code, responseCode, message = 'erreur SMTP') =>
  Object.assign(new Error(message), { code, responseCode })

describe('sendEmail helper', () => {
  let saved
  let mailers

  const configureTwoProviders = () => {
    process.env.SMTP_PROVIDERS = 'primary,secondary'
    process.env.SMTP_PRIMARY_HOST = 'primary.example.com'
    process.env.SMTP_PRIMARY_PORT = '465'
    process.env.SMTP_PRIMARY_SECURE = 'true'
    process.env.SMTP_PRIMARY_USER = 'user-1'
    process.env.SMTP_PRIMARY_PASS = 'pass-1'
    process.env.SMTP_SECONDARY_HOST = 'secondary.example.com'
    process.env.SMTP_SECONDARY_USER = 'user-2'
    process.env.SMTP_SECONDARY_PASS = 'pass-2'
  }

  beforeEach(() => {
    saved = {}
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key]
      delete process.env[key]
    }
    process.env.EMAIL_FROM = 'support@example.com'

    jest.clearAllMocks()
    sendEmail.resetState()
    mailers = {
      'primary.example.com': jest.fn().mockResolvedValue({}),
      'secondary.example.com': jest.fn().mockResolvedValue({}),
      'legacy.example.com': jest.fn().mockResolvedValue({}),
      'my-relay.example.com': jest.fn().mockResolvedValue({})
    }
    nodemailer.createTransport.mockImplementation((options) => ({ sendMail: mailers[options.host] }))
  })

  afterEach(() => {
    jest.restoreAllMocks()
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key]
      else process.env[key] = saved[key]
    }
  })

  describe('sans SMTP_PROVIDERS (comportement historique)', () => {
    beforeEach(() => {
      process.env.SMTP_HOST = 'legacy.example.com'
      process.env.SMTP_PORT = '587'
      process.env.SMTP_SECURE = 'false'
      process.env.SMTP_USER = 'legacy-user'
      process.env.SMTP_PASS = 'legacy-pass'
    })

    it('sendEmail - SMTP_* seuls - envoie via ce provider avec expéditeur, destinataire, objet et texte', async () => {
      await sendEmail('Objet', 'Corps', 'dest@example.com')

      expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({
        host: 'legacy.example.com', port: 587, secure: false, auth: { user: 'legacy-user', pass: 'legacy-pass' }
      }))
      expect(mailers['legacy.example.com']).toHaveBeenCalledWith({
        from: 'support@example.com', to: 'dest@example.com', subject: 'Objet', text: 'Corps'
      })
    })

    it('sendEmail - expéditeur fourni - l\'utilise à la place de EMAIL_FROM', async () => {
      await sendEmail('Objet', 'Corps', 'dest@example.com', 'autre@example.com')

      expect(mailers['legacy.example.com']).toHaveBeenCalledWith(expect.objectContaining({ from: 'autre@example.com' }))
    })

    it('sendEmail - échec d\'envoi - relance l\'erreur d\'origine', async () => {
      const failure = smtpError('ECONNECTION', undefined, 'connexion refusée')
      mailers['legacy.example.com'].mockRejectedValue(failure)

      await expect(sendEmail('Objet', 'Corps', 'dest@example.com')).rejects.toBe(failure)
    })

    it('sendEmail - SMTP_TIMEOUT_MS défini - le transmet au transporteur', async () => {
      process.env.SMTP_TIMEOUT_MS = '3000'

      await sendEmail('Objet', 'Corps', 'dest@example.com')

      expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({
        connectionTimeout: 3000, greetingTimeout: 3000, socketTimeout: 3000
      }))
    })

    it('sendEmail - SMTP_TIMEOUT_MS invalide - retombe sur 10 s', async () => {
      process.env.SMTP_TIMEOUT_MS = 'abc'

      await sendEmail('Objet', 'Corps', 'dest@example.com')

      expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({ connectionTimeout: 10000 }))
    })
  })

  describe('paramètres', () => {
    it.each([
      ['objet', ['', 'Corps', 'dest@example.com']],
      ['texte', ['Objet', '', 'dest@example.com']],
      ['destinataire', ['Objet', 'Corps', '']]
    ])('sendEmail - %s manquant - lève une erreur sans envoyer', async (_label, args) => {
      process.env.SMTP_HOST = 'legacy.example.com'

      await expect(sendEmail(...args)).rejects.toThrow('Missing email parameters')
      expect(mailers['legacy.example.com']).not.toHaveBeenCalled()
    })

    it('sendEmail - aucun expéditeur - lève une erreur', async () => {
      delete process.env.EMAIL_FROM

      await expect(sendEmail('Objet', 'Corps', 'dest@example.com')).rejects.toThrow('Missing email parameters')
    })
  })

  describe('avec SMTP_PROVIDERS', () => {
    beforeEach(configureTwoProviders)

    it('sendEmail - le premier provider répond - le second n\'est pas utilisé', async () => {
      await sendEmail('Objet', 'Corps', 'dest@example.com')

      expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({
        host: 'primary.example.com', port: 465, secure: true, auth: { user: 'user-1', pass: 'pass-1' }
      }))
      expect(mailers['primary.example.com']).toHaveBeenCalledTimes(1)
      expect(mailers['secondary.example.com']).not.toHaveBeenCalled()
      expect(logger.warn).not.toHaveBeenCalled()
    })

    it('sendEmail - port absent - utilise 587 par défaut', async () => {
      process.env.SMTP_PROVIDERS = 'secondary'

      await sendEmail('Objet', 'Corps', 'dest@example.com')

      expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({ port: 587, secure: false }))
    })

    it('sendEmail - le premier est injoignable - bascule sur le second et le journalise', async () => {
      mailers['primary.example.com'].mockRejectedValue(smtpError('ETIMEDOUT', undefined, 'délai dépassé'))

      await sendEmail('Objet', 'Corps', 'dest@example.com')

      expect(mailers['secondary.example.com']).toHaveBeenCalledWith({
        from: 'support@example.com', to: 'dest@example.com', subject: 'Objet', text: 'Corps'
      })
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('bascule sur « secondary »'))
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('provider de secours « secondary »'))
    })

    it('sendEmail - authentification refusée (535) - bascule sur le second', async () => {
      mailers['primary.example.com'].mockRejectedValue(smtpError('EAUTH', 535, 'Invalid login'))

      await sendEmail('Objet', 'Corps', 'dest@example.com')

      expect(mailers['secondary.example.com']).toHaveBeenCalledTimes(1)
    })

    it('sendEmail - expéditeur refusé (550 sender denied) - bascule sur le second', async () => {
      mailers['primary.example.com'].mockRejectedValue(smtpError('EMESSAGE', 550, 'Sender denied'))

      await sendEmail('Objet', 'Corps', 'dest@example.com')

      expect(mailers['secondary.example.com']).toHaveBeenCalledTimes(1)
    })

    it('sendEmail - destinataire refusé (EENVELOPE) - relance l\'erreur sans essayer le second', async () => {
      const rejection = smtpError('EENVELOPE', 550, 'destinataire inconnu')
      mailers['primary.example.com'].mockRejectedValue(rejection)

      await expect(sendEmail('Objet', 'Corps', 'dest@example.com')).rejects.toBe(rejection)
      expect(mailers['secondary.example.com']).not.toHaveBeenCalled()
    })

    it('sendEmail - tous les providers échouent - lève une erreur qui nomme les providers et garde la cause', async () => {
      const lastFailure = smtpError('ECONNECTION', undefined, 'second HS')
      mailers['primary.example.com'].mockRejectedValue(smtpError('ETIMEDOUT'))
      mailers['secondary.example.com'].mockRejectedValue(lastFailure)

      const error = await sendEmail('Objet', 'Corps', 'dest@example.com').catch((e) => e)

      expect(error.message).toContain('primary, secondary')
      expect(error.cause).toBe(lastFailure)
    })

    it('sendEmail - nom avec tirets - lit les variables en majuscules avec underscores', async () => {
      process.env.SMTP_PROVIDERS = 'my-relay'
      process.env.SMTP_MY_RELAY_HOST = 'my-relay.example.com'

      await sendEmail('Objet', 'Corps', 'dest@example.com')

      expect(mailers['my-relay.example.com']).toHaveBeenCalledTimes(1)
    })

    it('sendEmail - provider sans HOST - l\'ignore, le signale une seule fois et utilise les autres', async () => {
      process.env.SMTP_PROVIDERS = 'ghost,secondary'

      await sendEmail('Objet', 'Corps', 'dest@example.com')
      await sendEmail('Objet', 'Corps', 'dest@example.com')

      expect(mailers['secondary.example.com']).toHaveBeenCalledTimes(2)
      expect(logger.error).toHaveBeenCalledTimes(1)
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('SMTP_GHOST_HOST'))
    })

    it('sendEmail - aucun provider valide - lève une erreur de configuration', async () => {
      process.env.SMTP_PROVIDERS = 'ghost'

      await expect(sendEmail('Objet', 'Corps', 'dest@example.com')).rejects.toThrow('Aucun provider SMTP configuré')
    })

    it('sendEmail - échec journalisé - ne contient aucun identifiant', async () => {
      mailers['primary.example.com'].mockRejectedValue(smtpError('EAUTH', 535, 'Invalid login'))

      await sendEmail('Objet', 'Corps', 'dest@example.com')

      const logged = JSON.stringify([...logger.warn.mock.calls, ...logger.error.mock.calls])
      expect(logged).not.toContain('pass-1')
      expect(logged).not.toContain('user-1')
    })
  })

  describe('disjoncteur', () => {
    beforeEach(() => {
      configureTwoProviders()
      process.env.SMTP_BREAKER_THRESHOLD = '2'
      process.env.SMTP_BREAKER_COOLDOWN_MS = '60000'
      mailers['primary.example.com'].mockRejectedValue(smtpError('ETIMEDOUT'))
    })

    it('sendEmail - provider en échec répété - est sauté pendant la pause', async () => {
      await sendEmail('A', 'a', 'dest@example.com')
      await sendEmail('B', 'b', 'dest@example.com')
      await sendEmail('C', 'c', 'dest@example.com')

      expect(mailers['primary.example.com']).toHaveBeenCalledTimes(2)
      expect(mailers['secondary.example.com']).toHaveBeenCalledTimes(3)
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('mis en pause 60 s'))
    })

    it('sendEmail - pause écoulée - réessaie le provider', async () => {
      const now = jest.spyOn(Date, 'now').mockReturnValue(1000)
      await sendEmail('A', 'a', 'dest@example.com')
      await sendEmail('B', 'b', 'dest@example.com')

      now.mockReturnValue(1000 + 60001)
      mailers['primary.example.com'].mockResolvedValue({})
      await sendEmail('C', 'c', 'dest@example.com')

      expect(mailers['primary.example.com']).toHaveBeenCalledTimes(3)
      expect(mailers['secondary.example.com']).toHaveBeenCalledTimes(2)
    })

    it('sendEmail - succès après des échecs - remet le compteur à zéro', async () => {
      process.env.SMTP_BREAKER_THRESHOLD = '3'
      await sendEmail('A', 'a', 'dest@example.com')
      await sendEmail('B', 'b', 'dest@example.com')
      mailers['primary.example.com'].mockResolvedValueOnce({})
      await sendEmail('C', 'c', 'dest@example.com')
      mailers['primary.example.com'].mockRejectedValue(smtpError('ETIMEDOUT'))
      await sendEmail('D', 'd', 'dest@example.com')
      await sendEmail('E', 'e', 'dest@example.com')

      expect(mailers['primary.example.com']).toHaveBeenCalledTimes(5)
    })

    it('sendEmail - tous les providers en pause - les réessaie quand même', async () => {
      mailers['secondary.example.com'].mockRejectedValue(smtpError('ETIMEDOUT'))
      await expect(sendEmail('A', 'a', 'dest@example.com')).rejects.toThrow()
      await expect(sendEmail('B', 'b', 'dest@example.com')).rejects.toThrow()

      mailers['secondary.example.com'].mockResolvedValue({})
      await sendEmail('C', 'c', 'dest@example.com')

      expect(mailers['secondary.example.com']).toHaveBeenCalledTimes(3)
    })

    it('sendEmail - destinataire refusé - ne compte pas comme un échec du provider', async () => {
      mailers['primary.example.com'].mockRejectedValue(smtpError('EENVELOPE', 550))
      await expect(sendEmail('A', 'a', 'x@example.com')).rejects.toThrow()
      await expect(sendEmail('B', 'b', 'y@example.com')).rejects.toThrow()
      await expect(sendEmail('C', 'c', 'z@example.com')).rejects.toThrow()

      expect(mailers['primary.example.com']).toHaveBeenCalledTimes(3)
      expect(logger.warn).not.toHaveBeenCalled()
    })
  })
})

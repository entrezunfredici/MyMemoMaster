const nodemailer = require('nodemailer')
const logger = require('./logger')

const LEGACY_PROVIDER_NAME = 'default'
const DEFAULT_TIMEOUT_MS = 10000
const DEFAULT_BREAKER_THRESHOLD = 3
const DEFAULT_BREAKER_COOLDOWN_MS = 60000

// État en mémoire par provider : transporteur Nodemailer, échecs consécutifs, fin de pause du disjoncteur.
// CHOIX: état local au processus plutôt que partagé via Redis
// RAISON: chaque pod découvre seul qu'un provider est en panne en quelques envois ; aucune dépendance en plus
const providerStates = new Map()
const alreadyReportedConfigErrors = new Set()

const readPositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const providerEnvKey = (providerName, field) =>
  `SMTP_${providerName.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_${field}`

/**
 * Lit la liste ordonnée des providers SMTP depuis l'environnement.
 *
 * Sans `SMTP_PROVIDERS`, un seul provider est lu depuis `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` /
 * `SMTP_USER` / `SMTP_PASS` (comportement historique). Avec `SMTP_PROVIDERS=hostinger,mailjet`, chaque nom
 * lit `SMTP_<NOM>_HOST`, `_PORT`, `_SECURE`, `_USER`, `_PASS` ; l'ordre de la liste est l'ordre d'essai.
 *
 * @returns {Array<{name: string, host: string, port: number, secure: boolean, user: string, pass: string}>}
 */
const loadProviderConfigs = () => {
  const names = (process.env.SMTP_PROVIDERS || '').split(',').map((name) => name.trim()).filter(Boolean)

  if (names.length === 0) {
    return [{
      name: LEGACY_PROVIDER_NAME,
      host: process.env.SMTP_HOST || 'smtp.hostinger.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }]
  }

  const configs = []
  for (const name of names) {
    const read = (field) => process.env[providerEnvKey(name, field)]
    const host = read('HOST')
    if (!host) {
      if (!alreadyReportedConfigErrors.has(name)) {
        alreadyReportedConfigErrors.add(name)
        logger.error(`[email] Provider « ${name} » ignoré : ${providerEnvKey(name, 'HOST')} n'est pas défini`)
      }
      continue
    }
    configs.push({
      name,
      host,
      port: parseInt(read('PORT') || '587', 10),
      secure: read('SECURE') === 'true',
      user: read('USER'),
      pass: read('PASS')
    })
  }
  return configs
}

const getProviderState = (config) => {
  let state = providerStates.get(config.name)
  if (!state) {
    const timeoutMs = readPositiveInt(process.env.SMTP_TIMEOUT_MS, DEFAULT_TIMEOUT_MS)
    state = {
      transporter: nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: { user: config.user, pass: config.pass },
        connectionTimeout: timeoutMs,
        greetingTimeout: timeoutMs,
        socketTimeout: timeoutMs
      }),
      failures: 0,
      openUntil: 0
    }
    providerStates.set(config.name, state)
  }
  return state
}

// CHOIX: seul un refus de destinataire (EENVELOPE) arrête la cascade
// RAISON: le provider a répondu normalement, un autre donnerait le même refus et multiplierait les envois ;
//   tout autre échec (connexion, timeout, authentification, expéditeur refusé, 4xx) est propre au provider
const isRecipientRejection = (error) => error?.code === 'EENVELOPE'

const recordFailure = (config, state) => {
  const threshold = readPositiveInt(process.env.SMTP_BREAKER_THRESHOLD, DEFAULT_BREAKER_THRESHOLD)
  state.failures += 1
  if (state.failures >= threshold) {
    const cooldownMs = readPositiveInt(process.env.SMTP_BREAKER_COOLDOWN_MS, DEFAULT_BREAKER_COOLDOWN_MS)
    state.openUntil = Date.now() + cooldownMs
    logger.warn(`[email] Provider « ${config.name} » mis en pause ${Math.round(cooldownMs / 1000)} s après ${state.failures} échecs consécutifs`)
  }
}

const recordSuccess = (state) => {
  state.failures = 0
  state.openUntil = 0
}

// Les providers en pause sont sautés, sauf si tous le sont : mieux vaut réessayer que de ne rien envoyer.
const pickCandidates = (configs) => {
  const now = Date.now()
  const available = configs.filter((config) => getProviderState(config).openUntil <= now)
  return available.length > 0 ? available : configs
}

/**
 * Envoie un email en essayant les providers SMTP configurés dans l'ordre jusqu'au premier succès.
 *
 * @param {string} subject - Objet du message
 * @param {string} text - Corps du message (texte brut)
 * @param {string} to - Destinataire(s)
 * @param {string} [from=process.env.EMAIL_FROM] - Expéditeur, commun à tous les providers
 * @returns {Promise<void>}
 * @throws {Error} Paramètre manquant, aucun provider configuré, destinataire refusé (propagé tel quel),
 *   ou échec de tous les providers (`cause` porte la dernière erreur)
 */
module.exports = async (subject = '', text = '', to = '', from = process.env.EMAIL_FROM) => {
  if (!subject || !text || !to || !from) throw new Error('Missing email parameters')

  const configs = loadProviderConfigs()
  if (configs.length === 0) throw new Error('Aucun provider SMTP configuré')

  const candidates = pickCandidates(configs)
  let lastError
  for (const [index, config] of candidates.entries()) {
    const state = getProviderState(config)
    try {
      await state.transporter.sendMail({ from, to, subject, text })
      recordSuccess(state)
      if (index > 0) logger.warn(`[email] Envoi réussi via le provider de secours « ${config.name} »`)
      return
    } catch (error) {
      if (isRecipientRejection(error)) throw error
      recordFailure(config, state)
      lastError = error
      const next = candidates[index + 1]
      logger.warn(`[email] Échec d'envoi via « ${config.name} » (${error.code || 'sans code'}${error.responseCode ? ` ${error.responseCode}` : ''}) : ${error.message}${next ? ` — bascule sur « ${next.name} »` : ''}`)
    }
  }

  if (candidates.length === 1) throw lastError
  const failure = new Error(`Échec de l'envoi de l'email sur tous les providers SMTP (${candidates.map((c) => c.name).join(', ')})`)
  failure.cause = lastError
  throw failure
}

/**
 * Réinitialise l'état en mémoire (transporteurs, disjoncteurs, erreurs de configuration déjà signalées).
 * Réservé aux tests.
 *
 * @returns {void}
 */
module.exports.resetState = () => {
  providerStates.clear()
  alreadyReportedConfigErrors.clear()
}

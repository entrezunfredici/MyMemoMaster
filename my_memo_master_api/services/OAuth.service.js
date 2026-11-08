const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const { OAuth2Client } = require('google-auth-library')
const bcrypt = require('bcryptjs')
const { User, UserOAuthAccount } = require('../models/index')
const userService = require('./User.service')
const logger = require('../helpers/logger')
const getFrontUrl = require('../helpers/frontUrl')
const { PROVIDER_IDS, getProvider } = require('../config/oauth.config')

const STATE_EXPIRES_IN = '10m'
const HTTP_TIMEOUT_MS = 10000

/**
 * Erreur attendue du parcours OAuth : le statut HTTP et le message (en français) sont renvoyés tels quels.
 */
class OAuthError extends Error {
  /**
   * @param {string} message - Message affichable à l'utilisateur
   * @param {number} [status=400] - Code HTTP
   */
  constructor(message, status = 400) {
    super(message)
    this.name = 'OAuthError'
    this.status = status
  }
}

// CHOIX: secret dérivé de AUTH_JWT_SECRET pour signer le paramètre `state`, comme le jeton de défi 2FA
// RAISON: un `state` ne peut jamais être accepté comme jeton d'accès (la signature échoue dans Auth.middleware.js)
const stateSecret = () => `${process.env.AUTH_JWT_SECRET}:oauth-state`

const redirectUri = (providerId) => `${getFrontUrl()}/oauth/callback/${providerId}`

const isEnabled = (provider) => Boolean(provider && provider.clientId && provider.clientSecret)

const requireProvider = (providerId) => {
  const provider = getProvider(providerId)
  if (!isEnabled(provider)) throw new OAuthError("Ce mode de connexion n'est pas disponible.", 404)
  return provider
}

const googleClient = (provider) =>
  new OAuth2Client(provider.clientId, provider.clientSecret, redirectUri(provider.id))

/**
 * Requête HTTP JSON vers un fournisseur, avec délai maximal ; toute réponse non 2xx lève une erreur.
 *
 * @param {string} url - URL appelée
 * @param {object} options - Options de fetch
 * @returns {Promise<object>} Corps JSON de la réponse
 * @throws {OAuthError} 502 si le fournisseur est injoignable ou répond en erreur
 */
const fetchJson = async (url, options = {}) => {
  let response
  try {
    response = await fetch(url, { ...options, signal: AbortSignal.timeout(HTTP_TIMEOUT_MS) })
  } catch (error) {
    logger.error(`OAuth — fournisseur injoignable (${new URL(url).host}) : ${error.message}`)
    throw new OAuthError('Le fournisseur de connexion est injoignable.', 502)
  }
  if (!response.ok) {
    logger.warn(`OAuth — réponse ${response.status} de ${new URL(url).host}`)
    throw new OAuthError('Connexion refusée par le fournisseur.', 401)
  }
  return response.json()
}

class OAuthService {
  /**
   * Liste les fournisseurs activés (identifiant et secret configurés).
   *
   * @returns {{ id: string, label: string }[]} Fournisseurs à proposer sur l'écran de connexion
   */
  getEnabledProviders() {
    return PROVIDER_IDS.map(getProvider)
      .filter(isEnabled)
      .map(({ id, label }) => ({ id, label }))
  }

  /**
   * Prépare la redirection vers le fournisseur : URL d'autorisation et jeton `state` signé.
   * Le front garde `state` en sessionStorage et le compare au retour (protection CSRF) ; le serveur
   * vérifie en plus sa signature et le fournisseur visé lors de l'échange du code.
   *
   * @param {string} providerId - google, github ou microsoft
   * @returns {{ url: string, state: string }}
   * @throws {OAuthError} 404 si le fournisseur est inconnu ou non configuré
   */
  buildAuthorizeUrl(providerId) {
    const provider = requireProvider(providerId)
    const state = jwt.sign({ provider: provider.id, nonce: crypto.randomBytes(16).toString('hex') }, stateSecret(), {
      expiresIn: STATE_EXPIRES_IN
    })

    if (provider.id === 'google') {
      const url = googleClient(provider).generateAuthUrl({
        scope: ['openid', 'email', 'profile'],
        state,
        prompt: 'select_account'
      })
      return { url, state }
    }

    const params = new URLSearchParams({
      client_id: provider.clientId,
      redirect_uri: redirectUri(provider.id),
      response_type: 'code',
      scope: provider.scope,
      state
    })
    return { url: `${provider.authorizeUrl}?${params.toString()}`, state }
  }

  /**
   * Vérifie le `state` reçu au retour du fournisseur.
   *
   * @param {string} state - Jeton `state`
   * @param {string} providerId - Fournisseur attendu
   * @throws {OAuthError} 400 si le state est invalide, expiré ou émis pour un autre fournisseur
   */
  verifyState(state, providerId) {
    try {
      const decoded = jwt.verify(state, stateSecret())
      if (decoded.provider === providerId) return
    } catch {
      // jeton invalide ou expiré : traité comme un state refusé ci-dessous
    }
    throw new OAuthError('La demande de connexion a expiré. Veuillez réessayer.', 400)
  }

  /**
   * Échange le code d'autorisation contre l'identité vérifiée de l'utilisateur chez le fournisseur.
   *
   * @param {string} providerId - google, github ou microsoft
   * @param {string} code - Code d'autorisation reçu en retour de redirection
   * @returns {Promise<{ providerUserId: string, email: string|null, emailVerified: boolean, name: string|null }>}
   * @throws {OAuthError} Si l'échange échoue ou si le fournisseur ne fournit aucune adresse email
   */
  async fetchProfile(providerId, code) {
    const provider = requireProvider(providerId)
    if (provider.id === 'google') return this._fetchGoogleProfile(provider, code)
    if (provider.id === 'github') return this._fetchGithubProfile(provider, code)
    return this._fetchMicrosoftProfile(provider, code)
  }

  async _fetchGoogleProfile(provider, code) {
    const client = googleClient(provider)
    let payload
    try {
      const { tokens } = await client.getToken(code)
      const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: provider.clientId })
      payload = ticket.getPayload()
    } catch (error) {
      logger.warn(`OAuth Google — échange du code refusé : ${error.message}`)
      throw new OAuthError('Connexion refusée par Google.', 401)
    }
    return {
      providerUserId: String(payload.sub),
      email: payload.email || null,
      emailVerified: payload.email_verified === true,
      name: payload.name || null
    }
  }

  async _fetchGithubProfile(provider, code) {
    const token = await fetchJson(provider.tokenUrl, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: provider.clientId,
        client_secret: provider.clientSecret,
        code,
        redirect_uri: redirectUri(provider.id)
      })
    })
    // GitHub répond 200 avec { error } quand le code est invalide
    if (!token.access_token) throw new OAuthError('Connexion refusée par GitHub.', 401)

    const headers = { Authorization: `Bearer ${token.access_token}`, Accept: 'application/vnd.github+json' }
    const profile = await fetchJson('https://api.github.com/user', { headers })
    const emails = await fetchJson('https://api.github.com/user/emails', { headers })
    // CHOIX: seule l'adresse principale ET vérifiée est retenue (l'email public du profil n'est pas fiable)
    const primary = Array.isArray(emails) ? emails.find((e) => e.primary && e.verified) : null
    return {
      providerUserId: String(profile.id),
      email: primary ? primary.email : null,
      emailVerified: Boolean(primary),
      name: profile.name || profile.login || null
    }
  }

  async _fetchMicrosoftProfile(provider, code) {
    const token = await fetchJson(provider.tokenUrl, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: provider.clientId,
        client_secret: provider.clientSecret,
        code,
        redirect_uri: redirectUri(provider.id),
        grant_type: 'authorization_code',
        scope: provider.scope
      }).toString()
    })
    if (!token.access_token) throw new OAuthError('Connexion refusée par Microsoft.', 401)

    const profile = await fetchJson('https://graph.microsoft.com/oidc/userinfo', {
      headers: { Authorization: `Bearer ${token.access_token}` }
    })
    // CHOIX: l'email Microsoft n'est jamais considéré comme vérifié (emailVerified: false)
    // RAISON: sur un tenant Entra ID, l'attribut email est modifiable par l'administrateur du tenant sans preuve
    // de possession (faille « nOAuth ») : il ne doit pas permettre de reprendre un compte existant.
    return {
      providerUserId: String(profile.sub),
      email: profile.email || null,
      emailVerified: false,
      name: profile.name || null
    }
  }

  /**
   * Termine une connexion OAuth : vérifie le state, récupère l'identité, puis retrouve, lie ou crée le compte.
   *
   * @param {string} providerId - google, github ou microsoft
   * @param {string} code - Code d'autorisation
   * @param {string} state - Jeton `state` émis par buildAuthorizeUrl
   * @returns {Promise<object>} Le compte (sans mot de passe) à connecter
   * @throws {OAuthError} 400/401/403/404/409/502 selon la cause (message en français)
   */
  async login(providerId, code, state) {
    requireProvider(providerId)
    this.verifyState(state, providerId)
    const profile = await this.fetchProfile(providerId, code)
    return this.findOrCreateUser(providerId, profile)
  }

  /**
   * Retrouve le compte lié à une identité OAuth, sinon le relie à un compte de même email, sinon le crée.
   *
   * @param {string} providerId - Fournisseur de l'identité
   * @param {{ providerUserId: string, email: string|null, emailVerified: boolean, name: string|null }} profile
   * @returns {Promise<object>} Le compte (sans mot de passe)
   * @throws {OAuthError} 400 sans email, 403 compte désactivé ou inscriptions fermées,
   *   409 email déjà pris par un compte que le fournisseur ne permet pas de prouver
   */
  async findOrCreateUser(providerId, profile) {
    const linked = await UserOAuthAccount.findOne({
      where: { provider: providerId, providerUserId: profile.providerUserId }
    })

    let user = null
    if (linked) {
      user = await User.findByPk(linked.userId)
    } else {
      user = await this._linkOrCreate(providerId, profile)
    }

    if (!user) throw new OAuthError('Compte introuvable.', 404)
    if (user.isActive === false) {
      logger.warn(`Connexion OAuth refusée — compte désactivé : ${user.userId}`)
      throw new OAuthError('Votre compte a été désactivé. Contactez un administrateur.', 403)
    }

    await userService.updateLoginDate(user.userId)
    // eslint-disable-next-line no-unused-vars
    const { password, ...userWithoutPassword } = user.dataValues || user
    return userWithoutPassword
  }

  async _linkOrCreate(providerId, profile) {
    const email = (profile.email || '').trim().toLowerCase()
    if (!email) {
      throw new OAuthError("Le fournisseur n'a transmis aucune adresse email vérifiée.", 400)
    }

    const existing = await User.findOne({ where: { email } })
    if (existing) {
      if (!profile.emailVerified) {
        logger.warn(`Connexion OAuth ${providerId} refusée — email non prouvé pour un compte existant : ${email}`)
        throw new OAuthError(
          'Un compte existe déjà avec cette adresse email. Connectez-vous avec votre mot de passe.',
          409
        )
      }
      if (!existing.hasValidatedEmail) await this._claimUnverifiedAccount(existing)
      await UserOAuthAccount.create({ userId: existing.userId, provider: providerId, providerUserId: profile.providerUserId, email })
      return existing
    }

    const name = (profile.name || email.split('@')[0]).trim().slice(0, 50).padEnd(2, '_')
    let created
    try {
      created = await userService.create({
        name,
        email,
        // CHOIX: mot de passe aléatoire inutilisable plutôt que colonne `password` nullable
        // RAISON: évite de modifier le schéma de User ; l'utilisateur peut en définir un via « mot de passe oublié ».
        password: crypto.randomBytes(32).toString('hex'),
        hasValidatedEmail: profile.emailVerified
      })
    } catch (error) {
      if (error?.message === "Limite d'utilisateurs atteinte") {
        throw new OAuthError("Le nombre maximal d'utilisateurs a été atteint. Les inscriptions sont temporairement fermées.", 403)
      }
      throw error
    }
    await UserOAuthAccount.create({ userId: created.userId, provider: providerId, providerUserId: profile.providerUserId, email })
    return User.findByPk(created.userId)
  }

  /**
   * Reprend un compte créé avec un email jamais vérifié : son mot de passe est remplacé par une valeur
   * aléatoire et ses sessions sont révoquées, pour qu'une personne ayant pré-enregistré l'adresse d'un tiers
   * (pré-détournement) ne garde aucun accès une fois le vrai propriétaire connecté via OAuth.
   *
   * @param {object} user - Instance Sequelize du compte
   */
  async _claimUnverifiedAccount(user) {
    user.password = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10)
    user.hasValidatedEmail = true
    user.validEmailCode = null
    user.validEmailCodeExpiresAt = null
    user.refreshToken = null
    user.refreshTokenExpiresAt = null
    await user.save()
  }
}

module.exports = new OAuthService()
module.exports.OAuthError = OAuthError

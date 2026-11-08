const oauthService = require('../services/OAuth.service')
const logger = require('../helpers/logger')
const { issueSession, sendTwoFactorCode } = require('../helpers/authSession')
const { isTwoFactorMandatory, signChallengeToken } = require('../helpers/twoFactor')

/**
 * Répond à une erreur du parcours OAuth : les erreurs attendues gardent leur code HTTP et leur message,
 * toute autre erreur est journalisée et devient un 500 générique.
 */
const respondError = (res, error, fallbackMessage) => {
  if (error?.name === 'OAuthError') {
    return res.status(error.status).send({ message: error.message })
  }
  logger.error(error?.message || error)
  return res.status(500).send({ message: fallbackMessage })
}

exports.providers = async (req, res) => {
  try {
    res.status(200).send({ providers: oauthService.getEnabledProviders() })
  } catch (error) {
    respondError(res, error, 'Erreur lors de la récupération des modes de connexion.')
  }
}

exports.authorizeUrl = async (req, res) => {
  try {
    res.status(200).send(oauthService.buildAuthorizeUrl(req.params.provider))
  } catch (error) {
    respondError(res, error, "Erreur lors de la préparation de la connexion.")
  }
}

exports.login = async (req, res) => {
  try {
    const { code, state } = req.body
    const user = await oauthService.login(req.params.provider, code, state)

    // Le fournisseur a déjà authentifié la personne : le code email n'est exigé que pour les rôles
    // qui ne peuvent pas s'en passer (administrateurs), comme pour la connexion par mot de passe.
    if (isTwoFactorMandatory(user)) {
      await sendTwoFactorCode(user)
      return res.status(200).send({
        twoFactorRequired: true,
        challengeToken: signChallengeToken(user.userId),
        message: 'Un code de vérification vous a été envoyé par email.'
      })
    }

    res.status(200).send(await issueSession(user.userId))
  } catch (error) {
    if (error?.name === 'OAuthError') {
      logger.warn(`Échec de connexion OAuth (${req.params.provider}) : ${error.message} (IP ${req.ip})`)
    }
    respondError(res, error, 'Erreur lors de la connexion.')
  }
}

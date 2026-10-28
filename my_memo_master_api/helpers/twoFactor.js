const jwt = require('jsonwebtoken')

// Rôles pour lesquels la double authentification est obligatoire : admin plateforme (1) et admin établissement (4)
const ADMIN_ROLE_IDS = [1, 4]

const CHALLENGE_EXPIRES_IN = '10m'

/**
 * Indique si la double authentification est imposée à ce compte (rôle administrateur).
 *
 * @param {{ roleId?: number|null }} user - Utilisateur (au moins `roleId`)
 * @returns {boolean} true si le compte ne peut pas s'en passer
 */
const isTwoFactorMandatory = (user) => ADMIN_ROLE_IDS.includes(Number(user?.roleId))

// CHOIX: interrupteur TWO_FACTOR_DISABLED réservé aux stacks jetables (CI), jamais actif en production
// RAISON: les parcours E2E et les tests de charge se connectent par l'API avec des comptes dont personne
// ne lit la boîte mail ; même modèle de garde-fou que SEED_E2E_USERS (opt-in explicite + NODE_ENV).
const isTwoFactorBypassed = () =>
  process.env.TWO_FACTOR_DISABLED === 'true' && process.env.NODE_ENV !== 'production'

/**
 * Indique si une connexion doit passer par la vérification du code reçu par email :
 * activée sur le compte (par défaut à la création, désactivable par l'utilisateur), ou imposée par son rôle.
 * Toujours false si l'interrupteur de test `TWO_FACTOR_DISABLED=true` est posé hors production.
 *
 * @param {{ roleId?: number|null, twoFactorEnabled?: boolean }} user - Utilisateur
 * @returns {boolean} true si le login doit être suivi de la saisie d'un code
 */
const isTwoFactorRequired = (user) =>
  !isTwoFactorBypassed() && (Boolean(user?.twoFactorEnabled) || isTwoFactorMandatory(user))

// CHOIX: secret dérivé de AUTH_JWT_SECRET pour signer le jeton de défi, plutôt qu'un claim `purpose`
// vérifié dans Auth.middleware.js
// RAISON: un jeton de défi ne peut ainsi jamais être accepté comme jeton d'accès — la signature échoue
// dans le middleware existant, qui reste inchangé.
const challengeSecret = () => `${process.env.AUTH_JWT_SECRET}:two-factor`

/**
 * Signe le jeton de défi remis après un mot de passe valide, à renvoyer avec le code reçu par email.
 *
 * @param {number} userId - ID de l'utilisateur dont le mot de passe vient d'être validé
 * @returns {string} JWT valable 10 minutes
 */
const signChallengeToken = (userId) =>
  jwt.sign({ id: userId }, challengeSecret(), { expiresIn: CHALLENGE_EXPIRES_IN })

/**
 * Vérifie un jeton de défi.
 *
 * @param {string} token - Jeton reçu du client
 * @returns {number|null} ID de l'utilisateur, ou null si le jeton est invalide ou expiré
 */
const verifyChallengeToken = (token) => {
  try {
    const decoded = jwt.verify(token, challengeSecret())
    return Number.isInteger(decoded?.id) ? decoded.id : null
  } catch {
    return null
  }
}

module.exports = {
  ADMIN_ROLE_IDS,
  isTwoFactorMandatory,
  isTwoFactorRequired,
  signChallengeToken,
  verifyChallengeToken
}

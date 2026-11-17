const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const userService = require('../services/User.service')
const sendEmail = require('./sendEmail')

/**
 * Ouvre une session : jeton d'accès, refresh token (stocké haché) et date de dernière connexion.
 * Partagé par la connexion par mot de passe (User.controller) et la connexion OAuth (OAuth.controller).
 *
 * @param {number} userId - ID de l'utilisateur authentifié
 * @returns {Promise<{ token: string, refreshToken: string }>}
 */
const issueSession = async (userId) => {
  const expiresIn = process.env.AUTH_JWT_EXPIRES_IN || '15m'
  const token = jwt.sign({ id: userId }, process.env.AUTH_JWT_SECRET, { expiresIn })

  const refreshToken = crypto.randomBytes(64).toString('hex')
  const refreshTokenDays = parseInt(process.env.AUTH_REFRESH_TOKEN_EXPIRES_DAYS || '7', 10)
  const refreshTokenExpiresAt = new Date(Date.now() + refreshTokenDays * 24 * 60 * 60 * 1000)
  await userService.setRefreshToken(userId, refreshToken, refreshTokenExpiresAt)

  await userService.updateLoginDate(userId)
  return { token, refreshToken }
}

/**
 * Envoie par email le code de connexion. Ne fait rien si un code vient d'être émis (délai de 1 min).
 *
 * @param {{ userId: number, name: string, email: string }} user - Compte qui se connecte
 * @returns {Promise<boolean>} true si un email a été envoyé
 */
const sendTwoFactorCode = async (user) => {
  const code = await userService.setTwoFactorCode(user.userId)
  if (!code) return false
  await sendEmail(
    'Code de connexion - MyMemoMaster',
    `Bonjour ${user.name},\n\nVotre code de connexion est :\n\n${code}\n\nIl est valable 10 minutes.\n\nSi vous n'êtes pas à l'origine de cette connexion, changez votre mot de passe sans attendre.`,
    user.email
  )
  return true
}

module.exports = { issueSession, sendTwoFactorCode }

const userService = require('../services/User.service')
const roleService = require('../services/Role.service')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const sendEmail = require('../helpers/sendEmail')
const logger = require('../helpers/logger')

exports.register = async (req, res) => {
  let newUser = null
  try {
    const { name, password, email } = req.body
    newUser = await userService.create({ name, email, password })
    const code = await userService.setValidEmailCode(newUser.userId)
    const frontUrl = (process.env.APP_FRONT_URL || 'http://localhost').replace(/\/$/, '')
    const verifyLink = `${frontUrl}/verify-email?email=${encodeURIComponent(email)}&code=${code}`
    await sendEmail(
      'Vérifiez votre adresse email - MyMemoMaster',
      `Bonjour ${name},\n\nMerci de vous être inscrit sur MyMemoMaster !\n\nCliquez sur le lien ci-dessous pour vérifier votre adresse email :\n\n${verifyLink}\n\nCe lien est valable 30 minutes.\n\nSi vous n'avez pas créé de compte, ignorez cet email.`,
      email
    )
    res.status(201).send({ message: 'Inscription réussie ! Vérifiez votre email pour activer votre compte.' })
  } catch (error) {
    logger.error(error?.message || error)
    if (newUser) {
      await userService.delete(newUser.userId).catch((e) => logger.error(e?.message || e))
    }
    res.status(500).send({ message: "Erreur lors de l'inscription." })
  }
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await userService.findByEmail(email)
    if (!user) return res.status(401).send({ message: 'Identifiants invalides.' })

    const isPasswordValid = await userService.verifyPassword(user.userId, password)
    if (!isPasswordValid) return res.status(401).send({ message: 'Identifiants invalides.' })

    if (!user.hasValidatedEmail) {
      return res.status(403).send({ message: 'Veuillez vérifier votre adresse email avant de vous connecter.' })
    }

    const expiresIn = process.env.AUTH_JWT_EXPIRES_IN || '15m'
    const token = jwt.sign({ id: user.userId }, process.env.AUTH_JWT_SECRET, { expiresIn })

    const refreshToken = crypto.randomBytes(64).toString('hex')
    const refreshTokenDays = parseInt(process.env.AUTH_REFRESH_TOKEN_EXPIRES_DAYS || '7', 10)
    const refreshTokenExpiresAt = new Date(Date.now() + refreshTokenDays * 24 * 60 * 60 * 1000)
    await userService.setRefreshToken(user.userId, refreshToken, refreshTokenExpiresAt)

    await userService.updateLoginDate(user.userId)

    res.status(200).send({ token, refreshToken })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).send({ message: 'Erreur lors de la connexion.' })
  }
}

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body
    const user = await userService.verifyRefreshToken(refreshToken)
    if (!user) return res.status(401).send({ message: 'Token de rafraîchissement invalide ou expiré.' })

    const expiresIn = process.env.AUTH_JWT_EXPIRES_IN || '15m'
    const token = jwt.sign({ id: user.userId }, process.env.AUTH_JWT_SECRET, { expiresIn })

    // Rotation : nouveau refresh token à chaque renouvellement
    const newRefreshToken = crypto.randomBytes(64).toString('hex')
    const refreshTokenDays = parseInt(process.env.AUTH_REFRESH_TOKEN_EXPIRES_DAYS || '7', 10)
    const refreshTokenExpiresAt = new Date(Date.now() + refreshTokenDays * 24 * 60 * 60 * 1000)
    await userService.setRefreshToken(user.userId, newRefreshToken, refreshTokenExpiresAt)

    res.status(200).send({ token, refreshToken: newRefreshToken })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).send({ message: 'Erreur lors du rafraîchissement du token.' })
  }
}

exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body
    if (refreshToken) {
      const user = await userService.verifyRefreshToken(refreshToken)
      if (user) await userService.clearRefreshToken(user.userId)
    }
    res.status(200).send({ message: 'Déconnexion réussie.' })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).send({ message: 'Erreur lors de la déconnexion.' })
  }
}

exports.verifyEmail = async (req, res) => {
  const { email, code } = req.body
  try {
    const user = await userService.findByEmail(email)

    if (!user) return res.status(401).send({ message: 'Code invalide.' })
    if (!(await userService.verifyValidEmailCode(user.userId, code)))
      return res.status(401).send({ message: 'Code invalide.' })

    await userService.setEmailValidated(user.userId)

    res.status(201).send({ message: 'Email vérifié avec succès.' })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).send({ message: "Erreur lors de la vérification de l'email." })
  }
}

exports.forgotPassword = async (req, res) => {
  const { email } = req.body
  const genericMessage = { message: 'Si cet email existe, un code de réinitialisation vous a été envoyé.' }
  try {
    const user = await userService.findByEmail(email)
    if (!user) return res.status(200).send(genericMessage)

    const code = await userService.setResetPasswordCode(user.userId)
    await sendEmail(
      'Réinitialisation de mot de passe - MyMemoMaster',
      `Votre token de réinitialisation est :\n\n${code}\n\nCopiez-collez ce token dans le formulaire de réinitialisation.\nIl est valable 30 minutes.`,
      email
    )

    res.status(200).send(genericMessage)
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).send({ message: "Erreur lors de l'envoi du code de réinitialisation." })
  }
}

exports.resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body
  try {
    const user = await userService.findByEmail(email)
    if (!user) return res.status(404).send({ message: 'Utilisateur introuvable.' })

    if (!(await userService.verifyResetPasswordCode(user.userId, code)))
      return res.status(401).send({ message: 'Code invalide.' })

    await userService.setPassword(user.userId, newPassword)

    res.status(201).send({ message: 'Mot de passe réinitialisé avec succès.' })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).send({ message: 'Erreur lors de la réinitialisation du mot de passe.' })
  }
}

exports.findOne = async (req, res) => {
  try {
    if (String(req.user.id) !== String(req.params.id)) {
      return res.status(403).send({ message: 'Accès refusé.' })
    }
    const user = await userService.findOne(req.params.id)
    if (!user) return res.status(404).send({ message: 'Utilisateur introuvable.' })

    user.role = await roleService.findOne(user.roleId)

    res.status(200).send(user)
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).send({ message: 'Erreur serveur.' })
  }
}

exports.update = async (req, res) => {
  try {
    if (String(req.user.id) !== String(req.params.id)) {
      return res.status(403).send({ message: 'Accès refusé.' })
    }
    await userService.update(req.params.id, req.body)
    const updatedUser = await userService.findOne(req.params.id)
    res.status(200).send(updatedUser)
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).send({ message: "Erreur lors de la mise à jour de l'utilisateur." })
  }
}

exports.changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body
  const id = req.user.id
  try {
    const user = await userService.findOne(id)
    if (!user) return res.status(404).send({ message: 'Utilisateur introuvable.' })

    const isPasswordValid = await userService.verifyPassword(user.userId, oldPassword)
    if (!isPasswordValid) return res.status(401).send({ message: 'Mot de passe incorrect.' })

    await userService.setPassword(user.userId, newPassword)

    res.status(200).send({ message: 'Mot de passe modifié avec succès.' })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).send({ message: 'Erreur lors de la modification du mot de passe.' })
  }
}

exports.addRole = async (req, res) => {
  const { roleId } = req.body
  try {
    await userService.setRole(req.params.id, roleId)
    res.status(200).send({ message: 'Rôle ajouté avec succès.' })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).send({ message: "Erreur lors de l'ajout du rôle." })
  }
}

exports.updateRole = async (req, res) => {
  try {
    const { roleId } = req.body
    await userService.setRole(req.params.id, roleId)
    res.status(200).send({ message: 'Rôle mis à jour avec succès.' })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).send({ message: 'Erreur lors de la mise à jour du rôle.' })
  }
}

exports.removeRole = async (req, res) => {
  try {
    const { roleId } = req.body
    await userService.deleteRole(req.params.id, roleId)
    res.status(200).send({ message: 'Rôle supprimé avec succès.' })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).send({ message: 'Erreur lors de la suppression du rôle.' })
  }
}

exports.delete = async (req, res) => {
  try {
    if (String(req.user.id) !== String(req.params.id)) {
      return res.status(403).send({ message: 'Accès refusé.' })
    }
    await userService.delete(req.params.id)
    res.status(200).send({ message: 'Utilisateur supprimé avec succès.' })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).send({ message: "Erreur lors de la suppression de l'utilisateur." })
  }
}

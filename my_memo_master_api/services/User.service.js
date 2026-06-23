const { User, Role, UserOnboardingState } = require('../models/index')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

class UserService {
  async findAll() {
    const users = await User.findAll()
    return users.map((user) => {
      // eslint-disable-next-line no-unused-vars
      const { password, ...userWithoutPassword } = user?.dataValues || user
      return userWithoutPassword
    })
  }

  async findByEmail(email) {
    const user = await User.findOne({
      where: { email }
    })
    if (!user) return null
    // eslint-disable-next-line no-unused-vars
    const { password, ...userWithoutPassword } = user?.dataValues || user
    return userWithoutPassword
  }

  async findOne(userId) {
    const user = await User.findByPk(userId)
    if (!user) return null
    // eslint-disable-next-line no-unused-vars
    const { password, ...userWithoutPassword } = user?.dataValues || user
    return userWithoutPassword
  }

  async create(user) {
    if (await this.findByEmail(user.email)) throw new Error('Email déjà utilisé')
    if (!user.name || !user.password || !user.email) throw new Error('Champs manquants')

    user.roleId = user.roleId ?? 2
    user.password = await bcrypt.hash(user.password, 10)

    const newUser = await User.create(user)
    if (!newUser) throw new Error("Erreur lors de la création de l'utilisateur")

    await UserOnboardingState.create({
      userId: newUser.userId,
      tourSeen: false,
      checklist: {
        todo_created: false,
        profile_completed: false,
        first_action: false
      }
    })

    // eslint-disable-next-line no-unused-vars
    const { password, ...userWithoutPassword } = newUser?.dataValues || newUser
    return userWithoutPassword
  }

  async update(userId, user) {
    const { name, email } = user
    await User.update(
      { name, email },
      {
        where: { userId: userId }
      }
    )
    return this.findOne(userId)
  }

  async delete(userId) {
    await User.destroy({
      where: { userId: userId }
    })
  }

  async setRole(userId, roleId) {
    if (!(await Role.findByPk(roleId))) throw new Error("Le rôle n'existe pas")

    await User.update(
      { roleId: roleId },
      {
        where: { userId: userId }
      }
    )
    return this.findOne(userId)
  }

  async deleteRole(userId) {
    await User.update(
      { roleId: null },
      {
        where: { userId: userId }
      }
    )
    return this.findOne(userId)
  }

  async updateLoginDate(userId) {
    await User.update(
      { lastLogin: new Date() },
      {
        where: { userId: userId }
      }
    )
  }

  async verifyPassword(userId, password) {
    const user = await User.findByPk(userId)
    return await bcrypt.compare(password, user.password)
  }

  async setPassword(userId, password) {
    if (!password) throw new Error('Mot de passe manquant')
    if (password.length < 10)
      throw new Error('Le mot de passe doit contenir au moins 10 caractères')

    const hashedPassword = await bcrypt.hash(password, 10)
    await User.update(
      { password: hashedPassword },
      {
        where: { userId: userId }
      }
    )
  }

  async setValidEmailCode(userId, code = '') {
    if (!code) code = crypto.randomInt(100000, 1000000).toString()
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
    await User.update(
      { validEmailCode: code, validEmailCodeExpiresAt: expiresAt },
      { where: { userId: userId } }
    )
    return code
  }

  async verifyValidEmailCode(userId, code) {
    const user = await User.findByPk(userId)
    const now = new Date()
    const isValid =
      user.validEmailCode === code &&
      user.validEmailCodeExpiresAt !== null &&
      user.validEmailCodeExpiresAt > now
    user.validEmailCode = null
    user.validEmailCodeExpiresAt = null
    await user.save()
    return isValid
  }

  async setEmailValidated(userId) {
    await User.update(
      { hasValidatedEmail: true },
      { where: { userId } }
    )
  }

  async clearValidEmailCode(userId) {
    await User.update(
      { validEmailCode: null, validEmailCodeExpiresAt: null },
      { where: { userId: userId } }
    )
  }

  /**
   * Génère un token de réinitialisation, stocke son hash SHA-256 en base et retourne le token brut.
   *
   * @param {number} userId - ID de l'utilisateur
   * @returns {Promise<string>} Token brut à envoyer par email (32 octets hex, 64 chars)
   */
  async setResetPasswordCode(userId) {
    const token = crypto.randomBytes(32).toString('hex')
    const hash = crypto.createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
    await User.update(
      { resetPasswordCode: hash, resetPasswordCodeExpiresAt: expiresAt },
      { where: { userId } }
    )
    return token
  }

  /**
   * Vérifie un token de réinitialisation en comparant son hash SHA-256 avec celui stocké en base.
   *
   * @param {number} userId - ID de l'utilisateur
   * @param {string} token - Token brut reçu depuis le formulaire
   * @returns {Promise<boolean>} true si le token est valide et non expiré
   */
  async verifyResetPasswordCode(userId, token) {
    const user = await User.findByPk(userId)
    const hash = crypto.createHash('sha256').update(token).digest('hex')
    const now = new Date()
    const isValid =
      user.resetPasswordCode === hash &&
      user.resetPasswordCodeExpiresAt &&
      user.resetPasswordCodeExpiresAt > now
    user.resetPasswordCode = null
    user.resetPasswordCodeExpiresAt = null
    await user.save()
    return isValid
  }

  async clearResetPasswordCode(userId) {
    await User.update(
      { resetPasswordCode: null },
      {
        where: { userId: userId }
      }
    )
  }

  async clearAllCodes(userId) {
    await this.clearValidEmailCode(userId)
    await this.clearResetPasswordCode(userId)
  }

  /**
   * Enregistre un refresh token pour un utilisateur.
   *
   * @param {number} userId - ID de l'utilisateur
   * @param {string} token - Token opaque généré côté controller
   * @param {Date} expiresAt - Date d'expiration du token
   */
  async setRefreshToken(userId, token, expiresAt) {
    const hash = crypto.createHash('sha256').update(token).digest('hex')
    await User.update(
      { refreshToken: hash, refreshTokenExpiresAt: expiresAt },
      { where: { userId } }
    )
  }

  /**
   * Vérifie un refresh token et retourne l'utilisateur associé s'il est valide.
   * Le token reçu est haché SHA-256 avant comparaison avec la valeur en base.
   *
   * @param {string} token - Refresh token brut reçu du client
   * @returns {Promise<User|null>} L'utilisateur si le token est valide, null sinon
   */
  async verifyRefreshToken(token) {
    if (!token) return null
    const hash = crypto.createHash('sha256').update(token).digest('hex')
    const user = await User.findOne({ where: { refreshToken: hash } })
    if (!user) return null
    if (!user.refreshTokenExpiresAt || user.refreshTokenExpiresAt < new Date()) return null
    return user
  }

  /**
   * Révoque le refresh token d'un utilisateur (déconnexion ou rotation forcée).
   *
   * @param {number} userId - ID de l'utilisateur
   */
  async clearRefreshToken(userId) {
    await User.update(
      { refreshToken: null, refreshTokenExpiresAt: null },
      { where: { userId } }
    )
  }
}

module.exports = new UserService()

const { User, Role, UserOnboardingState, Invitation, ClassGroupUsers, Etablissement, instance: sequelize } = require('../models/index')
const { Op } = require('sequelize')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const logger = require('../helpers/logger')
const AuditLogService = require('./AuditLog.service')
const tokenBlacklist = require('../helpers/tokenBlacklist')
const { isTwoFactorMandatory } = require('../helpers/twoFactor')

const TWO_FACTOR_CODE_TTL_MS = 10 * 60 * 1000
const TWO_FACTOR_RESEND_COOLDOWN_MS = 60 * 1000
const MAX_TWO_FACTOR_CODE_ATTEMPTS = 5

class UserService {
  async findAll() {
    const users = await User.findAll()
    return users.map((user) => {
      // eslint-disable-next-line no-unused-vars
      const { password, ...userWithoutPassword } = user?.dataValues || user
      return userWithoutPassword
    })
  }

  /**
   * Recherche paginée de comptes (administration plateforme). Ne renvoie que des champs d'affichage :
   * jamais le mot de passe, les codes ni les jetons.
   *
   * @param {object} [filters]
   * @param {string} [filters.search] - Texte cherché dans le nom ou l'e-mail (insensible à la casse)
   * @param {number} [filters.roleId] - Ne garder que les comptes de ce rôle
   * @param {number} [filters.page=1] - Page (à partir de 1)
   * @param {number} [filters.limit=20] - Taille de page (1 à 100)
   * @returns {Promise<{ users: object[], total: number, page: number, limit: number }>}
   */
  async search({ search, roleId, page = 1, limit = 20 } = {}) {
    // Op.like est insensible à la casse sur SQLite (dev) mais pas sur PostgreSQL (prod) : iLike sur PostgreSQL.
    const likeOp = sequelize.getDialect() === 'postgres' ? Op.iLike : Op.like
    const safeLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20))
    const safePage = Math.max(1, Number.parseInt(page, 10) || 1)
    const where = {}
    const term = typeof search === 'string' ? search.trim().slice(0, 100) : ''
    if (term) where[Op.or] = [{ name: { [likeOp]: `%${term}%` } }, { email: { [likeOp]: `%${term}%` } }]
    if (roleId !== undefined && roleId !== null && roleId !== '') where.roleId = Number.parseInt(roleId, 10)

    const { rows, count } = await User.findAndCountAll({
      where,
      attributes: ['userId', 'name', 'email', 'roleId', 'isActive', 'hasValidatedEmail', 'createdAt', 'lastLogin'],
      order: [['name', 'ASC'], ['userId', 'ASC']],
      limit: safeLimit,
      offset: (safePage - 1) * safeLimit
    })
    return { users: rows, total: count, page: safePage, limit: safeLimit }
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
    const { password, twoFactorCode, twoFactorCodeExpiresAt, twoFactorCodeAttempts, ...userWithoutPassword } =
      user?.dataValues || user
    // twoFactorRequired : le front masque l'interrupteur pour les rôles qui ne peuvent pas s'en passer
    return { ...userWithoutPassword, twoFactorRequired: isTwoFactorMandatory(userWithoutPassword) }
  }

  /**
   * Indique si de nouvelles inscriptions sont encore possibles.
   * La limite est désactivée si MAX_USERS est absent, vide ou <= 0.
   * Seuls les comptes actifs comptent dans le plafond : désactiver un compte
   * (PATCH /:id/deactivate) libère donc une place.
   *
   * @returns {Promise<boolean>} true si l'inscription est ouverte
   */
  async isRegistrationOpen() {
    const maxUsers = parseInt(process.env.MAX_USERS, 10)
    if (!maxUsers || maxUsers <= 0) return true

    const total = await User.count({ where: { isActive: true } })
    return total < maxUsers
  }

  async create(user) {
    if (!(await this.isRegistrationOpen())) throw new Error('Limite d\'utilisateurs atteinte')
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

    // Traite les invitations email en attente pour cette adresse
    await this._processPendingEmailInvitations(newUser.userId, user.email)

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

  async setRole(userId, roleId, actorId = null) {
    if (!(await Role.findByPk(roleId))) throw new Error("Le rôle n'existe pas")

    await User.update(
      { roleId: roleId },
      {
        where: { userId: userId }
      }
    )
    try {
      await AuditLogService.log(actorId, 'USER_ROLE_CHANGED', 'User', userId, { roleId })
    } catch (auditErr) {
      logger.warn(`Audit log échoué (setRole): ${auditErr.message}`)
    }
    return this.findOne(userId)
  }

  async deleteRole(userId, actorId = null) {
    await User.update(
      { roleId: null },
      {
        where: { userId: userId }
      }
    )
    try {
      await AuditLogService.log(actorId, 'USER_ROLE_CHANGED', 'User', userId, { roleId: null })
    } catch (auditErr) {
      logger.warn(`Audit log échoué (deleteRole): ${auditErr.message}`)
    }
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
   * Génère un code de réinitialisation à 6 chiffres, stocke son hash bcrypt en base et retourne le code brut.
   *
   * @param {number} userId - ID de l'utilisateur
   * @returns {Promise<string>} Code brut à 6 chiffres à envoyer par email
   */
  async setResetPasswordCode(userId) {
    // CHOIX: code OTP 6 chiffres + hash bcrypt plutôt que token 64 chars + SHA-256
    // RAISON: UX standard des plateformes (code saisissable) — la faible entropie (10^6)
    // est compensée par bcrypt (brute force offline coûteux), 15 min d'expiration,
    // 5 essais max et le rate limiting authLimiter déjà posé sur la route.
    const code = crypto.randomInt(100000, 1000000).toString()
    const hash = await bcrypt.hash(code, 10)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
    await User.update(
      { resetPasswordCode: hash, resetPasswordCodeExpiresAt: expiresAt, resetPasswordCodeAttempts: 0 },
      { where: { userId } }
    )
    return code
  }

  /**
   * Vérifie un code de réinitialisation (comparaison bcrypt + expiration + essais limités).
   * Le code est invalidé après un succès, après expiration ou après 5 essais infructueux.
   *
   * @param {number} userId - ID de l'utilisateur
   * @param {string} code - Code à 6 chiffres reçu depuis le formulaire
   * @returns {Promise<boolean>} true si le code est valide et non expiré
   */
  async verifyResetPasswordCode(userId, code) {
    const MAX_RESET_CODE_ATTEMPTS = 5
    const user = await User.findByPk(userId)
    const now = new Date()

    const isUsable =
      user.resetPasswordCode &&
      user.resetPasswordCodeExpiresAt &&
      user.resetPasswordCodeExpiresAt > now

    if (!isUsable) {
      await this.clearResetPasswordCode(userId)
      return false
    }

    const matches = await bcrypt.compare(String(code), user.resetPasswordCode)
    const attempts = (user.resetPasswordCodeAttempts || 0) + 1

    if (matches || attempts >= MAX_RESET_CODE_ATTEMPTS) {
      // CHOIX: invalidation après succès OU 5 essais infructueux
      // RAISON: un code à 6 chiffres ne doit pas être brute-forçable en ligne
      await this.clearResetPasswordCode(userId)
    } else {
      await User.update(
        { resetPasswordCodeAttempts: attempts },
        { where: { userId } }
      )
    }
    return matches
  }

  async clearResetPasswordCode(userId) {
    await User.update(
      { resetPasswordCode: null, resetPasswordCodeExpiresAt: null, resetPasswordCodeAttempts: 0 },
      {
        where: { userId: userId }
      }
    )
  }

  async clearAllCodes(userId) {
    await this.clearValidEmailCode(userId)
    await this.clearResetPasswordCode(userId)
    await this.clearTwoFactorCode(userId)
  }

  /**
   * Génère le code de connexion à 6 chiffres (double authentification par email), stocke son hash bcrypt
   * et retourne le code brut. Refuse d'en émettre un nouveau tant que le précédent a moins d'une minute
   * (anti-spam de la boîte mail de l'utilisateur).
   *
   * @param {number} userId - ID de l'utilisateur
   * @returns {Promise<string|null>} Code brut à envoyer par email, ou null si un code vient d'être émis
   */
  async setTwoFactorCode(userId) {
    const user = await User.findByPk(userId, { attributes: ['userId', 'twoFactorCodeExpiresAt'] })
    const issuedAt = user?.twoFactorCodeExpiresAt
      ? user.twoFactorCodeExpiresAt.getTime() - TWO_FACTOR_CODE_TTL_MS
      : 0
    if (Date.now() - issuedAt < TWO_FACTOR_RESEND_COOLDOWN_MS) return null

    // CHOIX: même schéma que le code de réinitialisation (OTP 6 chiffres + hash bcrypt + 5 essais max)
    // RAISON: un code à 6 chiffres n'est pas brute-forçable en ligne avec 5 essais, 10 min d'expiration
    // et le rate limiting authLimiter sur la route de vérification.
    const code = crypto.randomInt(100000, 1000000).toString()
    const hash = await bcrypt.hash(code, 10)
    await User.update(
      {
        twoFactorCode: hash,
        twoFactorCodeExpiresAt: new Date(Date.now() + TWO_FACTOR_CODE_TTL_MS),
        twoFactorCodeAttempts: 0
      },
      { where: { userId } }
    )
    return code
  }

  /**
   * Vérifie le code de connexion (comparaison bcrypt + expiration + essais limités).
   * Le code est invalidé après un succès (usage unique), après expiration ou après 5 essais infructueux.
   *
   * @param {number} userId - ID de l'utilisateur
   * @param {string} code - Code à 6 chiffres reçu par email
   * @returns {Promise<boolean>} true si le code est valide et non expiré
   */
  async verifyTwoFactorCode(userId, code) {
    const user = await User.findByPk(userId)
    if (!user) return false

    const isUsable =
      user.twoFactorCode && user.twoFactorCodeExpiresAt && user.twoFactorCodeExpiresAt > new Date()
    if (!isUsable) {
      await this.clearTwoFactorCode(userId)
      return false
    }

    const matches = await bcrypt.compare(String(code), user.twoFactorCode)
    const attempts = (user.twoFactorCodeAttempts || 0) + 1

    if (matches || attempts >= MAX_TWO_FACTOR_CODE_ATTEMPTS) {
      await this.clearTwoFactorCode(userId)
    } else {
      await User.update({ twoFactorCodeAttempts: attempts }, { where: { userId } })
    }
    return matches
  }

  async clearTwoFactorCode(userId) {
    await User.update(
      { twoFactorCode: null, twoFactorCodeExpiresAt: null, twoFactorCodeAttempts: 0 },
      { where: { userId } }
    )
  }

  /**
   * Active ou désactive volontairement la double authentification d'un compte.
   *
   * @param {number} userId - ID de l'utilisateur
   * @param {boolean} enabled - Nouvel état
   */
  async setTwoFactorEnabled(userId, enabled) {
    await User.update({ twoFactorEnabled: Boolean(enabled) }, { where: { userId } })
    if (!enabled) await this.clearTwoFactorCode(userId)
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
    // Un compte désactivé après coup ne doit pas pouvoir renouveler un token d'accès via son
    // refresh token encore valide — sans cette vérification, la révocation A07-M1 de setActive()
    // serait contournable en appelant /refresh-token juste après la désactivation.
    if (user.isActive === false) return null
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

  async setActive(targetUserId, active, requesterRoleId, actorId = null) {
    const target = await User.findByPk(targetUserId, { attributes: ['userId', 'roleId', 'isActive'] })
    if (!target) return null
    // Personne ne peut se désactiver lui-même
    if (actorId !== null && Number(targetUserId) === Number(actorId)) return false
    // Admin établissement (4) ne peut pas agir sur un admin plateforme (1)
    if (requesterRoleId === 4 && target.roleId === 1) return false
    // Un admin plateforme (1) ne peut pas désactiver un autre admin plateforme (1)
    if (target.roleId === 1 && requesterRoleId === 1) return false
    await User.update({ isActive: active }, { where: { userId: targetUserId } })
    if (!active) {
      // A07-M1 : coupe l'accès immédiatement plutôt que d'attendre l'expiration naturelle du token
      // (jusqu'à AUTH_JWT_EXPIRES_IN). verifyRefreshToken() bloque déjà le renouvellement du token
      // d'accès pour un compte désactivé — ceci révoque en plus celui déjà émis et encore valide.
      await tokenBlacklist.revokeUserTokens(targetUserId)
    }
    try {
      await AuditLogService.log(
        actorId,
        active ? 'USER_ACCOUNT_ACTIVATED' : 'USER_ACCOUNT_DEACTIVATED',
        'User',
        targetUserId,
        { previousIsActive: target.isActive }
      )
    } catch (auditErr) {
      logger.warn(`Audit log échoué (setActive): ${auditErr.message}`)
    }
    return this.findOne(targetUserId)
  }

  async _processPendingEmailInvitations(userId, email) {
    const pending = await Invitation.findAll({
      where: { targetEmail: email.toLowerCase(), status: 'pending' }
    })
    for (const inv of pending) {
      if (inv.role === 'admin_etablissement' && inv.etablissementId) {
        // Invitation gérant établissement → promouvoir le compte et l'associer
        // (même garde-fou qu'EtablissementService.assignAdmin : transaction + révocation de l'ancien gérant)
        const etab = await Etablissement.findByPk(inv.etablissementId)
        if (etab) {
          await Etablissement.sequelize.transaction(async (t) => {
            if (etab.adminId && etab.adminId !== userId) {
              await User.update({ roleId: 2 }, { where: { userId: etab.adminId }, transaction: t })
            }
            await User.update({ roleId: 4 }, { where: { userId }, transaction: t })
            await etab.update({ adminId: userId }, { transaction: t })
          })
          try {
            await AuditLogService.log(userId, 'ADMIN_ETABLISSEMENT_ASSIGNED', 'Etablissement', inv.etablissementId, {
              adminId: userId, viaInvitation: true
            })
          } catch (auditErr) {
            logger.warn(`Audit log échoué (_processPendingEmailInvitations): ${auditErr.message}`)
          }
        }
      } else if (inv.classGroupId) {
        await ClassGroupUsers.findOrCreate({
          where: { classGroupId: inv.classGroupId, userId },
          defaults: { role: inv.role }
        })
      }
      await inv.update({ status: 'accepted', targetUserId: userId })
    }
  }
}

module.exports = new UserService()

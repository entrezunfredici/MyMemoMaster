const { User } = require('../models/index')
const logger = require('../helpers/logger')

/**
 * Middleware RBAC — vérifie que l'utilisateur connecté possède l'un des rôles autorisés
 * et que son compte est actif. Doit être placé APRÈS Auth.middleware (req.user.id doit être défini).
 *
 * @param {...number} allowedRoleIds - IDs de rôles autorisés (ex: requireRole(1, 4))
 */
module.exports = (...allowedRoleIds) =>
  async (req, res, next) => {
    try {
      const user = await User.findByPk(req.user.id, { attributes: ['roleId', 'isActive'] })
      if (!user || !allowedRoleIds.includes(user.roleId)) {
        // OWASP F-M8 : les refus d'accès RBAC (403) sont journalisés
        logger.warn(
          `Accès RBAC refusé — userId ${req.user.id} (roleId ${user?.roleId ?? 'inconnu'}) sur ${req.method} ${req.originalUrl} (IP ${req.ip})`
        )
        return res.status(403).json({ message: 'Accès refusé. Permissions insuffisantes.' })
      }
      if (user.isActive === false) {
        return res.status(401).json({ message: 'Compte désactivé.' })
      }
      req.user.roleId = user.roleId
      next()
    } catch (error) {
      logger.error(error?.message || error)
      res.status(500).json({ message: 'Erreur lors de la vérification des permissions.' })
    }
  }

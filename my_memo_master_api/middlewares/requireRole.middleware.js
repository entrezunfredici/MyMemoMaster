const { User } = require('../models/index')
const logger = require('../helpers/logger')

/**
 * Middleware RBAC — vérifie que l'utilisateur connecté possède l'un des rôles autorisés.
 * Doit être placé APRÈS Auth.middleware (req.user.id doit être défini).
 *
 * @param {...number} allowedRoleIds - IDs de rôles autorisés (ex: requireRole(1, 4))
 */
module.exports = (...allowedRoleIds) =>
  async (req, res, next) => {
    try {
      const user = await User.findByPk(req.user.id, { attributes: ['roleId'] })
      if (!user || !allowedRoleIds.includes(user.roleId)) {
        return res.status(403).json({ message: 'Accès refusé. Permissions insuffisantes.' })
      }
      req.user.roleId = user.roleId
      next()
    } catch (error) {
      logger.error(error?.message || error)
      res.status(500).json({ message: 'Erreur lors de la vérification des permissions.' })
    }
  }

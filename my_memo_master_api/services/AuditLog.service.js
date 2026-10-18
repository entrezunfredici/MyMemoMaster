const { AuditLog, User, instance: sequelize } = require('../models/index')
const { Op } = require('sequelize')

// Plafond (et valeur par défaut) du nombre d'entrées renvoyées.
const MAX_LIMIT = 500

class AuditLogService {
  /**
   * Crée une entrée d'audit.
   *
   * @param {number|null} actorId - ID de l'utilisateur ayant déclenché l'action
   * @param {string} action - Code d'action (ex: USER_ACCOUNT_ACTIVATED)
   * @param {string} entityType - Type d'entité concernée (ex: 'User')
   * @param {number|null} entityId - ID de l'entité concernée
   * @param {object|null} metadata - Données supplémentaires libres
   * @returns {Promise<AuditLog>}
   */
  async log(actorId, action, entityType, entityId = null, metadata = null) {
    return AuditLog.create({ actorId, action, entityType, entityId, metadata })
  }

  /**
   * Liste les entrées d'audit avec filtres optionnels, les plus récentes d'abord.
   *
   * @param {object} filters
   * @param {number} [filters.actorId]
   * @param {string} [filters.entityType]
   * @param {number} [filters.entityId]
   * @param {string} [filters.action] - Texte contenu dans le code d'action (ex. ROLE), insensible à la casse
   * @param {number} [filters.limit=500] - Nombre maximum d'entrées (1 à 500)
   * @returns {Promise<AuditLog[]>}
   */
  async findAll({ actorId, entityType, entityId, action, limit } = {}) {
    const where = {}
    if (actorId) where.actorId = parseInt(actorId, 10)
    if (entityType) where.entityType = entityType
    if (entityId) where.entityId = parseInt(entityId, 10)
    const term = typeof action === 'string' ? action.trim().slice(0, 100) : ''
    if (term) {
      // Op.like est insensible à la casse sur SQLite (dev) mais pas sur PostgreSQL (prod) : iLike sur PostgreSQL.
      const likeOp = sequelize.getDialect() === 'postgres' ? Op.iLike : Op.like
      where.action = { [likeOp]: `%${term}%` }
    }
    const parsedLimit = Number.parseInt(limit, 10)
    const safeLimit = Number.isFinite(parsedLimit) ? Math.min(MAX_LIMIT, Math.max(1, parsedLimit)) : MAX_LIMIT

    return AuditLog.findAll({
      where,
      include: [{ model: User, as: 'actor', attributes: ['userId', 'name', 'email'] }],
      order: [['createdAt', 'DESC']],
      limit: safeLimit
    })
  }
}

module.exports = new AuditLogService()

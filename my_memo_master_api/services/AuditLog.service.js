const { AuditLog, User } = require('../models/index')

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
   * Liste les entrées d'audit avec filtres optionnels.
   *
   * @param {object} filters
   * @param {number} [filters.actorId]
   * @param {string} [filters.entityType]
   * @param {number} [filters.entityId]
   * @returns {Promise<AuditLog[]>}
   */
  async findAll({ actorId, entityType, entityId } = {}) {
    const where = {}
    if (actorId) where.actorId = parseInt(actorId, 10)
    if (entityType) where.entityType = entityType
    if (entityId) where.entityId = parseInt(entityId, 10)

    return AuditLog.findAll({
      where,
      include: [{ model: User, as: 'actor', attributes: ['userId', 'name', 'email'] }],
      order: [['createdAt', 'DESC']],
      limit: 500
    })
  }
}

module.exports = new AuditLogService()

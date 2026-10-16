const AuditLogService = require('../services/AuditLog.service')
const logger = require('../helpers/logger')

exports.findAll = async (req, res) => {
  try {
    const { actorId, entityType, entityId } = req.query
    const data = await AuditLogService.findAll({ actorId, entityType, entityId })
    res.status(200).json({ message: 'Journaux récupérés.', data })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la récupération des journaux d\'audit.' })
  }
}

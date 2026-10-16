const express = require('express')
const auditLog = require('../controllers/AuditLog.controller')
const authMiddleware = require('../middlewares/Auth.middleware')
const requireRole = require('../middlewares/requireRole.middleware')

const router = express.Router()

/**
 * @swagger
 * /audit-logs:
 *   get:
 *     summary: Lister les entrées d'audit
 *     tags: [AuditLog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: actorId
 *         schema:
 *           type: integer
 *         description: Filtrer par auteur de l'action
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *         description: Filtrer par type d'entité (User, ClassGroup, etc.)
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: integer
 *         description: Filtrer par ID d'entité
 *     responses:
 *       200:
 *         description: Journaux récupérés.
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Accès refusé.
 */
router.get('/', authMiddleware, requireRole(1), auditLog.findAll)

module.exports = (app) => {
  /**
   * @swagger
   * tags:
   *   name: AuditLog
   *   description: Journal d'audit des actions sensibles
   */
  app.use('/audit-logs', router)
}

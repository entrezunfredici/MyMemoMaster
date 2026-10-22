const express = require('express')
const backup = require('../controllers/Backup.controller')
const authMiddleware = require('../middlewares/Auth.middleware')
const requireRole = require('../middlewares/requireRole.middleware')

const router = express.Router()

/**
 * @swagger
 * /backups:
 *   get:
 *     summary: État des sauvegardes de la base et historique des exécutions
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 30
 *           maximum: 100
 *         description: Nombre d'exécutions de l'historique (les plus récentes d'abord)
 *     responses:
 *       200:
 *         description: Réglages, dernières exécutions et historique.
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Accès refusé.
 *   post:
 *     summary: Lancer une sauvegarde manuelle (exécutée en tâche de fond)
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Sauvegarde lancée.
 *       400:
 *         description: Base non PostgreSQL, ou sauvegarde déjà en cours.
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Accès refusé.
 */
router.get('/', authMiddleware, requireRole(1), backup.findAll)
router.post('/', authMiddleware, requireRole(1), backup.create)

module.exports = (app) => {
  /**
   * @swagger
   * tags:
   *   name: Backup
   *   description: Sauvegardes de la base de données (administrateur plateforme)
   */
  app.use('/backups', router)
}

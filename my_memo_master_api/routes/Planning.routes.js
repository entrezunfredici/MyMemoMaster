const express = require('express')
const router = express.Router()
const authMiddleware = require('../middlewares/Auth.middleware')
const validate = require('../middlewares/validate.middleware')
const planningValidators = require('../validators/Planning.validators')
const planning = require('../controllers/Planning.controller')

module.exports = (v1) => {
  v1.use('/planning', router)

  /**
   * @swagger
   * tags:
   *   name: Planning
   *   description: Calcul de charge de révision et priorisation des tâches
   */

  /**
   * @swagger
   * /planning/load:
   *   get:
   *     summary: Charge de révision quotidienne sur N jours
   *     tags: [Planning]
   *     parameters:
   *       - in: query
   *         name: days
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 90
   *           default: 14
   *         description: Nombre de jours à calculer (défaut 14)
   *     responses:
   *       200:
   *         description: Tableau de charge journalière (cardsDue, sessions, deadlines, loadScore)
   *       400:
   *         description: Paramètre invalide
   *       401:
   *         description: Non authentifié
   *       500:
   *         description: Erreur serveur
   */
  router.get('/load', authMiddleware, planningValidators.getLoad, validate, planning.getLoad)

  /**
   * @swagger
   * /planning/priorities:
   *   get:
   *     summary: Liste priorisée des tâches de révision
   *     tags: [Planning]
   *     description: Retourne les tâches classées en overdue, today et upcoming (7 jours).
   *     responses:
   *       200:
   *         description: Objet {overdue, today, upcoming} avec les tâches priorisées
   *       401:
   *         description: Non authentifié
   *       500:
   *         description: Erreur serveur
   */
  router.get('/priorities', authMiddleware, planning.getPriorities)
}

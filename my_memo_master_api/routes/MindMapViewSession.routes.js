const authMiddleware = require('../middlewares/Auth.middleware')
const validate = require('../middlewares/validate.middleware')
const mindMapViewSessionValidators = require('../validators/MindMapViewSession.validators')
const mindMapViewSession = require('../controllers/MindMapViewSession.controller')

module.exports = (router) => {
  /**
   * @swagger
   * tags:
   *   name: MindMapViewSessions
   *   description: Journal des consultations de cartes mentales réellement effectuées (alimente le KPI temps de révision)
   */

  /**
   * @swagger
   * /mindmap-view-sessions:
   *   post:
   *     summary: Journaliser une consultation de carte mentale terminée
   *     tags: [MindMapViewSessions]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [idMindMap, durationSeconds]
   *             properties:
   *               idMindMap:
   *                 type: integer
   *               durationSeconds:
   *                 type: integer
   *     responses:
   *       201:
   *         description: Consultation journalisée
   *       400:
   *         description: Données invalides
   *       401:
   *         description: Non authentifié
   *       500:
   *         description: Erreur serveur
   */
  router.post(
    '/mindmap-view-sessions',
    authMiddleware,
    mindMapViewSessionValidators.create,
    validate,
    mindMapViewSession.create
  )
}

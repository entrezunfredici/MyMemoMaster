const authMiddleware = require('../middlewares/Auth.middleware')
const validate = require('../middlewares/validate.middleware')
const leitnerReviewSessionValidators = require('../validators/LeitnerReviewSession.validators')
const leitnerReviewSession = require('../controllers/LeitnerReviewSession.controller')

module.exports = (router) => {
  /**
   * @swagger
   * tags:
   *   name: LeitnerReviewSessions
   *   description: Journal des sessions de révision Leitner réellement effectuées (alimente le KPI temps de révision)
   */

  /**
   * @swagger
   * /leitner-review-sessions:
   *   post:
   *     summary: Journaliser une session de révision Leitner terminée
   *     tags: [LeitnerReviewSessions]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [idSystem, cardsReviewed, durationSeconds]
   *             properties:
   *               idSystem:
   *                 type: integer
   *               cardsReviewed:
   *                 type: integer
   *               durationSeconds:
   *                 type: integer
   *     responses:
   *       201:
   *         description: Session journalisée
   *       400:
   *         description: Données invalides
   *       401:
   *         description: Non authentifié
   *       500:
   *         description: Erreur serveur
   */
  router.post(
    '/leitner-review-sessions',
    authMiddleware,
    leitnerReviewSessionValidators.create,
    validate,
    leitnerReviewSession.create
  )
}

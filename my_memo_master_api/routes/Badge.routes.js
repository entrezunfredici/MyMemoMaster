const authMiddleware = require('../middlewares/Auth.middleware')
const validate = require('../middlewares/validate.middleware')
const badgeValidators = require('../validators/Badge.validators')
const badge = require('../controllers/Badge.controller')

module.exports = (router) => {
  /**
   * @swagger
   * tags:
   *   name: Badge
   *   description: Badges de gamification de l'utilisateur connecté (obtention, progression, niveau)
   */

  /**
   * @swagger
   * /badges:
   *   get:
   *     summary: Catalogue des badges avec l'état de l'utilisateur (obtenu ou progression)
   *     tags: [Badge]
   *     responses:
   *       200:
   *         description: Liste des badges
   *       401:
   *         description: Non authentifié
   *       500:
   *         description: Erreur serveur
   */
  router.get('/badges', authMiddleware, badge.findAll)

  /**
   * @swagger
   * /badges/me/recent:
   *   get:
   *     summary: Badges obtenus dont l'obtention n'a pas encore été vue (animation à jouer)
   *     tags: [Badge]
   *     responses:
   *       200:
   *         description: Badges non vus, du plus ancien au plus récent
   *       401:
   *         description: Non authentifié
   *       500:
   *         description: Erreur serveur
   */
  router.get('/badges/me/recent', authMiddleware, badge.findRecent)

  /**
   * @swagger
   * /badges/me/summary:
   *   get:
   *     summary: Résumé du profil gamifié (niveau, badges obtenus, séries)
   *     tags: [Badge]
   *     responses:
   *       200:
   *         description: Résumé
   *       401:
   *         description: Non authentifié
   *       500:
   *         description: Erreur serveur
   */
  router.get('/badges/me/summary', authMiddleware, badge.summary)

  /**
   * @swagger
   * /badges/me/seen:
   *   patch:
   *     summary: Marquer des badges comme vus
   *     tags: [Badge]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [codes]
   *             properties:
   *               codes:
   *                 type: array
   *                 items:
   *                   type: string
   *     responses:
   *       200:
   *         description: Badges marqués (les codes inconnus ou non obtenus sont ignorés)
   *       400:
   *         description: Données invalides
   *       401:
   *         description: Non authentifié
   *       500:
   *         description: Erreur serveur
   */
  router.patch('/badges/me/seen', authMiddleware, badgeValidators.markSeen, validate, badge.markSeen)
}

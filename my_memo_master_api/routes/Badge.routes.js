const authMiddleware = require('../middlewares/Auth.middleware')
const requireRole = require('../middlewares/requireRole.middleware')
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

  /**
   * @swagger
   * /badges/me/profile:
   *   get:
   *     summary: Titre affiché et vitrine de l'utilisateur
   *     tags: [Badge]
   *     responses:
   *       200:
   *         description: "{ titleCode, showcaseCodes }"
   *       401:
   *         description: Non authentifié
   *       500:
   *         description: Erreur serveur
   *   put:
   *     summary: Définir le titre et la vitrine (3 badges obtenus au maximum)
   *     tags: [Badge]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               titleCode:
   *                 type: string
   *                 nullable: true
   *               showcaseCodes:
   *                 type: array
   *                 maxItems: 3
   *                 items:
   *                   type: string
   *     responses:
   *       200:
   *         description: Titre et vitrine enregistrés
   *       400:
   *         description: Données invalides, plus de 3 badges, ou badge non obtenu
   *       401:
   *         description: Non authentifié
   *       500:
   *         description: Erreur serveur
   */
  router.get('/badges/me/profile', authMiddleware, badge.getProfile)
  router.put('/badges/me/profile', authMiddleware, badgeValidators.setProfile, validate, badge.setProfile)

  /**
   * @swagger
   * /badges/me/activity:
   *   get:
   *     summary: Calendrier d'activité (jours de pratique des dernières semaines)
   *     tags: [Badge]
   *     parameters:
   *       - in: query
   *         name: weeks
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 52
   *           default: 12
   *     responses:
   *       200:
   *         description: "{ from, to, today, weeks, activeDates, activeDaysLast30, streakCurrent, streakBest }"
   *       400:
   *         description: Paramètre invalide
   *       401:
   *         description: Non authentifié
   *       500:
   *         description: Erreur serveur
   */
  router.get('/badges/me/activity', authMiddleware, badgeValidators.activity, validate, badge.activity)

  /**
   * @swagger
   * /badges/me/daily-goal:
   *   get:
   *     summary: Progression de l'objectif quotidien (cartes révisées et exercices terminés aujourd'hui)
   *     tags: [Badge]
   *     responses:
   *       200:
   *         description: "{ date, cards: { goal, done }, exercises: { goal, done }, achieved }"
   *       401:
   *         description: Non authentifié
   *       500:
   *         description: Erreur serveur
   */
  router.get('/badges/me/daily-goal', authMiddleware, badge.dailyGoal)

  /**
   * @swagger
   * /badges/me/settings:
   *   get:
   *     summary: Réglages de gamification (valeurs par défaut si jamais modifiés)
   *     tags: [Badge]
   *     responses:
   *       200:
   *         description: Réglages
   *       401:
   *         description: Non authentifié
   *       500:
   *         description: Erreur serveur
   *   patch:
   *     summary: Modifier une partie des réglages de gamification
   *     tags: [Badge]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               dailyGoalCards:
   *                 type: integer
   *                 minimum: 0
   *                 maximum: 500
   *               dailyGoalExercises:
   *                 type: integer
   *                 minimum: 0
   *                 maximum: 50
   *               streakReminderEnabled:
   *                 type: boolean
   *               badgesVisibleToTeachers:
   *                 type: boolean
   *               animationsEnabled:
   *                 type: boolean
   *               zenMode:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Réglages enregistrés
   *       400:
   *         description: Données invalides
   *       401:
   *         description: Non authentifié
   *       500:
   *         description: Erreur serveur
   */
  router.get('/badges/me/settings', authMiddleware, badge.getSettings)
  router.patch('/badges/me/settings', authMiddleware, badgeValidators.updateSettings, validate, badge.updateSettings)

  /**
   * @swagger
   * /badges/{code}/subjects:
   *   put:
   *     summary: Définir les matières liées à un badge (administrateur)
   *     description: >
   *       Relation many-to-many badge ↔ matières. Un badge lié ne compte que l'activité de ces matières.
   *       Une liste vide rend le badge global. Les badges déjà obtenus restent acquis. La visibilité pour
   *       un enseignant ne dépend pas de ce lien mais des matières avec lesquelles le badge a été obtenu.
   *     tags: [Badge]
   *     parameters:
   *       - in: path
   *         name: code
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [subjectIds]
   *             properties:
   *               subjectIds:
   *                 type: array
   *                 items:
   *                   type: integer
   *     responses:
   *       200:
   *         description: Matières mises à jour
   *       400:
   *         description: Données invalides, matière inconnue ou badge non restreignable par matière
   *       401:
   *         description: Non authentifié
   *       403:
   *         description: Réservé aux administrateurs
   *       404:
   *         description: Badge introuvable
   *       500:
   *         description: Erreur serveur
   */
  router.put('/badges/:code/subjects', authMiddleware, requireRole(1), badgeValidators.setSubjects, validate, badge.setSubjects)
}

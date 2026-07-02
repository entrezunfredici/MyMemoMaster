const express = require('express')
const etablissement = require('../controllers/Etablissement.controller')
const authMiddleware = require('../middlewares/Auth.middleware')
const requireRole = require('../middlewares/requireRole.middleware')
const validate = require('../middlewares/validate.middleware')
const etablissementValidators = require('../validators/Etablissement.validators')

const router = express.Router()

/**
 * @swagger
 * /etablissements/mine:
 *   get:
 *     summary: Récupérer l'établissement de l'admin connecté (roleId=4 uniquement)
 *     tags: [Etablissement]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Établissement récupéré.
 *       404:
 *         description: Aucun établissement associé.
 */
router.get('/mine', authMiddleware, requireRole(4), etablissement.findMine)

/**
 * @swagger
 * /etablissements:
 *   get:
 *     summary: Lister tous les établissements
 *     tags: [Etablissement]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des établissements.
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Accès refusé.
 */
router.get('/', authMiddleware, requireRole(1), etablissement.findAll)

/**
 * @swagger
 * /etablissements/{id}:
 *   get:
 *     summary: Récupérer un établissement par son ID
 *     tags: [Etablissement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Détails de l'établissement.
 *       403:
 *         description: Accès refusé.
 *       404:
 *         description: Établissement introuvable.
 */
router.get(
  '/:id',
  authMiddleware,
  requireRole(1, 4),
  etablissementValidators.byId,
  validate,
  etablissement.findOne
)

/**
 * @swagger
 * /etablissements:
 *   post:
 *     summary: Créer un établissement
 *     tags: [Etablissement]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, code]
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               adminId:
 *                 type: integer
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Établissement créé.
 *       409:
 *         description: Code déjà utilisé.
 */
router.post(
  '/',
  authMiddleware,
  requireRole(1),
  etablissementValidators.create,
  validate,
  etablissement.create
)

/**
 * @swagger
 * /etablissements/{id}:
 *   put:
 *     summary: Modifier un établissement
 *     tags: [Etablissement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Établissement mis à jour.
 *       404:
 *         description: Établissement introuvable.
 */
router.put(
  '/:id',
  authMiddleware,
  requireRole(1),
  etablissementValidators.update,
  validate,
  etablissement.update
)

/**
 * @swagger
 * /etablissements/{id}:
 *   delete:
 *     summary: Supprimer un établissement
 *     tags: [Etablissement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Établissement supprimé.
 *       404:
 *         description: Établissement introuvable.
 */
router.delete(
  '/:id',
  authMiddleware,
  requireRole(1),
  etablissementValidators.byId,
  validate,
  etablissement.destroy
)

/**
 * @swagger
 * /etablissements/{id}/stats:
 *   get:
 *     summary: Statistiques de pilotage d'un établissement
 *     tags: [Etablissement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Statistiques récupérées.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 groupCount:
 *                   type: integer
 *                 totalMembers:
 *                   type: integer
 *                 activeMembers:
 *                   type: integer
 *                 inactiveMembers:
 *                   type: integer
 *                 validatedAccounts:
 *                   type: integer
 *                 pendingInvitations:
 *                   type: integer
 *                 roleBreakdown:
 *                   type: object
 *                   properties:
 *                     students:
 *                       type: integer
 *                     teachers:
 *                       type: integer
 *                 recentActivity:
 *                   type: array
 *       403:
 *         description: Accès refusé.
 *       404:
 *         description: Établissement introuvable.
 */
/**
 * @swagger
 * /etablissements/{id}/audit:
 *   get:
 *     summary: Journaux d'audit scopés à un établissement
 *     tags: [Etablissement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filtrer par code d'action (ex USER_INVITED)
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *         description: Filtrer par type d'entité (User, Invitation, etc.)
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: Journaux récupérés.
 *       403:
 *         description: Accès refusé.
 *       404:
 *         description: Établissement introuvable.
 */
/**
 * @swagger
 * /etablissements/{id}/content:
 *   get:
 *     summary: Lister tout le contenu (ressources + sections) d'un établissement pour modération
 *     tags: [Etablissement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: "Contenu récupéré ({ resources: [], sections: [] })."
 *       403:
 *         description: Accès refusé.
 *       404:
 *         description: Établissement introuvable.
 */
router.post(
  '/:id/assign-admin',
  authMiddleware,
  requireRole(1),
  etablissementValidators.assignAdmin,
  validate,
  etablissement.assignAdmin
)

router.get(
  '/:id/content',
  authMiddleware,
  requireRole(1, 4),
  etablissementValidators.byId,
  validate,
  etablissement.getContent
)

/**
 * @swagger
 * /etablissements/{id}/content/{contentType}/{contentId}:
 *   delete:
 *     summary: Supprimer un contenu pour modération (admin plateforme ou établissement)
 *     tags: [Etablissement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: contentType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [resource, section]
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Contenu supprimé.
 *       403:
 *         description: Accès refusé.
 *       404:
 *         description: Établissement ou contenu introuvable.
 */
router.delete(
  '/:id/content/:contentType/:contentId',
  authMiddleware,
  requireRole(1, 4),
  etablissementValidators.deleteContent,
  validate,
  etablissement.deleteContent
)

router.get(
  '/:id/audit',
  authMiddleware,
  requireRole(1, 4),
  etablissementValidators.byId,
  validate,
  etablissement.getAuditLogs
)

router.get(
  '/:id/stats',
  authMiddleware,
  requireRole(1, 4),
  etablissementValidators.byId,
  validate,
  etablissement.getStats
)

module.exports = (app) => {
  /**
   * @swagger
   * tags:
   *   name: Etablissement
   *   description: Gestion des établissements
   */
  app.use('/etablissements', router)
}

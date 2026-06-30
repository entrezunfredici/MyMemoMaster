const express = require('express')
const etablissement = require('../controllers/Etablissement.controller')
const authMiddleware = require('../middlewares/Auth.middleware')
const requireRole = require('../middlewares/requireRole.middleware')
const validate = require('../middlewares/validate.middleware')
const etablissementValidators = require('../validators/Etablissement.validators')

const router = express.Router()

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

module.exports = (app) => {
  /**
   * @swagger
   * tags:
   *   name: Etablissement
   *   description: Gestion des établissements
   */
  app.use('/etablissements', router)
}

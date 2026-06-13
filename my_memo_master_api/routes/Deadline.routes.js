const express = require('express')
const deadline = require('../controllers/Deadline.controller')
const authMiddleware = require('../middlewares/Auth.middleware')
const validate = require('../middlewares/validate.middleware')
const deadlineValidators = require('../validators/Deadline.validators')

const router = express.Router()

/**
 * @swagger
 * /deadlines:
 *   get:
 *     summary: Lister les échéances des groupes de l'utilisateur
 *     tags: [Deadline]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès.
 *       401:
 *         description: Non authentifié.
 *       500:
 *         description: Erreur serveur.
 */
router.get('/', authMiddleware, deadline.findAll)

/**
 * @swagger
 * /deadlines/{id}:
 *   get:
 *     summary: Récupérer une échéance par ID
 *     tags: [Deadline]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Échéance récupérée avec succès.
 *       404:
 *         description: Échéance introuvable.
 *       500:
 *         description: Erreur serveur.
 */
router.get('/:id', authMiddleware, deadline.findOne)

/**
 * @swagger
 * /deadlines:
 *   post:
 *     summary: Créer une échéance (enseignant du groupe uniquement)
 *     tags: [Deadline]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type, occurrenceId, dueDate]
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [ds, devoir, exposé, autre]
 *               description:
 *                 type: string
 *               occurrenceId:
 *                 type: integer
 *                 description: ID de l'occurrence de cours où l'échéance est annoncée
 *               dueDate:
 *                 type: string
 *                 format: date
 *               dueTime:
 *                 type: string
 *                 example: "17:00"
 *     responses:
 *       201:
 *         description: Échéance créée avec succès.
 *       400:
 *         description: Données invalides.
 *       403:
 *         description: Accès refusé.
 *       500:
 *         description: Erreur serveur.
 */
router.post('/', authMiddleware, deadlineValidators.create, validate, deadline.create)

/**
 * @swagger
 * /deadlines/{id}:
 *   put:
 *     summary: Mettre à jour une échéance (créateur uniquement)
 *     tags: [Deadline]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [ds, devoir, exposé, autre]
 *               description:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date
 *               dueTime:
 *                 type: string
 *     responses:
 *       200:
 *         description: Échéance mise à jour avec succès.
 *       403:
 *         description: Accès refusé.
 *       404:
 *         description: Échéance introuvable.
 *       500:
 *         description: Erreur serveur.
 */
router.put('/:id', authMiddleware, deadlineValidators.update, validate, deadline.update)

/**
 * @swagger
 * /deadlines/{id}:
 *   delete:
 *     summary: Supprimer une échéance (créateur uniquement)
 *     tags: [Deadline]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Échéance supprimée avec succès.
 *       403:
 *         description: Accès refusé.
 *       404:
 *         description: Échéance introuvable.
 *       500:
 *         description: Erreur serveur.
 */
router.delete('/:id', authMiddleware, deadline.delete)

module.exports = (app) => {
  /**
   * @swagger
   * tags:
   *   name: Deadline
   *   description: Échéances liées aux séances de cours
   */
  app.use('/deadlines', router)
}

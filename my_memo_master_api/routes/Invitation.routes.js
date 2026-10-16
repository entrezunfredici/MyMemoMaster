const express = require('express')
const invitation = require('../controllers/Invitation.controller')
const authMiddleware = require('../middlewares/Auth.middleware')
const validate = require('../middlewares/validate.middleware')
const invitationValidators = require('../validators/Invitation.validators')

const router = express.Router()

/**
 * @swagger
 * /invitations/mine:
 *   get:
 *     summary: Lister mes invitations en attente
 *     tags: [Invitation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des invitations pending pour l'utilisateur connecté.
 *       401:
 *         description: Non authentifié.
 */
router.get('/mine', authMiddleware, invitation.findMine)

/**
 * @swagger
 * /invitations/{id}:
 *   put:
 *     summary: Répondre à une invitation (accepter ou décliner)
 *     tags: [Invitation]
 *     security:
 *       - bearerAuth: []
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [accepted, declined]
 *     responses:
 *       200:
 *         description: Invitation mise à jour.
 *       403:
 *         description: Accès refusé.
 *       404:
 *         description: Invitation introuvable ou déjà traitée.
 */
router.put(
  '/:id',
  authMiddleware,
  invitationValidators.respond,
  validate,
  invitation.respond
)

module.exports = (app) => {
  /**
   * @swagger
   * tags:
   *   name: Invitation
   *   description: Gestion des invitations aux groupes classes
   */
  app.use('/invitations', router)
}

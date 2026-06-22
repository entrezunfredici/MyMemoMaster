const authMiddleware = require('../middlewares/Auth.middleware')
const validate = require('../middlewares/validate.middleware')
const reminderValidators = require('../validators/Reminder.validators')
const reminder = require('../controllers/Reminder.controller')

/**
 * @swagger
 * tags:
 *   name: Reminder
 *   description: Gestion des rappels et notifications
 */

module.exports = (router) => {
  /**
   * @swagger
   * /reminders:
   *   get:
   *     summary: Récupérer tous les rappels de l'utilisateur connecté
   *     tags: [Reminder]
   *     responses:
   *       200:
   *         description: Liste récupérée avec succès
   *       401:
   *         description: Non authentifié
   */
  router.get('/reminders', authMiddleware, reminder.findAll)

  /**
   * @swagger
   * /reminders/{id}:
   *   get:
   *     summary: Récupérer un rappel par son ID
   *     tags: [Reminder]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Rappel récupéré avec succès
   *       404:
   *         description: Rappel introuvable
   *       401:
   *         description: Non authentifié
   */
  router.get('/reminders/:id', authMiddleware, reminder.findOne)

  /**
   * @swagger
   * /reminders:
   *   post:
   *     summary: Créer un rappel pour une échéance ou une séance de révision
   *     tags: [Reminder]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - entityType
   *               - entityId
   *               - delayMinutes
   *             properties:
   *               entityType:
   *                 type: string
   *                 enum: [deadline, revision_session]
   *               entityId:
   *                 type: integer
   *               delayMinutes:
   *                 type: integer
   *                 minimum: 1
   *               message:
   *                 type: string
   *                 maxLength: 500
   *     responses:
   *       201:
   *         description: Rappel créé avec succès
   *       400:
   *         description: Données invalides ou date passée
   *       404:
   *         description: Entité introuvable
   *       401:
   *         description: Non authentifié
   */
  router.post('/reminders', authMiddleware, reminderValidators.create, validate, reminder.create)

  /**
   * @swagger
   * /reminders/{id}:
   *   put:
   *     summary: Modifier un rappel (délai et/ou message)
   *     tags: [Reminder]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               delayMinutes:
   *                 type: integer
   *                 minimum: 1
   *               message:
   *                 type: string
   *                 maxLength: 500
   *     responses:
   *       200:
   *         description: Rappel mis à jour avec succès
   *       400:
   *         description: Données invalides ou rappel déjà traité
   *       404:
   *         description: Rappel introuvable
   *       401:
   *         description: Non authentifié
   */
  router.put('/reminders/:id', authMiddleware, reminderValidators.update, validate, reminder.update)

  /**
   * @swagger
   * /reminders/{id}:
   *   delete:
   *     summary: Supprimer (annuler) un rappel
   *     tags: [Reminder]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Rappel supprimé avec succès
   *       404:
   *         description: Rappel introuvable
   *       401:
   *         description: Non authentifié
   */
  router.delete('/reminders/:id', authMiddleware, reminder.delete)
}

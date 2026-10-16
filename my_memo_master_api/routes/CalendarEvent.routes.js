const express = require('express')
const calendarEvent = require('../controllers/CalendarEvent.controller')
const authMiddleware = require('../middlewares/Auth.middleware')
const validate = require('../middlewares/validate.middleware')
const calendarEventValidators = require('../validators/CalendarEvent.validators')

const router = express.Router()

/**
 * @swagger
 * /calendar-events:
 *   get:
 *     summary: Lister les événements visibles par l'utilisateur
 *     tags: [CalendarEvent]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès.
 *       401:
 *         description: Non authentifié.
 *       500:
 *         description: Erreur serveur.
 */
router.get('/', authMiddleware, calendarEvent.findAll)

/**
 * @swagger
 * /calendar-events/{id}:
 *   get:
 *     summary: Récupérer un événement avec ses occurrences
 *     tags: [CalendarEvent]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Événement récupéré avec succès.
 *       404:
 *         description: Événement introuvable.
 *       500:
 *         description: Erreur serveur.
 */
router.get('/:id', authMiddleware, calendarEvent.findOne)

/**
 * @swagger
 * /calendar-events:
 *   post:
 *     summary: Créer un événement de calendrier (admin uniquement)
 *     tags: [CalendarEvent]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type, classGroupId, recurrenceMode]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [cours, examen, autre]
 *               classGroupId:
 *                 type: integer
 *               recurrenceMode:
 *                 type: string
 *                 enum: [manual, auto]
 *               recurrenceRule:
 *                 type: object
 *                 description: Requis si recurrenceMode = auto
 *               occurrences:
 *                 type: array
 *                 description: Requis si recurrenceMode = manual
 *                 items:
 *                   type: object
 *                   properties:
 *                     date:
 *                       type: string
 *                       format: date
 *                     startTime:
 *                       type: string
 *                     endTime:
 *                       type: string
 *     responses:
 *       201:
 *         description: Événement créé avec succès.
 *       400:
 *         description: Données invalides.
 *       403:
 *         description: Accès refusé.
 *       500:
 *         description: Erreur serveur.
 */
router.post('/', authMiddleware, calendarEventValidators.create, validate, calendarEvent.create)

/**
 * @swagger
 * /calendar-events/{id}:
 *   put:
 *     summary: Mettre à jour un événement (admin uniquement)
 *     tags: [CalendarEvent]
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
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [cours, examen, autre]
 *     responses:
 *       200:
 *         description: Événement mis à jour avec succès.
 *       403:
 *         description: Accès refusé.
 *       404:
 *         description: Événement introuvable.
 *       500:
 *         description: Erreur serveur.
 */
router.put('/:id', authMiddleware, calendarEventValidators.update, validate, calendarEvent.update)

/**
 * @swagger
 * /calendar-events/{id}:
 *   delete:
 *     summary: Supprimer un événement et toutes ses occurrences (admin uniquement)
 *     tags: [CalendarEvent]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Événement supprimé avec succès.
 *       403:
 *         description: Accès refusé.
 *       404:
 *         description: Événement introuvable.
 *       500:
 *         description: Erreur serveur.
 */
router.delete('/:id', authMiddleware, calendarEvent.delete)

/**
 * @swagger
 * /calendar-events/{id}/occurrences:
 *   post:
 *     summary: Ajouter une occurrence manuelle à un événement (admin uniquement)
 *     tags: [CalendarEvent]
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
 *             required: [date, startTime, endTime]
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               startTime:
 *                 type: string
 *               endTime:
 *                 type: string
 *     responses:
 *       201:
 *         description: Occurrence ajoutée avec succès.
 *       400:
 *         description: Données invalides.
 *       403:
 *         description: Accès refusé.
 *       404:
 *         description: Événement introuvable.
 *       500:
 *         description: Erreur serveur.
 */
router.post(
  '/:id/occurrences',
  authMiddleware,
  calendarEventValidators.addOccurrence,
  validate,
  calendarEvent.addOccurrence
)

/**
 * @swagger
 * /calendar-events/occurrences/{occurrenceId}:
 *   delete:
 *     summary: Supprimer une occurrence (admin uniquement — bloqué si des échéances y sont liées)
 *     tags: [CalendarEvent]
 *     parameters:
 *       - in: path
 *         name: occurrenceId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Occurrence supprimée avec succès.
 *       403:
 *         description: Accès refusé.
 *       404:
 *         description: Occurrence introuvable.
 *       409:
 *         description: Impossible de supprimer — des échéances sont liées à cette occurrence.
 *       500:
 *         description: Erreur serveur.
 */
router.delete('/occurrences/:occurrenceId', authMiddleware, calendarEvent.deleteOccurrence)

module.exports = (app) => {
  /**
   * @swagger
   * tags:
   *   name: CalendarEvent
   *   description: Événements de calendrier et occurrences
   */
  app.use('/calendar-events', router)
}

const express = require('express')
const revisionSession = require('../controllers/RevisionSession.controller')
const authMiddleware = require('../middlewares/Auth.middleware')
const validate = require('../middlewares/validate.middleware')
const revisionSessionValidators = require('../validators/RevisionSession.validators')

const router = express.Router()

/**
 * @swagger
 * /revision-sessions:
 *   get:
 *     summary: Lister toutes les séances de révision de l'utilisateur
 *     tags: [RevisionSession]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès.
 *       401:
 *         description: Non authentifié.
 *       500:
 *         description: Erreur serveur.
 */
router.get('/', authMiddleware, revisionSession.findAll)

/**
 * @swagger
 * /revision-sessions/today:
 *   get:
 *     summary: Récupérer les séances du jour (todo list)
 *     tags: [RevisionSession]
 *     responses:
 *       200:
 *         description: Séances du jour récupérées avec succès.
 *       401:
 *         description: Non authentifié.
 *       500:
 *         description: Erreur serveur.
 */
router.get('/today', authMiddleware, revisionSession.findToday)

/**
 * @swagger
 * /revision-sessions/{id}:
 *   get:
 *     summary: Récupérer une séance par ID
 *     tags: [RevisionSession]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Séance récupérée avec succès.
 *       404:
 *         description: Séance introuvable.
 *       500:
 *         description: Erreur serveur.
 */
router.get('/:id', authMiddleware, revisionSession.findOne)

/**
 * @swagger
 * /revision-sessions:
 *   post:
 *     summary: Créer une séance de révision
 *     tags: [RevisionSession]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, date, startTime, endTime]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               startTime:
 *                 type: string
 *                 example: "09:00"
 *               endTime:
 *                 type: string
 *                 example: "11:00"
 *     responses:
 *       201:
 *         description: Séance créée avec succès.
 *       400:
 *         description: Données invalides.
 *       500:
 *         description: Erreur serveur.
 */
router.post('/', authMiddleware, revisionSessionValidators.create, validate, revisionSession.create)

/**
 * @swagger
 * /revision-sessions/{id}:
 *   put:
 *     summary: Mettre à jour une séance de révision
 *     tags: [RevisionSession]
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
 *               date:
 *                 type: string
 *                 format: date
 *               startTime:
 *                 type: string
 *               endTime:
 *                 type: string
 *     responses:
 *       200:
 *         description: Séance mise à jour avec succès.
 *       400:
 *         description: Données invalides.
 *       404:
 *         description: Séance introuvable.
 *       500:
 *         description: Erreur serveur.
 */
/**
 * @swagger
 * /revision-sessions/{id}/done:
 *   put:
 *     summary: Marquer une séance comme terminée ou non terminée
 *     tags: [RevisionSession]
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
 *             required: [isDone]
 *             properties:
 *               isDone:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Séance mise à jour.
 *       400:
 *         description: Données invalides.
 *       404:
 *         description: Séance introuvable.
 *       500:
 *         description: Erreur serveur.
 */
router.put(
  '/:id/done',
  authMiddleware,
  revisionSessionValidators.markDone,
  validate,
  revisionSession.markDone
)

router.put(
  '/:id',
  authMiddleware,
  revisionSessionValidators.update,
  validate,
  revisionSession.update
)

/**
 * @swagger
 * /revision-sessions/{id}:
 *   delete:
 *     summary: Supprimer une séance de révision
 *     tags: [RevisionSession]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Séance supprimée avec succès.
 *       404:
 *         description: Séance introuvable.
 *       500:
 *         description: Erreur serveur.
 */
router.delete('/:id', authMiddleware, revisionSession.delete)

module.exports = (app) => {
  /**
   * @swagger
   * tags:
   *   name: RevisionSession
   *   description: Séances de révision (affiché dans le calendrier et la todo list du jour)
   */
  app.use('/revision-sessions', router)
}

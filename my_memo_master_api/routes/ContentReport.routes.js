const express = require('express')
const contentReport = require('../controllers/ContentReport.controller')
const validators = require('../validators/ContentReport.validators')
const validate = require('../middlewares/validate.middleware')
const authMiddleware = require('../middlewares/Auth.middleware')
const requireRole = require('../middlewares/requireRole.middleware')

const router = express.Router()
const moderators = requireRole(1, 4, 5)

/**
 * @swagger
 * /content-reports:
 *   post:
 *     summary: Signaler un contenu (ressource ou section d'un groupe classe)
 *     tags: [ContentReport]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [contentType, contentId, reason]
 *             properties:
 *               contentType: { type: string, enum: [resource, section] }
 *               contentId: { type: integer }
 *               reason: { type: string, enum: [illegal, harassment, copyright, spam, personal_data, other] }
 *               comment: { type: string, maxLength: 500, description: Obligatoire pour le motif other }
 *     responses:
 *       201: { description: Signalement enregistré. }
 *       400: { description: Validation échouée ou signalement de son propre contenu. }
 *       403: { description: Contenu inaccessible au signalant. }
 *       404: { description: Contenu introuvable. }
 *       409: { description: Signalement déjà ouvert sur ce contenu, ou contenu déjà masqué. }
 *       429: { description: Plus de 10 signalements en 24 h. }
 */
router.post('/', authMiddleware, validators.create, validate, contentReport.create)

/**
 * @swagger
 * /content-reports:
 *   get:
 *     summary: File de traitement des signalements (une ligne par contenu signalé)
 *     tags: [ContentReport]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: status, schema: { type: string, enum: [pending, in_review, hidden, dismissed, actioned] }, description: Par défaut les statuts ouverts }
 *       - { in: query, name: reason, schema: { type: string } }
 *       - { in: query, name: contentType, schema: { type: string, enum: [resource, section] } }
 *       - { in: query, name: etablissementId, schema: { type: integer }, description: Rôles 1 et 5 }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20, maximum: 100 } }
 *     responses:
 *       200: { description: File récupérée. }
 *       403: { description: Accès refusé. }
 */
router.get('/', authMiddleware, moderators, validators.findAll, validate, contentReport.findAll)

/**
 * @swagger
 * /content-reports/{id}:
 *   get:
 *     summary: Détail d'un dossier de signalement
 *     tags: [ContentReport]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Dossier, signalements du même contenu et contenu actuel. }
 *       403: { description: Signalement visant votre propre contenu. }
 *       404: { description: Introuvable ou hors périmètre. }
 */
router.get('/:id', authMiddleware, moderators, validators.byId, validate, contentReport.findOne)

/**
 * @swagger
 * /content-reports/{id}/claim:
 *   patch:
 *     summary: Prendre en charge un contenu signalé
 *     tags: [ContentReport]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Pris en charge. }
 *       404: { description: Introuvable ou hors périmètre. }
 *       409: { description: Statut incompatible. }
 */
router.patch('/:id/claim', authMiddleware, moderators, validators.byId, validate, contentReport.claim)

/**
 * @swagger
 * /content-reports/{id}/dismiss:
 *   patch:
 *     summary: Rejeter un signalement (le contenu respecte les règles)
 *     tags: [ContentReport]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [decisionNote]
 *             properties:
 *               decisionNote: { type: string, maxLength: 500 }
 *     responses:
 *       200: { description: Rejeté. }
 *       409: { description: Statut incompatible. }
 */
router.patch('/:id/dismiss', authMiddleware, moderators, validators.withDecision, validate, contentReport.dismiss)

/**
 * @swagger
 * /content-reports/{id}/hide:
 *   patch:
 *     summary: Masquer le contenu signalé (30 jours au maximum, puis suppression automatique)
 *     tags: [ContentReport]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [decisionNote]
 *             properties:
 *               decisionNote: { type: string, maxLength: 500 }
 *     responses:
 *       200: { description: Contenu masqué, auteur prévenu par email. }
 *       409: { description: Statut incompatible ou contenu déjà masqué ou supprimé. }
 */
router.patch('/:id/hide', authMiddleware, moderators, validators.withDecision, validate, contentReport.hide)

/**
 * @swagger
 * /content-reports/{id}/restore:
 *   patch:
 *     summary: Rétablir un contenu masqué
 *     tags: [ContentReport]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Contenu rétabli. }
 *       409: { description: Le contenu n'est pas masqué. }
 */
router.patch('/:id/restore', authMiddleware, moderators, validators.byId, validate, contentReport.restore)

/**
 * @swagger
 * /content-reports/{id}/remove-content:
 *   patch:
 *     summary: Supprimer définitivement le contenu signalé (aussi possible depuis un contenu masqué)
 *     tags: [ContentReport]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [decisionNote]
 *             properties:
 *               decisionNote: { type: string, maxLength: 500 }
 *     responses:
 *       200: { description: Contenu supprimé, auteur prévenu par email. }
 *       409: { description: Dossier déjà clos. }
 */
router.patch('/:id/remove-content', authMiddleware, moderators, validators.withDecision, validate, contentReport.removeContent)

module.exports = (app) => {
  /**
   * @swagger
   * tags:
   *   name: ContentReport
   *   description: Signalement et modération de contenu
   */
  app.use('/content-reports', router)
}

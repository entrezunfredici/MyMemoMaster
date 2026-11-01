const { body, param, query } = require('express-validator')
const { REASONS, CONTENT_TYPES, STATUSES } = require('../services/ContentReport.service')

const idParam = param('id').isInt({ min: 1 }).withMessage('Identifiant de signalement invalide.')

const decisionNote = body('decisionNote')
  .trim()
  .notEmpty()
  .withMessage('Le motif de la décision est requis.')
  .isLength({ max: 500 })
  .withMessage('Le motif de la décision ne peut pas dépasser 500 caractères.')

exports.create = [
  body('contentType').isIn(CONTENT_TYPES).withMessage("Le type de contenu doit être 'resource' ou 'section'."),
  body('contentId').isInt({ min: 1 }).withMessage('Identifiant de contenu invalide.'),
  body('reason').isIn(REASONS).withMessage('Motif de signalement invalide.'),
  body('comment')
    .optional({ nullable: true })
    .isString()
    .withMessage('Le commentaire doit être un texte.')
    .trim()
    .isLength({ max: 500 })
    .withMessage('Le commentaire ne peut pas dépasser 500 caractères.'),
  body('comment')
    .if(body('reason').equals('other'))
    .trim()
    .notEmpty()
    .withMessage("Une précision est obligatoire pour le motif 'autre'.")
]

exports.findAll = [
  query('status').optional().isIn(STATUSES).withMessage('Statut invalide.'),
  query('reason').optional().isIn(REASONS).withMessage('Motif invalide.'),
  query('contentType').optional().isIn(CONTENT_TYPES).withMessage('Type de contenu invalide.'),
  query('etablissementId').optional().isInt({ min: 1 }).withMessage("Identifiant d'établissement invalide."),
  query('page').optional().isInt({ min: 1 }).withMessage('Page invalide.'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite invalide (1 à 100).')
]

exports.byId = [idParam]
exports.withDecision = [idParam, decisionNote]

const { body } = require('express-validator')

exports.create = [
  body('title')
    .trim()
    .notEmpty().withMessage('Le titre est requis.')
    .isLength({ max: 150 }).withMessage('Le titre ne peut pas dépasser 150 caractères.'),
  body('type')
    .notEmpty().withMessage('Le type est requis.')
    .isIn(['cours', 'carte_mentale', 'sujet', 'autre']).withMessage("Le type doit être 'cours', 'carte_mentale', 'sujet' ou 'autre'."),
  body('description')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2000 }).withMessage('La description ne peut pas dépasser 2000 caractères.'),
  body('url').optional({ nullable: true }).trim(),
  body('fileKey').optional({ nullable: true }).trim(),
  body('mimeType').optional({ nullable: true }).trim(),
  body('originalName').optional({ nullable: true }).trim(),
  body('fileSize').optional({ nullable: true }).isInt({ min: 0 }).withMessage('La taille doit être un entier positif.')
]

exports.update = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 150 }).withMessage('Le titre doit contenir entre 1 et 150 caractères.'),
  body('type')
    .optional()
    .isIn(['cours', 'carte_mentale', 'sujet', 'autre']).withMessage("Le type doit être 'cours', 'carte_mentale', 'sujet' ou 'autre'."),
  body('description')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2000 }).withMessage('La description ne peut pas dépasser 2000 caractères.'),
  body('url').optional({ nullable: true }).trim()
]

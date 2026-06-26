const { body } = require('express-validator')

exports.create = [
  body('title')
    .trim()
    .notEmpty().withMessage('Le titre est requis.')
    .isLength({ max: 150 }).withMessage('Le titre ne peut pas dépasser 150 caractères.'),
  body('type')
    .notEmpty().withMessage('Le type est requis.')
    .isIn(['section', 'rendu']).withMessage("Le type doit être 'section' ou 'rendu'."),
  body('description')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2000 }).withMessage('La description ne peut pas dépasser 2000 caractères.'),
  body('dueDate')
    .optional({ nullable: true })
    .isDate().withMessage('La date cible doit être une date valide (YYYY-MM-DD).')
]

exports.update = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 150 }).withMessage('Le titre doit contenir entre 1 et 150 caractères.'),
  body('type')
    .optional()
    .isIn(['section', 'rendu']).withMessage("Le type doit être 'section' ou 'rendu'."),
  body('description')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2000 }).withMessage('La description ne peut pas dépasser 2000 caractères.'),
  body('dueDate')
    .optional({ nullable: true })
    .isDate().withMessage('La date cible doit être une date valide (YYYY-MM-DD).')
]

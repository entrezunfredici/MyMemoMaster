const { body } = require('express-validator')

const contentRules = body('content')
  .trim()
  .notEmpty()
  .withMessage('Le contenu de la réponse est requis')
  .isLength({ max: 2000 })
  .withMessage('Le contenu ne peut pas dépasser 2000 caractères')

const correctionRules = body('correction')
  .isBoolean()
  .withMessage('correction doit être un booléen')

const questionIdRules = body('idQuestion')
  .isInt({ min: 1 })
  .withMessage('idQuestion doit être un entier positif')

exports.create = [contentRules, correctionRules, questionIdRules]

exports.update = [
  body('content')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Le contenu ne peut pas dépasser 2000 caractères'),
  body('correction').optional().isBoolean().withMessage('correction doit être un booléen'),
  body('idQuestion')
    .optional()
    .isInt({ min: 1 })
    .withMessage('idQuestion doit être un entier positif')
]

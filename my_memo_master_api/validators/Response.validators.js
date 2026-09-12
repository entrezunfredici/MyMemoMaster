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

// Aperçu de qualité (AnswerQuality.service.js) SANS persistance — statement + réponse(s) fournis
// directement par l'appelant, aucun idQuestion requis (utile avant même la création de la
// Question, ex. modale de création d'une carte Leitner). DECISIONS.md 2026-09-12.
exports.qualityPreview = [
  body('statement')
    .trim()
    .notEmpty()
    .withMessage("L'énoncé de la question est requis")
    .isLength({ max: 5000 })
    .withMessage("L'énoncé ne peut pas dépasser 5000 caractères"),
  body('answer')
    .trim()
    .notEmpty()
    .withMessage('La réponse principale est requise')
    .isLength({ max: 2000 })
    .withMessage('La réponse ne peut pas dépasser 2000 caractères'),
  body('acceptedAnswers')
    .optional()
    .isArray()
    .withMessage('acceptedAnswers doit être un tableau'),
  body('acceptedAnswers.*')
    .isString()
    .withMessage('Chaque reformulation acceptée doit être une chaîne')
    .isLength({ max: 2000 })
    .withMessage('Chaque reformulation ne peut pas dépasser 2000 caractères')
]

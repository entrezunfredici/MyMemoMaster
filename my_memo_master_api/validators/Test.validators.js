const { body } = require('express-validator')

const nameRules = body('name')
  .trim()
  .notEmpty()
  .withMessage('Le nom du test est requis')
  .isLength({ min: 2, max: 100 })
  .withMessage('Le nom doit contenir entre 2 et 100 caractères')

const subjectIdRules = body('subjectId')
  .isInt({ min: 1 })
  .withMessage('subjectId doit être un entier positif')

exports.create = [nameRules, subjectIdRules]

exports.submit = [
  body('answers')
    .isArray({ min: 1 })
    .withMessage('answers doit être un tableau non vide.'),
  body('answers.*.questionId')
    .isInt({ min: 1 })
    .withMessage('Chaque réponse doit avoir un questionId valide.')
]

exports.update = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Le nom doit contenir entre 2 et 100 caractères'),
  body('subjectId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('subjectId doit être un entier positif')
]

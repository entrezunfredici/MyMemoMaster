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

// Plafond à 4h (14 400 s), même borne que LeitnerReviewSession.validators.js —
// au-delà, la valeur ne reflète plus un temps de passage réel.
const MAX_SESSION_DURATION_SECONDS = 14400

exports.submit = [
  body('answers')
    .isArray({ min: 1 })
    .withMessage('answers doit être un tableau non vide.'),
  body('answers.*.questionId')
    .isInt({ min: 1 })
    .withMessage('Chaque réponse doit avoir un questionId valide.'),
  body('durationSeconds')
    .optional({ nullable: true })
    .isInt({ min: 0, max: MAX_SESSION_DURATION_SECONDS })
    .withMessage(`durationSeconds doit être un entier entre 0 et ${MAX_SESSION_DURATION_SECONDS}.`)
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

exports.assignGroups = [
  body('groupIds')
    .isArray()
    .withMessage('groupIds doit être un tableau'),
  body('groupIds.*')
    .isInt({ min: 1 })
    .withMessage('Chaque groupId doit être un entier positif')
]

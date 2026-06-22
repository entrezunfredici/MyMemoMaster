const { body } = require('express-validator')

/**
 * Validation pour la correction automatique de réponse de type date.
 */
exports.gradeDateAnswer = [
  body('correct_answer')
    .notEmpty()
    .withMessage('Le champ "correct_answer" est requis')
    .isString()
    .withMessage('"correct_answer" doit être une chaîne de caractères'),
  body('student_answer')
    .notEmpty()
    .withMessage('Le champ "student_answer" est requis')
    .isString()
    .withMessage('"student_answer" doit être une chaîne de caractères')
]

/**
 * Validation pour la correction sémantique.
 * correct_answers accepte une string ou un tableau de strings non vides.
 */
exports.gradeSemantic = [
  body('correct_answers')
    .notEmpty()
    .withMessage('Le champ "correct_answers" est requis')
    .custom((value) => {
      const isValidString = typeof value === 'string' && value.trim().length > 0
      const isValidArray =
        Array.isArray(value) &&
        value.length > 0 &&
        value.every((a) => typeof a === 'string' && a.trim().length > 0)
      if (!isValidString && !isValidArray) {
        throw new Error(
          '"correct_answers" doit être une chaîne non vide ou un tableau de chaînes non vides'
        )
      }
      return true
    }),
  body('student_answer')
    .exists({ checkNull: true })
    .withMessage('Le champ "student_answer" est requis')
    .isString()
    .withMessage('"student_answer" doit être une chaîne de caractères')
]

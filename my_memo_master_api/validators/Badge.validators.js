const { body, param } = require('express-validator')

const MAX_CODES_PER_REQUEST = 50

exports.setSubjects = [
  param('code').isString().isLength({ min: 1, max: 40 }).withMessage('Le code du badge est invalide.'),
  body('subjectIds')
    .isArray({ max: 100 })
    .withMessage('subjectIds doit être un tableau (vide pour un badge global).'),
  body('subjectIds.*').isInt({ min: 1 }).withMessage('Chaque matière doit être un entier positif.')
]

exports.markSeen = [
  body('codes')
    .isArray({ min: 1, max: MAX_CODES_PER_REQUEST })
    .withMessage(`codes doit être un tableau de 1 à ${MAX_CODES_PER_REQUEST} éléments.`),
  body('codes.*')
    .isString()
    .withMessage('Chaque code doit être une chaîne de caractères.')
    .bail()
    .isLength({ min: 1, max: 40 })
    .withMessage('Chaque code doit contenir entre 1 et 40 caractères.')
]

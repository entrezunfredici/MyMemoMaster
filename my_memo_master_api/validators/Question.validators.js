const { body } = require('express-validator')

const QUESTION_TYPES = ['open', 'mcq', 'fill_blank', 'reorder']

exports.create = [
  body('statement').trim().notEmpty().withMessage("L'énoncé de la question est requis"),
  body('questionPosition')
    .isInt({ min: 0 })
    .withMessage('questionPosition doit être un entier positif ou nul'),
  body('type')
    .trim()
    .notEmpty()
    .withMessage('Le type de question est requis')
    .isIn(QUESTION_TYPES)
    .withMessage(`Le type doit être l'un des suivants : ${QUESTION_TYPES.join(', ')}`),
  body('content')
    .optional({ nullable: true })
    .custom((value) => {
      if (value !== null && typeof value !== 'object') {
        throw new Error('content doit être un objet JSON valide')
      }
      return true
    }),
  body('idTest')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('idTest doit être un entier positif'),
  body('idCard')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('idCard doit être un entier positif'),
  body('idSystem')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('idSystem doit être un entier positif')
]

exports.update = [
  body('statement').optional().trim().notEmpty().withMessage("L'énoncé ne peut pas être vide"),
  body('questionPosition')
    .optional()
    .isInt({ min: 0 })
    .withMessage('questionPosition doit être un entier positif ou nul'),
  body('type')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Le type ne peut pas être vide')
    .isIn(QUESTION_TYPES)
    .withMessage(`Le type doit être l'un des suivants : ${QUESTION_TYPES.join(', ')}`),
  body('content')
    .optional({ nullable: true })
    .custom((value) => {
      if (value !== null && typeof value !== 'object') {
        throw new Error('content doit être un objet JSON valide')
      }
      return true
    }),
  body('idTest')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('idTest doit être un entier positif'),
  body('idCard')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('idCard doit être un entier positif')
]

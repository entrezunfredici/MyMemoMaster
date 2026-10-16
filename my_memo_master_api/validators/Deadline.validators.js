const { body } = require('express-validator')

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/
const VALID_TYPES = ['ds', 'devoir', 'exposé', 'autre']

exports.create = [
  body('name').trim().notEmpty().withMessage('Le nom est requis.').isLength({ min: 2, max: 150 }),
  body('type')
    .notEmpty()
    .withMessage('Le type est requis.')
    .isIn(VALID_TYPES)
    .withMessage(`Le type doit être : ${VALID_TYPES.join(', ')}.`),
  body('description').optional({ nullable: true }).trim(),
  body('occurrenceId')
    .notEmpty()
    .withMessage("L'identifiant de la séance est requis.")
    .isInt({ min: 1 })
    .withMessage('occurrenceId doit être un entier positif.'),
  body('dueDate')
    .notEmpty()
    .withMessage("La date d'échéance est requise.")
    .isDate({ format: 'YYYY-MM-DD' })
    .withMessage('dueDate doit être au format YYYY-MM-DD.'),
  body('dueTime')
    .optional({ nullable: true })
    .matches(timeRegex)
    .withMessage('dueTime doit être au format HH:MM.'),
  body('testId')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('testId doit être un entier positif.')
]

exports.update = [
  body('name').optional().trim().isLength({ min: 2, max: 150 }),
  body('type')
    .optional()
    .isIn(VALID_TYPES)
    .withMessage(`Le type doit être : ${VALID_TYPES.join(', ')}.`),
  body('description').optional({ nullable: true }).trim(),
  body('dueDate')
    .optional()
    .isDate({ format: 'YYYY-MM-DD' })
    .withMessage('dueDate doit être au format YYYY-MM-DD.'),
  body('dueTime')
    .optional({ nullable: true })
    .matches(timeRegex)
    .withMessage('dueTime doit être au format HH:MM.')
]

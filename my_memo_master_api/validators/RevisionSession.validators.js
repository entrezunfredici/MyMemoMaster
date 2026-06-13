const { body } = require('express-validator')

exports.markDone = [
  body('isDone').isBoolean().withMessage('isDone doit être un booléen.')
]

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/

exports.create = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Le nom est requis.')
    .isLength({ min: 2, max: 150 })
    .withMessage('Le nom doit contenir entre 2 et 150 caractères.'),
  body('description').optional({ nullable: true }).trim().isLength({ max: 1000 }),
  body('date')
    .notEmpty()
    .withMessage('La date est requise.')
    .isDate({ format: 'YYYY-MM-DD' })
    .withMessage('La date doit être au format YYYY-MM-DD.'),
  body('startTime')
    .notEmpty()
    .withMessage("L'heure de début est requise.")
    .matches(timeRegex)
    .withMessage("L'heure de début doit être au format HH:MM."),
  body('endTime')
    .notEmpty()
    .withMessage("L'heure de fin est requise.")
    .matches(timeRegex)
    .withMessage("L'heure de fin doit être au format HH:MM.")
    .custom((endTime, { req }) => {
      if (req.body.startTime && endTime <= req.body.startTime) {
        throw new Error("L'heure de fin doit être postérieure à l'heure de début.")
      }
      return true
    }),
  body('idSystem').optional({ nullable: true }).isInt({ min: 1 }).withMessage('idSystem doit être un entier positif.'),
  body('idTest').optional({ nullable: true }).isInt({ min: 1 }).withMessage('idTest doit être un entier positif.')
]

exports.update = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 150 })
    .withMessage('Le nom doit contenir entre 2 et 150 caractères.'),
  body('description').optional({ nullable: true }).trim().isLength({ max: 1000 }),
  body('date')
    .optional()
    .isDate({ format: 'YYYY-MM-DD' })
    .withMessage('La date doit être au format YYYY-MM-DD.'),
  body('startTime')
    .optional()
    .matches(timeRegex)
    .withMessage("L'heure de début doit être au format HH:MM."),
  body('endTime')
    .optional()
    .matches(timeRegex)
    .withMessage("L'heure de fin doit être au format HH:MM.")
    .custom((endTime, { req }) => {
      if (req.body.startTime && endTime <= req.body.startTime) {
        throw new Error("L'heure de fin doit être postérieure à l'heure de début.")
      }
      return true
    }),
  body('idSystem').optional({ nullable: true }).isInt({ min: 1 }).withMessage('idSystem doit être un entier positif.'),
  body('idTest').optional({ nullable: true }).isInt({ min: 1 }).withMessage('idTest doit être un entier positif.')
]

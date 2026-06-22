const { body } = require('express-validator')

const ENTITY_TYPES = ['deadline', 'revision_session']

exports.create = [
  body('entityType')
    .notEmpty()
    .withMessage("Le type d'entité est requis.")
    .isIn(ENTITY_TYPES)
    .withMessage(`Le type doit être l'un des suivants : ${ENTITY_TYPES.join(', ')}.`),
  body('entityId')
    .notEmpty()
    .withMessage("L'identifiant de l'entité est requis.")
    .isInt({ min: 1 })
    .withMessage("L'identifiant doit être un entier positif."),
  body('delayMinutes')
    .notEmpty()
    .withMessage('Le délai en minutes est requis.')
    .isInt({ min: 1 })
    .withMessage('Le délai doit être un entier supérieur à 0.'),
  body('message')
    .optional()
    .isString()
    .withMessage('Le message doit être une chaîne de caractères.')
    .isLength({ max: 500 })
    .withMessage('Le message ne peut pas dépasser 500 caractères.')
]

exports.update = [
  body('delayMinutes')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Le délai doit être un entier supérieur à 0.'),
  body('message')
    .optional({ nullable: true })
    .isString()
    .withMessage('Le message doit être une chaîne de caractères.')
    .isLength({ max: 500 })
    .withMessage('Le message ne peut pas dépasser 500 caractères.')
]

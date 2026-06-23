const { body } = require('express-validator')

exports.update = [
  body('enabled').optional().isBoolean().withMessage('enabled doit être un booléen.'),
  body('inAppEnabled').optional().isBoolean().withMessage('inAppEnabled doit être un booléen.'),
  body('emailEnabled').optional().isBoolean().withMessage('emailEnabled doit être un booléen.'),
  body('pushEnabled').optional().isBoolean().withMessage('pushEnabled doit être un booléen.'),
  body('streakAlertEnabled').optional().isBoolean().withMessage('streakAlertEnabled doit être un booléen.'),
  body('disciplineAlertEnabled').optional().isBoolean().withMessage('disciplineAlertEnabled doit être un booléen.'),
  body('scoreDropAlertEnabled').optional().isBoolean().withMessage('scoreDropAlertEnabled doit être un booléen.'),
  body('thresholdDiscipline')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('thresholdDiscipline doit être un entier entre 0 et 100.')
]

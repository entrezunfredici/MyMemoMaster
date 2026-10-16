const { query } = require('express-validator')

exports.getLoad = [
  query('days')
    .optional()
    .isInt({ min: 1, max: 90 })
    .withMessage('Le paramètre days doit être un entier entre 1 et 90.')
    .toInt()
]

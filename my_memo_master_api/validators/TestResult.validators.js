const { body } = require('express-validator')

exports.create = [
  body('testId').isInt({ min: 1 }).withMessage('testId doit être un entier positif.'),
  body('score').isInt({ min: 0 }).withMessage('score doit être un entier positif ou nul.'),
  body('total').isInt({ min: 1 }).withMessage('total doit être un entier strictement positif.')
]

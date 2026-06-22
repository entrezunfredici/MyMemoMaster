const { body } = require('express-validator')

exports.create = [
  body('level').isInt({ min: 1, max: 10 }).withMessage('level doit être un entier entre 1 et 10'),
  body('intervall').isInt({ min: 1 }).withMessage('intervall doit être un entier positif'),
  body('color')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('color trop long'),
  body('idSystem').isInt({ min: 1 }).withMessage('idSystem doit être un entier positif')
]

exports.update = [
  body('level')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('level doit être un entier entre 1 et 10'),
  body('intervall')
    .optional()
    .isInt({ min: 1 })
    .withMessage('intervall doit être un entier positif'),
  body('color')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('color trop long')
]

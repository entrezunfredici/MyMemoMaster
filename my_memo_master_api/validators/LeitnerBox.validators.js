const { body } = require('express-validator')

// color = entier 0xRRGGBB (0 → 16777215)
const colorRule = body('color')
  .optional({ nullable: true })
  .isInt({ min: 0, max: 0xffffff })
  .withMessage('color doit être un entier de couleur valide (0 à 16777215)')

exports.create = [
  body('level').isInt({ min: 1, max: 10 }).withMessage('level doit être un entier entre 1 et 10'),
  body('intervall').isInt({ min: 1 }).withMessage('intervall doit être un entier positif'),
  colorRule,
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
  colorRule
]

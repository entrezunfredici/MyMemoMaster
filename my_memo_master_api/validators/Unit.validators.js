const { body } = require('express-validator')

exports.create = [
  body('name').trim().notEmpty().withMessage("Le nom de l'unité est requis").isLength({ max: 100 }),
  body('denomination')
    .trim()
    .notEmpty()
    .withMessage('La dénomination est requise')
    .isLength({ max: 20 }),
  body('physicalQuantityName')
    .trim()
    .notEmpty()
    .withMessage('La grandeur physique est requise')
    .isLength({ max: 100 })
]

exports.update = [
  body('name').optional().trim().isLength({ max: 100 }),
  body('denomination').optional().trim().isLength({ max: 20 }),
  body('physicalQuantityName').optional().trim().isLength({ max: 100 })
]

const { body } = require('express-validator')

const colorRule = body('color')
  .optional()
  .matches(/^#[0-9A-Fa-f]{6}$/)
  .withMessage('La couleur doit être un code hexadécimal valide (ex: #3B82F6).')

exports.create = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Le nom du tag est requis.')
    .isLength({ max: 50 })
    .withMessage('Le nom ne peut pas dépasser 50 caractères.'),
  colorRule
]

exports.update = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Le nom du tag ne peut pas être vide.')
    .isLength({ max: 50 })
    .withMessage('Le nom ne peut pas dépasser 50 caractères.'),
  colorRule,
  body().custom((_, { req }) => {
    if (req.body.name === undefined && req.body.color === undefined) {
      throw new Error('Au moins le nom ou la couleur est requis.')
    }
    return true
  })
]

exports.setTags = [
  body('tagIds')
    .isArray()
    .withMessage('tagIds doit être un tableau.')
    .custom((ids) => ids.every(Number.isInteger))
    .withMessage('tagIds doit contenir uniquement des entiers.')
]

const { body } = require('express-validator')

exports.create = [
  body('statement').trim().notEmpty().withMessage("L'énoncé de la question est requis"),
  body('questionPosition')
    .isInt({ min: 0 })
    .withMessage('questionPosition doit être un entier positif ou nul'),
  body('type').trim().notEmpty().withMessage('Le type de question est requis'),
  body('idTest')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('idTest doit être un entier positif'),
  body('idCard')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('idCard doit être un entier positif'),
  body('idSystem')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('idSystem doit être un entier positif')
]

exports.update = [
  body('statement').optional().trim().notEmpty().withMessage("L'énoncé ne peut pas être vide"),
  body('questionPosition')
    .optional()
    .isInt({ min: 0 })
    .withMessage('questionPosition doit être un entier positif ou nul'),
  body('type').optional().trim().notEmpty().withMessage('Le type ne peut pas être vide'),
  body('idTest')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('idTest doit être un entier positif'),
  body('idCard')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('idCard doit être un entier positif')
]

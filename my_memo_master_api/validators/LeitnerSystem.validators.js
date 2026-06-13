const { body } = require('express-validator')

const nameRules = body('name')
  .trim()
  .isLength({ min: 2, max: 100 })
  .withMessage('Le nom doit contenir entre 2 et 100 caractères')

const optionalIntId = (field) =>
  body(field)
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage(`${field} doit être un entier positif`)

const boolRight = (field) =>
  body(field).optional({ nullable: true }).isBoolean().withMessage(`${field} doit être un booléen`)

exports.create = [
  nameRules,
  optionalIntId('idMindMap'),
  body('sujet')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 200 })
    .withMessage('sujet trop long')
]

exports.update = [nameRules, optionalIntId('idMindMap')]

exports.share = [
  body('idUserShared').isInt({ min: 1 }).withMessage('idUserShared doit être un entier positif'),
  body('idSystem').isInt({ min: 1 }).withMessage('idSystem doit être un entier positif'),
  boolRight('writeRight'),
  boolRight('shareRight'),
  boolRight('shareWithWriteRightRight'),
  boolRight('shareWithAllRights')
]

const { body } = require('express-validator')

const nameRules = body('name')
  .trim()
  .isLength({ min: 2, max: 100 })
  .withMessage('Le nom doit contenir entre 2 et 100 caractères')

const optionalSubjectId = body('subjectId')
  .optional({ nullable: true })
  .isInt({ min: 1 })
  .withMessage('subjectId doit être un entier positif')

const boolRight = (field) =>
  body(field).optional({ nullable: true }).isBoolean().withMessage(`${field} doit être un booléen`)

exports.create = [nameRules, optionalSubjectId]

exports.update = [nameRules, optionalSubjectId]

exports.share = [
  body('idUserShared').isInt({ min: 1 }).withMessage('idUserShared doit être un entier positif'),
  body('idSystem').isInt({ min: 1 }).withMessage('idSystem doit être un entier positif'),
  boolRight('writeRight'),
  boolRight('shareRight'),
  boolRight('shareWithWriteRightRight'),
  boolRight('shareWithAllRights')
]

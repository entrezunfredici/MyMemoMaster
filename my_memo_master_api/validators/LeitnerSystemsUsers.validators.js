const { body } = require('express-validator')

const boolRight = (field) =>
  body(field).optional({ nullable: true }).isBoolean().withMessage(`${field} doit être un booléen`)

exports.create = [
  body('idSystem').isInt({ min: 1 }).withMessage('idSystem doit être un entier positif'),
  boolRight('writeRight'),
  boolRight('shareRight'),
  boolRight('shareWithWriteRightRight'),
  boolRight('shareWithAllRights')
]

exports.update = [
  boolRight('writeRight'),
  boolRight('shareRight'),
  boolRight('shareWithWriteRightRight'),
  boolRight('shareWithAllRights')
]

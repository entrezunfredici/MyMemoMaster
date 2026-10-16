const { body } = require('express-validator')

const nameRules = body('name')
  .trim()
  .notEmpty()
  .withMessage('Le nom du rôle est requis')
  .isLength({ min: 2, max: 50 })
  .withMessage('Le nom doit contenir entre 2 et 50 caractères')

exports.create = [nameRules]
exports.update = [nameRules]

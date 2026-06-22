const { query } = require('express-validator')

const keyRules = query('key')
  .notEmpty()
  .withMessage("Le paramètre 'key' est requis.")
  .isString()
  .withMessage("Le paramètre 'key' doit être une chaîne de caractères.")

exports.delete = [keyRules]

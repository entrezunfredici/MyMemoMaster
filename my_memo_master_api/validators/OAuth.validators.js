const { body, param } = require('express-validator')
const { PROVIDER_IDS } = require('../config/oauth.config')

const providerRule = param('provider').isIn(PROVIDER_IDS).withMessage('Fournisseur de connexion inconnu')

exports.authorizeUrl = [providerRule]

exports.login = [
  providerRule,
  body('code').isString().trim().notEmpty().isLength({ max: 2048 }).withMessage("Code d'autorisation requis"),
  body('state').isString().trim().notEmpty().isLength({ max: 2048 }).withMessage('Paramètre state requis')
]

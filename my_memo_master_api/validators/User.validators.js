const { body } = require('express-validator')

const passwordRules = body('password')
  .isLength({ min: 10 })
  .withMessage('Le mot de passe doit contenir au moins 10 caractères')
  .matches(/[A-Z]/)
  .withMessage('Le mot de passe doit contenir au moins une majuscule')
  .matches(/[0-9]/)
  .withMessage('Le mot de passe doit contenir au moins un chiffre')

const newPasswordRules = body('newPassword')
  .isLength({ min: 10 })
  .withMessage('Le mot de passe doit contenir au moins 10 caractères')
  .matches(/[A-Z]/)
  .withMessage('Le mot de passe doit contenir au moins une majuscule')
  .matches(/[0-9]/)
  .withMessage('Le mot de passe doit contenir au moins un chiffre')

const emailRules = body('email').isEmail().withMessage('Email invalide').normalizeEmail()

exports.register = [
  emailRules,
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Le nom doit contenir entre 2 et 50 caractères'),
  passwordRules
]

exports.login = [emailRules, body('password').notEmpty().withMessage('Mot de passe requis')]

exports.forgotPassword = [emailRules]

exports.resetPassword = [
  emailRules,
  body('code')
    .trim()
    .isHexadecimal()
    .withMessage('Token invalide')
    .isLength({ min: 64, max: 64 })
    .withMessage('Token invalide'),
  newPasswordRules
]

exports.changePassword = [
  body('id').isInt({ min: 1 }).withMessage('ID invalide'),
  body('oldPassword').notEmpty().withMessage('Ancien mot de passe requis'),
  newPasswordRules
]

exports.update = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Le nom doit contenir entre 2 et 50 caractères'),
  body('email').optional().isEmail().withMessage('Email invalide').normalizeEmail()
]

exports.refreshToken = [
  body('refreshToken').notEmpty().withMessage('Token de rafraîchissement requis')
]

const { body } = require('express-validator')

// OWASP F-M2 — le caractère spécial est exigé en plus de la majuscule et du chiffre
const passwordRules = body('password')
  .isLength({ min: 10 })
  .withMessage('Le mot de passe doit contenir au moins 10 caractères')
  .matches(/[A-Z]/)
  .withMessage('Le mot de passe doit contenir au moins une majuscule')
  .matches(/[0-9]/)
  .withMessage('Le mot de passe doit contenir au moins un chiffre')
  .matches(/[^a-zA-Z0-9]/)
  .withMessage('Le mot de passe doit contenir au moins un caractère spécial')

const newPasswordRules = body('newPassword')
  .isLength({ min: 10 })
  .withMessage('Le mot de passe doit contenir au moins 10 caractères')
  .matches(/[A-Z]/)
  .withMessage('Le mot de passe doit contenir au moins une majuscule')
  .matches(/[0-9]/)
  .withMessage('Le mot de passe doit contenir au moins un chiffre')
  .matches(/[^a-zA-Z0-9]/)
  .withMessage('Le mot de passe doit contenir au moins un caractère spécial')

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
    .matches(/^\d{6}$/)
    .withMessage('Code invalide'),
  newPasswordRules
]

// OWASP F-M3 — pas de règle body('id') : le controller utilise req.user.id (JWT), jamais le body
exports.changePassword = [
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

exports.resendVerification = [emailRules]

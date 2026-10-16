const { body, param, query } = require('express-validator')

const contentIdParam = param('contentId')
  .isInt({ min: 1 })
  .withMessage("L'identifiant du contenu est invalide.")

const contentTypeParam = param('contentType')
  .isIn(['resource', 'section'])
  .withMessage("Le type de contenu doit être 'resource' ou 'section'.")

const idParam = param('id')
  .isInt({ min: 1 })
  .withMessage("L'identifiant de l'établissement est invalide.")

exports.create = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage("Le nom de l'établissement est requis.")
    .isLength({ max: 100 })
    .withMessage("Le nom ne peut pas dépasser 100 caractères."),
  body('code')
    .trim()
    .notEmpty()
    .withMessage("Le code de l'établissement est requis.")
    .isLength({ max: 20 })
    .withMessage("Le code ne peut pas dépasser 20 caractères.")
    .matches(/^[A-Z0-9_-]+$/i)
    .withMessage("Le code ne peut contenir que des lettres, chiffres, tirets et underscores."),
  body('adminId')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("L'identifiant de l'administrateur est invalide.")
]

exports.update = [
  idParam,
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Le nom ne peut pas être vide.")
    .isLength({ max: 100 })
    .withMessage("Le nom ne peut pas dépasser 100 caractères."),
  body('code')
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Le code ne peut pas être vide.")
    .isLength({ max: 20 })
    .withMessage("Le code ne peut pas dépasser 20 caractères.")
    .matches(/^[A-Z0-9_-]+$/i)
    .withMessage("Le code ne peut contenir que des lettres, chiffres, tirets et underscores."),
  body('adminId')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("L'identifiant de l'administrateur est invalide.")
]

exports.byId = [idParam]

exports.assignAdmin = [
  idParam,
  body('email')
    .trim()
    .notEmpty()
    .withMessage("L'email est requis.")
    .isEmail()
    .withMessage("L'email est invalide.")
    .normalizeEmail()
]

exports.auditLogs = [
  idParam,
  query('entityId')
    .optional()
    .isInt({ min: 1 })
    .withMessage("L'identifiant de l'entité doit être un entier positif."),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('La limite doit être un entier entre 1 et 500.')
]

exports.deleteContent = [idParam, contentTypeParam, contentIdParam]

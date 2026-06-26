const { body } = require('express-validator')

exports.create = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Le nom du groupe est requis.')
    .isLength({ min: 2, max: 100 })
    .withMessage('Le nom doit contenir entre 2 et 100 caractères.'),
  body('description')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('La description ne peut pas dépasser 500 caractères.'),
  body('level')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Le niveau ne peut pas dépasser 50 caractères.'),
  body('code')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Le code ne peut pas dépasser 50 caractères.'),
  body('score')
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 100 })
    .withMessage('Le score doit être un nombre entre 0 et 100.')
]

exports.update = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Le nom doit contenir entre 2 et 100 caractères.'),
  body('description')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('La description ne peut pas dépasser 500 caractères.'),
  body('level')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Le niveau ne peut pas dépasser 50 caractères.'),
  body('code')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Le code ne peut pas dépasser 50 caractères.'),
  body('score')
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 100 })
    .withMessage('Le score doit être un nombre entre 0 et 100.')
]

exports.updateMember = [
  body('role')
    .notEmpty()
    .withMessage('Le rôle est requis.')
    .isIn(['teacher', 'student'])
    .withMessage("Le rôle doit être 'teacher' ou 'student'.")
]

exports.addMember = [
  body('userId')
    .notEmpty()
    .withMessage("L'identifiant de l'utilisateur est requis.")
    .isInt({ min: 1 })
    .withMessage('userId doit être un entier positif.'),
  body('role')
    .notEmpty()
    .withMessage('Le rôle est requis.')
    .isIn(['teacher', 'student'])
    .withMessage("Le rôle doit être 'teacher' ou 'student'.")
]

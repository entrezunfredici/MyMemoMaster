const { query } = require('express-validator')

exports.searchAll = [
  query('subjectId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('subjectId doit être un entier positif.'),
  query('q')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('La recherche ne peut pas dépasser 200 caractères.')
]

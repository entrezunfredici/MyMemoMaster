const { body } = require('express-validator')

exports.create = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Le nom du tutoriel est requis')
    .isLength({ max: 200 }),
  body('link')
    .trim()
    .notEmpty()
    .withMessage('Le lien est requis')
    .isURL()
    .withMessage('Le lien doit être une URL valide'),
  body('revision_tips').optional().isBoolean().withMessage('revision_tips doit être un booléen'),
  body('subjectId')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('subjectId doit être un entier positif')
]

exports.update = [
  body('name').optional().trim().isLength({ max: 200 }),
  body('link').optional().trim().isURL().withMessage('Le lien doit être une URL valide'),
  body('revision_tips').optional().isBoolean().withMessage('revision_tips doit être un booléen'),
  body('subjectId')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('subjectId doit être un entier positif')
]

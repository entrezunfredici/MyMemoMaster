const { body, query } = require('express-validator')

exports.grantConsent = [
  body('teacherId').isInt({ min: 1 }).withMessage("L'identifiant de l'enseignant est invalide."),
  body('classGroupId').isInt({ min: 1 }).withMessage("L'identifiant du groupe est invalide."),
  body('subjectId').optional({ nullable: true }).isInt({ min: 1 }).withMessage("L'identifiant de la matière est invalide.")
]

exports.getStudentKpis = [
  query('classGroupId').isInt({ min: 1 }).withMessage('Le paramètre classGroupId est requis et doit être un entier positif.')
]

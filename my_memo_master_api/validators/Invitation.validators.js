const { body, param } = require('express-validator')

exports.create = [
  body('targetUserId')
    .notEmpty()
    .withMessage("L'identifiant de l'utilisateur cible est requis.")
    .isInt({ min: 1 })
    .withMessage("L'identifiant de l'utilisateur cible est invalide."),
  body('role')
    .notEmpty()
    .withMessage('Le rôle est requis.')
    .isIn(['teacher', 'student'])
    .withMessage("Le rôle doit être 'teacher' ou 'student'.")
]

exports.respond = [
  param('id')
    .isInt({ min: 1 })
    .withMessage("L'identifiant de l'invitation est invalide."),
  body('status')
    .notEmpty()
    .withMessage('Le statut est requis.')
    .isIn(['accepted', 'declined'])
    .withMessage("Le statut doit être 'accepted' ou 'declined'.")
]

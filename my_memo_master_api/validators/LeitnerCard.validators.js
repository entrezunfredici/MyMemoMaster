const { body } = require('express-validator')

exports.addCard = [
  body('idQuestion').isInt({ min: 1 }).withMessage('idQuestion doit être un entier positif'),
  body('idSystem').isInt({ min: 1 }).withMessage('idSystem doit être un entier positif'),
  body('mindMapNodeId')
    .optional({ nullable: true })
    .isString()
    .withMessage('mindMapNodeId doit être une chaîne')
    .trim()
    .isLength({ min: 1, max: 64 })
    .withMessage('mindMapNodeId doit contenir entre 1 et 64 caractères')
]

exports.updateCard = [
  body('idQuestion').isInt({ min: 1 }).withMessage('idQuestion doit être un entier positif')
]

exports.correctResponse = [
  body('cardId').isInt({ min: 1 }).withMessage('cardId doit être un entier positif'),
  body('studentAnswer').trim().notEmpty().withMessage("La réponse de l'étudiant est requise")
]

const { body } = require('express-validator');

exports.addCard = [
    body('idQuestion').isInt({ min: 1 }).withMessage('idQuestion doit être un entier positif'),
];

exports.updateCard = [
    body('idQuestion').isInt({ min: 1 }).withMessage('idQuestion doit être un entier positif'),
];

exports.correctResponse = [
    body('cardId').isInt({ min: 1 }).withMessage('cardId doit être un entier positif'),
    body('studentAnswer').trim().notEmpty().withMessage('La réponse de l\'étudiant est requise'),
];

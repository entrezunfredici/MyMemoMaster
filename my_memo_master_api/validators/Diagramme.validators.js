const { body } = require('express-validator');

const mmNameRules = body('mmName')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('mmName doit contenir entre 1 et 200 caractères');

const mindMapJsonRules = body('mindMapJson')
    .notEmpty()
    .withMessage('mindMapJson est requis');

exports.create = [
    mmNameRules,
    mindMapJsonRules,
    body('subjectId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('subjectId doit être un entier positif'),
];

exports.update = [
    mmNameRules,
    mindMapJsonRules,
];

const { body } = require('express-validator');

exports.create = [
    body('name').trim().notEmpty().withMessage('Le nom du type est requis').isLength({ min: 2, max: 50 }).withMessage('Le nom doit contenir entre 2 et 50 caractères'),
    body('allowUnit').isBoolean().withMessage('allowUnit doit être un booléen'),
];

exports.update = [
    body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Le nom doit contenir entre 2 et 50 caractères'),
    body('allowUnit').optional().isBoolean().withMessage('allowUnit doit être un booléen'),
];

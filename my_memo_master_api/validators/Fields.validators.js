const { body } = require('express-validator');

exports.create = [
    body('fieldletter').trim().notEmpty().withMessage('fieldletter est requis').isLength({ max: 5 }).withMessage('fieldletter ne peut pas dépasser 5 caractères'),
    body('idType').isInt({ min: 1 }).withMessage('idType doit être un entier positif'),
    body('data').notEmpty().withMessage('data est requis'),
    body('idUnit').optional({ nullable: true }).isInt({ min: 1 }).withMessage('idUnit doit être un entier positif'),
];

exports.update = [
    body('fieldletter').optional().trim().isLength({ max: 5 }).withMessage('fieldletter ne peut pas dépasser 5 caractères'),
    body('idType').optional().isInt({ min: 1 }).withMessage('idType doit être un entier positif'),
    body('idUnit').optional({ nullable: true }).isInt({ min: 1 }).withMessage('idUnit doit être un entier positif'),
];

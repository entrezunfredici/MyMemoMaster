const { body } = require('express-validator');

const nameRules = body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Le nom doit contenir entre 2 et 100 caractères');

exports.create = [nameRules];
exports.update = [nameRules];

const { body } = require('express-validator');

/**
 * Validation pour la mise à jour de l'état d'onboarding.
 */
exports.update = [
    body('tourSeen')
        .optional()
        .isBoolean().withMessage('tourSeen doit être un booléen'),
    body('checklist')
        .optional()
        .isObject().withMessage('checklist doit être un objet JSON'),
];

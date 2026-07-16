const { body } = require('express-validator')

/**
 * Validation pour la mise à jour de l'état d'onboarding.
 */
exports.update = [
  // `tour_seen` est le champ effectivement lu par OnboardingState.service ;
  // `tourSeen` reste validé pour compatibilité avec les clients existants.
  body('tour_seen').optional().isBoolean().withMessage('tour_seen doit être un booléen'),
  body('tourSeen').optional().isBoolean().withMessage('tourSeen doit être un booléen'),
  body('checklist').optional().isObject().withMessage('checklist doit être un objet JSON')
]

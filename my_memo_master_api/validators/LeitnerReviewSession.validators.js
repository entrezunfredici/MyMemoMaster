const { body } = require('express-validator')

// Plafond à 4h (14 400 s) : au-delà, la mesure ne reflète plus une session
// réelle (onglet resté ouvert en arrière-plan, ordinateur en veille...) — mieux
// vaut ignorer la valeur que polluer le KPI avec une durée aberrante.
const MAX_SESSION_DURATION_SECONDS = 14400

exports.create = [
  body('idSystem')
    .isInt({ min: 1 })
    .withMessage('idSystem doit être un entier positif.'),
  body('cardsReviewed')
    .isInt({ min: 1 })
    .withMessage('cardsReviewed doit être un entier strictement positif.'),
  body('durationSeconds')
    .isInt({ min: 0, max: MAX_SESSION_DURATION_SECONDS })
    .withMessage(`durationSeconds doit être un entier entre 0 et ${MAX_SESSION_DURATION_SECONDS}.`),
  // Optionnel, défaut true (comportement historique — voir modèle) : absent pour
  // un appelant qui ignore la distinction, explicite (false) pour une sortie
  // anticipée journalisée depuis le 2026-09-04.
  body('completed')
    .optional()
    .isBoolean()
    .withMessage('completed doit être un booléen.')
]

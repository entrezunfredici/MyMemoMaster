const { body } = require('express-validator')

// Plafond à 4h (14 400 s), même borne que LeitnerReviewSession.validators.js et
// Test.validators.js — au-delà, la mesure ne reflète plus une consultation
// réelle (onglet resté ouvert en arrière-plan, ordinateur en veille...).
const MAX_SESSION_DURATION_SECONDS = 14400

exports.create = [
  body('idMindMap')
    .isInt({ min: 1 })
    .withMessage('idMindMap doit être un entier positif.'),
  body('durationSeconds')
    .isInt({ min: 0, max: MAX_SESSION_DURATION_SECONDS })
    .withMessage(`durationSeconds doit être un entier entre 0 et ${MAX_SESSION_DURATION_SECONDS}.`)
]

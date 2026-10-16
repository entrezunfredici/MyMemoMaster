const { body } = require('express-validator')

// CHOIX: max: 50 aligné sur la colonne Subject.name (VARCHAR(50), voir
// migrations/20260226151200-create-subject-table.js) plutôt que max: 100.
// RAISON: [FIX] même désaccord validateur/colonne que sur LeitnerSystem.validators.js
// (voir DECISIONS.md 2026-08-31) — un nom de 51 à 100 caractères passait la validation
// puis échouait en base (value too long for type character varying(50)), remontant en 500.
const nameRules = body('name')
  .trim()
  .isLength({ min: 2, max: 50 })
  .withMessage('Le nom doit contenir entre 2 et 50 caractères')

exports.create = [nameRules]
exports.update = [nameRules]

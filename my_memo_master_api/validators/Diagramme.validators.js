const { body } = require('express-validator')

// CHOIX: max: 50 aligné sur la colonne MindMap.mmName (VARCHAR(50), voir
// migrations/20260226151800-create-mindmap-table.js) plutôt que max: 200.
// RAISON: [FIX] même désaccord validateur/colonne que sur LeitnerSystem.validators.js
// (voir DECISIONS.md 2026-08-31) — un mmName de 51 à 200 caractères passait la validation
// puis échouait en base (value too long for type character varying(50)), remontant en 500.
const mmNameRules = body('mmName')
  .trim()
  .isLength({ min: 1, max: 50 })
  .withMessage('mmName doit contenir entre 1 et 50 caractères')

const mindMapJsonRules = body('mindMapJson').notEmpty().withMessage('mindMapJson est requis')

exports.create = [
  mmNameRules,
  mindMapJsonRules,
  body('subjectId')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('subjectId doit être un entier positif')
]

exports.update = [
  mmNameRules,
  mindMapJsonRules,
  body('subjectId')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('subjectId doit être un entier positif')
]

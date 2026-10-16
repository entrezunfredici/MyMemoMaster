const { body } = require('express-validator')

// CHOIX: max: 50 aligné sur la colonne LeitnerSystem.name (VARCHAR(50), voir
// migrations/20260226151700-create-leitnersystem-table.js) plutôt que max: 100.
// RAISON: [FIX] le validateur laissait passer 51-100 caractères, l'INSERT échouait
// ensuite en base (value too long for type character varying(50)) et remontait
// en 500 générique côté /leitnersystems POST au lieu d'un 400 explicite.
// TODO: même désaccord détecté sur Subject.validators.js (max: 100 vs STRING(50))
// et Diagramme.validators.js (max: 200 vs STRING(50)) — hors périmètre de ce ticket.
const nameRules = body('name')
  .trim()
  .isLength({ min: 2, max: 50 })
  .withMessage('Le nom doit contenir entre 2 et 50 caractères')

const optionalSubjectId = body('subjectId')
  .optional({ nullable: true })
  .isInt({ min: 1 })
  .withMessage('subjectId doit être un entier positif')

const optionalIdMindMap = body('idMindMap')
  .optional({ nullable: true })
  .isInt({ min: 1 })
  .withMessage('idMindMap doit être un entier positif')

const boolRight = (field) =>
  body(field).optional({ nullable: true }).isBoolean().withMessage(`${field} doit être un booléen`)

exports.create = [nameRules, optionalSubjectId, optionalIdMindMap]

exports.update = [nameRules, optionalSubjectId, optionalIdMindMap]

exports.share = [
  body('idUserShared').isInt({ min: 1 }).withMessage('idUserShared doit être un entier positif'),
  body('idSystem').isInt({ min: 1 }).withMessage('idSystem doit être un entier positif'),
  boolRight('writeRight'),
  boolRight('shareRight'),
  boolRight('shareWithWriteRightRight'),
  boolRight('shareWithAllRights')
]

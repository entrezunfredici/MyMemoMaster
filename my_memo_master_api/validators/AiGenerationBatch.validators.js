const { body, param } = require('express-validator')

// Plafond dupliqué de services/AiCardGeneration.service.js#MAX_CARD_COUNT — même choix assumé que
// Test.validators.js/LeitnerReviewSession.validators.js (voir DECISIONS.md, 2026-09-01) : rejet
// précoce et clair côté validateur plutôt que de laisser filer jusqu'à l'erreur du service.
const MAX_CARD_COUNT = 30
// CORRECTIF (C-01.11) : cette route est multipart (multer), donc hors du plafond global
// bodyParser.json({ limit: '10kb' }) (app.js) qui borne toutes les autres routes JSON de l'app —
// sourceText n'avait jusqu'ici aucune limite de longueur propre. Valeur alignée sur ce que le
// pipeline peut effectivement exploiter : MAX_CHUNKS (20) × MAX_CHUNK_LENGTH (4000) = 80 000
// caractères (AiCardGenerationPipeline.service.js) — au-delà, le contenu est de toute façon tronqué
// avec un warning, donc valider plus haut ne ferait que payer du découpage pour rien.
const MAX_SOURCE_TEXT_LENGTH = 80000
const CARD_TYPES = ['open', 'mcq', 'mixed']
const CARD_STATUSES = ['pending', 'accepted', 'edited', 'rejected']
const BATCH_STATUSES = ['validated', 'discarded']

exports.generate = [
  body('idSystem').isInt({ min: 1 }).withMessage('idSystem doit être un entier positif.'),
  body('subjectContext').optional({ nullable: true }).isString().isLength({ max: 100 }),
  body('cardCount')
    .isInt({ min: 1, max: MAX_CARD_COUNT })
    .withMessage(`cardCount doit être un entier entre 1 et ${MAX_CARD_COUNT}.`),
  body('cardType').optional().isIn(CARD_TYPES).withMessage(`cardType doit être l'un de : ${CARD_TYPES.join(', ')}.`),
  body('outputLanguage').optional().isString().isLength({ min: 2, max: 10 }),
  body('sourceText')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: MAX_SOURCE_TEXT_LENGTH })
    .withMessage(`sourceText ne peut pas dépasser ${MAX_SOURCE_TEXT_LENGTH} caractères.`),
  // Exactement un des deux : texte collé (sourceText) ou fichier PDF (req.file, posé par le
  // middleware d'upload qui précède ce validateur dans la chaîne de route).
  body().custom((_, { req }) => {
    const hasText = typeof req.body.sourceText === 'string' && req.body.sourceText.trim().length > 0
    const hasFile = Boolean(req.file)
    if (hasText === hasFile) {
      throw new Error("Fournir soit un texte source (sourceText), soit un fichier PDF (l'un des deux exactement).")
    }
    return true
  })
]

exports.findOne = [param('id').isInt({ min: 1 }).withMessage('id doit être un entier positif.')]

exports.remove = [param('id').isInt({ min: 1 }).withMessage('id doit être un entier positif.')]

exports.markStatus = [
  param('id').isInt({ min: 1 }).withMessage('id doit être un entier positif.'),
  body('status').isIn(BATCH_STATUSES).withMessage(`status doit être l'un de : ${BATCH_STATUSES.join(', ')}.`)
]

exports.updateCard = [
  param('cardId').isInt({ min: 1 }).withMessage('cardId doit être un entier positif.'),
  body('statement').optional().isString().isLength({ min: 1 }),
  body('type').optional().isIn(['open', 'mcq']).withMessage('type doit être "open" ou "mcq".'),
  body('answer').optional({ nullable: true }).isString(),
  body('acceptedAnswers').optional({ nullable: true }).isArray(),
  body('options').optional({ nullable: true }).isArray(),
  body('status')
    .optional()
    .isIn(CARD_STATUSES)
    .withMessage(`status doit être l'un de : ${CARD_STATUSES.join(', ')}.`)
]

const { body } = require('express-validator')
const { bufferMatchesMime } = require('../helpers/fileSignature')

// Plafond dupliqué de services/AiExerciseGeneration.service.js#MAX_QUESTION_COUNT — même choix
// assumé que AiGenerationBatch.validators.js (C-01) et documenté dans DECISIONS.md (2026-09-01) :
// rejet précoce et clair côté validateur plutôt que de laisser filer jusqu'à l'erreur du service.
const MAX_QUESTION_COUNT = 30
// Import PDF ajouté après C-02.07 (demande utilisateur) : cette route est désormais multipart
// (comme routes/AiGenerationBatch.routes.js, C-01.11) plutôt que JSON pur — hors du plafond global
// bodyParser.json({ limit: '10kb' }) (app.js). Valeur alignée sur ce que le pipeline peut
// effectivement exploiter : MAX_CHUNKS (20) × MAX_CHUNK_LENGTH (4000) = 80 000 caractères
// (AiExerciseGenerationPipeline.service.js) — même plafond que AiGenerationBatch.validators.js
// (C-01), au-delà le contenu est de toute façon tronqué avec un warning.
const MAX_SOURCE_TEXT_LENGTH = 80000
const QUESTION_TYPES = ['mixed', 'open', 'mcq', 'fill_blank', 'reorder']

exports.generate = [
  body('sourceText')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: MAX_SOURCE_TEXT_LENGTH })
    .withMessage(`sourceText ne peut pas dépasser ${MAX_SOURCE_TEXT_LENGTH} caractères.`),
  body('subjectContext').optional({ nullable: true }).isString().isLength({ max: 100 }),
  body('questionCount')
    .isInt({ min: 1, max: MAX_QUESTION_COUNT })
    .withMessage(`questionCount doit être un entier entre 1 et ${MAX_QUESTION_COUNT}.`),
  body('questionType')
    .optional()
    .isIn(QUESTION_TYPES)
    .withMessage(`questionType doit être l'un de : ${QUESTION_TYPES.join(', ')}.`),
  body('outputLanguage').optional().isString().isLength({ min: 2, max: 10 }),
  // Exactement un des deux : texte collé (sourceText) ou fichier PDF (req.file, posé par le
  // middleware d'upload qui précède ce validateur dans la chaîne de route) — même contrôle que
  // AiGenerationBatch.validators.js#generate (C-01).
  body().custom((_, { req }) => {
    const hasText = typeof req.body.sourceText === 'string' && req.body.sourceText.trim().length > 0
    const hasFile = Boolean(req.file)
    if (hasText === hasFile) {
      throw new Error("Fournir soit un texte source (sourceText), soit un fichier PDF (l'un des deux exactement).")
    }
    return true
  }),
  // Magic bytes (OWASP A08-M2) : déplacé du controller (qui ne doit faire que try/catch + appel
  // service + réponse HTTP, AGENT.md §3/CLAUDE.md « Règles rapides ») vers le validateur, comme
  // c'est déjà le rôle de ce fichier pour toute validation d'entrée. Même vérification que
  // AiGenerationBatch.controller.js#generate (C-01) faisait déjà dans son controller — écart
  // pré-existant, hors périmètre de ce ticket (voir TODO ci-dessous côté C-01).
  body().custom((_, { req }) => {
    if (req.file && !bufferMatchesMime(req.file.buffer, 'application/pdf')) {
      throw new Error("Le fichier envoyé n'est pas un PDF valide.")
    }
    return true
  })
]

// Ajout C-02.09 (revue de code) : POST /ai-exercise-generations/validate-import — voir
// controllers/AiExerciseGeneration.controller.js#validateImport.
exports.validateImport = [
  body('questions')
    .isArray({ min: 1 })
    .withMessage('questions doit être un tableau non vide.')
]

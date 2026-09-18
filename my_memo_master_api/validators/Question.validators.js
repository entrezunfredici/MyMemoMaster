const { body } = require('express-validator')

const QUESTION_TYPES = ['open', 'mcq', 'fill_blank', 'reorder']

// Champs image : renseignés par le front après un upload via POST /storage/upload (voir
// Storage.controller.js#upload), même pattern que ClassGroupResource.validators.js. `imageSource` n'est
// accepté du client QUE pour la valeur 'ai' (Ticket B, 2026-09-12) — le brouillon de question généré par
// AiExerciseGenerationPipeline.service.js porte déjà cette valeur, transmise telle quelle par le front à
// l'acceptation en Interface de révision. `'manual'` reste dérivé côté serveur de la présence
// d'`imageUrl` (Question.service.js#extractImageFields), jamais accepté directement du client — pas
// utile, et évite un client qui déclarerait `imageSource: 'manual'` sans raison.
const imageFieldsValidators = [
  body('imageUrl').optional({ nullable: true }).trim().isLength({ max: 500 }).withMessage("L'URL de l'image ne peut pas dépasser 500 caractères"),
  body('imageKey').optional({ nullable: true }).trim().isLength({ max: 500 }).withMessage("La clé de l'image ne peut pas dépasser 500 caractères"),
  body('imageMimeType').optional({ nullable: true }).trim().isLength({ max: 100 }).withMessage("Le type MIME de l'image ne peut pas dépasser 100 caractères"),
  body('imageOriginalName').optional({ nullable: true }).trim().isLength({ max: 255 }).withMessage("Le nom du fichier image ne peut pas dépasser 255 caractères"),
  body('imageSize').optional({ nullable: true }).isInt({ min: 0 }).withMessage("La taille de l'image doit être un entier positif ou nul"),
  body('imageSource').optional({ nullable: true }).equals('ai').withMessage('imageSource ne peut valoir que "ai" (la valeur "manual" est déterminée automatiquement)')
]

exports.create = [
  body('statement').trim().notEmpty().withMessage("L'énoncé de la question est requis"),
  body('questionPosition')
    .isInt({ min: 0 })
    .withMessage('questionPosition doit être un entier positif ou nul'),
  body('type')
    .trim()
    .notEmpty()
    .withMessage('Le type de question est requis')
    .isIn(QUESTION_TYPES)
    .withMessage(`Le type doit être l'un des suivants : ${QUESTION_TYPES.join(', ')}`),
  body('content')
    .optional({ nullable: true })
    .custom((value) => {
      if (value !== null && typeof value !== 'object') {
        throw new Error('content doit être un objet JSON valide')
      }
      return true
    }),
  body('idTest')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('idTest doit être un entier positif'),
  body('idCard')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('idCard doit être un entier positif'),
  body('idSystem')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('idSystem doit être un entier positif'),
  ...imageFieldsValidators
]

exports.update = [
  body('statement').optional().trim().notEmpty().withMessage("L'énoncé ne peut pas être vide"),
  body('questionPosition')
    .optional()
    .isInt({ min: 0 })
    .withMessage('questionPosition doit être un entier positif ou nul'),
  body('type')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Le type ne peut pas être vide')
    .isIn(QUESTION_TYPES)
    .withMessage(`Le type doit être l'un des suivants : ${QUESTION_TYPES.join(', ')}`),
  body('content')
    .optional({ nullable: true })
    .custom((value) => {
      if (value !== null && typeof value !== 'object') {
        throw new Error('content doit être un objet JSON valide')
      }
      return true
    }),
  body('idTest')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('idTest doit être un entier positif'),
  body('idCard')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('idCard doit être un entier positif'),
  ...imageFieldsValidators
]

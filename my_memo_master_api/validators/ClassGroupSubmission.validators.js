const { body } = require('express-validator')

exports.upsert = [
  body('url')
    .optional({ nullable: true })
    .trim()
    .isURL().withMessage("L'URL fournie est invalide."),
  body('fileKey')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 }).withMessage('La clé de fichier ne peut pas dépasser 500 caractères.'),
  body('mimeType')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 }).withMessage('Le type MIME ne peut pas dépasser 100 caractères.'),
  body('originalName')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 255 }).withMessage('Le nom de fichier ne peut pas dépasser 255 caractères.'),
  body('fileSize')
    .optional({ nullable: true })
    .isInt({ min: 0 }).withMessage('La taille du fichier doit être un entier positif.')
]

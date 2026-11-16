const { body, param, query } = require('express-validator')

const MAX_CODES_PER_REQUEST = 50

exports.setSubjects = [
  param('code').isString().isLength({ min: 1, max: 40 }).withMessage('Le code du badge est invalide.'),
  body('subjectIds')
    .isArray({ max: 100 })
    .withMessage('subjectIds doit être un tableau (vide pour un badge global).'),
  body('subjectIds.*').isInt({ min: 1 }).withMessage('Chaque matière doit être un entier positif.')
]

exports.markSeen = [
  body('codes')
    .isArray({ min: 1, max: MAX_CODES_PER_REQUEST })
    .withMessage(`codes doit être un tableau de 1 à ${MAX_CODES_PER_REQUEST} éléments.`),
  body('codes.*')
    .isString()
    .withMessage('Chaque code doit être une chaîne de caractères.')
    .bail()
    .isLength({ min: 1, max: 40 })
    .withMessage('Chaque code doit contenir entre 1 et 40 caractères.')
]

exports.setProfile = [
  body('titleCode')
    .optional({ nullable: true })
    .isString()
    .withMessage('Le titre doit être un code de badge ou null.')
    .bail()
    .isLength({ min: 1, max: 40 })
    .withMessage('Le code du titre doit contenir entre 1 et 40 caractères.'),
  body('showcaseCodes').optional().isArray({ max: 3 }).withMessage('La vitrine accepte 3 badges au maximum.'),
  body('showcaseCodes.*')
    .isString()
    .withMessage('Chaque code doit être une chaîne de caractères.')
    .bail()
    .isLength({ min: 1, max: 40 })
    .withMessage('Chaque code doit contenir entre 1 et 40 caractères.')
]

exports.activity = [
  query('weeks').optional().isInt({ min: 1, max: 52 }).withMessage('weeks doit être un entier entre 1 et 52.').toInt()
]

exports.updateSettings = [
  body('dailyGoalCards').optional().isInt({ min: 0, max: 500 }).withMessage("L'objectif de cartes doit être entre 0 et 500.").toInt(),
  body('dailyGoalExercises').optional().isInt({ min: 0, max: 50 }).withMessage("L'objectif d'exercices doit être entre 0 et 50.").toInt(),
  body('streakReminderEnabled').optional().isBoolean({ strict: true }).withMessage('streakReminderEnabled doit être un booléen.'),
  body('badgesVisibleToTeachers').optional().isBoolean({ strict: true }).withMessage('badgesVisibleToTeachers doit être un booléen.'),
  body('animationsEnabled').optional().isBoolean({ strict: true }).withMessage('animationsEnabled doit être un booléen.'),
  body('zenMode').optional().isBoolean({ strict: true }).withMessage('zenMode doit être un booléen.')
]

const authMiddleware = require('../middlewares/Auth.middleware')
const validate = require('../middlewares/validate.middleware')
const sanitize = require('../middlewares/sanitize.middleware')
const { aiGenerationLimiter } = require('../middlewares/rateLimit.middleware')
const aiPdfUpload = require('../middlewares/aiPdfUpload.middleware')
const aiExerciseGenerationValidators = require('../validators/AiExerciseGeneration.validators')
const aiExerciseGeneration = require('../controllers/AiExerciseGeneration.controller')

module.exports = (router) => {
  /**
   * @swagger
   * tags:
   *   name: AiExerciseGeneration
   *   description: Génération d'exercices par IA (C-02) — brouillon synchrone, jamais persisté par cette route
   */

  /**
   * @swagger
   * /ai-exercise-generations:
   *   post:
   *     summary: Génère un brouillon de questions d'exercice par IA à partir d'un texte source ou d'un PDF
   *     description: >
   *       Réponse toujours 200 sur un échec du Service génération (LLM indisponible, rate limit, sortie
   *       non exploitable) — voir `success`/`degraded`/`suggestManualCreation` dans le corps (Mode
   *       dégradé, C-02.05). Seule une entrée invalide reste un 400 HTTP. Source au choix : texte collé
   *       (`sourceText`) ou fichier PDF (`multipart/form-data`, champ `pdf`) — exclusifs. Un contenu
   *       long est automatiquement découpé en plusieurs passages (chunking), chacun envoyé séparément au
   *       modèle — `warnings` (tableau) remplace alors `warning` (chaîne unique côté appel simple).
   *       Aucune persistance : les questions renvoyées ne sont ajoutées à un exercice qu'au clic
   *       explicite de l'utilisateur sur « Créer l'exercice »/« Enregistrer les modifications »
   *       (endpoints POST /tests, POST /questions existants, inchangés).
   *       Une question portant sur un schéma détecté dans le PDF source peut porter en plus
   *       `imageUrl`/`imageKey`/`imageMimeType`/`imageOriginalName`/`imageSize`/`imageSource: "ai"`
   *       (Ticket B, image déjà uploadée par le pipeline) — à transmettre tel quel à `POST /questions`
   *       si la question est acceptée sans modification de l'image.
   *     tags: [AiExerciseGeneration]
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required: [questionCount]
   *             properties:
   *               sourceText:
   *                 type: string
   *                 description: Texte collé — exclusif avec pdf
   *               pdf:
   *                 type: string
   *                 format: binary
   *                 description: Fichier PDF — exclusif avec sourceText
   *               subjectContext:
   *                 type: string
   *               questionCount:
   *                 type: integer
   *               questionType:
   *                 type: string
   *                 enum: [mixed, open, mcq, fill_blank, reorder]
   *               outputLanguage:
   *                 type: string
   *     responses:
   *       200:
   *         description: Résultat discriminé sur `success` (brouillon généré, ou échec dégradé avec repli conseillé)
   *       400:
   *         description: Entrée invalide (source manquante/en double, PDF illisible, questionCount/questionType invalides)
   *       401:
   *         description: Non authentifié
   *       422:
   *         description: Aucun contenu exploitable dans la source fournie
   *       429:
   *         description: Trop de générations IA demandées (limiteur dédié, partagé avec C-01)
   */
  router.post(
    '/ai-exercise-generations',
    authMiddleware,
    // Même limiteur dédié que la génération de cartes Leitner (C-01.11) — cette route déclenche un
    // vrai appel LLM payant par requête, l'apiLimiter générique seul ne suffit pas. Partagé entre les
    // deux features (clé par utilisateur, pas par feature) : voir DECISIONS.md, C-02.06.
    aiGenerationLimiter,
    aiPdfUpload.single('pdf'),
    // Même correctif que routes/AiGenerationBatch.routes.js (C-01.11) : le `sanitize` global (app.js)
    // tourne avant le routing, donc avant que multer (ci-dessus) ne peuple req.body pour cette route
    // multipart — sourceText/subjectContext ne seraient donc jamais nettoyés du HTML sans ce second
    // passage, posé ici après multer.
    sanitize,
    aiExerciseGenerationValidators.generate,
    validate,
    aiExerciseGeneration.generate
  )

  /**
   * @swagger
   * /ai-exercise-generations/validate-import:
   *   post:
   *     summary: Revalide le format d'un lot de questions de brouillon juste avant leur import réel
   *     description: >
   *       Périmètre C-02.04/C-02.09 : à appeler par le front juste avant les POST /tests + POST
   *       /questions existants (inchangés), pour les questions issues de l'Écran de révision
   *       (générées par IA, éventuellement éditées). Échec partiel toléré : les questions non
   *       conformes sont renvoyées dans `rejected` (avec le détail des erreurs), pas persistées ; les
   *       autres dans `importable`. Aucune persistance n'est faite par cette route elle-même.
   *     tags: [AiExerciseGeneration]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [questions]
   *             properties:
   *               questions:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     statement: { type: string }
   *                     type: { type: string }
   *                     content: { type: object }
   *     responses:
   *       200:
   *         description: Lot partitionné entre `importable` et `rejected`
   *       400:
   *         description: questions manquant ou vide
   *       401:
   *         description: Non authentifié
   */
  router.post(
    '/ai-exercise-generations/validate-import',
    authMiddleware,
    sanitize,
    aiExerciseGenerationValidators.validateImport,
    validate,
    aiExerciseGeneration.validateImport
  )
}

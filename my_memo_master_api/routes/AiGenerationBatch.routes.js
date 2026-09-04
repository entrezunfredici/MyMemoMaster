const authMiddleware = require('../middlewares/Auth.middleware')
const validate = require('../middlewares/validate.middleware')
const sanitize = require('../middlewares/sanitize.middleware')
const { aiGenerationLimiter } = require('../middlewares/rateLimit.middleware')
const aiPdfUpload = require('../middlewares/aiPdfUpload.middleware')
const aiGenerationBatchValidators = require('../validators/AiGenerationBatch.validators')
const aiGenerationBatch = require('../controllers/AiGenerationBatch.controller')

module.exports = (router) => {
  /**
   * @swagger
   * tags:
   *   name: AiGenerationBatches
   *   description: Génération de cartes Leitner par IA (C-01) — stockage des brouillons en attente de validation
   */

  /**
   * @swagger
   * /ai-generation-batches:
   *   post:
   *     summary: Lance une génération de cartes par IA (texte ou PDF) et stocke le brouillon en attente
   *     tags: [AiGenerationBatches]
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required: [idSystem, cardCount]
   *             properties:
   *               idSystem:
   *                 type: integer
   *               sourceText:
   *                 type: string
   *                 description: Texte collé — exclusif avec pdf
   *               pdf:
   *                 type: string
   *                 format: binary
   *                 description: Fichier PDF — exclusif avec sourceText
   *               subjectContext:
   *                 type: string
   *               cardCount:
   *                 type: integer
   *               cardType:
   *                 type: string
   *                 enum: [open, mcq, mixed]
   *               outputLanguage:
   *                 type: string
   *     responses:
   *       201:
   *         description: Brouillon créé (batch "pending" avec ses cartes)
   *       400:
   *         description: Entrée invalide (source manquante/en double, PDF illisible, quota de cartes dépassé...)
   *       401:
   *         description: Non authentifié
   *       403:
   *         description: Droits insuffisants sur le système Leitner ciblé
   *       422:
   *         description: Aucun contenu exploitable dans la source fournie
   *       429:
   *         description: Quota quotidien personnel ou budget mensuel global atteint (C-01.06)
   *       500:
   *         description: Service IA non configuré
   *       502:
   *         description: Échec du modèle LLM/OCR
   */
  router.post(
    '/ai-generation-batches',
    authMiddleware,
    // CORRECTIF (C-01.11) : limiteur dédié avant tout traitement — cette route déclenche un vrai
    // appel LLM/OCR payant par requête, l'apiLimiter générique seul (500 req/15 min) ne suffit pas.
    aiGenerationLimiter,
    aiPdfUpload.single('pdf'),
    // CORRECTIF (C-01.11) : le `sanitize` global (app.js) tourne avant le routing, donc avant que
    // multer (ci-dessus) ne peuple req.body pour cette route multipart — sourceText/subjectContext
    // n'étaient donc jamais nettoyés du HTML. Reproduit ici, après multer, comme seule route de
    // l'app dont le corps arrive en multipart plutôt qu'en JSON.
    sanitize,
    aiGenerationBatchValidators.generate,
    validate,
    aiGenerationBatch.generate
  )

  /**
   * @swagger
   * /ai-generation-batches:
   *   get:
   *     summary: Liste les générations en attente de l'utilisateur connecté
   *     tags: [AiGenerationBatches]
   *     responses:
   *       200:
   *         description: Liste des batches "pending"
   *       401:
   *         description: Non authentifié
   */
  router.get('/ai-generation-batches', authMiddleware, aiGenerationBatch.findPending)

  /**
   * @swagger
   * /ai-generation-batches/quota:
   *   get:
   *     summary: Résumé de consommation IA de l'utilisateur connecté (quota quotidien + budget mensuel global, C-01.06)
   *     tags: [AiGenerationBatches]
   *     responses:
   *       200:
   *         description: Résumé de consommation
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 generationsToday: { type: integer }
   *                 maxGenerationsPerDay: { type: integer }
   *                 remainingGenerationsToday: { type: integer }
   *                 budgetSpentThisMonthUsd: { type: number }
   *                 maxBudgetUsdPerMonth: { type: number }
   *       401:
   *         description: Non authentifié
   */
  // Déclarée AVANT /ai-generation-batches/:id — un segment fixe ("quota") placé après une route
  // paramétrée à un seul segment serait autrement capturé par :id (même précaution que
  // /ai-generation-batches/cards/:cardId, qui s'en sort par un segment supplémentaire).
  router.get('/ai-generation-batches/quota', authMiddleware, aiGenerationBatch.getQuota)

  /**
   * @swagger
   * /ai-generation-batches/{id}:
   *   get:
   *     summary: Récupère une génération (et ses cartes proposées) par id
   *     tags: [AiGenerationBatches]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   *     responses:
   *       200:
   *         description: Batch trouvé
   *       401:
   *         description: Non authentifié
   *       404:
   *         description: Génération introuvable
   */
  router.get(
    '/ai-generation-batches/:id',
    authMiddleware,
    aiGenerationBatchValidators.findOne,
    validate,
    aiGenerationBatch.findOne
  )

  /**
   * @swagger
   * /ai-generation-batches/{id}/status:
   *   patch:
   *     summary: Marque une génération "validated" ou "discarded" (statut uniquement — aucune carte Leitner réelle créée)
   *     tags: [AiGenerationBatches]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [status]
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [validated, discarded]
   *     responses:
   *       200:
   *         description: Statut mis à jour
   *       400:
   *         description: Statut invalide
   *       401:
   *         description: Non authentifié
   *       404:
   *         description: Génération introuvable
   */
  router.patch(
    '/ai-generation-batches/:id/status',
    authMiddleware,
    aiGenerationBatchValidators.markStatus,
    validate,
    aiGenerationBatch.markStatus
  )

  /**
   * @swagger
   * /ai-generation-batches/{id}:
   *   delete:
   *     summary: Supprime une génération en attente (et ses cartes, cascade)
   *     tags: [AiGenerationBatches]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   *     responses:
   *       204:
   *         description: Supprimée
   *       401:
   *         description: Non authentifié
   *       404:
   *         description: Génération introuvable
   */
  router.delete(
    '/ai-generation-batches/:id',
    authMiddleware,
    aiGenerationBatchValidators.remove,
    validate,
    aiGenerationBatch.remove
  )

  /**
   * @swagger
   * /ai-generation-batches/cards/{cardId}:
   *   patch:
   *     summary: Modifie une carte proposée (accept/edit/reject) tant que son batch est "pending"
   *     tags: [AiGenerationBatches]
   *     parameters:
   *       - in: path
   *         name: cardId
   *         required: true
   *         schema: { type: integer }
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               statement: { type: string }
   *               type: { type: string, enum: [open, mcq] }
   *               answer: { type: string, nullable: true }
   *               acceptedAnswers: { type: array, items: { type: string } }
   *               options: { type: array }
   *               mindMapNodeId: { type: string, nullable: true, description: "Nœud de la carte mentale liée au système (optionnel)" }
   *               status: { type: string, enum: [pending, accepted, edited, rejected] }
   *     responses:
   *       200:
   *         description: Carte mise à jour
   *       400:
   *         description: Statut invalide
   *       401:
   *         description: Non authentifié
   *       404:
   *         description: Carte introuvable ou non modifiable (batch déjà validé/abandonné)
   */
  router.patch(
    '/ai-generation-batches/cards/:cardId',
    authMiddleware,
    aiGenerationBatchValidators.updateCard,
    validate,
    aiGenerationBatch.updateCard
  )
}

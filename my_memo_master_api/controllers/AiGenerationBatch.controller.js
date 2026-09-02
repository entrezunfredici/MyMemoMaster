const aiGenerationBatchService = require('../services/AiGenerationBatch.service')
const aiCardGenerationPipelineService = require('../services/AiCardGenerationPipeline.service')
const aiQuotaService = require('../services/AiQuota.service')
const leitnerCardService = require('../services/LeitnerCard.service')
const { bufferMatchesMime } = require('../helpers/fileSignature')
const logger = require('../helpers/logger')

// Périmètre : referme la boucle entre le pipeline (C-01.05), le stockage (C-01.07) et Quotas/budget
// (C-01.06) — `generate` vérifie le quota/budget AVANT tout appel LLM/OCR coûteux
// (`aiQuotaService.checkQuota`) et journalise l'usage réel APRÈS une génération réussie
// (`aiQuotaService.recordUsage`). L'Écran de validation (front) reste hors périmètre.

// Codes renvoyés tels quels par les services de cette chaîne (validation, LLM, OCR, droits, quotas)
// — whitelist plutôt que de faire confiance à n'importe quel statusCode levé (cf.
// LeitnerCard.controller.js pour le même principe sur un seul code).
const KNOWN_ERROR_STATUS_CODES = [400, 403, 422, 429, 500, 502]

const respondWithKnownOrGenericError = (res, error, genericMessage) => {
  logger.error(error?.message || error)
  if (KNOWN_ERROR_STATUS_CODES.includes(error.statusCode)) {
    return res.status(error.statusCode).json({ message: error.message })
  }
  res.status(500).json({ message: genericMessage })
}

/**
 * Journalise un usage réel (C-01.06) en best-effort : un échec d'écriture dans AiUsageLog ne doit
 * jamais faire échouer la requête HTTP en cours (génération réussie mais budget non journalisé
 * pour cet appel précis, préférable à perdre un brouillon déjà valide/payé).
 *
 * @param {number} userId
 * @param {number|null} idBatch - `null` si la génération a échoué avant qu'un batch n'existe
 * @param {object|undefined} usage - Absent si rien n'a été réellement facturé pour cet appel
 */
const recordUsageBestEffort = async (userId, idBatch, usage) => {
  if (!usage) return
  try {
    await aiQuotaService.recordUsage({ userId, idBatch, ...usage })
  } catch (usageError) {
    logger.error(`[AiGenerationBatch] Échec de journalisation de l'usage IA : ${usageError?.message || usageError}`)
  }
}

/**
 * Lance une génération de cartes par IA (pipeline C-01.05) et stocke le résultat en attente
 * (C-01.07). Source au choix : texte collé (`sourceText`) ou fichier PDF (`multipart/form-data`,
 * champ `pdf`) — validators.generate impose l'un des deux, exclusivement.
 */
exports.generate = async (req, res) => {
  try {
    const idSystem = Number(req.body.idSystem)
    const rights = await leitnerCardService.resolveUserRights(req.user.id, idSystem)
    if (!rights.canAdd) {
      return res.status(403).json({ message: 'Droits insuffisants pour générer des cartes dans ce système.' })
    }

    // Avant tout appel LLM/OCR coûteux (C-01.06) : quota personnel quotidien + budget global mensuel
    await aiQuotaService.checkQuota(req.user.id)

    let pdfBuffer = null
    if (req.file) {
      if (!bufferMatchesMime(req.file.buffer, 'application/pdf')) {
        return res.status(400).json({ message: "Le fichier envoyé n'est pas un PDF valide." })
      }
      pdfBuffer = req.file.buffer
    }

    const { subjectContext = null, cardType = 'open', outputLanguage = 'fr' } = req.body
    const cardCount = Number(req.body.cardCount)

    const pipelineResult = await aiCardGenerationPipelineService.generateCardsFromContent({
      sourceText: pdfBuffer ? null : req.body.sourceText,
      pdfBuffer,
      subjectContext,
      cardCount,
      cardType,
      outputLanguage
    })

    const batch = await aiGenerationBatchService.createFromPipelineResult({
      userId: req.user.id,
      idSystem,
      subjectContext,
      cardType,
      outputLanguage,
      cards: pipelineResult.cards,
      warnings: pipelineResult.warnings
    })

    // Journalisation du coût réel APRÈS coup, une fois le batch créé (C-01.06)
    await recordUsageBestEffort(req.user.id, batch.id, pipelineResult.usage)

    res.status(201).json(batch)
  } catch (error) {
    // Un échec de génération peut malgré tout avoir réellement consommé des tokens/pages facturés
    // (ex. 2 appels LLM réels mais non conformes, cf. AiCardGenerationService/
    // AiCardGenerationPipelineService) — ce coût est journalisé même si aucun batch n'a été créé
    // (`idBatch: null`), pour que le budget (C-01.06) reflète la dépense réelle, pas seulement les
    // générations réussies.
    await recordUsageBestEffort(req.user.id, null, error.usage)
    respondWithKnownOrGenericError(res, error, 'Erreur lors de la génération des cartes.')
  }
}

/**
 * Liste les batches "pending" de l'utilisateur connecté (reprise d'un brouillon non validé).
 */
exports.findPending = async (req, res) => {
  try {
    const batches = await aiGenerationBatchService.findPendingByUser(req.user.id)
    res.status(200).json(batches)
  } catch (error) {
    respondWithKnownOrGenericError(res, error, 'Erreur lors de la récupération des générations en attente.')
  }
}

/**
 * Récupère un batch (et ses cartes) par id — 404 si absent ou n'appartenant pas à l'utilisateur.
 */
exports.findOne = async (req, res) => {
  try {
    const batch = await aiGenerationBatchService.findById(Number(req.params.id), req.user.id)
    if (!batch) return res.status(404).json({ message: 'Génération introuvable.' })
    res.status(200).json(batch)
  } catch (error) {
    respondWithKnownOrGenericError(res, error, 'Erreur lors de la récupération de la génération.')
  }
}

/**
 * Modifie une carte proposée (contenu et/ou statut accept/edit/reject) tant que son batch est
 * encore "pending".
 */
exports.updateCard = async (req, res) => {
  try {
    const card = await aiGenerationBatchService.updateCard(Number(req.params.cardId), req.user.id, req.body)
    if (!card) return res.status(404).json({ message: 'Carte introuvable ou non modifiable.' })
    res.status(200).json(card)
  } catch (error) {
    respondWithKnownOrGenericError(res, error, 'Erreur lors de la mise à jour de la carte.')
  }
}

/**
 * Marque un batch "validated" ou "discarded" (bookkeeping — ne persiste aucune carte réelle, voir
 * services/AiGenerationBatch.service.js).
 */
exports.markStatus = async (req, res) => {
  try {
    const batch = await aiGenerationBatchService.markBatchStatus(Number(req.params.id), req.user.id, req.body.status)
    if (!batch) return res.status(404).json({ message: 'Génération introuvable.' })
    res.status(200).json(batch)
  } catch (error) {
    respondWithKnownOrGenericError(res, error, 'Erreur lors de la mise à jour du statut de la génération.')
  }
}

/**
 * Supprime un batch (et ses cartes, cascade DB) — abandon d'un brouillon.
 */
exports.remove = async (req, res) => {
  try {
    const deleted = await aiGenerationBatchService.deleteBatch(Number(req.params.id), req.user.id)
    if (!deleted) return res.status(404).json({ message: 'Génération introuvable.' })
    res.status(204).send()
  } catch (error) {
    respondWithKnownOrGenericError(res, error, 'Erreur lors de la suppression de la génération.')
  }
}

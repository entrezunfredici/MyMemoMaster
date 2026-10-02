const { instance, AiGenerationBatch, AiGeneratedCard } = require('../models/index')
const AnswerQualityService = require('./AnswerQuality.service')

// Périmètre C-01.07 (« Stockage cartes générées — en attente ») : persiste le brouillon produit par
// le pipeline (C-01.05, `{ cards, warnings }`) dans un état "pending", et permet de le relire/le
// modifier/l'abandonner tant qu'il n'est pas validé. Ce service NE fait PAS :
// - l'orchestration de la génération elle-même (appel du pipeline — hors périmètre, aucun
//   controller/route ne branche encore ce service à une requête HTTP entrante, comme pour
//   AiCardGenerationService/AiCardGenerationPipelineService en C-01.04/05)
// - la promotion des cartes acceptées vers Question/Response/LeitnerCard (persistance réelle) —
//   `markBatchStatus('validated', ...)` n'est qu'un marqueur de statut, pas une écriture dans ces
//   tables ; l'exécution de cette promotion reste une hypothèse ouverte, documentée en
//   diagrams/generation_ia_prompt_cartes.md §6 et non tranchée par ce ticket (Écran de validation)
// - la logique d'accept/edit/reject côté UI (Écran de validation, hors périmètre) — `updateCard`
//   n'est qu'une mutation de données, pas le comportement de l'écran qui l'appellera

const BATCH_INCLUDE = { model: AiGeneratedCard, as: 'cards' }
const BATCH_STATUSES = ['validated', 'discarded']
const CARD_STATUSES = ['pending', 'accepted', 'edited', 'rejected']

/**
 * Attache des champs calculés `qualityWarnings`/`qualityLevel` (AnswerQuality.service.js) à une
 * carte "open" — jamais persistés (pas de colonne dédiée), recalculés à chaque lecture pour rester
 * à jour si la carte est éditée entre deux affichages. `[]`/`null` pour une carte "mcq" (pas de
 * "answer"/"acceptedAnswers" à évaluer) ou sans statement/answer — `null` signale "non applicable",
 * pas "bonne qualité", pour ne pas afficher à tort un badge vert sur un QCM côté écran de validation.
 *
 * Écrits à deux endroits chacun, pas par redondance inutile : `dataValues` est ce que lit `toJSON()`
 * (donc la réponse HTTP réelle, cf. sanity-check DECISIONS.md 2026-09-12 — un champ non déclaré
 * comme attribut du modèle n'apparaît PAS dans `toJSON()` s'il n'est écrit qu'en propriété directe) ;
 * la propriété directe `card.qualityWarnings`/`card.qualityLevel` est ce que lit tout code appelant
 * `card.x` sans passer par `toJSON()` (accès direct en JS, y compris les tests unitaires de ce fichier).
 *
 * @param {AiGeneratedCard} card
 */
function attachQualityWarnings(card) {
  const isEvaluable = card.type === 'open' && card.statement && card.answer
  const warnings = isEvaluable
    ? AnswerQualityService.assess(card.statement, [card.answer, ...(card.acceptedAnswers || [])])
    : []
  const level = isEvaluable ? AnswerQualityService.levelFromWarnings(warnings) : null

  card.dataValues.qualityWarnings = warnings
  card.qualityWarnings = warnings
  card.dataValues.qualityLevel = level
  card.qualityLevel = level
}

/**
 * Applique `attachQualityWarnings` à toutes les cartes d'un batch (association `cards`, si chargée).
 *
 * @param {AiGenerationBatch} batch
 * @returns {AiGenerationBatch} le même batch, muté
 */
function attachQualityWarningsToBatch(batch) {
  (batch.cards || []).forEach(attachQualityWarnings)
  return batch
}

class AiGenerationBatchService {
  /**
   * Persiste le résultat du pipeline (C-01.05) comme un batch "pending" : le batch et toutes ses
   * cartes sont créés dans une même transaction (aucune carte orpheline en cas d'échec partiel).
   *
   * @param {object} params
   * @param {number} params.userId
   * @param {number} params.idSystem - Système Leitner cible (une fois les cartes validées)
   * @param {string|null} [params.subjectContext]
   * @param {string} [params.cardType] - "open" | "mcq" | "mixed" (défaut "open")
   * @param {string} [params.outputLanguage] - Défaut "fr"
   * @param {object[]} params.cards - Cartes proposées, contrat generation_ia_prompt_cartes.md §4
   * @param {string[]} [params.warnings] - Avertissements du pipeline (C-01.05)
   * @returns {Promise<AiGenerationBatch>} Le batch créé, avec ses cartes (`cards`)
   */
  async createFromPipelineResult({
    userId,
    idSystem,
    subjectContext = null,
    cardType = 'open',
    outputLanguage = 'fr',
    cards,
    warnings = []
  }) {
    const t = await instance.transaction()
    try {
      const batch = await AiGenerationBatch.create(
        { userId, idSystem, subjectContext, cardType, outputLanguage, warnings, status: 'pending' },
        { transaction: t }
      )

      await AiGeneratedCard.bulkCreate(
        cards.map((card) => ({
          idBatch: batch.id,
          statement: card.statement,
          type: card.type,
          answer: card.answer ?? null,
          acceptedAnswers: card.acceptedAnswers ?? null,
          options: card.options ?? null,
          sourceExcerpt: card.sourceExcerpt ?? null,
          status: 'pending'
        })),
        { transaction: t }
      )

      await t.commit()
      const created = await AiGenerationBatch.findByPk(batch.id, { include: [BATCH_INCLUDE] })
      return attachQualityWarningsToBatch(created)
    } catch (err) {
      await t.rollback()
      throw err
    }
  }

  /**
   * Récupère un batch et ses cartes — retourne `null` si absent ou n'appartenant pas à
   * l'utilisateur (pas de distinction 403/404, cf. pattern déjà utilisé pour les ressources
   * strictement personnelles de ce projet — évite de confirmer l'existence d'un batch d'autrui).
   * Chaque carte "open" porte un champ calculé `qualityWarnings` (AnswerQuality.service.js —
   * DECISIONS.md 2026-09-12), à l'attention de l'écran de validation IA.
   *
   * @param {number} idBatch
   * @param {number} userId
   * @returns {Promise<AiGenerationBatch|null>}
   */
  async findById(idBatch, userId) {
    const batch = await AiGenerationBatch.findOne({ where: { id: idBatch, userId }, include: [BATCH_INCLUDE] })
    return batch ? attachQualityWarningsToBatch(batch) : null
  }

  /**
   * Batches "pending" de l'utilisateur, du plus récent au plus ancien — permet de reprendre une
   * génération non encore validée (ex. après un rechargement de page côté Écran de validation).
   *
   * @param {number} userId
   * @returns {Promise<AiGenerationBatch[]>}
   */
  async findPendingByUser(userId) {
    const batches = await AiGenerationBatch.findAll({
      where: { userId, status: 'pending' },
      include: [BATCH_INCLUDE],
      order: [['createdAt', 'DESC']]
    })
    return batches.map(attachQualityWarningsToBatch)
  }

  /**
   * Met à jour une carte proposée (contenu et/ou statut) tant que son batch est encore "pending" —
   * une carte d'un batch déjà validé/abandonné n'est plus modifiable.
   *
   * @param {number} idCard
   * @param {number} userId
   * @param {object} updates - Champs à modifier : statement/type/answer/acceptedAnswers/options/mindMapNodeId/status
   * @returns {Promise<AiGeneratedCard|null>} `null` si la carte n'existe pas, n'appartient pas à
   *   l'utilisateur, ou que son batch n'est plus "pending"
   * @throws {Error} `status` fourni hors de l'ensemble autorisé (400)
   */
  async updateCard(idCard, userId, updates) {
    if (updates.status !== undefined && !CARD_STATUSES.includes(updates.status)) {
      const err = new Error(`"status" doit être l'un de : ${CARD_STATUSES.join(', ')}.`)
      err.statusCode = 400
      throw err
    }

    const card = await AiGeneratedCard.findByPk(idCard, {
      include: [{ model: AiGenerationBatch, as: 'batch' }]
    })
    if (!card || card.batch.userId !== userId || card.batch.status !== 'pending') return null

    const { statement, type, answer, acceptedAnswers, options, mindMapNodeId, status } = updates
    await card.update({
      ...(statement !== undefined ? { statement } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(answer !== undefined ? { answer } : {}),
      ...(acceptedAnswers !== undefined ? { acceptedAnswers } : {}),
      ...(options !== undefined ? { options } : {}),
      ...(mindMapNodeId !== undefined ? { mindMapNodeId } : {}),
      ...(status !== undefined ? { status } : {})
    })
    attachQualityWarnings(card)
    return card
  }

  /**
   * Marque un batch "validated" ou "discarded" — bookkeeping uniquement, ne crée aucune ligne dans
   * Question/Response/LeitnerCard (voir en-tête de fichier).
   *
   * @param {number} idBatch
   * @param {number} userId
   * @param {string} status - "validated" | "discarded"
   * @returns {Promise<AiGenerationBatch|null>} `null` si le batch n'existe pas ou n'appartient pas à l'utilisateur
   * @throws {Error} `status` hors de l'ensemble autorisé (400)
   */
  async markBatchStatus(idBatch, userId, status) {
    if (!BATCH_STATUSES.includes(status)) {
      const err = new Error(`"status" doit être l'un de : ${BATCH_STATUSES.join(', ')}.`)
      err.statusCode = 400
      throw err
    }

    const batch = await AiGenerationBatch.findOne({ where: { id: idBatch, userId } })
    if (!batch) return null

    await batch.update({ status })
    return batch
  }

  /**
   * Supprime un batch et ses cartes (cascade DB) — abandon d'un brouillon.
   *
   * @param {number} idBatch
   * @param {number} userId
   * @returns {Promise<boolean>} `true` si supprimé, `false` si absent/n'appartenant pas à l'utilisateur
   */
  async deleteBatch(idBatch, userId) {
    const deletedCount = await AiGenerationBatch.destroy({ where: { id: idBatch, userId } })
    return deletedCount > 0
  }
}

module.exports = new AiGenerationBatchService()

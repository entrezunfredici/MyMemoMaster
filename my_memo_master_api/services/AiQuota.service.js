const dayjs = require('dayjs')
const { Op } = require('sequelize')
const { AiUsageLog } = require('../models/index')
const getAiQuotaConfig = require('../helpers/aiQuotaConfig')
const logger = require('../helpers/logger')

// Périmètre C-01.06 (« Gestion quotas et budget IA ») : deux garde-fous distincts, appliqués
// séparément selon ce qu'ils protègent —
// - QUOTA (équité entre utilisateurs) : nombre de TENTATIVES DE GÉNÉRATION RÉELLEMENT FACTURÉES par
//   utilisateur et par jour, compté sur AiUsageLog (une ligne = un appel LLM/OCR qui a réellement
//   consommé des tokens/pages, que la génération ait ensuite abouti à un batch ou échoué après coup
//   — voir controller#recordUsageBestEffort, appelé sur succès ET sur échec dès qu'un coût réel a
//   été engagé). CHOIX (correctif, C-01.11) : compter sur AiGenerationBatch (une ligne = une
//   requête ABOUTIE) laissait un utilisateur contourner le quota à volonté en faisant échouer la
//   génération après l'appel payant — un batch n'est créé qu'après succès complet du pipeline, alors
//   que le coût, lui, est déjà engagé dès le premier appel. Voir DECISIONS.md.
// - BUDGET (coût total maîtrisé) : somme du coût réel estimé, tous utilisateurs confondus, sur le
//   mois en cours, calculée sur AiUsageLog (même table, même raisonnement — indépendant du nombre de
//   requêtes, un batch peut déclencher plusieurs appels LLM/OCR).
// Ce service NE FAIT PAS : le calcul du coût par appel individuel (fait dans
// AiCardGenerationService/PdfExtraction.service.js, qui renvoient l'usage réel sans le persister) —
// il ne fait que l'estimer en $ (`estimateCostUsd`) et le journaliser (`recordUsage`), appelé par le
// controller après chaque appel LLM/OCR réellement facturé (succès ou échec ultérieur).

// Tarifs en $/M tokens (entrée/sortie) et $/1000 pages OCR — repris du benchmark C-01.03
// (diagrams/generation_ia_llm_benchmark.md §4) et de l'API OCR (mistral.ai/pricing/api, consultée
// le 2026-09-01). À REVÉRIFIER périodiquement : le marché des tarifs LLM évolue vite (limite déjà
// notée dans le document de benchmark).
const CHAT_PRICING_USD_PER_MILLION_TOKENS = {
  'mistral-small-latest': { input: 0.15, output: 0.6 },
  'mistral-medium-latest': { input: 1.5, output: 7.5 },
  'mistral-large-latest': { input: 0.5, output: 1.5 }
}
const OCR_PRICE_USD_PER_1000_PAGES = 4

class AiQuotaService {
  /**
   * Estime le coût réel (en $) d'une génération à partir de sa consommation réelle rapportée par
   * les services d'inférence — pas une mesure facturée par Mistral, une estimation basée sur les
   * tarifs publics connus au moment de l'écriture (voir en-tête de fichier).
   *
   * @param {{ model: string|null, promptTokens?: number, completionTokens?: number, pagesProcessed?: number }} params
   * @returns {number} Coût estimé en dollars, arrondi à 6 décimales (les coûts unitaires sont minuscules)
   */
  estimateCostUsd({ model, promptTokens = 0, completionTokens = 0, pagesProcessed = 0 }) {
    let cost = 0

    const pricing = model ? CHAT_PRICING_USD_PER_MILLION_TOKENS[model] : null
    if (pricing) {
      cost += (promptTokens / 1_000_000) * pricing.input
      cost += (completionTokens / 1_000_000) * pricing.output
    } else if (model && (promptTokens > 0 || completionTokens > 0)) {
      // CORRECTIF (C-01.11) : un modèle configuré (MISTRAL_MODEL) mais absent de cette table
      // faisait auparavant tomber silencieusement le coût de chat à 0 $ — le budget mensuel
      // (checkQuota) ne voyait alors plus rien de la dépense réelle. Logué pour être visible en
      // monitoring plutôt que de continuer à échouer en silence ; ne bloque pas la génération
      // (une estimation de coût manquante n'est pas une raison de refuser un service déjà payé).
      logger.error(
        `[AiQuota] Aucun tarif connu pour le modèle "${model}" — coût de chat non comptabilisé (0 $). ` +
          'Table à jour dans services/AiQuota.service.js#CHAT_PRICING_USD_PER_MILLION_TOKENS.'
      )
    }

    cost += (pagesProcessed / 1000) * OCR_PRICE_USD_PER_1000_PAGES

    return Math.round(cost * 1e6) / 1e6
  }

  /**
   * Vérifie que l'utilisateur peut lancer une nouvelle génération : quota quotidien personnel ET
   * budget mensuel global tous les deux respectés. À appeler AVANT tout appel LLM/OCR (protège
   * d'une dépense inutile si l'un des deux est déjà atteint).
   *
   * @param {number} userId
   * @throws {Error} Quota ou budget dépassé (429)
   */
  async checkQuota(userId) {
    const config = getAiQuotaConfig()

    const startOfDay = dayjs().startOf('day').toDate()
    const generationsToday = await AiUsageLog.count({
      where: { userId, createdAt: { [Op.gte]: startOfDay } }
    })
    if (generationsToday >= config.maxGenerationsPerDay) {
      const err = new Error(
        `Quota quotidien de générations par IA atteint (${config.maxGenerationsPerDay} par jour). Réessayez demain.`
      )
      err.statusCode = 429
      throw err
    }

    const startOfMonth = dayjs().startOf('month').toDate()
    const spentThisMonth =
      (await AiUsageLog.sum('estimatedCostUsd', { where: { createdAt: { [Op.gte]: startOfMonth } } })) || 0
    if (spentThisMonth >= config.maxBudgetUsdPerMonth) {
      const err = new Error(
        "Le budget mensuel de génération par IA est atteint pour l'ensemble des utilisateurs. Réessayez le mois prochain."
      )
      err.statusCode = 429
      throw err
    }
  }

  /**
   * Journalise l'usage réel d'un appel LLM/OCR réellement facturé — succès (une ligne par batch créé,
   * agrégeant tous les appels sous-jacents) OU échec après coup (`idBatch: null`, voir
   * controller#recordUsageBestEffort). Chaque ligne créée ici compte comme une tentative dans
   * checkQuota (voir en-tête de fichier).
   *
   * @param {object} params
   * @param {number|null} [params.userId]
   * @param {number|null} [params.idBatch]
   * @param {string|null} [params.model]
   * @param {number} [params.promptTokens]
   * @param {number} [params.completionTokens]
   * @param {number} [params.pagesProcessed]
   * @returns {Promise<AiUsageLog>}
   */
  async recordUsage({ userId = null, idBatch = null, model = null, promptTokens = 0, completionTokens = 0, pagesProcessed = 0 }) {
    const usedChat = promptTokens > 0 || completionTokens > 0
    const usedOcr = pagesProcessed > 0
    const operation = usedChat && usedOcr ? 'chat_completion+ocr' : usedOcr ? 'ocr' : 'chat_completion'

    const estimatedCostUsd = this.estimateCostUsd({ model, promptTokens, completionTokens, pagesProcessed })

    return await AiUsageLog.create({
      userId,
      idBatch,
      provider: 'mistral',
      operation,
      model,
      promptTokens,
      completionTokens,
      pagesProcessed,
      estimatedCostUsd
    })
  }

  /**
   * Résumé de consommation pour l'utilisateur — pensé pour un futur affichage "Quota restant"
   * (déjà maquetté en generation_ia_ui.md, C-01.02) : pas encore consommé par aucune route/UI.
   *
   * @param {number} userId
   * @returns {Promise<{ generationsToday: number, maxGenerationsPerDay: number, remainingGenerationsToday: number, budgetSpentThisMonthUsd: number, maxBudgetUsdPerMonth: number }>}
   */
  async getUsageSummary(userId) {
    const config = getAiQuotaConfig()
    const startOfDay = dayjs().startOf('day').toDate()
    const startOfMonth = dayjs().startOf('month').toDate()

    const generationsToday = await AiUsageLog.count({
      where: { userId, createdAt: { [Op.gte]: startOfDay } }
    })
    const spentThisMonth =
      (await AiUsageLog.sum('estimatedCostUsd', { where: { createdAt: { [Op.gte]: startOfMonth } } })) || 0

    return {
      generationsToday,
      maxGenerationsPerDay: config.maxGenerationsPerDay,
      remainingGenerationsToday: Math.max(0, config.maxGenerationsPerDay - generationsToday),
      budgetSpentThisMonthUsd: Math.round(spentThisMonth * 100) / 100,
      maxBudgetUsdPerMonth: config.maxBudgetUsdPerMonth
    }
  }
}

module.exports = new AiQuotaService()

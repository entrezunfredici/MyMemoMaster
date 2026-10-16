// Résout la configuration des quotas/budget IA (C-01.06) depuis les variables d'environnement.
// Même pattern que helpers/mistralConfig.js (fonction, pas un objet figé au chargement du module)
// — reste testable sans jest.resetModules().

const DEFAULT_MAX_GENERATIONS_PER_DAY = 10
const DEFAULT_MAX_BUDGET_USD_PER_MONTH = 20
// Corrections de réponses par Mistral (MistralGrading.service) : plafonds distincts de la génération —
// une correction est ~100× moins chère mais ~100× plus fréquente. 300/jour/utilisateur couvre une
// grosse journée de révision ; 5 $/mois ≈ 80 000 corrections au tarif mistral-small.
const DEFAULT_MAX_GRADINGS_PER_DAY = 300
const DEFAULT_MAX_GRADING_BUDGET_USD_PER_MONTH = 5

/**
 * @returns {{ maxGenerationsPerDay: number, maxBudgetUsdPerMonth: number, maxGradingsPerDay: number, maxGradingBudgetUsdPerMonth: number }}
 */
module.exports = function getAiQuotaConfig() {
  return {
    maxGenerationsPerDay: parseInt(
      process.env.AI_QUOTA_MAX_GENERATIONS_PER_DAY || String(DEFAULT_MAX_GENERATIONS_PER_DAY),
      10
    ),
    maxBudgetUsdPerMonth: parseFloat(
      process.env.AI_BUDGET_MAX_USD_PER_MONTH || String(DEFAULT_MAX_BUDGET_USD_PER_MONTH)
    ),
    maxGradingsPerDay: parseInt(
      process.env.AI_GRADING_MAX_PER_DAY || String(DEFAULT_MAX_GRADINGS_PER_DAY),
      10
    ),
    maxGradingBudgetUsdPerMonth: parseFloat(
      process.env.AI_GRADING_BUDGET_MAX_USD_PER_MONTH || String(DEFAULT_MAX_GRADING_BUDGET_USD_PER_MONTH)
    )
  }
}

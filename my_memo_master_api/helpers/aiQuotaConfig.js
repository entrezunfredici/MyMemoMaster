// Résout la configuration des quotas/budget IA (C-01.06) depuis les variables d'environnement.
// Même pattern que helpers/mistralConfig.js (fonction, pas un objet figé au chargement du module)
// — reste testable sans jest.resetModules().

const DEFAULT_MAX_GENERATIONS_PER_DAY = 10
const DEFAULT_MAX_BUDGET_USD_PER_MONTH = 20

/**
 * @returns {{ maxGenerationsPerDay: number, maxBudgetUsdPerMonth: number }}
 */
module.exports = function getAiQuotaConfig() {
  return {
    maxGenerationsPerDay: parseInt(
      process.env.AI_QUOTA_MAX_GENERATIONS_PER_DAY || String(DEFAULT_MAX_GENERATIONS_PER_DAY),
      10
    ),
    maxBudgetUsdPerMonth: parseFloat(
      process.env.AI_BUDGET_MAX_USD_PER_MONTH || String(DEFAULT_MAX_BUDGET_USD_PER_MONTH)
    )
  }
}

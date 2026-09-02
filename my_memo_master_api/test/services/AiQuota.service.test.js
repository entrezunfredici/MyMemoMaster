// Tests fonctionnels sur une vraie base SQLite en mémoire (comme AiGenerationBatch.service.test.js)
// : checkQuota/getUsageSummary agrègent des COUNT/SUM réels sur AiUsageLog (correctif C-01.11 — le
// quota comptait auparavant sur AiGenerationBatch, contournable, voir DECISIONS.md), mal représentés
// par des modèles mockés.
process.env.DB_STORAGE = ':memory:'

const dayjs = require('dayjs')
const { syncModels, Role, User, AiGenerationBatch, AiUsageLog } = require('../../models')
const AiQuotaService = require('../../services/AiQuota.service')
const logger = require('../../helpers/logger')

describe('AiQuotaService', () => {
  let userId
  let otherUserId
  const ENV_KEYS = ['AI_QUOTA_MAX_GENERATIONS_PER_DAY', 'AI_BUDGET_MAX_USD_PER_MONTH']

  beforeAll(async () => {
    await syncModels({ force: true })

    const role = await Role.create({ name: 'Étudiant' })
    const user = await User.create({
      name: 'Quota Tester',
      email: 'quota-tester@test.fr',
      password: 'hash',
      roleId: role.roleId,
      hasValidatedEmail: true,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    userId = user.userId

    const otherUser = await User.create({
      name: 'Autre utilisateur',
      email: 'quota-autre@test.fr',
      password: 'hash',
      roleId: role.roleId,
      hasValidatedEmail: true,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    otherUserId = otherUser.userId
  })

  afterEach(async () => {
    ENV_KEYS.forEach((key) => delete process.env[key])
    // Isolation entre tests : checkQuota/getUsageSummary agrègent des COUNT/SUM sur l'ensemble de
    // la table — sans nettoyage, les lignes créées par un test fausseraient les suivants.
    await AiUsageLog.destroy({ where: {}, truncate: true })
    await AiGenerationBatch.destroy({ where: {}, truncate: true })
  })

  describe('estimateCostUsd', () => {
    it('estimateCostUsd - modèle connu avec tokens - calcule le coût selon les tarifs entrée/sortie', () => {
      const cost = AiQuotaService.estimateCostUsd({
        model: 'mistral-small-latest',
        promptTokens: 1_000_000,
        completionTokens: 1_000_000
      })
      // 1M tokens entrée à 0.15 $ + 1M tokens sortie à 0.6 $
      expect(cost).toBeCloseTo(0.75, 6)
    })

    it('estimateCostUsd - pagesProcessed (OCR) uniquement - calcule le coût OCR indépendamment du modèle', () => {
      const cost = AiQuotaService.estimateCostUsd({ model: null, pagesProcessed: 500 })
      // 500/1000 * 4 $
      expect(cost).toBeCloseTo(2, 6)
    })

    it('estimateCostUsd - modèle inconnu - ignore le coût de chat, garde le coût OCR', () => {
      const cost = AiQuotaService.estimateCostUsd({
        model: 'modele-inconnu',
        promptTokens: 1_000_000,
        completionTokens: 1_000_000,
        pagesProcessed: 250
      })
      expect(cost).toBeCloseTo(1, 6) // 250/1000 * 4 $, rien pour le chat
    })

    it('estimateCostUsd - modèle inconnu avec tokens réellement consommés - logue une alerte (C-01.11, pas un échec silencieux)', () => {
      const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {})
      AiQuotaService.estimateCostUsd({ model: 'modele-inconnu', promptTokens: 100, completionTokens: 50 })
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('modele-inconnu'))
      errorSpy.mockRestore()
    })

    it('estimateCostUsd - modèle absent (null) - ne logue rien (cas normal, pas une config défaillante)', () => {
      const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {})
      AiQuotaService.estimateCostUsd({ model: null, pagesProcessed: 3 })
      expect(errorSpy).not.toHaveBeenCalled()
      errorSpy.mockRestore()
    })

    it('estimateCostUsd - aucun paramètre - retourne 0', () => {
      expect(AiQuotaService.estimateCostUsd({ model: null })).toBe(0)
    })
  })

  describe('checkQuota', () => {
    it('checkQuota - sous les deux limites - ne lève pas', async () => {
      await expect(AiQuotaService.checkQuota(userId)).resolves.toBeUndefined()
    })

    it('checkQuota - quota quotidien atteint pour cet utilisateur - lève une erreur 429', async () => {
      process.env.AI_QUOTA_MAX_GENERATIONS_PER_DAY = '2'
      await AiUsageLog.create({ userId, operation: 'chat_completion', estimatedCostUsd: 0.001 })
      await AiUsageLog.create({ userId, operation: 'chat_completion', estimatedCostUsd: 0.001 })

      await expect(AiQuotaService.checkQuota(userId)).rejects.toMatchObject({ statusCode: 429 })
    })

    it('checkQuota - quota quotidien atteint pour un AUTRE utilisateur - ne bloque pas celui-ci (quota par utilisateur)', async () => {
      process.env.AI_QUOTA_MAX_GENERATIONS_PER_DAY = '1'
      await AiUsageLog.create({ userId: otherUserId, operation: 'chat_completion', estimatedCostUsd: 0.001 })

      await expect(AiQuotaService.checkQuota(userId)).resolves.toBeUndefined()
    })

    it('checkQuota - tentative facturée sans batch créé (échec après coup) - compte quand même dans le quota (C-01.11, non-contournement)', async () => {
      process.env.AI_QUOTA_MAX_GENERATIONS_PER_DAY = '1'
      // Aucun AiGenerationBatch créé (génération jamais aboutie) — seul AiUsageLog l'est, comme le
      // fait controller#recordUsageBestEffort sur un échec après appel réellement facturé.
      await AiUsageLog.create({ userId, idBatch: null, operation: 'chat_completion', estimatedCostUsd: 0.001 })

      await expect(AiQuotaService.checkQuota(userId)).rejects.toMatchObject({ statusCode: 429 })
    })

    it('checkQuota - budget mensuel global atteint - lève une erreur 429, même pour un utilisateur sans génération', async () => {
      process.env.AI_BUDGET_MAX_USD_PER_MONTH = '1'
      await AiUsageLog.create({ userId: otherUserId, operation: 'chat_completion', estimatedCostUsd: 1.5 })

      await expect(AiQuotaService.checkQuota(userId)).rejects.toMatchObject({ statusCode: 429 })
    })

    it('checkQuota - usage hors de la période courante - ne compte pas (jour/mois précédents ignorés)', async () => {
      process.env.AI_QUOTA_MAX_GENERATIONS_PER_DAY = '1'
      process.env.AI_BUDGET_MAX_USD_PER_MONTH = '1'
      const lastMonth = dayjs().subtract(1, 'month').toDate()
      await AiUsageLog.create({ userId, operation: 'chat_completion', estimatedCostUsd: 5, createdAt: lastMonth })

      await expect(AiQuotaService.checkQuota(userId)).resolves.toBeUndefined()
    })
  })

  describe('recordUsage', () => {
    it('recordUsage - usage chat uniquement - opération "chat_completion", coût calculé', async () => {
      const log = await AiQuotaService.recordUsage({
        userId,
        model: 'mistral-small-latest',
        promptTokens: 1000,
        completionTokens: 500
      })
      expect(log.operation).toBe('chat_completion')
      expect(log.estimatedCostUsd).toBeGreaterThan(0)
    })

    it('recordUsage - usage OCR uniquement - opération "ocr"', async () => {
      const log = await AiQuotaService.recordUsage({ userId, pagesProcessed: 3 })
      expect(log.operation).toBe('ocr')
    })

    it('recordUsage - usage chat ET OCR - opération "chat_completion+ocr"', async () => {
      const log = await AiQuotaService.recordUsage({
        userId,
        model: 'mistral-small-latest',
        promptTokens: 100,
        completionTokens: 50,
        pagesProcessed: 2
      })
      expect(log.operation).toBe('chat_completion+ocr')
    })

    it('recordUsage - aucun usage - opération "chat_completion" par défaut, coût nul', async () => {
      const log = await AiQuotaService.recordUsage({ userId })
      expect(log.operation).toBe('chat_completion')
      expect(log.estimatedCostUsd).toBe(0)
    })
  })

  describe('getUsageSummary', () => {
    it('getUsageSummary - retourne les compteurs du jour/mois en cours pour l\'utilisateur', async () => {
      process.env.AI_QUOTA_MAX_GENERATIONS_PER_DAY = '10'
      process.env.AI_BUDGET_MAX_USD_PER_MONTH = '20'
      await AiQuotaService.recordUsage({ userId, model: 'mistral-small-latest', promptTokens: 1_000_000, completionTokens: 0 })

      const summary = await AiQuotaService.getUsageSummary(userId)

      expect(summary.maxGenerationsPerDay).toBe(10)
      expect(summary.maxBudgetUsdPerMonth).toBe(20)
      expect(summary.generationsToday).toBeGreaterThanOrEqual(1)
      expect(summary.remainingGenerationsToday).toBe(summary.maxGenerationsPerDay - summary.generationsToday)
      expect(summary.budgetSpentThisMonthUsd).toBeGreaterThan(0)
    })
  })
})

const getAiQuotaConfig = require('../../helpers/aiQuotaConfig')

describe('getAiQuotaConfig', () => {
  const ENV_KEYS = ['AI_QUOTA_MAX_GENERATIONS_PER_DAY', 'AI_BUDGET_MAX_USD_PER_MONTH']
  let savedEnv

  beforeEach(() => {
    savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))
    ENV_KEYS.forEach((key) => delete process.env[key])
  })

  afterEach(() => {
    ENV_KEYS.forEach((key) => {
      if (savedEnv[key] === undefined) delete process.env[key]
      else process.env[key] = savedEnv[key]
    })
  })

  it('getAiQuotaConfig - aucune variable d\'environnement - retourne les valeurs par défaut', () => {
    expect(getAiQuotaConfig()).toEqual({ maxGenerationsPerDay: 10, maxBudgetUsdPerMonth: 20 })
  })

  it('getAiQuotaConfig - variables renseignées - les reprend telles quelles', () => {
    process.env.AI_QUOTA_MAX_GENERATIONS_PER_DAY = '5'
    process.env.AI_BUDGET_MAX_USD_PER_MONTH = '2.5'
    expect(getAiQuotaConfig()).toEqual({ maxGenerationsPerDay: 5, maxBudgetUsdPerMonth: 2.5 })
  })
})

const kpiAlertService = require('../../services/KpiAlert.service')

jest.mock('../../models', () => ({
  User: {},
  UserKpiAlertSettings: { findAll: jest.fn() },
  Reminder: { create: jest.fn() }
}))
jest.mock('../../services/Kpi.service', () => ({ getMyKpis: jest.fn() }))
jest.mock('../../helpers/sendEmail', () => jest.fn())
jest.mock('../../helpers/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }))

const BASE_KPIS = {
  revision: { streakDays: 0, revivedToday: true },
  exercises: { recentTrend: 0 },
  discipline: { disciplineScore: 0 }
}

const BASE_SETTINGS = {
  streakAlertEnabled: true,
  disciplineAlertEnabled: true,
  scoreDropAlertEnabled: true,
  thresholdDiscipline: 40
}

describe('KpiAlertService.buildDigestItems', () => {
  // ── Cas nominal vide ───────────────────────────────────────────────────────

  it('retourne un tableau vide si aucune condition n\'est déclenchée', () => {
    const items = kpiAlertService.buildDigestItems(BASE_KPIS, BASE_SETTINGS)

    expect(items).toEqual([])
  })

  // ── streak_risk ────────────────────────────────────────────────────────────

  it('streak_risk — déclenché si streakDays > 0 et revivedToday = false', () => {
    const kpis = { ...BASE_KPIS, revision: { streakDays: 5, revivedToday: false } }

    const items = kpiAlertService.buildDigestItems(kpis, BASE_SETTINGS)

    expect(items).toHaveLength(1)
    expect(items[0].type).toBe('streak_risk')
    expect(items[0].icon).toBe('🔥')
    expect(items[0].text).toContain('5')
  })

  it('streak_risk — non déclenché si revivedToday = true', () => {
    const kpis = { ...BASE_KPIS, revision: { streakDays: 5, revivedToday: true } }

    const items = kpiAlertService.buildDigestItems(kpis, BASE_SETTINGS)

    expect(items.find((i) => i.type === 'streak_risk')).toBeUndefined()
  })

  it('streak_risk — non déclenché si streakDays = 0', () => {
    const kpis = { ...BASE_KPIS, revision: { streakDays: 0, revivedToday: false } }

    const items = kpiAlertService.buildDigestItems(kpis, BASE_SETTINGS)

    expect(items.find((i) => i.type === 'streak_risk')).toBeUndefined()
  })

  it('streak_risk — non déclenché si streakAlertEnabled = false', () => {
    const kpis = { ...BASE_KPIS, revision: { streakDays: 5, revivedToday: false } }
    const settings = { ...BASE_SETTINGS, streakAlertEnabled: false }

    const items = kpiAlertService.buildDigestItems(kpis, settings)

    expect(items.find((i) => i.type === 'streak_risk')).toBeUndefined()
  })

  it('streak_risk — texte au pluriel si streakDays > 1', () => {
    const kpis = { ...BASE_KPIS, revision: { streakDays: 3, revivedToday: false } }

    const [item] = kpiAlertService.buildDigestItems(kpis, BASE_SETTINGS)

    expect(item.text).toContain('jours')
  })

  it('streak_risk — texte au singulier si streakDays = 1', () => {
    const kpis = { ...BASE_KPIS, revision: { streakDays: 1, revivedToday: false } }

    const [item] = kpiAlertService.buildDigestItems(kpis, BASE_SETTINGS)

    expect(item.text).not.toContain('jours')
  })

  // ── discipline_low ─────────────────────────────────────────────────────────

  it('discipline_low — déclenché si score > 0 et score < thresholdDiscipline', () => {
    const kpis = { ...BASE_KPIS, discipline: { disciplineScore: 25 } }

    const items = kpiAlertService.buildDigestItems(kpis, BASE_SETTINGS)

    expect(items).toHaveLength(1)
    expect(items[0].type).toBe('discipline_low')
    expect(items[0].icon).toBe('📉')
    expect(items[0].text).toContain('25')
  })

  it('discipline_low — non déclenché si disciplineScore = 0', () => {
    const kpis = { ...BASE_KPIS, discipline: { disciplineScore: 0 } }

    const items = kpiAlertService.buildDigestItems(kpis, BASE_SETTINGS)

    expect(items.find((i) => i.type === 'discipline_low')).toBeUndefined()
  })

  it('discipline_low — non déclenché si score >= thresholdDiscipline', () => {
    const kpis = { ...BASE_KPIS, discipline: { disciplineScore: 40 } }

    const items = kpiAlertService.buildDigestItems(kpis, BASE_SETTINGS)

    expect(items.find((i) => i.type === 'discipline_low')).toBeUndefined()
  })

  it('discipline_low — non déclenché si disciplineAlertEnabled = false', () => {
    const kpis = { ...BASE_KPIS, discipline: { disciplineScore: 20 } }
    const settings = { ...BASE_SETTINGS, disciplineAlertEnabled: false }

    const items = kpiAlertService.buildDigestItems(kpis, settings)

    expect(items.find((i) => i.type === 'discipline_low')).toBeUndefined()
  })

  it('discipline_low — seuil personnalisé : déclenché si score < seuil modifié', () => {
    const kpis = { ...BASE_KPIS, discipline: { disciplineScore: 55 } }
    const settings = { ...BASE_SETTINGS, thresholdDiscipline: 60 }

    const items = kpiAlertService.buildDigestItems(kpis, settings)

    expect(items.find((i) => i.type === 'discipline_low')).toBeDefined()
  })

  // ── score_drop ─────────────────────────────────────────────────────────────

  it('score_drop — déclenché si recentTrend <= -10', () => {
    const kpis = { ...BASE_KPIS, exercises: { recentTrend: -15 } }

    const items = kpiAlertService.buildDigestItems(kpis, BASE_SETTINGS)

    expect(items).toHaveLength(1)
    expect(items[0].type).toBe('score_drop')
    expect(items[0].icon).toBe('📚')
    expect(items[0].text).toContain('15')
  })

  it('score_drop — déclenché à exactement -10 (valeur limite)', () => {
    const kpis = { ...BASE_KPIS, exercises: { recentTrend: -10 } }

    const items = kpiAlertService.buildDigestItems(kpis, BASE_SETTINGS)

    expect(items.find((i) => i.type === 'score_drop')).toBeDefined()
  })

  it('score_drop — non déclenché si recentTrend = -9', () => {
    const kpis = { ...BASE_KPIS, exercises: { recentTrend: -9 } }

    const items = kpiAlertService.buildDigestItems(kpis, BASE_SETTINGS)

    expect(items.find((i) => i.type === 'score_drop')).toBeUndefined()
  })

  it('score_drop — non déclenché si recentTrend positif', () => {
    const kpis = { ...BASE_KPIS, exercises: { recentTrend: 5 } }

    const items = kpiAlertService.buildDigestItems(kpis, BASE_SETTINGS)

    expect(items.find((i) => i.type === 'score_drop')).toBeUndefined()
  })

  it('score_drop — non déclenché si scoreDropAlertEnabled = false', () => {
    const kpis = { ...BASE_KPIS, exercises: { recentTrend: -20 } }
    const settings = { ...BASE_SETTINGS, scoreDropAlertEnabled: false }

    const items = kpiAlertService.buildDigestItems(kpis, settings)

    expect(items.find((i) => i.type === 'score_drop')).toBeUndefined()
  })

  // ── Déclenchement multiple ─────────────────────────────────────────────────

  it('retourne les 3 items dans l\'ordre si toutes les conditions sont déclenchées', () => {
    const kpis = {
      revision: { streakDays: 5, revivedToday: false },
      exercises: { recentTrend: -15 },
      discipline: { disciplineScore: 20 }
    }

    const items = kpiAlertService.buildDigestItems(kpis, BASE_SETTINGS)

    expect(items).toHaveLength(3)
    expect(items.map((i) => i.type)).toEqual(['streak_risk', 'discipline_low', 'score_drop'])
  })

  it('retourne uniquement les types activés dans les settings', () => {
    const kpis = {
      revision: { streakDays: 5, revivedToday: false },
      exercises: { recentTrend: -15 },
      discipline: { disciplineScore: 20 }
    }
    const settings = { ...BASE_SETTINGS, disciplineAlertEnabled: false, scoreDropAlertEnabled: false }

    const items = kpiAlertService.buildDigestItems(kpis, settings)

    expect(items).toHaveLength(1)
    expect(items[0].type).toBe('streak_risk')
  })
})

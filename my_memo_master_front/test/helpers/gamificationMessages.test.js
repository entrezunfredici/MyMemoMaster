import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  ENCOURAGEMENTS,
  FIRST_OF_DAY,
  freezeLabel,
  freezeSummary,
  pickVariant,
  scoreTone,
  sessionEncouragement,
  streakFlame,
} from '@/helpers/gamificationMessages'
import { PRACTICE_EVENT, announcePractice, isPracticeEndpoint } from '@/helpers/practiceEvents'

describe('streakFlame', () => {
  it('aucune série - masquée (pas de « 0 jour » culpabilisant)', () => {
    expect(streakFlame(null).visible).toBe(false)
    expect(streakFlame({ current: 0, practicedToday: true }).visible).toBe(false)
  })

  it('série prolongée aujourd’hui - visible, libellé « déjà prolongée »', () => {
    const flame = streakFlame({ current: 5, practicedToday: true })

    expect(flame).toMatchObject({ visible: true, count: 5, done: true })
    expect(flame.label).toBe('Série de 5 jours, déjà prolongée aujourd\'hui.')
  })

  it('série à prolonger - libellé sans reproche, au singulier pour 1 jour', () => {
    const flame = streakFlame({ current: 1, practicedToday: false })

    expect(flame).toMatchObject({ visible: true, count: 1, done: false })
    expect(flame.label).toBe('Série de 1 jour. Une courte pratique aujourd\'hui la prolonge.')
    expect(flame.hint).toContain('Un jour manqué par semaine')
  })
})

describe('gel de série (A3)', () => {
  it('freezeLabel - singulier et pluriel', () => {
    expect(freezeLabel(1)).toBe('1 gel de série')
    expect(freezeLabel(2)).toBe('2 gels de série')
  })

  it('streakFlame - gels en réserve - ajoutés au libellé, nombre exposé', () => {
    const flame = streakFlame({ current: 15, practicedToday: true, freezes: 2 })

    expect(flame.freezes).toBe(2)
    expect(flame.label).toBe("Série de 15 jours, déjà prolongée aujourd'hui. 2 gels de série en réserve.")
  })

  it('streakFlame - sans gel ou valeur invalide - libellé inchangé, jamais négatif', () => {
    expect(streakFlame({ current: 3, practicedToday: true }).label).toBe("Série de 3 jours, déjà prolongée aujourd'hui.")
    expect(streakFlame({ current: 3, practicedToday: true, freezes: -4 }).freezes).toBe(0)
  })

  it('freezeSummary - champ absent - masqué', () => {
    expect(freezeSummary(undefined).visible).toBe(false)
    expect(freezeSummary({}).visible).toBe(false)
  })

  it('freezeSummary - prochain gel dans N jours, singulier à 1 jour', () => {
    expect(freezeSummary({ available: 0, max: 2, progress: 13, every: 14 }).text).toContain('dans 1 jour de série')
    expect(freezeSummary({ available: 1, max: 2, progress: 0, every: 14 }).text).toContain('dans 14 jours de série')
  })

  it('sessionEncouragement - gel utilisé prime sur gel gagné ; sinon null', () => {
    const base = { date: '2026-11-18', practicesToday: 2, streakCurrent: 20 }

    expect(sessionEncouragement({ ...base, freezeUsed: true, freezeEarned: true }).freeze).toContain('a protégé ta série')
    expect(sessionEncouragement({ ...base, freezeEarned: true }).freeze).toContain('gagné un gel de série')
    expect(sessionEncouragement(base).freeze).toBeNull()
  })
})

describe('scoreTone', () => {
  it.each([
    [100, 'excellent'],
    [90, 'excellent'],
    [89, 'good'],
    [60, 'good'],
    [59, 'effort'],
    [0, 'effort'],
    [null, 'neutral'],
    [undefined, 'neutral'],
    [NaN, 'neutral'],
  ])('%p - ton %s', (score, tone) => {
    expect(scoreTone(score)).toBe(tone)
  })
})

describe('pickVariant', () => {
  it('même graine - même variante (stable au rendu)', () => {
    expect(pickVariant(['a', 'b', 'c'], 20261118)).toBe(pickVariant(['a', 'b', 'c'], 20261118))
  })

  it('graines consécutives - parcourt toutes les variantes', () => {
    const seen = new Set([0, 1, 2, 3].map((seed) => pickVariant(['a', 'b', 'c', 'd'], seed)))

    expect(seen.size).toBe(4)
  })

  it('graine invalide ou négative - ne plante pas et reste dans la liste', () => {
    expect(['a', 'b']).toContain(pickVariant(['a', 'b'], NaN))
    expect(['a', 'b']).toContain(pickVariant(['a', 'b'], -7))
  })
})

describe('sessionEncouragement', () => {
  const feedback = (patch = {}) => ({
    date: '2026-11-18',
    firstOfDay: false,
    practicesToday: 2,
    streakCurrent: 4,
    streakExtended: false,
    dailyGoalAchieved: false,
    ...patch,
  })

  it('aucun bilan - null (rien à afficher)', () => {
    expect(sessionEncouragement(null)).toBeNull()
  })

  it('bon score - message du bon registre, sans bonus ni série', () => {
    const result = sessionEncouragement(feedback(), { scorePercent: 95 })

    expect(result.tone).toBe('excellent')
    expect(ENCOURAGEMENTS.excellent).toContain(result.message)
    expect(result).toMatchObject({ bonus: null, streak: null, goal: null })
  })

  it('mauvais score - message encourageant, aucun reproche', () => {
    const result = sessionEncouragement(feedback(), { scorePercent: 20 })

    expect(result.tone).toBe('effort')
    expect(ENCOURAGEMENTS.effort).toContain(result.message)
    expect(result.message).not.toMatch(/nul|échec|raté|mauvais/i)
  })

  it('sans score - registre neutre', () => {
    expect(sessionEncouragement(feedback()).tone).toBe('neutral')
  })

  it('première session du jour - bonus (message, jamais de points)', () => {
    const result = sessionEncouragement(feedback({ firstOfDay: true, practicesToday: 1 }), { scorePercent: 70 })

    expect(FIRST_OF_DAY).toContain(result.bonus)
    expect(`${result.bonus} ${result.message}`).not.toMatch(/point|xp/i)
  })

  it('série prolongée et objectif atteint - lignes dédiées', () => {
    const result = sessionEncouragement(feedback({ streakExtended: true, streakCurrent: 8, dailyGoalAchieved: true }))

    expect(result.streak).toBe('Ta série passe à 8 jours.')
    expect(result.goal).toBe('Objectif du jour atteint, bravo !')
  })

  it('même bilan - même message ; session suivante - le message peut changer', () => {
    const first = sessionEncouragement(feedback({ practicesToday: 1 }), { scorePercent: 95 })
    const again = sessionEncouragement(feedback({ practicesToday: 1 }), { scorePercent: 95 })
    const messages = new Set([1, 2, 3, 4].map((n) => sessionEncouragement(feedback({ practicesToday: n }), { scorePercent: 95 }).message))

    expect(again.message).toBe(first.message)
    expect(messages.size).toBeGreaterThan(1)
  })
})

describe('practiceEvents', () => {
  afterEach(() => vi.restoreAllMocks())

  it.each([
    ['leitner-review-sessions', true],
    ['mindmap-view-sessions', true],
    ['tests/12/submit', true],
    ['/tests/12/submit', true],
    ['tests/12/submit?x=1', true],
    ['tests/12', false],
    ['tests/12/submit/extra', false],
    ['test-results', false],
    ['badges/me/seen', false],
    [undefined, false],
  ])('isPracticeEndpoint(%p) - %s', (endpoint, expected) => {
    expect(isPracticeEndpoint(endpoint)).toBe(expected)
  })

  it('announcePractice - émet l’événement de la fenêtre', () => {
    const listener = vi.fn()
    window.addEventListener(PRACTICE_EVENT, listener)

    announcePractice()

    expect(listener).toHaveBeenCalledTimes(1)
    window.removeEventListener(PRACTICE_EVENT, listener)
  })
})

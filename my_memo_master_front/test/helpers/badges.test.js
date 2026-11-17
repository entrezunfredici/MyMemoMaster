import { describe, it, expect } from 'vitest'
import {
  badgeAriaLabel,
  badgeState,
  categoryLabel,
  filterBadges,
  formatEarnedDate,
  groupByCategory,
  latestEarned,
  levelProgress,
  nextBadges,
  progressPercent,
  rarityMeta,
  streakMessage,
} from '@/helpers/badges'

const BADGES = [
  { code: 'a', category: 'regularity', rarity: 'common', label: 'A', earned: true, earnedAt: '2026-10-01T10:00:00Z', progress: { current: 3, target: 3 } },
  { code: 'b', category: 'regularity', rarity: 'rare', label: 'B', earned: false, progress: { current: 12, target: 30 } },
  { code: 'c', category: 'exercises', rarity: 'epic', label: 'C', earned: true, earnedAt: '2026-10-12T10:00:00Z', progress: { current: 1, target: 1 } },
  { code: 'd', category: 'exercises', rarity: 'common', label: 'D', earned: false, progress: { current: 9, target: 10 } },
  { code: 'e', category: 'nouvelle', rarity: 'common', label: 'E', earned: false, progress: { current: 0, target: 5 } },
]

describe('rarityMeta / categoryLabel / badgeState', () => {
  it('rarityMeta - rareté connue - libellé et forme associés', () => {
    expect(rarityMeta('rare')).toMatchObject({ label: 'Rare', shape: '◆' })
    expect(rarityMeta('epic')).toMatchObject({ label: 'Épique', shape: '★' })
  })

  it('rarityMeta - rareté inconnue - repli sur Commun', () => {
    expect(rarityMeta('mythique').label).toBe('Commun')
  })

  it('categoryLabel - clé inconnue - renvoie la clé', () => {
    expect(categoryLabel('regularity')).toBe('Régularité')
    expect(categoryLabel('nouvelle')).toBe('nouvelle')
  })

  it('badgeState - obtenu ou non', () => {
    expect(badgeState({ earned: true })).toBe('earned')
    expect(badgeState({ earned: false })).toBe('locked')
    expect(badgeState(undefined)).toBe('locked')
  })
})

describe('progressPercent', () => {
  it('cas nominal', () => expect(progressPercent({ current: 4, target: 10 })).toBe(40))
  it('borne à 100', () => expect(progressPercent({ current: 50, target: 10 })).toBe(100))
  it('cible nulle ou absente - 0', () => {
    expect(progressPercent({ current: 4, target: 0 })).toBe(0)
    expect(progressPercent(undefined)).toBe(0)
  })
  it('valeur négative - 0', () => expect(progressPercent({ current: -3, target: 10 })).toBe(0))
})

describe('formatEarnedDate', () => {
  it('date valide - format français', () => {
    expect(formatEarnedDate('2026-10-12T10:00:00Z')).toMatch(/12 octobre 2026/)
  })
  it('absente ou invalide - chaîne vide', () => {
    expect(formatEarnedDate(null)).toBe('')
    expect(formatEarnedDate('pas une date')).toBe('')
  })
})

describe('badgeAriaLabel', () => {
  it('badge obtenu - mentionne la date', () => {
    expect(badgeAriaLabel(BADGES[0])).toMatch(/^A, commun, obtenu le 1 octobre 2026$/)
  })
  it('badge en cours - mentionne la progression', () => {
    expect(badgeAriaLabel(BADGES[1])).toBe('B, rare, non obtenu, 12 sur 30')
  })
  it('badge obtenu sans date - obtenu seul', () => {
    expect(badgeAriaLabel({ label: 'X', rarity: 'common', earned: true })).toBe('X, commun, obtenu')
  })
})

describe('filterBadges', () => {
  it('sans filtre - tout', () => expect(filterBadges(BADGES)).toHaveLength(5))
  it('obtenus', () => expect(filterBadges(BADGES, { status: 'earned' }).map((b) => b.code)).toEqual(['a', 'c']))
  it('en cours', () => expect(filterBadges(BADGES, { status: 'locked' }).map((b) => b.code)).toEqual(['b', 'd', 'e']))
  it('état + catégorie combinés', () => {
    expect(filterBadges(BADGES, { status: 'locked', category: 'exercises' }).map((b) => b.code)).toEqual(['d'])
  })
  it('aucun résultat - tableau vide', () => {
    expect(filterBadges(BADGES, { status: 'earned', category: 'nouvelle' })).toEqual([])
  })
  it('entrée absente - tableau vide', () => expect(filterBadges(undefined)).toEqual([]))
})

describe('groupByCategory', () => {
  it('ordre du catalogue, catégories inconnues en fin', () => {
    expect(groupByCategory(BADGES).map((g) => g.category)).toEqual(['regularity', 'exercises', 'nouvelle'])
  })
  it('libellés français et badges regroupés', () => {
    const [first] = groupByCategory(BADGES)
    expect(first.label).toBe('Régularité')
    expect(first.badges.map((b) => b.code)).toEqual(['a', 'b'])
  })
  it('liste vide - aucun groupe', () => expect(groupByCategory([])).toEqual([]))
})

describe('nextBadges / latestEarned', () => {
  it('nextBadges - plus forte progression relative d\'abord, limité', () => {
    expect(nextBadges(BADGES, 2).map((b) => b.code)).toEqual(['d', 'b'])
  })
  it('nextBadges - ignore les badges obtenus', () => {
    expect(nextBadges(BADGES, 10).every((b) => !b.earned)).toBe(true)
  })
  it('latestEarned - du plus récent au plus ancien', () => {
    expect(latestEarned(BADGES).map((b) => b.code)).toEqual(['c', 'a'])
  })
  it('latestEarned - ne mute pas la liste source', () => {
    const copy = [...BADGES]
    latestEarned(BADGES)
    expect(BADGES).toEqual(copy)
  })
})

describe('levelProgress', () => {
  it('niveau avec suivant - texte n / palier', () => {
    const result = levelProgress({ level: { name: 'Apprenti', next: { name: 'Confirmé', min: 10 } }, earnedCount: 7 })
    expect(result).toEqual({ name: 'Apprenti', percent: 70, text: '7 / 10 badges pour devenir Confirmé', isMax: false })
  })
  it('niveau maximum', () => {
    expect(levelProgress({ level: { name: 'Maître', next: null }, earnedCount: 30 })).toMatchObject({ isMax: true, percent: 100, text: 'Niveau maximum atteint' })
  })
  it('résumé absent - Débutant sans plantage', () => {
    expect(levelProgress(null).name).toBe('Débutant')
  })
})

describe('streakMessage', () => {
  it('série en cours - aucun message', () => expect(streakMessage({ streakCurrent: 4, streakBest: 9 })).toBe(''))
  it('série cassée - rappelle la meilleure série, sans culpabiliser', () => {
    expect(streakMessage({ streakCurrent: 0, streakBest: 21 })).toMatch(/meilleure série reste de 21 jours/)
  })
  it('meilleure série de 1 - singulier', () => {
    expect(streakMessage({ streakCurrent: 0, streakBest: 1 })).toMatch(/1 jour :/)
  })
  it('compte neuf - encouragement', () => {
    expect(streakMessage({ streakCurrent: 0, streakBest: 0 })).toMatch(/première pratique/)
  })
})

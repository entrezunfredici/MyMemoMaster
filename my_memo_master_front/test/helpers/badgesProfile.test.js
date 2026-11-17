import { describe, it, expect } from 'vitest'
import {
  MAX_SHOWCASE,
  activitySummary,
  buildCalendar,
  calendarDayLabel,
  clampGoal,
  showcaseBadges,
  titleBadge,
  toggleShowcaseCode,
} from '@/helpers/badges'

const BADGES = [
  { code: 'a', label: 'A', earned: true },
  { code: 'b', label: 'B', earned: true },
  { code: 'c', label: 'C', earned: false },
]

describe('showcaseBadges', () => {
  it('codes obtenus - renvoie les badges dans l\'ordre choisi', () => {
    expect(showcaseBadges(BADGES, ['b', 'a']).map((b) => b.code)).toEqual(['b', 'a'])
  })

  it('code inconnu ou badge non obtenu - ignoré', () => {
    expect(showcaseBadges(BADGES, ['zzz', 'c', 'a']).map((b) => b.code)).toEqual(['a'])
  })

  it('entrées absentes - liste vide', () => {
    expect(showcaseBadges(undefined, undefined)).toEqual([])
    expect(showcaseBadges(BADGES, [])).toEqual([])
  })
})

describe('titleBadge', () => {
  it('badge obtenu - le renvoie', () => {
    expect(titleBadge(BADGES, 'a')).toMatchObject({ code: 'a' })
  })

  it('aucun titre, code inconnu ou badge non obtenu - null', () => {
    expect(titleBadge(BADGES, null)).toBeNull()
    expect(titleBadge(BADGES, 'zzz')).toBeNull()
    expect(titleBadge(BADGES, 'c')).toBeNull()
    expect(titleBadge(undefined, 'a')).toBeNull()
  })
})

describe('toggleShowcaseCode', () => {
  it('code absent - l\'ajoute sans modifier la liste d\'origine', () => {
    const codes = ['a']
    expect(toggleShowcaseCode(codes, 'b')).toEqual(['a', 'b'])
    expect(codes).toEqual(['a'])
  })

  it('code présent - le retire', () => {
    expect(toggleShowcaseCode(['a', 'b'], 'a')).toEqual(['b'])
  })

  it('vitrine pleine - l\'ajout est ignoré, le retrait reste possible', () => {
    const full = ['a', 'b', 'c']
    expect(full).toHaveLength(MAX_SHOWCASE)
    expect(toggleShowcaseCode(full, 'd')).toEqual(full)
    expect(toggleShowcaseCode(full, 'b')).toEqual(['a', 'c'])
  })

  it('liste absente - démarre une vitrine', () => {
    expect(toggleShowcaseCode(undefined, 'a')).toEqual(['a'])
  })
})

describe('calendarDayLabel', () => {
  it('jour actif - nom accessible complet', () => {
    expect(calendarDayLabel('2026-11-04', true)).toBe('mercredi 4 novembre : activité')
  })

  it('jour inactif - « pas d\'activité »', () => {
    expect(calendarDayLabel('2026-11-04', false)).toBe("mercredi 4 novembre : pas d'activité")
  })
})

describe('buildCalendar', () => {
  // Du lundi 2 au lundi 16 novembre 2026 : 3 semaines (S45, S46, S47), la dernière ne contient que le lundi
  const activity = { from: '2026-11-02', to: '2026-11-16', today: '2026-11-16', activeDates: ['2026-11-02', '2026-11-16'] }

  it('une entrée par semaine, 7 jours du lundi au dimanche, numéros de semaine ISO', () => {
    const weeks = buildCalendar(activity)

    expect(weeks.map((w) => w.week)).toEqual([45, 46, 47])
    expect(weeks.every((w) => w.days.length === 7)).toBe(true)
    expect(weeks[0].days[0].date).toBe('2026-11-02')
    expect(weeks[0].days[6].date).toBe('2026-11-08')
  })

  it('jours actifs et jour courant marqués ; jours après la fin marqués futurs', () => {
    const weeks = buildCalendar(activity)
    const last = weeks[2].days

    expect(weeks[0].days[0]).toMatchObject({ active: true, isToday: false, future: false })
    expect(last[0]).toMatchObject({ date: '2026-11-16', active: true, isToday: true, future: false })
    expect(last[1]).toMatchObject({ future: true, active: false })
  })

  it('chaque case porte un nom accessible', () => {
    const [first] = buildCalendar(activity)

    expect(first.days[0].label).toBe('lundi 2 novembre : activité')
    expect(first.days[1].label).toBe("mardi 3 novembre : pas d'activité")
  })

  it('passage d\'année - numéro de semaine 53 puis 1 corrects', () => {
    const weeks = buildCalendar({ from: '2026-12-28', to: '2027-01-04', activeDates: [] })

    expect(weeks.map((w) => w.week)).toEqual([53, 1])
  })

  it('réponse absente ou incomplète - grille vide', () => {
    expect(buildCalendar(null)).toEqual([])
    expect(buildCalendar({})).toEqual([])
  })
})

describe('activitySummary', () => {
  it('pluriel - jours actifs et série', () => {
    expect(activitySummary({ activeDaysLast30: 19, streakCurrent: 12 })).toBe('19 jours actifs sur les 30 derniers jours, série de 12 jours.')
  })

  it('singulier - 1 jour actif, série de 1 jour', () => {
    expect(activitySummary({ activeDaysLast30: 1, streakCurrent: 1 })).toBe('1 jour actif sur les 30 derniers jours, série de 1 jour.')
  })

  it('aucune activité - zéros', () => {
    expect(activitySummary({})).toBe('0 jour actif sur les 30 derniers jours, série de 0 jour.')
  })
})

describe('clampGoal', () => {
  it('valeur valide - renvoyée telle quelle', () => {
    expect(clampGoal('10', 500)).toBe(10)
  })

  it('décimale - tronquée', () => {
    expect(clampGoal('7.9', 500)).toBe(7)
  })

  it('négative, vide ou non numérique - 0 (objectif désactivé)', () => {
    expect(clampGoal('-3', 500)).toBe(0)
    expect(clampGoal('', 500)).toBe(0)
    expect(clampGoal('abc', 500)).toBe(0)
  })

  it('au-dessus du maximum - ramenée au maximum', () => {
    expect(clampGoal('900', 500)).toBe(500)
  })
})

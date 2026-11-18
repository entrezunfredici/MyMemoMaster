const { computeStreaks, computeStreakDetails, FREEZE_EVERY_DAYS, MAX_FREEZES } = require('../../helpers/badges/streak')
const { levelFor, CATALOG } = require('../../helpers/badges/catalog')

describe('computeStreaks', () => {
  it('computeStreaks - aucun jour d\'activité - retourne 0 et 0', () => {
    expect(computeStreaks([], '2026-11-04')).toEqual({ current: 0, best: 0 })
  })

  it('computeStreaks - 3 jours consécutifs jusqu\'à aujourd\'hui - série courante 3', () => {
    expect(computeStreaks(['2026-11-02', '2026-11-03', '2026-11-04'], '2026-11-04')).toEqual({ current: 3, best: 3 })
  })

  it('computeStreaks - dernier jour hier - série encore active', () => {
    expect(computeStreaks(['2026-11-02', '2026-11-03'], '2026-11-04').current).toBe(2)
  })

  it('computeStreaks - dernier jour avant-hier - série courante cassée mais meilleure série conservée', () => {
    expect(computeStreaks(['2026-11-01', '2026-11-02'], '2026-11-04')).toEqual({ current: 0, best: 2 })
  })

  it('computeStreaks - doublons et ordre quelconque - même résultat que la liste triée', () => {
    expect(computeStreaks(['2026-11-04', '2026-11-02', '2026-11-03', '2026-11-03'], '2026-11-04').current).toBe(3)
  })

  it('computeStreaks - un jour manqué isolé - jour de grâce : la série continue sans compter le jour manqué', () => {
    expect(computeStreaks(['2026-11-01', '2026-11-03', '2026-11-04'], '2026-11-04')).toEqual({ current: 3, best: 3 })
  })

  it('computeStreaks - deux jours de grâce à moins de 7 jours - la série est cassée au second', () => {
    // manqués : 02 (grâce) puis 04 (2ᵉ trou, 2 jours plus tard) → série repart à 1 le 05
    expect(computeStreaks(['2026-11-01', '2026-11-03', '2026-11-05'], '2026-11-05')).toEqual({ current: 1, best: 2 })
  })

  it('computeStreaks - deux jours de grâce espacés de 7 jours - la série continue', () => {
    const dates = ['2026-11-01', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-11']
    // trous : 02 puis 10 (8 jours plus tard) → tout est tenu
    expect(computeStreaks(dates, '2026-11-11')).toEqual({ current: 9, best: 9 })
  })

  it('computeStreaks - trou de 2 jours manqués - série cassée', () => {
    expect(computeStreaks(['2026-11-01', '2026-11-04'], '2026-11-04')).toEqual({ current: 1, best: 1 })
  })

  it('computeStreaks - passage de changement d\'heure - jours consécutifs bien comptés', () => {
    expect(computeStreaks(['2026-10-24', '2026-10-25', '2026-10-26'], '2026-10-26').current).toBe(3)
  })

  it('computeStreaks - changement de mois et d\'année - jours consécutifs bien comptés', () => {
    expect(computeStreaks(['2026-12-31', '2027-01-01'], '2027-01-01').current).toBe(2)
  })
})

// Jours consécutifs à partir du 1er janvier 2026 (offsets en jours), pour les scénarios de gel de série
const dayAt = (offset) => new Date(Date.UTC(2026, 0, 1 + offset)).toISOString().slice(0, 10)
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => dayAt(from + i))

describe('computeStreakDetails — gel de série (A3)', () => {
  it('constantes - 1 gel tous les 14 jours, 2 en réserve au maximum', () => {
    expect(FREEZE_EVERY_DAYS).toBe(14)
    expect(MAX_FREEZES).toBe(2)
  })

  it('13 jours consécutifs - aucun gel encore, progression 13/14', () => {
    const details = computeStreakDetails(range(0, 12), dayAt(12))

    expect(details).toMatchObject({ current: 13, freezesAvailable: 0, freezeProgress: 13, lastFreezeEarnedOn: null })
  })

  it('14 jours consécutifs - un gel gagné le 14ᵉ jour, cycle repart à 0', () => {
    const details = computeStreakDetails(range(0, 13), dayAt(13))

    expect(details).toMatchObject({ current: 14, freezesAvailable: 1, freezeProgress: 0, lastFreezeEarnedOn: dayAt(13) })
  })

  it('20 jours consécutifs - un gel et 6 jours dans le cycle suivant', () => {
    expect(computeStreakDetails(range(0, 19), dayAt(19))).toMatchObject({ freezesAvailable: 1, freezeProgress: 6 })
  })

  it('42 jours consécutifs - le stock est plafonné à 2', () => {
    expect(computeStreakDetails(range(0, 41), dayAt(41))).toMatchObject({ current: 42, freezesAvailable: 2 })
  })

  it('trou d’un jour avec jour de grâce disponible - le gel n’est pas consommé (la grâce joue en premier)', () => {
    const dates = [...range(0, 13), ...range(15, 16)] // 14 jours, un trou (le 14), puis 2 jours
    const details = computeStreakDetails(dates, dayAt(16))

    expect(details).toMatchObject({ current: 16, freezesAvailable: 1, freezesUsed: 0, lastFreezeUsedOn: null })
  })

  it('trou de deux jours - la grâce couvre le premier, le gel le second : la série continue', () => {
    const dates = [...range(0, 13), ...range(16, 17)] // 14 jours, trous 14 et 15, puis reprise le 16
    const details = computeStreakDetails(dates, dayAt(17))

    expect(details).toMatchObject({ current: 16, best: 16, freezesAvailable: 0, freezesUsed: 1, lastFreezeUsedOn: dayAt(16) })
  })

  it('deuxième trou isolé dans la semaine - la grâce est épuisée, le gel prend le relais', () => {
    // 14 jours, trou le 14 (grâce), pratique 15-16, trou le 17 (grâce épuisée → gel), pratique le 18
    const dates = [...range(0, 13), ...range(15, 16), dayAt(18)]
    const details = computeStreakDetails(dates, dayAt(18))

    expect(details).toMatchObject({ current: 17, freezesUsed: 1, freezesAvailable: 0, lastFreezeUsedOn: dayAt(18) })
  })

  it('sans gel en réserve - le même deuxième trou casse la série', () => {
    // 10 jours (pas de gel), trou (grâce), 2 jours, nouveau trou dans la semaine : cassée
    const dates = [...range(0, 9), ...range(11, 12), dayAt(14)]
    const details = computeStreakDetails(dates, dayAt(14))

    expect(details).toMatchObject({ current: 1, best: 12, freezesAvailable: 0, freezesUsed: 0 })
  })

  it('trou trop long pour grâce + gels - série cassée, mais le gel gagné reste en réserve', () => {
    const dates = [...range(0, 13), dayAt(19)] // 4 jours manqués : grâce + 1 gel ne suffisent pas
    const details = computeStreakDetails(dates, dayAt(19))

    expect(details).toMatchObject({ current: 1, best: 14, freezesAvailable: 1, freezesUsed: 0 })
  })

  it('gel conservé après une rupture - il sert plus tard', () => {
    const dates = [...range(0, 13), dayAt(19), dayAt(20), dayAt(22), dayAt(24)]
    // rupture (le 19 repart à 1), puis trou le 21 (grâce), puis trou le 23 : grâce épuisée → gel
    const details = computeStreakDetails(dates, dayAt(24))

    expect(details).toMatchObject({ current: 4, freezesUsed: 1, freezesAvailable: 0 })
  })

  it('série courante nulle - progression du cycle remise à 0, gel toujours disponible', () => {
    const details = computeStreakDetails(range(0, 13), dayAt(30))

    expect(details).toMatchObject({ current: 0, best: 14, freezeProgress: 0, freezesAvailable: 1 })
  })

  it('aucune activité - tout à zéro', () => {
    expect(computeStreakDetails([], dayAt(0))).toEqual({
      current: 0, best: 0, freezesAvailable: 0, freezesUsed: 0, freezeProgress: 0, lastFreezeEarnedOn: null, lastFreezeUsedOn: null
    })
  })

  it('computeStreaks - garde sa forme { current, best }', () => {
    expect(computeStreaks(range(0, 13), dayAt(13))).toEqual({ current: 14, best: 14 })
  })
})

describe('levelFor', () => {
  it('levelFor - 0 badge - Débutant avec Apprenti comme niveau suivant', () => {
    const level = levelFor(0)
    expect(level.name).toBe('Débutant')
    expect(level.next.name).toBe('Apprenti')
  })

  it('levelFor - seuil exact 5 - Apprenti', () => {
    expect(levelFor(5).name).toBe('Apprenti')
    expect(levelFor(4).name).toBe('Débutant')
  })

  it('levelFor - au-delà du dernier palier - Maître sans niveau suivant', () => {
    const level = levelFor(40)
    expect(level.name).toBe('Maître')
    expect(level.next).toBeNull()
  })
})

describe('CATALOG', () => {
  it('CATALOG - codes - uniques et de 40 caractères maximum (colonne STRING(40))', () => {
    const codes = CATALOG.map((b) => b.code)
    expect(new Set(codes).size).toBe(codes.length)
    codes.forEach((code) => expect(code.length).toBeLessThanOrEqual(40))
  })

  it('CATALOG - badges historiques de Kpi.service - tous repris avec le même code', () => {
    const codes = CATALOG.map((b) => b.code)
    ;['streak7', 'streak30', 'perfectScore', 'tenTests', 'fiveSubjects', 'leitnerMastery', 'regular'].forEach((code) =>
      expect(codes).toContain(code)
    )
  })

  it('CATALOG - chaque badge - cible positive, événements et fonction de mesure définis', () => {
    CATALOG.forEach((badge) => {
      expect(badge.target).toBeGreaterThan(0)
      expect(badge.events.length).toBeGreaterThan(0)
      expect(typeof badge.value).toBe('function')
    })
  })
})

const { computeStreaks } = require('../../helpers/badges/streak')
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

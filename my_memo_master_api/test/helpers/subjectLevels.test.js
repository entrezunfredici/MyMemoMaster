const { LEVELS, CARD_TIERS, EXERCISE_TIERS, cardsTier, exercisesTier, levelForSubject } = require('../../helpers/badges/subjectLevels')

const stats = (masteredCards, exercises, averagePercent) => ({ masteredCards, exercises, averagePercent })

describe('subjectLevels', () => {
  it('constantes - quatre niveaux, trois paliers par axe, seuils croissants', () => {
    expect(LEVELS.map((level) => level.label)).toEqual(['Novice', 'Initié', 'Confirmé', 'Expert'])
    expect(CARD_TIERS).toEqual([...CARD_TIERS].sort((a, b) => a - b))
    expect(EXERCISE_TIERS.map((tier) => tier.count)).toEqual([...EXERCISE_TIERS.map((tier) => tier.count)].sort((a, b) => a - b))
  })

  describe('cardsTier', () => {
    it.each([[0, 0], [9, 0], [10, 1], [49, 1], [50, 2], [149, 2], [150, 3], [999, 3]])('%i cartes maîtrisées - palier %i', (cards, tier) => {
      expect(cardsTier(cards)).toBe(tier)
    })
  })

  describe('exercisesTier', () => {
    it('nombre ET moyenne requis : une moyenne haute sur trop peu d’essais ne suffit pas', () => {
      expect(exercisesTier(1, 100)).toBe(0)
      expect(exercisesTier(2, 100)).toBe(1)
    })

    it('une moyenne trop basse bloque le palier même avec beaucoup d’exercices', () => {
      expect(exercisesTier(30, 49)).toBe(0)
      expect(exercisesTier(30, 64)).toBe(1)
      expect(exercisesTier(30, 79)).toBe(2)
      expect(exercisesTier(30, 80)).toBe(3)
    })
  })

  describe('levelForSubject', () => {
    it('aucune activité - Novice, prochain niveau Initié', () => {
      const result = levelForSubject(stats(0, 0, 0))

      expect(result.rank).toBe(0)
      expect(result.level.code).toBe('novice')
      expect(result.next).toMatchObject({ code: 'initiate', mode: 'either', cards: { current: 0, target: 10 }, exercises: { current: 0, target: 2 } })
    })

    it('Initié - l’un des deux axes suffit (cartes seules, ou exercices seuls)', () => {
      expect(levelForSubject(stats(10, 0, 0)).level.code).toBe('initiate')
      expect(levelForSubject(stats(0, 2, 50)).level.code).toBe('initiate')
    })

    it('Confirmé et Expert - les deux axes sont requis', () => {
      expect(levelForSubject(stats(500, 0, 0)).level.code).toBe('initiate') // que des cartes : plafonné à Initié
      expect(levelForSubject(stats(0, 40, 100)).level.code).toBe('initiate') // que des exercices : idem
      expect(levelForSubject(stats(50, 5, 65)).level.code).toBe('confirmed')
      expect(levelForSubject(stats(150, 10, 80)).level.code).toBe('expert')
    })

    it('le palier le plus faible des deux axes décide', () => {
      expect(levelForSubject(stats(150, 5, 65)).level.code).toBe('confirmed')
      expect(levelForSubject(stats(50, 10, 80)).level.code).toBe('confirmed')
    })

    it('prochain niveau - ce qu’il reste à faire, avec les valeurs courantes', () => {
      const result = levelForSubject(stats(20, 3, 70))

      expect(result.level.code).toBe('initiate')
      expect(result.next).toMatchObject({
        code: 'confirmed',
        mode: 'both',
        cards: { current: 20, target: 50 },
        exercises: { current: 3, target: 5 },
        averagePercent: { current: 70, target: 65 }
      })
    })

    it('Expert - niveau maximal, pas de prochain niveau', () => {
      const result = levelForSubject(stats(300, 20, 95))

      expect(result.rank).toBe(3)
      expect(result.next).toBeNull()
    })
  })
})

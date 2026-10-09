const { parseNumber, parseDate, sameValue, numericVerdict } = require('../../helpers/numericEquivalence')

describe('numericEquivalence', () => {
  describe('parseNumber', () => {
    it.each([
      ['1789', 1789],
      ['3,14', 3.14],
      ['3.14', 3.14],
      ['1 000', 1000],
      ['1 000,5', 1000.5],
      ['-5', -5],
      ['zéro', 0],
      ['quinze', 15],
      ['vingt et un', 21],
      ['soixante et onze', 71],
      ['soixante-quinze', 75],
      ['quatre-vingts', 80],
      ['quatre-vingt-dix-sept', 97],
      ['cent', 100],
      ['deux cents', 200],
      ['trois cent quarante-deux', 342],
      ['mille', 1000],
      ['mille sept cent quatre-vingt-neuf', 1789],
      ['deux mille vingt-six', 2026],
      ['trois cent mille', 300000],
      ['un million deux cent mille', 1200000],
      ['trois virgule quatorze', 3.14],
      ['zéro virgule zéro cinq', 0.05],
      ['moins cinq', -5]
    ])('parseNumber - « %s » - vaut %s', (text, expected) => {
      expect(parseNumber(text).value).toBeCloseTo(expected, 9)
    })

    it('parseNumber - pourcentage en chiffres ou en lettres - marque percent', () => {
      expect(parseNumber('50 %')).toEqual({ value: 50, percent: true })
      expect(parseNumber('cinquante pour cent')).toEqual({ value: 50, percent: true })
    })

    it.each(['', '   ', 'bonjour', '100 degrés', 'trois chats', '1.000', 'vingt vingt virgule virgule'])(
      'parseNumber - « %s » - non comparable (null)',
      (text) => {
        expect(parseNumber(text)).toBeNull()
      }
    )
  })

  describe('parseDate', () => {
    it.each([
      ['18/09/2026', { year: 2026, month: 9, day: 18 }],
      ['18-09-2026', { year: 2026, month: 9, day: 18 }],
      ['2026-09-18', { year: 2026, month: 9, day: 18 }],
      ['le 18 septembre 2026', { year: 2026, month: 9, day: 18 }],
      ['dix-huit septembre deux mille vingt-six', { year: 2026, month: 9, day: 18 }],
      ['le premier mai 1789', { year: 1789, month: 5, day: 1 }],
      ['1er août 1914', { year: 1914, month: 8, day: 1 }],
      ['14 juillet mille sept cent quatre-vingt-neuf', { year: 1789, month: 7, day: 14 }]
    ])('parseDate - « %s »', (text, expected) => {
      expect(parseDate(text)).toEqual(expected)
    })

    it.each(['1789', 'septembre 2026', '31/13/2026', '32 janvier 2026', 'bonjour', '', '0/0/2026'])(
      'parseDate - « %s » - pas une date complète (null)',
      (text) => {
        expect(parseDate(text)).toBeNull()
      }
    )
  })

  describe('sameValue', () => {
    it('sameValue - date en chiffres contre date en lettres - true', () => {
      expect(sameValue('18/09/2026', 'dix-huit septembre deux mille vingt-six')).toBe(true)
    })

    it('sameValue - jour différent - false', () => {
      expect(sameValue('18/09/2026', 'dix-neuf septembre deux mille vingt-six')).toBe(false)
    })

    it('sameValue - année différente - false', () => {
      expect(sameValue('18/09/2026', '18 septembre 2025')).toBe(false)
    })

    it('sameValue - 1789 contre sa version en lettres - true', () => {
      expect(sameValue('1789', 'mille sept cent quatre-vingt-neuf')).toBe(true)
    })

    it('sameValue - 1789 contre 1798 - false (cas où MiniLM se trompait : score 0,89)', () => {
      expect(sameValue('1789', '1798')).toBe(false)
    })

    it('sameValue - décimal en lettres - true', () => {
      expect(sameValue('3,14', 'trois virgule quatorze')).toBe(true)
    })

    it('sameValue - pourcentage contre nombre nu - null (nature différente)', () => {
      expect(sameValue('50 %', '50')).toBeNull()
    })

    it('sameValue - date contre nombre - null', () => {
      expect(sameValue('18/09/2026', '2026')).toBeNull()
    })

    it('sameValue - valeur avec unité - null (au juge de trancher)', () => {
      expect(sameValue('100 °C', 'cent degrés Celsius')).toBeNull()
    })

    it('sameValue - texte libre - null', () => {
      expect(sameValue('la pression', 'le volume')).toBeNull()
    })
  })

  describe('numericVerdict', () => {
    it('numericVerdict - une des références égale - equal', () => {
      expect(numericVerdict(['1789', '1790'], 'mille sept cent quatre-vingt-neuf')).toBe('equal')
    })

    it('numericVerdict - toutes comparables, aucune égale - different', () => {
      expect(numericVerdict(['1789', '1790'], '1798')).toBe('different')
    })

    it('numericVerdict - une référence non comparable - null', () => {
      expect(numericVerdict(['1789', 'la Révolution'], '1798')).toBeNull()
    })

    it('numericVerdict - aucune référence - null', () => {
      expect(numericVerdict([], '1798')).toBeNull()
    })
  })
})

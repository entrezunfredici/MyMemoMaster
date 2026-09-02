const {
  normalize,
  isExcerptGenuine,
  findDuplicateStatements,
  wordOverlapRatio,
  dedupeCards,
  respectsShortfallWarning
} = require('../../helpers/aiGenerationQualityChecks')

describe('aiGenerationQualityChecks', () => {
  describe('normalize', () => {
    it('normalize - espaces multiples et casse - aplatit en minuscule espace simple', () => {
      expect(normalize('  La   Photosynthèse   ')).toBe('la photosynthèse')
    })

    it('normalize - valeur non-string (null/undefined) - retourne une chaîne vide', () => {
      expect(normalize(null)).toBe('')
      expect(normalize(undefined)).toBe('')
    })
  })

  describe('isExcerptGenuine', () => {
    const sourceText =
      'La photosynthèse est le processus par lequel les plantes convertissent la lumière en énergie chimique.'

    it('isExcerptGenuine - extrait cité mot pour mot - true', () => {
      expect(isExcerptGenuine('les plantes convertissent la lumière', sourceText)).toBe(true)
    })

    it('isExcerptGenuine - extrait avec casse/espaces différents - true (tolérant)', () => {
      expect(isExcerptGenuine('  LES   PLANTES convertissent LA lumière  ', sourceText)).toBe(true)
    })

    it('isExcerptGenuine - extrait paraphrasé, absent mot pour mot - false', () => {
      expect(isExcerptGenuine('les plantes transforment la lumière en énergie', sourceText)).toBe(false)
    })

    it('isExcerptGenuine - extrait vide ou non-string - false', () => {
      expect(isExcerptGenuine('', sourceText)).toBe(false)
      expect(isExcerptGenuine(null, sourceText)).toBe(false)
    })

    it('isExcerptGenuine - texte source vide/non-string - false', () => {
      expect(isExcerptGenuine('les plantes', '')).toBe(false)
      expect(isExcerptGenuine('les plantes', null)).toBe(false)
    })
  })

  describe('wordOverlapRatio', () => {
    it('wordOverlapRatio - deux textes identiques - 1', () => {
      expect(wordOverlapRatio('la photosynthèse produit du glucose', 'la photosynthèse produit du glucose')).toBe(1)
    })

    it('wordOverlapRatio - aucun mot commun - 0', () => {
      expect(wordOverlapRatio('la photosynthèse', 'un théorème')).toBe(0)
    })

    it('wordOverlapRatio - un texte vide - 0', () => {
      expect(wordOverlapRatio('', 'la photosynthèse')).toBe(0)
    })
  })

  describe('findDuplicateStatements', () => {
    it('findDuplicateStatements - deux énoncés strictement identiques - signale le doublon', () => {
      const cards = [{ statement: 'Qu\'est-ce que la photosynthèse ?' }, { statement: 'Qu\'est-ce que la photosynthèse ?' }]
      expect(findDuplicateStatements(cards)).toEqual([{ index: 1, duplicateOf: 0 }])
    })

    it('findDuplicateStatements - deux énoncés quasi-identiques (chevauchement lexical élevé) - signale le doublon', () => {
      const cards = [
        { statement: 'Quel est le rôle de la chlorophylle dans la photosynthèse ?' },
        { statement: 'Quel est le rôle de la chlorophylle lors de la photosynthèse ?' }
      ]
      expect(findDuplicateStatements(cards)).toHaveLength(1)
    })

    it('findDuplicateStatements - énoncés distincts sur des notions différentes - aucun doublon', () => {
      const cards = [
        { statement: 'Qu\'est-ce que la photosynthèse ?' },
        { statement: 'Où se déroule la respiration cellulaire ?' },
        { statement: 'Quels sont les réactifs de la glycolyse ?' }
      ]
      expect(findDuplicateStatements(cards)).toEqual([])
    })

    it('findDuplicateStatements - liste vide ou absente - aucun doublon, ne lève pas', () => {
      expect(findDuplicateStatements([])).toEqual([])
      expect(findDuplicateStatements(undefined)).toEqual([])
    })

    it('findDuplicateStatements - carte sans statement (sortie malformée) - ignorée sans lever', () => {
      const cards = [{ statement: 'Qu\'est-ce que la photosynthèse ?' }, {}]
      expect(findDuplicateStatements(cards)).toEqual([])
    })
  })

  describe('dedupeCards', () => {
    it('dedupeCards - aucun doublon - retourne le tableau tel quel, removedCount à 0', () => {
      const cards = [{ statement: 'Qu\'est-ce que la photosynthèse ?' }, { statement: 'Où se déroule la respiration cellulaire ?' }]
      expect(dedupeCards(cards)).toEqual({ cards, removedCount: 0 })
    })

    it('dedupeCards - un doublon strict - retire la seconde occurrence, garde la première', () => {
      const cards = [
        { statement: 'Citez un état physique de l\'eau.', answer: 'Solide' },
        { statement: 'Où se déroule la respiration cellulaire ?', answer: 'Mitochondries' },
        { statement: 'Citez un état physique de l\'eau.', answer: 'Liquide' }
      ]
      const result = dedupeCards(cards)
      expect(result.removedCount).toBe(1)
      expect(result.cards).toEqual([cards[0], cards[1]])
    })

    it('dedupeCards - liste vide ou absente - ne lève pas, removedCount à 0', () => {
      expect(dedupeCards([])).toEqual({ cards: [], removedCount: 0 })
      expect(dedupeCards(undefined)).toEqual({ cards: [], removedCount: 0 })
    })

    it('dedupeCards - trois cartes quasi-identiques (cas cardcount-disproportionne du rapport C-01.10) - garde une seule occurrence', () => {
      const cards = [
        { statement: 'Citez un état physique de l\'eau.', answer: 'Solide (glace)' },
        { statement: 'Citez un état physique de l\'eau.', answer: 'Liquide' },
        { statement: 'Citez un état physique de l\'eau.', answer: 'Gazeux (vapeur)' }
      ]
      const result = dedupeCards(cards)
      expect(result.cards).toEqual([cards[0]])
      expect(result.removedCount).toBe(2)
    })
  })

  describe('respectsShortfallWarning', () => {
    it('respectsShortfallWarning - autant de cartes que demandé - true, warning non requis', () => {
      expect(respectsShortfallWarning({ cards: [{}, {}, {}], warning: null }, 3)).toBe(true)
    })

    it('respectsShortfallWarning - plus de cartes que demandé (ne devrait jamais arriver, cf. schéma) - true', () => {
      expect(respectsShortfallWarning({ cards: [{}, {}, {}, {}], warning: null }, 3)).toBe(true)
    })

    it('respectsShortfallWarning - moins de cartes que demandé avec warning renseigné - true', () => {
      expect(
        respectsShortfallWarning({ cards: [{}], warning: 'Contenu source insuffisant pour 3 cartes.' }, 3)
      ).toBe(true)
    })

    it('respectsShortfallWarning - moins de cartes que demandé sans warning - false', () => {
      expect(respectsShortfallWarning({ cards: [{}], warning: null }, 3)).toBe(false)
    })

    it('respectsShortfallWarning - moins de cartes que demandé avec warning vide/blanc - false', () => {
      expect(respectsShortfallWarning({ cards: [{}], warning: '   ' }, 3)).toBe(false)
    })

    it('respectsShortfallWarning - payload malformé (cards absent) - traité comme 0 carte produite', () => {
      expect(respectsShortfallWarning({ warning: null }, 3)).toBe(false)
      expect(respectsShortfallWarning({ warning: 'Rien à signaler' }, 3)).toBe(true)
    })
  })
})

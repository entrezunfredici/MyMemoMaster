const AiExerciseImportValidationService = require('../../services/AiExerciseImportValidation.service')

const VALID_OPEN = {
  statement: 'Qu\'est-ce que la photosynthèse ?',
  type: 'open',
  content: { correct_answer: 'Un processus de conversion de lumière en énergie chimique.', accepted_answers: [] }
}

const VALID_MCQ = {
  statement: 'Quelle est la capitale de la France ?',
  type: 'mcq',
  content: {
    options: [
      { text: 'Paris', correct: true },
      { text: 'Madrid', correct: false },
      { text: 'Berlin', correct: false }
    ]
  }
}

const VALID_FILL_BLANK = {
  statement: 'Complétez la phrase.',
  type: 'fill_blank',
  content: { template: 'La capitale de la France est {{0}} et celle d\'Allemagne est {{1}}.', blanks: ['Paris', 'Berlin'] }
}

const VALID_REORDER = {
  statement: 'Remettez dans l\'ordre.',
  type: 'reorder',
  content: { fragments: ['le', 'chat', 'dort', 'tranquillement'] }
}

describe('AiExerciseImportValidationService', () => {
  describe('validateQuestionFormat', () => {
    it.each([
      ['open', VALID_OPEN],
      ['mcq', VALID_MCQ],
      ['fill_blank', VALID_FILL_BLANK],
      ['reorder', VALID_REORDER]
    ])('validateQuestionFormat - question %s valide - aucune erreur', (_type, question) => {
      expect(AiExerciseImportValidationService.validateQuestionFormat(question, 0)).toEqual([])
    })

    it('validateQuestionFormat - question non objet - une seule erreur', () => {
      expect(AiExerciseImportValidationService.validateQuestionFormat(null, 0)).toEqual([
        'Question #1 : doit être un objet.'
      ])
    })

    it('validateQuestionFormat - statement manquant - erreur dédiée', () => {
      const errors = AiExerciseImportValidationService.validateQuestionFormat({ ...VALID_OPEN, statement: '' }, 0)
      expect(errors.some((e) => e.includes('statement'))).toBe(true)
    })

    it('validateQuestionFormat - statement absent sans index fourni - préfixe "Question #1" par défaut', () => {
      const errors = AiExerciseImportValidationService.validateQuestionFormat({ ...VALID_OPEN, statement: '' })
      expect(errors[0]).toContain('Question #1')
    })

    it('validateQuestionFormat - sourceExcerpt absent - AUCUNE erreur (non persisté, non vérifié à l\'import)', () => {
      // VALID_OPEN n'a volontairement pas de sourceExcerpt (champ de traçabilité de génération,
      // jamais transmis à POST /questions) — contrairement à
      // AiExerciseGeneration.service.js#validateQuestion, qui l'exige.
      expect(AiExerciseImportValidationService.validateQuestionFormat(VALID_OPEN, 0)).toEqual([])
    })

    it('validateQuestionFormat - type invalide - erreur dédiée', () => {
      const errors = AiExerciseImportValidationService.validateQuestionFormat({ ...VALID_OPEN, type: 'true_false' }, 0)
      expect(errors.some((e) => e.includes('"type"'))).toBe(true)
    })

    it('validateQuestionFormat - mcq édité sans option correcte - erreur dédiée (régression après édition)', () => {
      const edited = {
        ...VALID_MCQ,
        content: { options: [{ text: 'Paris', correct: false }, { text: 'Madrid', correct: false }, { text: 'Berlin', correct: false }] }
      }
      const errors = AiExerciseImportValidationService.validateQuestionFormat(edited, 0)
      expect(errors.some((e) => e.includes('exactement une'))).toBe(true)
    })

    it('validateQuestionFormat - fill_blank édité avec blanks désynchronisé du template - erreur dédiée', () => {
      const edited = {
        ...VALID_FILL_BLANK,
        content: { template: 'La capitale de la France est {{0}}.', blanks: ['Paris', 'Berlin'] }
      }
      const errors = AiExerciseImportValidationService.validateQuestionFormat(edited, 0)
      expect(errors.some((e) => e.includes('content.template'))).toBe(true)
    })

    it('validateQuestionFormat - reorder édité avec un seul fragment restant - erreur dédiée', () => {
      const edited = { ...VALID_REORDER, content: { fragments: ['le'] } }
      const errors = AiExerciseImportValidationService.validateQuestionFormat(edited, 0)
      expect(errors.some((e) => e.includes('au moins 2 fragments'))).toBe(true)
    })

    it('validateQuestionFormat - index fourni - préfixe le numéro correspondant', () => {
      const errors = AiExerciseImportValidationService.validateQuestionFormat({ ...VALID_OPEN, statement: '' }, 2)
      expect(errors[0]).toContain('Question #3')
    })
  })

  describe('validateBatchForImport', () => {
    it('validateBatchForImport - lot entièrement valide - tout est importable, rien de rejeté', () => {
      const result = AiExerciseImportValidationService.validateBatchForImport([VALID_OPEN, VALID_MCQ, VALID_FILL_BLANK, VALID_REORDER])
      expect(result.importable).toEqual([VALID_OPEN, VALID_MCQ, VALID_FILL_BLANK, VALID_REORDER])
      expect(result.rejected).toEqual([])
    })

    it('validateBatchForImport - une question invalide au milieu - échec partiel toléré, les autres restent importables', () => {
      const brokenMcq = { ...VALID_MCQ, content: { options: [{ text: 'Paris', correct: false }, { text: 'Madrid', correct: false }, { text: 'Berlin', correct: false }] } }
      const result = AiExerciseImportValidationService.validateBatchForImport([VALID_OPEN, brokenMcq, VALID_REORDER])

      expect(result.importable).toEqual([VALID_OPEN, VALID_REORDER])
      expect(result.rejected).toHaveLength(1)
      expect(result.rejected[0].index).toBe(1)
      expect(result.rejected[0].question).toBe(brokenMcq)
      expect(result.rejected[0].errors.length).toBeGreaterThan(0)
    })

    it('validateBatchForImport - lot vide - importable et rejected vides', () => {
      expect(AiExerciseImportValidationService.validateBatchForImport([])).toEqual({ importable: [], rejected: [] })
    })

    it('validateBatchForImport - questions non fourni (null/undefined) - ne lève pas, renvoie des tableaux vides', () => {
      expect(AiExerciseImportValidationService.validateBatchForImport(null)).toEqual({ importable: [], rejected: [] })
      expect(AiExerciseImportValidationService.validateBatchForImport(undefined)).toEqual({ importable: [], rejected: [] })
    })

    it('validateBatchForImport - toutes les questions invalides - importable vide, tout rejeté avec le bon index', () => {
      const result = AiExerciseImportValidationService.validateBatchForImport([
        { ...VALID_OPEN, statement: '' },
        { ...VALID_MCQ, content: null }
      ])
      expect(result.importable).toEqual([])
      expect(result.rejected.map((r) => r.index)).toEqual([0, 1])
    })
  })

  describe('assertValidForImport', () => {
    it.each([
      ['open', VALID_OPEN],
      ['mcq', VALID_MCQ],
      ['fill_blank', VALID_FILL_BLANK],
      ['reorder', VALID_REORDER]
    ])('assertValidForImport - question %s valide - ne lève pas', (_type, question) => {
      expect(() => AiExerciseImportValidationService.assertValidForImport(question)).not.toThrow()
    })

    it('assertValidForImport - question invalide - lève une erreur 400 avec le détail des erreurs', () => {
      expect(() => AiExerciseImportValidationService.assertValidForImport({ ...VALID_OPEN, statement: '' })).toThrow(
        "Le format de la question n'est pas valide avant import"
      )
      try {
        AiExerciseImportValidationService.assertValidForImport({ ...VALID_OPEN, statement: '' })
      } catch (err) {
        expect(err.statusCode).toBe(400)
        expect(err.message).toContain('statement')
      }
    })

    it('assertValidForImport - index fourni - reflété dans le message d\'erreur', () => {
      try {
        AiExerciseImportValidationService.assertValidForImport({ ...VALID_OPEN, statement: '' }, 4)
      } catch (err) {
        expect(err.message).toContain('Question #5')
      }
    })
  })
})

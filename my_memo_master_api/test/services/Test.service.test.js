const { Test, TestResult } = require('../../models/index')
const semanticService = require('../../services/Semantic.service')
const TestService = require('../../services/Test.service')

jest.mock('../../services/Semantic.service', () => ({
  gradeSemantic: jest.fn()
}))

jest.mock('../../models/index', () => ({
  Test: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  },
  Subject: {},
  Question: {},
  TestResult: {
    create: jest.fn()
  }
}))

describe('TestService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should retrieve all tests', async () => {
    const mockTests = [
      { testId: 1, subjectId: 1, name: 'Controle milieu semestre' },
      { testId: 2, subjectId: 1, name: 'Controle finale' }
    ]
    Test.findAll.mockResolvedValue(mockTests)

    const tests = await TestService.findAll()

    expect(Test.findAll).toHaveBeenCalledTimes(1)
    expect(tests).toEqual(mockTests)
  })

  test('should retrieve a test by ID', async () => {
    const mockTest = { testId: 1, subjectId: 1, name: 'Controle finale' }
    Test.findByPk.mockResolvedValue(mockTest)

    const test = await TestService.findOne(1)

    expect(Test.findByPk).toHaveBeenCalledWith(1, expect.objectContaining({ include: expect.any(Array) }))
    expect(test).toEqual(mockTest)
  })

  test('should create a new test', async () => {
    const mockTest = { testId: 3, subjectId: 1, name: 'Controle m1' }
    Test.create.mockResolvedValue(mockTest)

    const test = await TestService.create({ subjectId: 1, name: 'Controle m1' })

    expect(Test.create).toHaveBeenCalledWith({ subjectId: 1, name: 'Controle m1' })
    expect(test).toEqual(mockTest)
  })

  test('should update a test', async () => {
    const mockTest = {
      testId: 1,
      subjectId: 1,
      name: 'Controle finale',
      update: jest.fn().mockResolvedValue({ testId: 1, subjectId: 1, name: 'Controle m1' })
    }
    Test.findByPk.mockResolvedValue(mockTest)

    const updatedTest = await TestService.update(1, { name: 'Controle m1' })

    expect(Test.findByPk).toHaveBeenCalledWith(1)
    expect(mockTest.update).toHaveBeenCalledWith({ name: 'Controle m1' })
    expect(updatedTest).toEqual({ testId: 1, subjectId: 1, name: 'Controle m1' })
  })

  test('should delete a test', async () => {
    const mockTest = {
      testId: 1,
      subjectId: 1,
      name: 'Controle finale',
      destroy: jest.fn().mockResolvedValue(true)
    }
    Test.findByPk.mockResolvedValue(mockTest)

    const result = await TestService.delete(1)

    expect(Test.findByPk).toHaveBeenCalledWith(1)
    expect(mockTest.destroy).toHaveBeenCalled()
    expect(result).toBe(true)
  })

  // ── submitAnswers ─────────────────────────────────────────────────────────────

  const makeQuestion = (idQuestion, type, content) => ({ idQuestion, type, content })

  describe('submitAnswers', () => {
    it('retourne null si le test est introuvable', async () => {
      Test.findByPk.mockResolvedValue(null)

      const result = await TestService.submitAnswers(99, 1, [])

      expect(result).toBeNull()
      expect(TestResult.create).not.toHaveBeenCalled()
    })

    it('calcule le score (somme des similarités) et crée le TestResult', async () => {
      const questions = [
        makeQuestion(1, 'open', { correct_answer: 'Paris' }),
        makeQuestion(2, 'open', { correct_answer: 'Berlin' })
      ]
      Test.findByPk.mockResolvedValue({ testId: 1, question: questions })
      TestResult.create.mockResolvedValue({ resultId: 42, score: 1.2, total: 2 })
      semanticService.gradeSemantic
        .mockResolvedValueOnce({ is_correct: true, score: 1.0, explanation: 'Correct (similarity=1.00).', decision_zone: 'correct' })
        .mockResolvedValueOnce({ is_correct: false, score: 0.2, explanation: 'Incorrect (similarity=0.20).', decision_zone: 'low' })

      const result = await TestService.submitAnswers(1, 5, [
        { questionId: 1, answer: 'Paris' },
        { questionId: 2, answer: 'Rome' }
      ])

      expect(result.score).toBe(1.2)
      expect(result.total).toBe(2)
      expect(result.resultId).toBe(42)
      expect(result.results).toHaveLength(2)
      expect(result.results[0]).toEqual(expect.objectContaining({ questionId: 1, correct: true, correctAnswer: 'Paris', explanation: 'Correct (similarity=1.00).', semanticScore: 1.0, points: 1.0 }))
      expect(result.results[1]).toEqual(expect.objectContaining({ questionId: 2, correct: false, correctAnswer: 'Berlin', explanation: 'Incorrect (similarity=0.20).', semanticScore: 0.2, points: 0.2 }))
      expect(TestResult.create).toHaveBeenCalledWith({ testId: 1, userId: 5, score: 1.2, total: 2 })
    })

    it('open — insensible à la casse et aux espaces (correction IA)', async () => {
      Test.findByPk.mockResolvedValue({
        question: [makeQuestion(1, 'open', { correct_answer: '  Paris  ' })]
      })
      TestResult.create.mockResolvedValue({ resultId: 1 })
      semanticService.gradeSemantic.mockResolvedValueOnce({ is_correct: true, score: 0.99, explanation: 'Correct (similarity=0.99).', decision_zone: 'correct' })

      const result = await TestService.submitAnswers(1, 1, [{ questionId: 1, answer: ' PARIS ' }])
      expect(result.results[0].correct).toBe(true)
      expect(result.results[0].explanation).toBe('Correct (similarity=0.99).')
      expect(semanticService.gradeSemantic).toHaveBeenCalledWith('Paris', 'PARIS')
    })

    it('open — réponse vide est incorrecte', async () => {
      Test.findByPk.mockResolvedValue({
        question: [makeQuestion(1, 'open', { correct_answer: 'Paris' })]
      })
      TestResult.create.mockResolvedValue({ resultId: 1 })

      const result = await TestService.submitAnswers(1, 1, [{ questionId: 1, answer: '' }])
      expect(result.results[0].correct).toBe(false)
    })

    it('mcq — bonne option sélectionnée', async () => {
      const content = { options: [{ text: 'A', correct: false }, { text: 'B', correct: true }] }
      Test.findByPk.mockResolvedValue({ question: [makeQuestion(1, 'mcq', content)] })
      TestResult.create.mockResolvedValue({ resultId: 1 })

      const result = await TestService.submitAnswers(1, 1, [{ questionId: 1, answer: 1 }])
      expect(result.results[0].correct).toBe(true)
      expect(result.results[0].correctAnswer).toBe('B')
      expect(result.results[0].points).toBe(1)
      expect(result.score).toBe(1)
    })

    it('mcq — mauvaise option sélectionnée', async () => {
      const content = { options: [{ text: 'A', correct: false }, { text: 'B', correct: true }] }
      Test.findByPk.mockResolvedValue({ question: [makeQuestion(1, 'mcq', content)] })
      TestResult.create.mockResolvedValue({ resultId: 1 })

      const result = await TestService.submitAnswers(1, 1, [{ questionId: 1, answer: 0 }])
      expect(result.results[0].correct).toBe(false)
      expect(result.results[0].points).toBe(0)
      expect(result.score).toBe(0)
    })

    it('mcq — aucune réponse (null) est incorrecte', async () => {
      const content = { options: [{ text: 'A', correct: true }] }
      Test.findByPk.mockResolvedValue({ question: [makeQuestion(1, 'mcq', content)] })
      TestResult.create.mockResolvedValue({ resultId: 1 })

      const result = await TestService.submitAnswers(1, 1, [{ questionId: 1, answer: null }])
      expect(result.results[0].correct).toBe(false)
    })

    it('fill_blank — tous les trous corrects (insensible casse/espaces)', async () => {
      const content = { blanks: ['rouge', 'bleu'], template: 'Le {{0}} et le {{1}}' }
      Test.findByPk.mockResolvedValue({ question: [makeQuestion(1, 'fill_blank', content)] })
      TestResult.create.mockResolvedValue({ resultId: 1 })

      const result = await TestService.submitAnswers(1, 1, [{ questionId: 1, answer: ['Rouge', ' BLEU '] }])
      expect(result.results[0].correct).toBe(true)
      expect(result.results[0].correctAnswer).toBe('rouge / bleu')
      expect(result.results[0].points).toBe(1)
      expect(result.score).toBe(1)
    })

    it('fill_blank — un trou incorrect', async () => {
      const content = { blanks: ['rouge', 'bleu'] }
      Test.findByPk.mockResolvedValue({ question: [makeQuestion(1, 'fill_blank', content)] })
      TestResult.create.mockResolvedValue({ resultId: 1 })

      const result = await TestService.submitAnswers(1, 1, [{ questionId: 1, answer: ['rouge', 'vert'] }])
      expect(result.results[0].correct).toBe(false)
    })

    it('reorder — ordre correct', async () => {
      const content = { fragments: ['le', 'chat', 'dort'] }
      Test.findByPk.mockResolvedValue({ question: [makeQuestion(1, 'reorder', content)] })
      TestResult.create.mockResolvedValue({ resultId: 1 })

      const result = await TestService.submitAnswers(1, 1, [{ questionId: 1, answer: ['le', 'chat', 'dort'] }])
      expect(result.results[0].correct).toBe(true)
      expect(result.results[0].correctAnswer).toBe('le chat dort')
      expect(result.results[0].points).toBe(1)
      expect(result.score).toBe(1)
    })

    it('reorder — ordre incorrect', async () => {
      const content = { fragments: ['le', 'chat', 'dort'] }
      Test.findByPk.mockResolvedValue({ question: [makeQuestion(1, 'reorder', content)] })
      TestResult.create.mockResolvedValue({ resultId: 1 })

      const result = await TestService.submitAnswers(1, 1, [{ questionId: 1, answer: ['chat', 'le', 'dort'] }])
      expect(result.results[0].correct).toBe(false)
    })

    it('question non répondue — traitée comme incorrecte', async () => {
      Test.findByPk.mockResolvedValue({
        question: [makeQuestion(1, 'open', { correct_answer: 'Paris' })]
      })
      TestResult.create.mockResolvedValue({ resultId: 1 })

      const result = await TestService.submitAnswers(1, 1, [])
      expect(result.results[0].correct).toBe(false)
      expect(result.score).toBe(0)
    })
  })
})

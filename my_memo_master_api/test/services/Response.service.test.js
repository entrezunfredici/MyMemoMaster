const { Question, Response } = require('../../models/index')
const ResponseService = require('../../services/Response.service')

jest.mock('../../models/index', () => ({
  Response: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  },
  Question: {
    findByPk: jest.fn()
  }
}))

describe('ResponseService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // test("should retrieve all responses", async () => {
  //   const mockResponses = [
  //     { idResponse: 1, content: "Réponse 1", correction: true, idQuestion: 42 },
  //     { idResponse: 2, content: "Réponse 2", correction: false, idQuestion: 43 },
  //   ];
  //   Response.findAll.mockResolvedValue(mockResponses);

  //   const responses = await ResponseService.findAll();

  //   expect(Response.findAll).toHaveBeenCalledTimes(1);
  //   expect(responses).toEqual(mockResponses);
  // });

  test('should retrieve all responses by question ID', async () => {
    const idQuestion = 42
    // const mockResponses = [
    //   { idResponse: 1, content: "Réponse 1", correction: true, idQuestion: idQuestion },
    //   { idResponse: 2, content: "Réponse 2", correction: false, idQuestion: idQuestion },
    // ];

    const expectedResponses = [
      { idResponse: 2, content: 'Réponse 2', correction: false, idQuestion: idQuestion }
    ]

    Response.findAll.mockResolvedValue(expectedResponses)

    const responses = await ResponseService.getAllResponsesByQuestion(idQuestion)

    expect(Response.findAll).toHaveBeenCalledWith({
      where: { idQuestion: idQuestion, correction: false }
    })
    expect(responses).toEqual(expectedResponses)
  })

  test('should retrieve the correction for a specific question', async () => {
    const idQuestion = 42
    const mockResponse = {
      idResponse: 1,
      content: 'Réponse correcte',
      correction: true,
      idQuestion: idQuestion
    }
    Response.findOne.mockResolvedValue(mockResponse)

    const response = await ResponseService.getCorrectionByQuestion(idQuestion)

    expect(Response.findOne).toHaveBeenCalledWith({
      where: { idQuestion: idQuestion, correction: true }
    })
    expect(response).toEqual(mockResponse)
  })

  test('should retrieve a response by ID', async () => {
    const mockResponse = {
      idResponse: 1,
      content: 'Réponse 1',
      correction: true,
      idQuestion: 42
    }
    Response.findByPk.mockResolvedValue(mockResponse)

    const response = await ResponseService.findOne(1)

    expect(Response.findByPk).toHaveBeenCalledWith(1)
    expect(response).toEqual(mockResponse)
  })

  test('should create a new response', async () => {
    const newResponse = {
      content: 'Nouvelle réponse',
      correction: false,
      idQuestion: 42
    }
    const mockResponse = { idResponse: 3, ...newResponse }
    Question.findByPk.mockResolvedValue({ idQuestion: 1, statement: 'Sample question' })
    Response.create.mockResolvedValue(mockResponse)

    const response = await ResponseService.create(newResponse)

    expect(Question.findByPk).toHaveBeenCalledWith(42)
    expect(Response.create).toHaveBeenCalledWith(newResponse)
    // correction: false -> pas d'évaluation de qualité (AnswerQuality.service.js) : niveau non applicable
    expect(response).toEqual({ ...mockResponse, qualityWarnings: [], qualityLevel: null })
  })

  test('should create a correct response and attach quality warnings + level', async () => {
    const newResponse = {
      content: 'Une fonction d\'état extensive associée au système.',
      correction: true,
      idQuestion: 42
    }
    const mockResponse = { idResponse: 4, ...newResponse }
    Question.findByPk.mockResolvedValue({
      idQuestion: 42,
      statement: "Qu'est-ce que l'énergie interne U d'un système ?"
    })
    Response.create.mockResolvedValue(mockResponse)
    Response.findAll.mockResolvedValue([]) // aucune autre réponse correction:true existante

    const response = await ResponseService.create(newResponse)

    // Cas réel du 2026-09-12 (Q4 preprod) : réponse elliptique, ne mentionne pas "énergie" -> signalée
    expect(response.qualityWarnings.length).toBeGreaterThan(0)
    expect(response.qualityLevel).toBe('low')
  })

  test('should update an existing response', async () => {
    const mockResponse = {
      update: jest.fn().mockResolvedValue({
        idResponse: 1,
        content: 'Réponse mise à jour',
        correction: true,
        idQuestion: 42
      })
    }
    Response.findByPk.mockResolvedValue(mockResponse)
    Question.findByPk.mockResolvedValue({ idQuestion: 42, statement: 'Sample question' })
    Response.findAll.mockResolvedValue([])

    const updatedResponse = await ResponseService.update(1, {
      content: 'Réponse mise à jour',
      correction: true
    })

    expect(Response.findByPk).toHaveBeenCalledWith(1)
    expect(mockResponse.update).toHaveBeenCalledWith({
      content: 'Réponse mise à jour',
      correction: true
    })
    // correction: true -> Question rechargée pour évaluer la qualité (AnswerQuality.service.js)
    expect(Question.findByPk).toHaveBeenCalledWith(42)
    expect(updatedResponse).toEqual({
      idResponse: 1,
      content: 'Réponse mise à jour',
      correction: true,
      idQuestion: 42,
      qualityWarnings: expect.any(Array),
      qualityLevel: expect.stringMatching(/^(high|medium|low)$/)
    })
  })

  test('should update a response without recomputing quality when correction is false', async () => {
    const mockResponse = {
      update: jest.fn().mockResolvedValue({
        idResponse: 2,
        content: 'Distracteur modifié',
        correction: false,
        idQuestion: 42
      })
    }
    Response.findByPk.mockResolvedValue(mockResponse)

    const updatedResponse = await ResponseService.update(2, {
      content: 'Distracteur modifié',
      correction: false
    })

    expect(Question.findByPk).not.toHaveBeenCalled()
    expect(updatedResponse.qualityWarnings).toEqual([])
    expect(updatedResponse.qualityLevel).toBeNull()
  })

  test('should delete a response by ID', async () => {
    const mockResponse = {
      destroy: jest.fn().mockResolvedValue(true)
    }
    Response.findByPk.mockResolvedValue(mockResponse)

    const result = await ResponseService.delete(1)

    expect(Response.findByPk).toHaveBeenCalledWith(1)
    expect(mockResponse.destroy).toHaveBeenCalled()
    expect(result).toBe(true)
  })

  describe('previewQuality', () => {
    it('n\'interroge jamais la base (aucune persistance ni lecture)', () => {
      ResponseService.previewQuality(
        "Qu'est-ce que l'énergie interne U d'un système ?",
        "Une fonction d'état extensive associée au système."
      )
      expect(Response.findAll).not.toHaveBeenCalled()
      expect(Response.findByPk).not.toHaveBeenCalled()
      expect(Response.create).not.toHaveBeenCalled()
      expect(Question.findByPk).not.toHaveBeenCalled()
    })

    it('reproduit le cas réel Q4 (2026-09-12) sans qu\'aucune reformulation ne soit encore en base', () => {
      const preview = ResponseService.previewQuality(
        "Qu'est-ce que l'énergie interne U d'un système ?",
        "Une fonction d'état extensive associée au système."
      )
      expect(preview.qualityWarnings.length).toBeGreaterThan(0)
      expect(preview.qualityLevel).toBe('low')
    })

    it('tient compte des acceptedAnswers fournies directement par l\'appelant', () => {
      const preview = ResponseService.previewQuality(
        "Qu'est-ce que l'énergie interne U d'un système ?",
        "L'énergie interne U est une fonction d'état extensive associée à un système.",
        [
          "U est une fonction d'état extensive associée à un système.",
          'Une grandeur extensive et fonction d\'état notée U, appelée énergie interne.'
        ]
      )
      expect(preview.qualityWarnings).toEqual([])
      expect(preview.qualityLevel).toBe('high')
    })

    it('fonctionne sans acceptedAnswers (paramètre optionnel)', () => {
      const preview = ResponseService.previewQuality('Une question ?', 'Une réponse suffisamment longue et complète.')
      expect(preview.qualityLevel).toMatch(/^(high|medium|low)$/)
    })
  })
})

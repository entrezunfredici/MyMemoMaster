const AiExerciseDegradedModeService = require('../../services/AiExerciseDegradedMode.service')
const aiExerciseGenerationService = require('../../services/AiExerciseGeneration.service')
const aiExerciseGenerationPipelineService = require('../../services/AiExerciseGenerationPipeline.service')

describe('AiExerciseDegradedModeService', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    delete process.env.MISTRAL_API_KEY
  })

  describe('isAvailable', () => {
    it('isAvailable - clé API absente - indisponible, code "not_configured"', () => {
      const result = AiExerciseDegradedModeService.isAvailable()
      expect(result).toEqual({
        available: false,
        reason: 'not_configured',
        message: expect.stringContaining('pas disponible')
      })
    })

    it('isAvailable - clé API présente - disponible, aucun message', () => {
      process.env.MISTRAL_API_KEY = 'test-key'
      expect(AiExerciseDegradedModeService.isAvailable()).toEqual({ available: true, reason: null, message: null })
    })
  })

  describe('describeFailure', () => {
    it('describeFailure - erreur 400 (saisie invalide) - pas un mode dégradé, message d\'origine conservé', () => {
      const error = Object.assign(new Error('Le nombre de questions demandé doit être un entier positif.'), { statusCode: 400 })
      expect(AiExerciseDegradedModeService.describeFailure(error)).toEqual({
        degraded: false,
        code: 'invalid_input',
        message: 'Le nombre de questions demandé doit être un entier positif.',
        suggestManualCreation: false
      })
    })

    it('describeFailure - erreur 500 (config manquante) - mode dégradé "not_configured"', () => {
      const error = Object.assign(new Error('Service de génération IA non configuré (clé API manquante).'), { statusCode: 500 })
      const result = AiExerciseDegradedModeService.describeFailure(error)
      expect(result.degraded).toBe(true)
      expect(result.code).toBe('not_configured')
      expect(result.suggestManualCreation).toBe(true)
      expect(result.message).toContain('manuellement')
    })

    it('describeFailure - erreur 502 avec rateLimited - mode dégradé "rate_limited"', () => {
      const error = Object.assign(new Error('Le service de génération IA est indisponible pour le moment.'), {
        statusCode: 502,
        rateLimited: true
      })
      const result = AiExerciseDegradedModeService.describeFailure(error)
      expect(result).toEqual({
        degraded: true,
        code: 'rate_limited',
        message: expect.stringContaining('surchargé'),
        suggestManualCreation: true
      })
    })

    it('describeFailure - erreur 502 "sortie non exploitable après retry" - mode dégradé "invalid_output"', () => {
      const error = Object.assign(new Error("La génération n'a pas produit un résultat exploitable. Réessayez."), { statusCode: 502 })
      const result = AiExerciseDegradedModeService.describeFailure(error)
      expect(result.code).toBe('invalid_output')
      expect(result.degraded).toBe(true)
      expect(result.suggestManualCreation).toBe(true)
    })

    it('describeFailure - erreur 502 générique (réseau/API en panne) - mode dégradé "service_unavailable"', () => {
      const error = Object.assign(new Error('Le service de génération IA est indisponible pour le moment.'), { statusCode: 502 })
      const result = AiExerciseDegradedModeService.describeFailure(error)
      expect(result.code).toBe('service_unavailable')
      expect(result.degraded).toBe(true)
    })

    it('describeFailure - erreur sans statusCode reconnu - repli générique "unknown", jamais bloquant', () => {
      const error = new Error('boom')
      const result = AiExerciseDegradedModeService.describeFailure(error)
      expect(result).toEqual({
        degraded: true,
        code: 'unknown',
        message: expect.stringContaining('manuellement'),
        suggestManualCreation: true
      })
    })

    it('describeFailure - erreur sans message (undefined) - ne lève pas, retombe sur "unknown"', () => {
      const error = { statusCode: 999 }
      expect(() => AiExerciseDegradedModeService.describeFailure(error)).not.toThrow()
      expect(AiExerciseDegradedModeService.describeFailure(error).code).toBe('unknown')
    })
  })

  describe('attemptGeneration', () => {
    const params = { sourceText: 'Un texte source.', questionCount: 2, questionType: 'mixed' }

    it('attemptGeneration - génération réussie - success true avec le résultat', async () => {
      const fakeResult = { questions: [{ statement: 'x' }], warning: null, usage: { model: 'mistral-small-latest', promptTokens: 1, completionTokens: 1 } }
      jest.spyOn(aiExerciseGenerationService, 'generateExercises').mockResolvedValue(fakeResult)

      const result = await AiExerciseDegradedModeService.attemptGeneration(params)

      expect(result).toEqual({ success: true, ...fakeResult })
    })

    it('attemptGeneration - génération en échec (500 config) - success false avec le mode dégradé', async () => {
      const error = Object.assign(new Error('Service de génération IA non configuré (clé API manquante).'), { statusCode: 500 })
      jest.spyOn(aiExerciseGenerationService, 'generateExercises').mockRejectedValue(error)

      const result = await AiExerciseDegradedModeService.attemptGeneration(params)

      expect(result.success).toBe(false)
      expect(result.code).toBe('not_configured')
      expect(result.suggestManualCreation).toBe(true)
    })

    it('attemptGeneration - génération en échec (400 saisie) - success false, mais pas dégradé', async () => {
      const error = Object.assign(new Error('Le contenu source est requis.'), { statusCode: 400 })
      jest.spyOn(aiExerciseGenerationService, 'generateExercises').mockRejectedValue(error)

      const result = await AiExerciseDegradedModeService.attemptGeneration(params)

      expect(result).toEqual({
        success: false,
        degraded: false,
        code: 'invalid_input',
        message: 'Le contenu source est requis.',
        suggestManualCreation: false
      })
    })

    it('attemptGeneration - transmet les paramètres tels quels au service de génération', async () => {
      const generateSpy = jest.spyOn(aiExerciseGenerationService, 'generateExercises').mockResolvedValue({ questions: [], warning: null, usage: {} })

      await AiExerciseDegradedModeService.attemptGeneration(params)

      expect(generateSpy).toHaveBeenCalledWith(params)
    })
  })

  describe('attemptGenerationFromContent', () => {
    const params = { sourceText: 'Un texte source.', questionCount: 2, questionType: 'mixed' }

    it('attemptGenerationFromContent - génération réussie - success true avec le résultat (warnings, pas warning)', async () => {
      const fakeResult = { questions: [{ statement: 'x' }], warnings: [], usage: { model: 'mistral-small-latest', promptTokens: 1, completionTokens: 1 } }
      jest.spyOn(aiExerciseGenerationPipelineService, 'generateExercisesFromContent').mockResolvedValue(fakeResult)

      const result = await AiExerciseDegradedModeService.attemptGenerationFromContent(params)

      expect(result).toEqual({ success: true, ...fakeResult })
    })

    it('attemptGenerationFromContent - génération en échec (500 config) - success false avec le mode dégradé', async () => {
      const error = Object.assign(new Error('Service de génération IA non configuré (clé API manquante).'), { statusCode: 500 })
      jest.spyOn(aiExerciseGenerationPipelineService, 'generateExercisesFromContent').mockRejectedValue(error)

      const result = await AiExerciseDegradedModeService.attemptGenerationFromContent(params)

      expect(result.success).toBe(false)
      expect(result.code).toBe('not_configured')
      expect(result.suggestManualCreation).toBe(true)
    })

    it('attemptGenerationFromContent - génération en échec (400 saisie) - success false, mais pas dégradé', async () => {
      const error = Object.assign(new Error("Fournir soit un texte source, soit un fichier PDF (l'un des deux exactement)."), { statusCode: 400 })
      jest.spyOn(aiExerciseGenerationPipelineService, 'generateExercisesFromContent').mockRejectedValue(error)

      const result = await AiExerciseDegradedModeService.attemptGenerationFromContent(params)

      expect(result).toEqual({
        success: false,
        degraded: false,
        code: 'invalid_input',
        message: "Fournir soit un texte source, soit un fichier PDF (l'un des deux exactement).",
        suggestManualCreation: false
      })
    })

    it('attemptGenerationFromContent - transmet les paramètres tels quels (dont pdfBuffer) au pipeline', async () => {
      const pdfParams = { pdfBuffer: Buffer.from('%PDF-1.4'), questionCount: 2, questionType: 'mixed' }
      const generateSpy = jest
        .spyOn(aiExerciseGenerationPipelineService, 'generateExercisesFromContent')
        .mockResolvedValue({ questions: [], warnings: [], usage: {} })

      await AiExerciseDegradedModeService.attemptGenerationFromContent(pdfParams)

      expect(generateSpy).toHaveBeenCalledWith(pdfParams)
    })
  })
})

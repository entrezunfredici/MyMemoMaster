jest.mock('../../services/PdfExtraction.service', () => ({
  extractText: jest.fn()
}))
jest.mock('../../services/AiExerciseGeneration.service', () => ({
  generateExercises: jest.fn()
}))

const PdfExtractionService = require('../../services/PdfExtraction.service')
const AiExerciseGenerationService = require('../../services/AiExerciseGeneration.service')
const AiExerciseGenerationPipelineService = require('../../services/AiExerciseGenerationPipeline.service')

const FAKE_QUESTION = (n) => ({
  statement: `Q${n}`,
  type: 'open',
  content: { correct_answer: `A${n}` },
  sourceExcerpt: `E${n}`
})
const FAKE_USAGE = { model: 'mistral-small-latest', promptTokens: 100, completionTokens: 50 }

describe('AiExerciseGenerationPipelineService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('resolveSourceText', () => {
    it('resolveSourceText - texte et PDF fournis en même temps - lève une erreur 400', async () => {
      await expect(
        AiExerciseGenerationPipelineService.resolveSourceText({ sourceText: 'x', pdfBuffer: Buffer.from('y') })
      ).rejects.toMatchObject({ statusCode: 400 })
    })

    it('resolveSourceText - ni texte ni PDF fournis - lève une erreur 400', async () => {
      await expect(
        AiExerciseGenerationPipelineService.resolveSourceText({ sourceText: null, pdfBuffer: null })
      ).rejects.toMatchObject({ statusCode: 400 })
      await expect(
        AiExerciseGenerationPipelineService.resolveSourceText({ sourceText: '   ', pdfBuffer: null })
      ).rejects.toMatchObject({ statusCode: 400 })
    })

    it('resolveSourceText - texte seul - retourne le texte trimé, hasEmbeddedImages à false, sans appeler PdfExtraction', async () => {
      const result = await AiExerciseGenerationPipelineService.resolveSourceText({ sourceText: '  bonjour  ', pdfBuffer: null })
      expect(result).toEqual({ text: 'bonjour', hasEmbeddedImages: false, ocrPagesProcessed: 0 })
      expect(PdfExtractionService.extractText).not.toHaveBeenCalled()
    })

    it('resolveSourceText - PDF seul - délègue à PdfExtractionService.extractText et propage son résultat', async () => {
      PdfExtractionService.extractText.mockResolvedValue({ text: 'texte extrait du pdf', hasEmbeddedImages: true, ocrPagesProcessed: 3 })
      const buffer = Buffer.from('%PDF-1.4')
      const result = await AiExerciseGenerationPipelineService.resolveSourceText({ sourceText: null, pdfBuffer: buffer })
      expect(result).toEqual({ text: 'texte extrait du pdf', hasEmbeddedImages: true, ocrPagesProcessed: 3 })
      expect(PdfExtractionService.extractText).toHaveBeenCalledWith(buffer)
    })
  })

  describe('distributeQuestionCount', () => {
    it('distributeQuestionCount - aucun chunk - retourne un tableau vide', () => {
      expect(AiExerciseGenerationPipelineService.distributeQuestionCount(5, 0)).toEqual([])
    })

    it('distributeQuestionCount - plus de chunks que de questions - 1 question pour les N premiers, 0 ensuite', () => {
      expect(AiExerciseGenerationPipelineService.distributeQuestionCount(3, 5)).toEqual([1, 1, 1, 0, 0])
    })

    it('distributeQuestionCount - autant de chunks que de questions - 1 question par chunk', () => {
      expect(AiExerciseGenerationPipelineService.distributeQuestionCount(4, 4)).toEqual([1, 1, 1, 1])
    })

    it('distributeQuestionCount - moins de chunks que de questions - répartition équilibrée avec reste sur les premiers', () => {
      const result = AiExerciseGenerationPipelineService.distributeQuestionCount(5, 2)
      expect(result).toEqual([3, 2])
      expect(result.reduce((a, b) => a + b, 0)).toBe(5)
    })
  })

  describe('generateExercisesFromContent', () => {
    it('generateExercisesFromContent - questionCount invalide - lève une erreur 400 avant tout traitement', async () => {
      await expect(
        AiExerciseGenerationPipelineService.generateExercisesFromContent({ sourceText: 'x', questionCount: 0 })
      ).rejects.toMatchObject({ statusCode: 400 })
      expect(AiExerciseGenerationService.generateExercises).not.toHaveBeenCalled()
    })

    it('generateExercisesFromContent - texte tenant en un seul chunk - un seul appel LLM avec tout le questionCount', async () => {
      AiExerciseGenerationService.generateExercises.mockResolvedValue({
        questions: [FAKE_QUESTION(1), FAKE_QUESTION(2)],
        warning: null,
        usage: FAKE_USAGE
      })

      const result = await AiExerciseGenerationPipelineService.generateExercisesFromContent({
        sourceText: 'Un texte court.',
        questionCount: 2,
        questionType: 'open'
      })

      expect(result.questions).toHaveLength(2)
      expect(result.warnings).toEqual([])
      expect(AiExerciseGenerationService.generateExercises).toHaveBeenCalledTimes(1)
      expect(AiExerciseGenerationService.generateExercises).toHaveBeenCalledWith(
        expect.objectContaining({ sourceText: 'Un texte court.', questionCount: 2 })
      )
      expect(result.usage).toEqual({ model: 'mistral-small-latest', promptTokens: 100, completionTokens: 50, ocrPagesProcessed: 0 })
    })

    it('generateExercisesFromContent - texte long (plusieurs chunks) - agrège les questions ET l\'usage de chaque chunk', async () => {
      const longText = Array.from({ length: 3 }, (_, i) => `Paragraphe ${i} : ${'mot '.repeat(500)}`).join('\n\n')
      AiExerciseGenerationService.generateExercises
        .mockResolvedValueOnce({ questions: [FAKE_QUESTION(1)], warning: null, usage: { model: 'mistral-small-latest', promptTokens: 100, completionTokens: 50 } })
        .mockResolvedValueOnce({
          questions: [FAKE_QUESTION(2)],
          warning: 'Contenu limité sur ce passage.',
          usage: { model: 'mistral-small-latest', promptTokens: 80, completionTokens: 40 }
        })
        .mockResolvedValueOnce({ questions: [FAKE_QUESTION(3)], warning: null, usage: { model: 'mistral-small-latest', promptTokens: 60, completionTokens: 30 } })

      const result = await AiExerciseGenerationPipelineService.generateExercisesFromContent({
        sourceText: longText,
        questionCount: 3
      })

      expect(AiExerciseGenerationService.generateExercises.mock.calls.length).toBeGreaterThan(1)
      expect(result.questions.length).toBe(AiExerciseGenerationService.generateExercises.mock.calls.length)
      expect(result.warnings.some((w) => w.includes('Contenu limité sur ce passage.'))).toBe(true)
      expect(result.usage).toEqual({
        model: 'mistral-small-latest',
        promptTokens: 240,
        completionTokens: 120,
        ocrPagesProcessed: 0
      })
    })

    it('generateExercisesFromContent - un chunk échoue, les autres réussissent - agrège les succès, journalise l\'échec en warning', async () => {
      const longText = Array.from({ length: 2 }, (_, i) => `Paragraphe ${i} : ${'mot '.repeat(500)}`).join('\n\n')
      AiExerciseGenerationService.generateExercises
        .mockRejectedValueOnce(Object.assign(new Error('Service indisponible.'), { statusCode: 502 }))
        .mockResolvedValueOnce({ questions: [FAKE_QUESTION(1)], warning: null, usage: FAKE_USAGE })

      const result = await AiExerciseGenerationPipelineService.generateExercisesFromContent({
        sourceText: longText,
        questionCount: 2
      })

      expect(result.questions).toHaveLength(1)
      expect(result.warnings.some((w) => w.includes("n'a pas pu être traité"))).toBe(true)
      expect(result.usage).toEqual({ model: 'mistral-small-latest', promptTokens: 100, completionTokens: 50, ocrPagesProcessed: 0 })
    })

    it('generateExercisesFromContent - tous les chunks échouent, sans usage réel - lève une erreur 502 sans usage attaché', async () => {
      AiExerciseGenerationService.generateExercises.mockRejectedValue(new Error('Service indisponible.'))

      const error = await AiExerciseGenerationPipelineService.generateExercisesFromContent({
        sourceText: 'Un texte court.',
        questionCount: 1
      }).catch((e) => e)

      expect(error).toMatchObject({
        message: 'La génération a échoué sur tous les passages du contenu fourni.',
        statusCode: 502
      })
      expect(error.usage).toBeUndefined()
    })

    describe('circuit breaker (rate limit Mistral soutenu)', () => {
      const longText5 = Array.from({ length: 5 }, (_, i) => `Paragraphe ${i} : ${'mot '.repeat(500)}`).join('\n\n')
      const rateLimitError = () =>
        Object.assign(new Error('Le service de génération IA est indisponible pour le moment.'), {
          statusCode: 502,
          rateLimited: true
        })

      it('2 chunks consécutifs en rate limit (seuil) - arrête avant les chunks restants', async () => {
        AiExerciseGenerationService.generateExercises
          .mockRejectedValueOnce(rateLimitError())
          .mockRejectedValueOnce(rateLimitError())

        await AiExerciseGenerationPipelineService.generateExercisesFromContent({
          sourceText: longText5,
          questionCount: 5
        }).catch(() => {})

        expect(AiExerciseGenerationService.generateExercises).toHaveBeenCalledTimes(2)
      })

      it('2 chunks consécutifs en rate limit, aucun succès - lève un message dédié (pas le message générique)', async () => {
        AiExerciseGenerationService.generateExercises
          .mockRejectedValueOnce(rateLimitError())
          .mockRejectedValueOnce(rateLimitError())

        const error = await AiExerciseGenerationPipelineService.generateExercisesFromContent({
          sourceText: longText5,
          questionCount: 5
        }).catch((e) => e)

        expect(error).toMatchObject({
          message: expect.stringContaining('limite de débit Mistral atteinte de façon soutenue'),
          statusCode: 502
        })
      })

      it('un succès entre deux échecs rate limit - le compteur se réinitialise, pas d\'arrêt anticipé', async () => {
        AiExerciseGenerationService.generateExercises
          .mockRejectedValueOnce(rateLimitError())
          .mockResolvedValueOnce({ questions: [FAKE_QUESTION(1)], warning: null, usage: FAKE_USAGE })
          .mockRejectedValueOnce(rateLimitError())
          .mockResolvedValueOnce({ questions: [FAKE_QUESTION(2)], warning: null, usage: FAKE_USAGE })
          .mockResolvedValueOnce({ questions: [FAKE_QUESTION(3)], warning: null, usage: FAKE_USAGE })

        const result = await AiExerciseGenerationPipelineService.generateExercisesFromContent({
          sourceText: longText5,
          questionCount: 5
        })

        expect(AiExerciseGenerationService.generateExercises).toHaveBeenCalledTimes(5)
        expect(result.questions).toHaveLength(3)
      })

      it('des succès avant l\'arrêt anticipé - retourne les questions déjà obtenues avec un warning explicite (pas d\'erreur levée)', async () => {
        AiExerciseGenerationService.generateExercises
          .mockResolvedValueOnce({ questions: [FAKE_QUESTION(1)], warning: null, usage: FAKE_USAGE })
          .mockRejectedValueOnce(rateLimitError())
          .mockRejectedValueOnce(rateLimitError())

        const result = await AiExerciseGenerationPipelineService.generateExercisesFromContent({
          sourceText: longText5,
          questionCount: 5
        })

        expect(AiExerciseGenerationService.generateExercises).toHaveBeenCalledTimes(3)
        expect(result.questions).toHaveLength(1)
        expect(result.warnings.some((w) => w.includes('console.mistral.ai'))).toBe(true)
      })
    })

    it('generateExercisesFromContent - tous les chunks échouent mais un usage réel a été facturé - l\'erreur porte l\'usage cumulé', async () => {
      const longText = Array.from({ length: 2 }, (_, i) => `Paragraphe ${i} : ${'mot '.repeat(500)}`).join('\n\n')
      AiExerciseGenerationService.generateExercises
        .mockRejectedValueOnce(
          Object.assign(new Error('non conforme'), {
            statusCode: 502,
            usage: { model: 'mistral-small-latest', promptTokens: 200, completionTokens: 100 }
          })
        )
        .mockRejectedValueOnce(new Error('Service indisponible.'))

      const error = await AiExerciseGenerationPipelineService.generateExercisesFromContent({
        sourceText: longText,
        questionCount: 2
      }).catch((e) => e)

      expect(error.statusCode).toBe(502)
      expect(error.usage).toEqual({
        model: 'mistral-small-latest',
        promptTokens: 200,
        completionTokens: 100,
        ocrPagesProcessed: 0
      })
    })

    it('generateExercisesFromContent - PDF en entrée - extrait le texte puis suit le même pipeline', async () => {
      PdfExtractionService.extractText.mockResolvedValue({ text: 'Texte extrait du PDF.', hasEmbeddedImages: false, ocrPagesProcessed: 0 })
      AiExerciseGenerationService.generateExercises.mockResolvedValue({ questions: [FAKE_QUESTION(1)], warning: null, usage: FAKE_USAGE })

      const result = await AiExerciseGenerationPipelineService.generateExercisesFromContent({
        pdfBuffer: Buffer.from('%PDF-1.4'),
        questionCount: 1
      })

      expect(result.questions).toHaveLength(1)
      expect(AiExerciseGenerationService.generateExercises).toHaveBeenCalledWith(
        expect.objectContaining({ sourceText: 'Texte extrait du PDF.' })
      )
    })

    it('generateExercisesFromContent - PDF traité via l\'OCR (repli) - ocrPagesProcessed remonté dans usage', async () => {
      PdfExtractionService.extractText.mockResolvedValue({ text: 'Texte extrait via OCR.', hasEmbeddedImages: true, ocrPagesProcessed: 5 })
      AiExerciseGenerationService.generateExercises.mockResolvedValue({ questions: [FAKE_QUESTION(1)], warning: null, usage: FAKE_USAGE })

      const result = await AiExerciseGenerationPipelineService.generateExercisesFromContent({
        pdfBuffer: Buffer.from('%PDF-1.4'),
        questionCount: 1
      })

      expect(result.usage.ocrPagesProcessed).toBe(5)
    })

    it('generateExercisesFromContent - PDF avec images/schémas détectés - ajoute un avertissement dédié', async () => {
      PdfExtractionService.extractText.mockResolvedValue({ text: 'Texte extrait du PDF.', hasEmbeddedImages: true, ocrPagesProcessed: 0 })
      AiExerciseGenerationService.generateExercises.mockResolvedValue({ questions: [FAKE_QUESTION(1)], warning: null, usage: FAKE_USAGE })

      const result = await AiExerciseGenerationPipelineService.generateExercisesFromContent({
        pdfBuffer: Buffer.from('%PDF-1.4'),
        questionCount: 1
      })

      expect(result.warnings.some((w) => w.includes('images/schémas'))).toBe(true)
    })

    it('generateExercisesFromContent - texte collé (pas de PDF) - jamais d\'avertissement images/schémas', async () => {
      AiExerciseGenerationService.generateExercises.mockResolvedValue({ questions: [FAKE_QUESTION(1)], warning: null, usage: FAKE_USAGE })

      const result = await AiExerciseGenerationPipelineService.generateExercisesFromContent({
        sourceText: 'Un texte collé.',
        questionCount: 1
      })

      expect(result.warnings.some((w) => w.includes('images/schémas'))).toBe(false)
    })

    it('generateExercisesFromContent - transmet questionType/outputLanguage/subjectContext à chaque chunk', async () => {
      AiExerciseGenerationService.generateExercises.mockResolvedValue({ questions: [FAKE_QUESTION(1)], warning: null, usage: FAKE_USAGE })

      await AiExerciseGenerationPipelineService.generateExercisesFromContent({
        sourceText: 'Un texte.',
        questionCount: 1,
        questionType: 'mcq',
        outputLanguage: 'en',
        subjectContext: 'Physique'
      })

      expect(AiExerciseGenerationService.generateExercises).toHaveBeenCalledWith(
        expect.objectContaining({ questionType: 'mcq', outputLanguage: 'en', subjectContext: 'Physique' })
      )
    })
  })
})

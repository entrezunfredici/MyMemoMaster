jest.mock('../../services/PdfExtraction.service', () => ({
  extractText: jest.fn()
}))
jest.mock('../../services/AiExerciseGeneration.service', () => ({
  generateExercises: jest.fn()
}))
jest.mock('../../services/ImageCaptioningPipeline.service', () => ({
  captionEmbeddedImages: jest.fn()
}))
jest.mock('@aws-sdk/client-s3', () => ({
  PutObjectCommand: jest.fn()
}))
jest.mock('../../config/storage.config', () => ({
  s3Client: { send: jest.fn() },
  bucket: 'test-bucket',
  publicUrl: 'https://cdn.example.com'
}))
jest.mock('../../helpers/logger', () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }))

const PdfExtractionService = require('../../services/PdfExtraction.service')
const AiExerciseGenerationService = require('../../services/AiExerciseGeneration.service')
const ImageCaptioningPipelineService = require('../../services/ImageCaptioningPipeline.service')
const AiExerciseGenerationPipelineService = require('../../services/AiExerciseGenerationPipeline.service')
const { s3Client } = require('../../config/storage.config')

const FAKE_SOURCE_IMAGE = { id: 1, pageIndex: 0, caption: 'Un schéma.', imageBase64: 'data:image/png;base64,QUJD' }

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
      expect(result).toEqual({ text: 'bonjour', hasEmbeddedImages: false, ocrPagesProcessed: 0, pageTexts: null })
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
      expect(error.rateLimited).toBeUndefined()
    })

    // C-02.09 (revue de code) : le message générique masquait "n'a pas produit un résultat
    // exploitable" (invalid_output) et le flag `rateLimited`, rendant ces deux branches de
    // AiExerciseDegradedMode.service.js#describeFailure inatteignables via la route réelle (un seul
    // chunk = le cas le plus courant). Corrigé en réutilisant le dernier échec de chunk.
    it('generateExercisesFromContent - tous les chunks échouent avec une sortie non exploitable - repropage le message précis (invalid_output)', async () => {
      AiExerciseGenerationService.generateExercises.mockRejectedValue(
        Object.assign(new Error("La génération n'a pas produit un résultat exploitable. Réessayez."), { statusCode: 502 })
      )

      const error = await AiExerciseGenerationPipelineService.generateExercisesFromContent({
        sourceText: 'Un texte court.',
        questionCount: 1
      }).catch((e) => e)

      expect(error).toMatchObject({
        message: "La génération n'a pas produit un résultat exploitable. Réessayez.",
        statusCode: 502
      })
      expect(error.rateLimited).toBeUndefined()
    })

    it('generateExercisesFromContent - un seul chunk, rate limité (sous le seuil du circuit breaker) - repropage rateLimited', async () => {
      AiExerciseGenerationService.generateExercises.mockRejectedValue(
        Object.assign(new Error('Le service de génération IA est indisponible pour le moment.'), {
          statusCode: 502,
          rateLimited: true
        })
      )

      const error = await AiExerciseGenerationPipelineService.generateExercisesFromContent({
        sourceText: 'Un texte court.',
        questionCount: 1
      }).catch((e) => e)

      expect(error).toMatchObject({ statusCode: 502, rateLimited: true })
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

    it('generateExercisesFromContent - PDF avec images/schémas, captioning échoue - ajoute l\'avertissement générique dédié', async () => {
      PdfExtractionService.extractText.mockResolvedValue({
        text: 'Texte extrait du PDF.',
        hasEmbeddedImages: true,
        ocrPagesProcessed: 0,
        pageTexts: ['Texte extrait du PDF.']
      })
      ImageCaptioningPipelineService.captionEmbeddedImages.mockRejectedValue(new Error('erreur inattendue'))
      AiExerciseGenerationService.generateExercises.mockResolvedValue({ questions: [FAKE_QUESTION(1)], warning: null, usage: FAKE_USAGE })

      const result = await AiExerciseGenerationPipelineService.generateExercisesFromContent({
        pdfBuffer: Buffer.from('%PDF-1.4'),
        questionCount: 1
      })

      expect(result.warnings.some((w) => w.includes('images/schémas'))).toBe(true)
    })

    it('generateExercisesFromContent - texte collé (pas de PDF) - jamais d\'avertissement images/schémas, jamais de captioning', async () => {
      AiExerciseGenerationService.generateExercises.mockResolvedValue({ questions: [FAKE_QUESTION(1)], warning: null, usage: FAKE_USAGE })

      const result = await AiExerciseGenerationPipelineService.generateExercisesFromContent({
        sourceText: 'Un texte collé.',
        questionCount: 1
      })

      expect(result.warnings.some((w) => w.includes('images/schémas'))).toBe(false)
      expect(ImageCaptioningPipelineService.captionEmbeddedImages).not.toHaveBeenCalled()
    })

    it('generateExercisesFromContent - captioning réussi - le texte enrichi est envoyé au modèle, usage agrégé, aucun avertissement générique', async () => {
      PdfExtractionService.extractText.mockResolvedValue({
        text: 'Texte extrait du PDF.',
        hasEmbeddedImages: true,
        ocrPagesProcessed: 1,
        pageTexts: ['Texte extrait du PDF.']
      })
      ImageCaptioningPipelineService.captionEmbeddedImages.mockResolvedValue({
        pageTexts: ['Texte extrait du PDF.\n\n[Schéma détecté sur cette page — description générée automatiquement par IA, non garantie exacte : Un schéma.]'],
        warnings: [],
        usage: { promptTokens: 200, completionTokens: 60, ocrPagesProcessed: 1 },
        captionedCount: 1
      })
      AiExerciseGenerationService.generateExercises.mockResolvedValue({ questions: [FAKE_QUESTION(1)], warning: null, usage: FAKE_USAGE })

      const result = await AiExerciseGenerationPipelineService.generateExercisesFromContent({
        pdfBuffer: Buffer.from('%PDF-1.4'),
        questionCount: 1
      })

      expect(AiExerciseGenerationService.generateExercises).toHaveBeenCalledWith(
        expect.objectContaining({ sourceText: expect.stringContaining('Un schéma.') })
      )
      expect(result.warnings.some((w) => w.includes('images/schémas'))).toBe(false)
      expect(result.usage).toEqual({
        model: 'mistral-small-latest',
        promptTokens: 300,
        completionTokens: 110,
        ocrPagesProcessed: 2
      })
    })

    it('generateExercisesFromContent - Ticket B : question avec imageRef résolu - l\'image est uploadée et attachée', async () => {
      PdfExtractionService.extractText.mockResolvedValue({
        text: 'Texte extrait du PDF.',
        hasEmbeddedImages: true,
        ocrPagesProcessed: 0,
        pageTexts: ['Texte extrait du PDF.']
      })
      ImageCaptioningPipelineService.captionEmbeddedImages.mockResolvedValue({
        pageTexts: ['Texte avec [Schéma n°1 détecté...].'],
        warnings: [],
        usage: { promptTokens: 0, completionTokens: 0, ocrPagesProcessed: 0 },
        captionedCount: 1,
        images: [FAKE_SOURCE_IMAGE]
      })
      AiExerciseGenerationService.generateExercises.mockResolvedValue({
        questions: [{ ...FAKE_QUESTION(1), imageRef: 1 }],
        warning: null,
        usage: FAKE_USAGE
      })
      s3Client.send.mockResolvedValue({})

      const result = await AiExerciseGenerationPipelineService.generateExercisesFromContent({
        pdfBuffer: Buffer.from('%PDF-1.4'),
        questionCount: 1,
        userId: 42
      })

      expect(result.questions[0]).toMatchObject({ imageMimeType: 'image/png', imageSource: 'ai' })
      expect(result.questions[0].imageKey).toMatch(/^uploads\/42\/.+\.png$/)
      expect(result.questions[0].imageUrl).toBe(`https://cdn.example.com/${result.questions[0].imageKey}`)
      expect(result.questions[0].imageRef).toBeUndefined()
      expect(s3Client.send).toHaveBeenCalledTimes(1)
    })

    it('generateExercisesFromContent - Ticket B : imageRef sans image disponible (captioning en échec) - question inchangée, imageRef retiré', async () => {
      AiExerciseGenerationService.generateExercises.mockResolvedValue({
        questions: [{ ...FAKE_QUESTION(1), imageRef: 3 }],
        warning: null,
        usage: FAKE_USAGE
      })

      const result = await AiExerciseGenerationPipelineService.generateExercisesFromContent({
        sourceText: 'Un texte sans image.',
        questionCount: 1
      })

      expect(result.questions[0].imageUrl).toBeUndefined()
      expect(result.questions[0].imageRef).toBeUndefined()
      expect(s3Client.send).not.toHaveBeenCalled()
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

  describe('uploadGeneratedImage', () => {
    it('succès - uploade sur S3 et renvoie les champs prêts pour Question.model.js', async () => {
      s3Client.send.mockResolvedValue({})

      const result = await AiExerciseGenerationPipelineService.uploadGeneratedImage(FAKE_SOURCE_IMAGE, 7)

      expect(s3Client.send).toHaveBeenCalledTimes(1)
      expect(result.imageMimeType).toBe('image/png')
      expect(result.imageSource).toBe('ai')
      expect(result.imageKey).toMatch(/^uploads\/7\/.+\.png$/)
      expect(result.imageUrl).toBe(`https://cdn.example.com/${result.imageKey}`)
      expect(result.imageOriginalName).toBe('schema-genere-ia-1.png')
      expect(result.imageSize).toBeGreaterThan(0)
    })

    it('format inattendu (pas une data URI) - retourne null sans appeler S3', async () => {
      const result = await AiExerciseGenerationPipelineService.uploadGeneratedImage(
        { id: 1, imageBase64: 'not-a-data-uri' },
        7
      )
      expect(result).toBeNull()
      expect(s3Client.send).not.toHaveBeenCalled()
    })

    it('échec S3 - retourne null (best-effort, ne lève jamais)', async () => {
      s3Client.send.mockRejectedValue(new Error('S3 indisponible'))

      const result = await AiExerciseGenerationPipelineService.uploadGeneratedImage(FAKE_SOURCE_IMAGE, 7)

      expect(result).toBeNull()
    })

    it('userId absent - retombe sur "anon" dans la clé', async () => {
      s3Client.send.mockResolvedValue({})

      const result = await AiExerciseGenerationPipelineService.uploadGeneratedImage(FAKE_SOURCE_IMAGE, null)

      expect(result.imageKey).toMatch(/^uploads\/anon\//)
    })

    // NOTE : la garde "bucket non configuré" (if (!bucket) return null, tout en haut de la méthode)
    // n'a pas de test dédié — même niveau de couverture que ClassGroupResourceService (garde `bucket`
    // équivalente, jamais testée séparément), `bucket` étant résolu une seule fois à l'import du module
    // (comme storage.config.js partout ailleurs), un test isolé nécessiterait de recharger le module
    // avec un mock différent, jugé disproportionné pour ce ticket.
  })

  describe('attachImagesToQuestions', () => {
    it('question sans imageRef - inchangée, aucun upload', async () => {
      const questions = [FAKE_QUESTION(1)]

      const { failedCount } = await AiExerciseGenerationPipelineService.attachImagesToQuestions(questions, [FAKE_SOURCE_IMAGE], 1)

      expect(failedCount).toBe(0)
      expect(s3Client.send).not.toHaveBeenCalled()
      expect(questions[0].imageUrl).toBeUndefined()
    })

    it('imageRef résolu - attache les champs image et retire imageRef', async () => {
      s3Client.send.mockResolvedValue({})
      const questions = [{ ...FAKE_QUESTION(1), imageRef: 1 }]

      const { failedCount } = await AiExerciseGenerationPipelineService.attachImagesToQuestions(questions, [FAKE_SOURCE_IMAGE], 1)

      expect(failedCount).toBe(0)
      expect(questions[0].imageSource).toBe('ai')
      expect(questions[0].imageRef).toBeUndefined()
    })

    it('imageRef référence un schéma inexistant - ignoré silencieusement, pas compté en échec', async () => {
      const questions = [{ ...FAKE_QUESTION(1), imageRef: 99 }]

      const { failedCount } = await AiExerciseGenerationPipelineService.attachImagesToQuestions(questions, [FAKE_SOURCE_IMAGE], 1)

      expect(failedCount).toBe(0)
      expect(questions[0].imageUrl).toBeUndefined()
      expect(questions[0].imageRef).toBeUndefined()
      expect(s3Client.send).not.toHaveBeenCalled()
    })

    it('deux questions référençant le même schéma - un seul upload S3, les deux sont attachées', async () => {
      s3Client.send.mockResolvedValue({})
      const questions = [{ ...FAKE_QUESTION(1), imageRef: 1 }, { ...FAKE_QUESTION(2), imageRef: 1 }]

      await AiExerciseGenerationPipelineService.attachImagesToQuestions(questions, [FAKE_SOURCE_IMAGE], 1)

      expect(s3Client.send).toHaveBeenCalledTimes(1)
      expect(questions[0].imageKey).toBe(questions[1].imageKey)
    })

    it('upload échoué - failedCount incrémenté, question laissée sans image', async () => {
      s3Client.send.mockRejectedValue(new Error('S3 indisponible'))
      const questions = [{ ...FAKE_QUESTION(1), imageRef: 1 }]

      const { failedCount } = await AiExerciseGenerationPipelineService.attachImagesToQuestions(questions, [FAKE_SOURCE_IMAGE], 1)

      expect(failedCount).toBe(1)
      expect(questions[0].imageUrl).toBeUndefined()
      expect(questions[0].imageRef).toBeUndefined()
    })
  })
})

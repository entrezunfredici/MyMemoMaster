jest.mock('../../services/PdfExtraction.service', () => ({
  extractText: jest.fn()
}))
jest.mock('../../services/AiCardGeneration.service', () => ({
  generateCards: jest.fn()
}))

const PdfExtractionService = require('../../services/PdfExtraction.service')
const AiCardGenerationService = require('../../services/AiCardGeneration.service')
const AiCardGenerationPipelineService = require('../../services/AiCardGenerationPipeline.service')

const FAKE_CARD = (n) => ({ statement: `Q${n}`, type: 'open', answer: `A${n}`, sourceExcerpt: `E${n}` })
const FAKE_USAGE = { model: 'mistral-small-latest', promptTokens: 100, completionTokens: 50 }

describe('AiCardGenerationPipelineService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('resolveSourceText', () => {
    it('resolveSourceText - texte et PDF fournis en même temps - lève une erreur 400', async () => {
      await expect(
        AiCardGenerationPipelineService.resolveSourceText({ sourceText: 'x', pdfBuffer: Buffer.from('y') })
      ).rejects.toMatchObject({ statusCode: 400 })
    })

    it('resolveSourceText - ni texte ni PDF fournis - lève une erreur 400', async () => {
      await expect(AiCardGenerationPipelineService.resolveSourceText({ sourceText: null, pdfBuffer: null })).rejects.toMatchObject({
        statusCode: 400
      })
      await expect(AiCardGenerationPipelineService.resolveSourceText({ sourceText: '   ', pdfBuffer: null })).rejects.toMatchObject({
        statusCode: 400
      })
    })

    it('resolveSourceText - texte seul - retourne le texte trimé, hasEmbeddedImages à false, sans appeler PdfExtraction', async () => {
      const result = await AiCardGenerationPipelineService.resolveSourceText({ sourceText: '  bonjour  ', pdfBuffer: null })
      expect(result).toEqual({ text: 'bonjour', hasEmbeddedImages: false, ocrPagesProcessed: 0 })
      expect(PdfExtractionService.extractText).not.toHaveBeenCalled()
    })

    it('resolveSourceText - PDF seul - délègue à PdfExtractionService.extractText et propage son résultat', async () => {
      PdfExtractionService.extractText.mockResolvedValue({ text: 'texte extrait du pdf', hasEmbeddedImages: true, ocrPagesProcessed: 3 })
      const buffer = Buffer.from('%PDF-1.4')
      const result = await AiCardGenerationPipelineService.resolveSourceText({ sourceText: null, pdfBuffer: buffer })
      expect(result).toEqual({ text: 'texte extrait du pdf', hasEmbeddedImages: true, ocrPagesProcessed: 3 })
      expect(PdfExtractionService.extractText).toHaveBeenCalledWith(buffer)
    })
  })

  describe('distributeCardCount', () => {
    it('distributeCardCount - aucun chunk - retourne un tableau vide', () => {
      expect(AiCardGenerationPipelineService.distributeCardCount(5, 0)).toEqual([])
    })

    it('distributeCardCount - plus de chunks que de cartes - 1 carte pour les N premiers, 0 ensuite', () => {
      expect(AiCardGenerationPipelineService.distributeCardCount(3, 5)).toEqual([1, 1, 1, 0, 0])
    })

    it('distributeCardCount - autant de chunks que de cartes - 1 carte par chunk', () => {
      expect(AiCardGenerationPipelineService.distributeCardCount(4, 4)).toEqual([1, 1, 1, 1])
    })

    it('distributeCardCount - moins de chunks que de cartes - répartition équilibrée avec reste sur les premiers', () => {
      const result = AiCardGenerationPipelineService.distributeCardCount(5, 2)
      expect(result).toEqual([3, 2])
      expect(result.reduce((a, b) => a + b, 0)).toBe(5)
    })
  })

  describe('generateCardsFromContent', () => {
    it('generateCardsFromContent - cardCount invalide - lève une erreur 400 avant tout traitement', async () => {
      await expect(
        AiCardGenerationPipelineService.generateCardsFromContent({ sourceText: 'x', cardCount: 0 })
      ).rejects.toMatchObject({ statusCode: 400 })
      expect(AiCardGenerationService.generateCards).not.toHaveBeenCalled()
    })

    it('generateCardsFromContent - texte tenant en un seul chunk - un seul appel LLM avec tout le cardCount', async () => {
      AiCardGenerationService.generateCards.mockResolvedValue({ cards: [FAKE_CARD(1), FAKE_CARD(2)], warning: null, usage: FAKE_USAGE })

      const result = await AiCardGenerationPipelineService.generateCardsFromContent({
        sourceText: 'Un texte court.',
        cardCount: 2,
        cardType: 'open'
      })

      expect(result.cards).toHaveLength(2)
      expect(result.warnings).toEqual([])
      expect(AiCardGenerationService.generateCards).toHaveBeenCalledTimes(1)
      expect(AiCardGenerationService.generateCards).toHaveBeenCalledWith(
        expect.objectContaining({ sourceText: 'Un texte court.', cardCount: 2 })
      )
      expect(result.usage).toEqual({ model: 'mistral-small-latest', promptTokens: 100, completionTokens: 50, ocrPagesProcessed: 0 })
    })

    it('generateCardsFromContent - texte long (plusieurs chunks) - agrège les cartes ET l\'usage de chaque chunk', async () => {
      const longText = Array.from({ length: 3 }, (_, i) => `Paragraphe ${i} : ${'mot '.repeat(500)}`).join('\n\n')
      AiCardGenerationService.generateCards
        .mockResolvedValueOnce({ cards: [FAKE_CARD(1)], warning: null, usage: { model: 'mistral-small-latest', promptTokens: 100, completionTokens: 50 } })
        .mockResolvedValueOnce({
          cards: [FAKE_CARD(2)],
          warning: 'Contenu limité sur ce passage.',
          usage: { model: 'mistral-small-latest', promptTokens: 80, completionTokens: 40 }
        })
        .mockResolvedValueOnce({ cards: [FAKE_CARD(3)], warning: null, usage: { model: 'mistral-small-latest', promptTokens: 60, completionTokens: 30 } })

      const result = await AiCardGenerationPipelineService.generateCardsFromContent({
        sourceText: longText,
        cardCount: 3
      })

      expect(AiCardGenerationService.generateCards.mock.calls.length).toBeGreaterThan(1)
      expect(result.cards.length).toBe(AiCardGenerationService.generateCards.mock.calls.length)
      expect(result.warnings.some((w) => w.includes('Contenu limité sur ce passage.'))).toBe(true)
      expect(result.usage).toEqual({
        model: 'mistral-small-latest',
        promptTokens: 240,
        completionTokens: 120,
        ocrPagesProcessed: 0
      })
    })

    it('generateCardsFromContent - un chunk échoue, les autres réussissent - agrège les succès (cartes ET usage), journalise l\'échec en warning', async () => {
      const longText = Array.from({ length: 2 }, (_, i) => `Paragraphe ${i} : ${'mot '.repeat(500)}`).join('\n\n')
      AiCardGenerationService.generateCards
        .mockRejectedValueOnce(Object.assign(new Error('Service indisponible.'), { statusCode: 502 }))
        .mockResolvedValueOnce({ cards: [FAKE_CARD(1)], warning: null, usage: FAKE_USAGE })

      const result = await AiCardGenerationPipelineService.generateCardsFromContent({
        sourceText: longText,
        cardCount: 2
      })

      expect(result.cards).toHaveLength(1)
      expect(result.warnings.some((w) => w.includes("n'a pas pu être traité"))).toBe(true)
      // Seul le chunk réussi contribue à l'usage — le chunk en échec n'a rien à agréger
      expect(result.usage).toEqual({ model: 'mistral-small-latest', promptTokens: 100, completionTokens: 50, ocrPagesProcessed: 0 })
    })

    it('generateCardsFromContent - tous les chunks échouent, sans usage réel - lève une erreur 502 sans usage attaché', async () => {
      AiCardGenerationService.generateCards.mockRejectedValue(new Error('Service indisponible.'))

      const error = await AiCardGenerationPipelineService.generateCardsFromContent({
        sourceText: 'Un texte court.',
        cardCount: 1
      }).catch((e) => e)

      expect(error).toMatchObject({
        message: 'La génération a échoué sur tous les passages du contenu fourni.',
        statusCode: 502
      })
      expect(error.usage).toBeUndefined()
    })

    // Régression constatée en prod (2026-09-04) : un compte durablement rate-limité par Mistral
    // faisait échouer chaque chunk indépendamment (chacun retentant son propre backoff en pure
    // perte) au lieu de s'arrêter — voir RATE_LIMIT_CIRCUIT_BREAKER_THRESHOLD.
    describe('circuit breaker (rate limit Mistral soutenu)', () => {
      const longText5 = Array.from({ length: 5 }, (_, i) => `Paragraphe ${i} : ${'mot '.repeat(500)}`).join('\n\n')
      const rateLimitError = () =>
        Object.assign(new Error('Le service de génération IA est indisponible pour le moment.'), {
          statusCode: 502,
          rateLimited: true
        })

      it('2 chunks consécutifs en rate limit (seuil) - arrête avant les chunks restants', async () => {
        AiCardGenerationService.generateCards
          .mockRejectedValueOnce(rateLimitError())
          .mockRejectedValueOnce(rateLimitError())

        await AiCardGenerationPipelineService.generateCardsFromContent({
          sourceText: longText5,
          cardCount: 5
        }).catch(() => {})

        // 5 chunks au total, mais seulement les 2 premiers tentés avant l'arrêt anticipé
        expect(AiCardGenerationService.generateCards).toHaveBeenCalledTimes(2)
      })

      it('2 chunks consécutifs en rate limit, aucun succès - lève un message dédié (pas le message générique)', async () => {
        AiCardGenerationService.generateCards
          .mockRejectedValueOnce(rateLimitError())
          .mockRejectedValueOnce(rateLimitError())

        const error = await AiCardGenerationPipelineService.generateCardsFromContent({
          sourceText: longText5,
          cardCount: 5
        }).catch((e) => e)

        expect(error).toMatchObject({
          message: expect.stringContaining('limite de débit Mistral atteinte de façon soutenue'),
          statusCode: 502
        })
      })

      it('un succès entre deux échecs rate limit - le compteur se réinitialise, pas d\'arrêt anticipé', async () => {
        AiCardGenerationService.generateCards
          .mockRejectedValueOnce(rateLimitError())
          .mockResolvedValueOnce({ cards: [FAKE_CARD(1)], warning: null, usage: FAKE_USAGE })
          .mockRejectedValueOnce(rateLimitError())
          .mockResolvedValueOnce({ cards: [FAKE_CARD(2)], warning: null, usage: FAKE_USAGE })
          .mockResolvedValueOnce({ cards: [FAKE_CARD(3)], warning: null, usage: FAKE_USAGE })

        const result = await AiCardGenerationPipelineService.generateCardsFromContent({
          sourceText: longText5,
          cardCount: 5
        })

        // Les 5 chunks ont été tentés — jamais 2 échecs rate limit consécutifs
        expect(AiCardGenerationService.generateCards).toHaveBeenCalledTimes(5)
        expect(result.cards).toHaveLength(3)
      })

      it('un échec non rate-limit entre deux échecs rate limit - le compteur se réinitialise aussi', async () => {
        AiCardGenerationService.generateCards
          .mockRejectedValueOnce(rateLimitError())
          .mockRejectedValueOnce(new Error('Sortie non conforme.')) // pas rateLimited
          .mockRejectedValueOnce(rateLimitError())
          .mockResolvedValueOnce({ cards: [FAKE_CARD(1)], warning: null, usage: FAKE_USAGE })
          .mockResolvedValueOnce({ cards: [FAKE_CARD(2)], warning: null, usage: FAKE_USAGE })

        const result = await AiCardGenerationPipelineService.generateCardsFromContent({
          sourceText: longText5,
          cardCount: 5
        })

        expect(AiCardGenerationService.generateCards).toHaveBeenCalledTimes(5)
        expect(result.cards).toHaveLength(2)
      })

      it('des succès avant l\'arrêt anticipé - retourne les cartes déjà obtenues avec un warning explicite (pas d\'erreur levée)', async () => {
        AiCardGenerationService.generateCards
          .mockResolvedValueOnce({ cards: [FAKE_CARD(1)], warning: null, usage: FAKE_USAGE })
          .mockRejectedValueOnce(rateLimitError())
          .mockRejectedValueOnce(rateLimitError())

        const result = await AiCardGenerationPipelineService.generateCardsFromContent({
          sourceText: longText5,
          cardCount: 5
        })

        expect(AiCardGenerationService.generateCards).toHaveBeenCalledTimes(3)
        expect(result.cards).toHaveLength(1)
        expect(result.warnings.some((w) => w.includes('console.mistral.ai'))).toBe(true)
      })
    })

    it('generateCardsFromContent - tous les chunks échouent mais un usage réel a été facturé - l\'erreur porte l\'usage cumulé (C-01.06)', async () => {
      const longText = Array.from({ length: 2 }, (_, i) => `Paragraphe ${i} : ${'mot '.repeat(500)}`).join('\n\n')
      AiCardGenerationService.generateCards
        .mockRejectedValueOnce(
          Object.assign(new Error('non conforme'), {
            statusCode: 502,
            usage: { model: 'mistral-small-latest', promptTokens: 200, completionTokens: 100 }
          })
        )
        .mockRejectedValueOnce(new Error('Service indisponible.')) // aucun usage : rien de facturé pour ce chunk

      const error = await AiCardGenerationPipelineService.generateCardsFromContent({
        sourceText: longText,
        cardCount: 2
      }).catch((e) => e)

      expect(error.statusCode).toBe(502)
      expect(error.usage).toEqual({
        model: 'mistral-small-latest',
        promptTokens: 200,
        completionTokens: 100,
        ocrPagesProcessed: 0
      })
    })

    it('generateCardsFromContent - un chunk échoue avec un usage réel, un autre réussit - l\'usage des deux est agrégé', async () => {
      const longText = Array.from({ length: 2 }, (_, i) => `Paragraphe ${i} : ${'mot '.repeat(500)}`).join('\n\n')
      AiCardGenerationService.generateCards
        .mockRejectedValueOnce(
          Object.assign(new Error('non conforme'), {
            statusCode: 502,
            usage: { model: 'mistral-small-latest', promptTokens: 200, completionTokens: 100 }
          })
        )
        .mockResolvedValueOnce({ cards: [FAKE_CARD(1)], warning: null, usage: FAKE_USAGE })

      const result = await AiCardGenerationPipelineService.generateCardsFromContent({
        sourceText: longText,
        cardCount: 2
      })

      expect(result.cards).toHaveLength(1)
      // Usage du chunk en échec (200/100) + usage du chunk réussi (100/50, FAKE_USAGE)
      expect(result.usage).toEqual({
        model: 'mistral-small-latest',
        promptTokens: 300,
        completionTokens: 150,
        ocrPagesProcessed: 0
      })
    })

    it('generateCardsFromContent - PDF en entrée - extrait le texte puis suit le même pipeline', async () => {
      PdfExtractionService.extractText.mockResolvedValue({ text: 'Texte extrait du PDF.', hasEmbeddedImages: false, ocrPagesProcessed: 0 })
      AiCardGenerationService.generateCards.mockResolvedValue({ cards: [FAKE_CARD(1)], warning: null, usage: FAKE_USAGE })

      const result = await AiCardGenerationPipelineService.generateCardsFromContent({
        pdfBuffer: Buffer.from('%PDF-1.4'),
        cardCount: 1
      })

      expect(result.cards).toHaveLength(1)
      expect(AiCardGenerationService.generateCards).toHaveBeenCalledWith(
        expect.objectContaining({ sourceText: 'Texte extrait du PDF.' })
      )
    })

    it('generateCardsFromContent - PDF traité via l\'OCR (repli) - ocrPagesProcessed remonté dans usage', async () => {
      PdfExtractionService.extractText.mockResolvedValue({ text: 'Texte extrait via OCR.', hasEmbeddedImages: true, ocrPagesProcessed: 5 })
      AiCardGenerationService.generateCards.mockResolvedValue({ cards: [FAKE_CARD(1)], warning: null, usage: FAKE_USAGE })

      const result = await AiCardGenerationPipelineService.generateCardsFromContent({
        pdfBuffer: Buffer.from('%PDF-1.4'),
        cardCount: 1
      })

      expect(result.usage.ocrPagesProcessed).toBe(5)
    })

    it('generateCardsFromContent - PDF avec images/schémas détectés - ajoute un avertissement dédié', async () => {
      PdfExtractionService.extractText.mockResolvedValue({ text: 'Texte extrait du PDF.', hasEmbeddedImages: true, ocrPagesProcessed: 0 })
      AiCardGenerationService.generateCards.mockResolvedValue({ cards: [FAKE_CARD(1)], warning: null, usage: FAKE_USAGE })

      const result = await AiCardGenerationPipelineService.generateCardsFromContent({
        pdfBuffer: Buffer.from('%PDF-1.4'),
        cardCount: 1
      })

      expect(result.warnings.some((w) => w.includes('images/schémas'))).toBe(true)
    })

    it('generateCardsFromContent - texte collé (pas de PDF) - jamais d\'avertissement images/schémas', async () => {
      AiCardGenerationService.generateCards.mockResolvedValue({ cards: [FAKE_CARD(1)], warning: null, usage: FAKE_USAGE })

      const result = await AiCardGenerationPipelineService.generateCardsFromContent({
        sourceText: 'Un texte collé.',
        cardCount: 1
      })

      expect(result.warnings.some((w) => w.includes('images/schémas'))).toBe(false)
    })
  })
})

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
      expect(result).toEqual({ text: 'bonjour', hasEmbeddedImages: false })
      expect(PdfExtractionService.extractText).not.toHaveBeenCalled()
    })

    it('resolveSourceText - PDF seul - délègue à PdfExtractionService.extractText et propage son résultat', async () => {
      PdfExtractionService.extractText.mockResolvedValue({ text: 'texte extrait du pdf', hasEmbeddedImages: true })
      const buffer = Buffer.from('%PDF-1.4')
      const result = await AiCardGenerationPipelineService.resolveSourceText({ sourceText: null, pdfBuffer: buffer })
      expect(result).toEqual({ text: 'texte extrait du pdf', hasEmbeddedImages: true })
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
      AiCardGenerationService.generateCards.mockResolvedValue({ cards: [FAKE_CARD(1), FAKE_CARD(2)], warning: null })

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
    })

    it('generateCardsFromContent - texte long (plusieurs chunks) - agrège les cartes de chaque chunk', async () => {
      const longText = Array.from({ length: 3 }, (_, i) => `Paragraphe ${i} : ${'mot '.repeat(500)}`).join('\n\n')
      AiCardGenerationService.generateCards
        .mockResolvedValueOnce({ cards: [FAKE_CARD(1)], warning: null })
        .mockResolvedValueOnce({ cards: [FAKE_CARD(2)], warning: 'Contenu limité sur ce passage.' })
        .mockResolvedValueOnce({ cards: [FAKE_CARD(3)], warning: null })

      const result = await AiCardGenerationPipelineService.generateCardsFromContent({
        sourceText: longText,
        cardCount: 3
      })

      expect(AiCardGenerationService.generateCards.mock.calls.length).toBeGreaterThan(1)
      expect(result.cards.length).toBe(AiCardGenerationService.generateCards.mock.calls.length)
      expect(result.warnings.some((w) => w.includes('Contenu limité sur ce passage.'))).toBe(true)
    })

    it('generateCardsFromContent - un chunk échoue, les autres réussissent - agrège les succès, journalise l\'échec en warning', async () => {
      const longText = Array.from({ length: 2 }, (_, i) => `Paragraphe ${i} : ${'mot '.repeat(500)}`).join('\n\n')
      AiCardGenerationService.generateCards
        .mockRejectedValueOnce(Object.assign(new Error('Service indisponible.'), { statusCode: 502 }))
        .mockResolvedValueOnce({ cards: [FAKE_CARD(1)], warning: null })

      const result = await AiCardGenerationPipelineService.generateCardsFromContent({
        sourceText: longText,
        cardCount: 2
      })

      expect(result.cards).toHaveLength(1)
      expect(result.warnings.some((w) => w.includes("n'a pas pu être traité"))).toBe(true)
    })

    it('generateCardsFromContent - tous les chunks échouent - lève une erreur 502', async () => {
      AiCardGenerationService.generateCards.mockRejectedValue(new Error('Service indisponible.'))

      await expect(
        AiCardGenerationPipelineService.generateCardsFromContent({ sourceText: 'Un texte court.', cardCount: 1 })
      ).rejects.toMatchObject({
        message: 'La génération a échoué sur tous les passages du contenu fourni.',
        statusCode: 502
      })
    })

    it('generateCardsFromContent - PDF en entrée - extrait le texte puis suit le même pipeline', async () => {
      PdfExtractionService.extractText.mockResolvedValue({ text: 'Texte extrait du PDF.', hasEmbeddedImages: false })
      AiCardGenerationService.generateCards.mockResolvedValue({ cards: [FAKE_CARD(1)], warning: null })

      const result = await AiCardGenerationPipelineService.generateCardsFromContent({
        pdfBuffer: Buffer.from('%PDF-1.4'),
        cardCount: 1
      })

      expect(result.cards).toHaveLength(1)
      expect(AiCardGenerationService.generateCards).toHaveBeenCalledWith(
        expect.objectContaining({ sourceText: 'Texte extrait du PDF.' })
      )
    })

    it('generateCardsFromContent - PDF avec images/schémas détectés - ajoute un avertissement dédié', async () => {
      PdfExtractionService.extractText.mockResolvedValue({ text: 'Texte extrait du PDF.', hasEmbeddedImages: true })
      AiCardGenerationService.generateCards.mockResolvedValue({ cards: [FAKE_CARD(1)], warning: null })

      const result = await AiCardGenerationPipelineService.generateCardsFromContent({
        pdfBuffer: Buffer.from('%PDF-1.4'),
        cardCount: 1
      })

      expect(result.warnings.some((w) => w.includes('images/schémas'))).toBe(true)
    })

    it('generateCardsFromContent - texte collé (pas de PDF) - jamais d\'avertissement images/schémas', async () => {
      AiCardGenerationService.generateCards.mockResolvedValue({ cards: [FAKE_CARD(1)], warning: null })

      const result = await AiCardGenerationPipelineService.generateCardsFromContent({
        sourceText: 'Un texte collé.',
        cardCount: 1
      })

      expect(result.warnings.some((w) => w.includes('images/schémas'))).toBe(false)
    })
  })
})

jest.mock('../../services/PdfExtraction.service', () => ({
  extractImages: jest.fn()
}))
jest.mock('../../services/ImageCaptioning.service', () => ({
  captionImage: jest.fn()
}))

const PdfExtractionService = require('../../services/PdfExtraction.service')
const ImageCaptioningService = require('../../services/ImageCaptioning.service')
const ImageCaptioningPipelineService = require('../../services/ImageCaptioningPipeline.service')

const FAKE_PDF = Buffer.from('%PDF-1.4')
const FAKE_USAGE = { model: 'mistral-small-latest', promptTokens: 200, completionTokens: 60 }

describe('ImageCaptioningPipelineService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('insertCaption', () => {
    it('insertCaption - page vide - la description devient le seul contenu de la page, marquée explicitement', () => {
      const result = ImageCaptioningPipelineService.insertCaption('', 'Un schéma de chloroplaste.')
      expect(result).toContain('générée automatiquement par IA')
      expect(result).toContain('Un schéma de chloroplaste.')
    })

    it('insertCaption - page avec du texte existant - ajoute la description comme paragraphe séparé (double saut de ligne)', () => {
      const result = ImageCaptioningPipelineService.insertCaption('Texte de la page.', 'Un schéma.')
      expect(result.startsWith('Texte de la page.\n\n[Schéma détecté')).toBe(true)
    })
  })

  describe('captionEmbeddedImages', () => {
    it('captionEmbeddedImages - récupération des images échoue - dégrade en warning, ne lève jamais, pageTexts inchangé', async () => {
      PdfExtractionService.extractImages.mockRejectedValue(Object.assign(new Error('indisponible'), { statusCode: 502 }))

      const result = await ImageCaptioningPipelineService.captionEmbeddedImages({
        pdfBuffer: FAKE_PDF,
        pageTexts: ['Page 1', 'Page 2']
      })

      expect(result.pageTexts).toEqual(['Page 1', 'Page 2'])
      expect(result.captionedCount).toBe(0)
      expect(result.warnings).toEqual([expect.stringContaining('images/schémas')])
      expect(ImageCaptioningService.captionImage).not.toHaveBeenCalled()
    })

    it('captionEmbeddedImages - aucune image trouvée malgré la détection - aucun warning, aucun appel de captioning', async () => {
      PdfExtractionService.extractImages.mockResolvedValue({ images: [], ocrPagesProcessed: 2 })

      const result = await ImageCaptioningPipelineService.captionEmbeddedImages({
        pdfBuffer: FAKE_PDF,
        pageTexts: ['Page 1']
      })

      expect(result.warnings).toEqual([])
      expect(result.captionedCount).toBe(0)
      expect(result.usage.ocrPagesProcessed).toBe(2)
      expect(ImageCaptioningService.captionImage).not.toHaveBeenCalled()
    })

    it('captionEmbeddedImages - image pédagogique - insère la description sur la bonne page, agrège l\'usage', async () => {
      PdfExtractionService.extractImages.mockResolvedValue({
        images: [{ pageIndex: 1, imageBase64: 'data:image/jpeg;base64,QUJD' }],
        ocrPagesProcessed: 2
      })
      ImageCaptioningService.captionImage.mockResolvedValue({
        isPedagogicalContent: true,
        caption: 'Un schéma de chloroplaste.',
        warning: null,
        usage: FAKE_USAGE
      })

      const result = await ImageCaptioningPipelineService.captionEmbeddedImages({
        pdfBuffer: FAKE_PDF,
        pageTexts: ['Page 1', 'Page 2'],
        subjectContext: 'SVT',
        outputLanguage: 'fr'
      })

      expect(result.pageTexts[0]).toBe('Page 1')
      expect(result.pageTexts[1]).toContain('Page 2')
      expect(result.pageTexts[1]).toContain('Un schéma de chloroplaste.')
      expect(result.captionedCount).toBe(1)
      expect(result.warnings).toEqual([])
      expect(result.usage).toEqual({ promptTokens: 200, completionTokens: 60, ocrPagesProcessed: 2 })
      expect(ImageCaptioningService.captionImage).toHaveBeenCalledWith(
        expect.objectContaining({
          imageBase64: 'data:image/jpeg;base64,QUJD',
          pageContext: 'Page 2',
          subjectContext: 'SVT',
          outputLanguage: 'fr'
        })
      )
    })

    it('captionEmbeddedImages - pageTexts null/vide (aucun texte de page connu) - l\'image devient le seul contenu de sa page', async () => {
      PdfExtractionService.extractImages.mockResolvedValue({
        images: [{ pageIndex: 0, imageBase64: 'data:image/jpeg;base64,QUJD' }],
        ocrPagesProcessed: 0
      })
      ImageCaptioningService.captionImage.mockResolvedValue({
        isPedagogicalContent: true,
        caption: 'Une description.',
        warning: null,
        usage: { promptTokens: 10, completionTokens: 5 }
      })

      const result = await ImageCaptioningPipelineService.captionEmbeddedImages({ pdfBuffer: FAKE_PDF, pageTexts: null })

      expect(result.pageTexts[0]).toContain('Une description.')
    })

    it('captionEmbeddedImages - image décorative (isPedagogicalContent: false) - filtrée silencieusement, aucun warning', async () => {
      PdfExtractionService.extractImages.mockResolvedValue({
        images: [{ pageIndex: 0, imageBase64: 'data:image/jpeg;base64,QUJD' }],
        ocrPagesProcessed: 0
      })
      ImageCaptioningService.captionImage.mockResolvedValue({
        isPedagogicalContent: false,
        caption: null,
        warning: null,
        usage: { promptTokens: 10, completionTokens: 5 }
      })

      const result = await ImageCaptioningPipelineService.captionEmbeddedImages({ pdfBuffer: FAKE_PDF, pageTexts: ['Page 1'] })

      expect(result.pageTexts).toEqual(['Page 1'])
      expect(result.captionedCount).toBe(0)
      expect(result.warnings).toEqual([])
    })

    it('captionEmbeddedImages - le captioning d\'une image échoue, les autres réussissent - warning proportionné, images réussies conservées', async () => {
      PdfExtractionService.extractImages.mockResolvedValue({
        images: [
          { pageIndex: 0, imageBase64: 'data:image/jpeg;base64,AAA' },
          { pageIndex: 1, imageBase64: 'data:image/jpeg;base64,BBB' }
        ],
        ocrPagesProcessed: 0
      })
      ImageCaptioningService.captionImage
        .mockRejectedValueOnce(Object.assign(new Error('indisponible'), { statusCode: 502 }))
        .mockResolvedValueOnce({
          isPedagogicalContent: true,
          caption: 'Un schéma.',
          warning: null,
          usage: { promptTokens: 10, completionTokens: 5 }
        })

      const result = await ImageCaptioningPipelineService.captionEmbeddedImages({
        pdfBuffer: FAKE_PDF,
        pageTexts: ['Page 1', 'Page 2']
      })

      expect(result.captionedCount).toBe(1)
      expect(result.warnings).toEqual([expect.stringContaining('1 image')])
      expect(result.pageTexts[1]).toContain('Un schéma.')
    })

    it('captionEmbeddedImages - toutes les images échouent - warning dédié "aucune n\'a pu être analysée"', async () => {
      PdfExtractionService.extractImages.mockResolvedValue({
        images: [{ pageIndex: 0, imageBase64: 'data:image/jpeg;base64,AAA' }],
        ocrPagesProcessed: 0
      })
      ImageCaptioningService.captionImage.mockRejectedValue(Object.assign(new Error('indisponible'), { statusCode: 502 }))

      const result = await ImageCaptioningPipelineService.captionEmbeddedImages({
        pdfBuffer: FAKE_PDF,
        pageTexts: ['Page 1']
      })

      expect(result.captionedCount).toBe(0)
      expect(result.warnings).toEqual([expect.stringContaining("Aucune des images/schémas")])
    })

    it('captionEmbeddedImages - un échec avec usage réel facturé - l\'usage n\'est pas perdu (C-01.06)', async () => {
      PdfExtractionService.extractImages.mockResolvedValue({
        images: [{ pageIndex: 0, imageBase64: 'data:image/jpeg;base64,AAA' }],
        ocrPagesProcessed: 0
      })
      ImageCaptioningService.captionImage.mockRejectedValue(
        Object.assign(new Error('non conforme'), {
          statusCode: 502,
          usage: { model: 'mistral-small-latest', promptTokens: 300, completionTokens: 100 }
        })
      )

      const result = await ImageCaptioningPipelineService.captionEmbeddedImages({
        pdfBuffer: FAKE_PDF,
        pageTexts: ['Page 1']
      })

      expect(result.usage).toEqual({ promptTokens: 300, completionTokens: 100, ocrPagesProcessed: 0 })
    })

    it('captionEmbeddedImages - plus d\'images que le plafond - tronque et avertit, ne captionne que les premières', async () => {
      const images = Array.from({ length: 7 }, (_, i) => ({ pageIndex: 0, imageBase64: `data:image/jpeg;base64,IMG${i}` }))
      PdfExtractionService.extractImages.mockResolvedValue({ images, ocrPagesProcessed: 0 })
      ImageCaptioningService.captionImage.mockResolvedValue({
        isPedagogicalContent: true,
        caption: 'Une description.',
        warning: null,
        usage: { promptTokens: 10, completionTokens: 5 }
      })

      const result = await ImageCaptioningPipelineService.captionEmbeddedImages({
        pdfBuffer: FAKE_PDF,
        pageTexts: ['Page 1']
      })

      // Plafond MAX_CAPTIONED_IMAGES_PER_GENERATION = 5 (voir le service) — 7 détectées, 5 captionnées
      expect(ImageCaptioningService.captionImage).toHaveBeenCalledTimes(5)
      expect(result.warnings).toEqual([expect.stringContaining('7 images/schémas détectés')])
    })

    it('captionEmbeddedImages - pageTexts fourni n\'est jamais muté en place', async () => {
      const originalPageTexts = ['Page 1']
      PdfExtractionService.extractImages.mockResolvedValue({
        images: [{ pageIndex: 0, imageBase64: 'data:image/jpeg;base64,AAA' }],
        ocrPagesProcessed: 0
      })
      ImageCaptioningService.captionImage.mockResolvedValue({
        isPedagogicalContent: true,
        caption: 'Une description.',
        warning: null,
        usage: { promptTokens: 10, completionTokens: 5 }
      })

      await ImageCaptioningPipelineService.captionEmbeddedImages({ pdfBuffer: FAKE_PDF, pageTexts: originalPageTexts })

      expect(originalPageTexts).toEqual(['Page 1'])
    })
  })
})

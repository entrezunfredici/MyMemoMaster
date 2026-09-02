const PdfExtractionService = require('../../services/PdfExtraction.service')

// STRATÉGIE DE TEST (DoD : "stratégie de test documentée" quand la couverture automatisée
// complète n'est pas praticable) — pdfjs-dist ≥ 6 ne publie son build Node ("legacy") qu'en ESM
// (`legacy/build/pdf.mjs`) ; `getPdfjs()` le charge via `import()` dynamique (cf. commentaire du
// service). Jest, dans la configuration par défaut de ce projet (pas de `--experimental-vm-
// modules`), lève `ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG` sur tout `import()` réel — constaté
// à l'exécution. Ajouter ce flag est un changement d'infrastructure de test global (affecterait
// TOUTE la suite Jest, pas seulement ce service) — hors périmètre de ce ticket, non fait
// unilatéralement (voir DECISIONS.md, C-01.05).
//
// En conséquence : toutes les branches de logique (échec d'ouverture, absence de texte, plusieurs
// pages, détection d'images, filtrage des items sans "str") sont couvertes ici en mockant
// `getPdfjs()` — la méthode PUBLIQUE qui isole l'`import()`, jamais l'`import()` lui-même. Le
// chemin réel (vrai `import()`, vrai pdfjs-dist, vrai PDF, et vrai appel OCR Mistral) a été vérifié
// manuellement hors Jest (scripts ponctuels, scratchpad de session) sur des PDF de
// `docs/sources/` : extraction pdfjs-dist réussie, détection d'images correcte, appel OCR réel
// réussi (format de requête/réponse conforme à la doc Mistral) — résultats consignés dans
// CHANGELOG_AGENT.md (2026-09-01, C-01.05).

// Codes d'opérateur factices (les vraies valeurs de pdfjs-dist.OPS n'ont pas d'importance ici, seul
// leur usage comme clés d'un Set compte).
const FAKE_OPS = { paintImageXObject: 1, paintJpegXObject: 2, paintImageMaskXObject: 3, paintInlineImageXObject: 4 }

const makeFakePage = (items, fnArray = []) => ({
  getTextContent: async () => ({ items }),
  getOperatorList: async () => ({ fnArray })
})

const mockPdfjs = (pdfDocument) => {
  jest.spyOn(PdfExtractionService, 'getPdfjs').mockResolvedValue({
    getDocument: () => ({ promise: Promise.resolve(pdfDocument) }),
    OPS: FAKE_OPS
  })
}

const mockOcrFetchResponse = (pages, usageInfo) => ({
  ok: true,
  status: 200,
  json: async () => ({ pages, ...(usageInfo ? { usage_info: usageInfo } : {}) })
})

describe('PdfExtractionService', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    delete process.env.MISTRAL_API_KEY
  })

  describe('extractTextViaPdfjs', () => {
    it('extractTextViaPdfjs - pdfjs-dist échoue à ouvrir le document - lève "illisible ou corrompu" (400)', async () => {
      jest.spyOn(PdfExtractionService, 'getPdfjs').mockResolvedValue({
        getDocument: () => ({ promise: Promise.reject(new Error('bad xref')) }),
        OPS: FAKE_OPS
      })

      await expect(PdfExtractionService.extractTextViaPdfjs(Buffer.from('%PDF-garbage'))).rejects.toMatchObject({
        message: 'Le fichier PDF est illisible ou corrompu.',
        statusCode: 400
      })
    })

    it('extractTextViaPdfjs - aucun texte extractible (PDF scanné sans couche texte) - lève une erreur 422', async () => {
      mockPdfjs({ numPages: 1, getPage: async () => makeFakePage([]) })

      await expect(PdfExtractionService.extractTextViaPdfjs(Buffer.from('%PDF-1.4'))).rejects.toMatchObject({
        message: "Aucun texte n'a pu être extrait de ce PDF (probablement un scan sans texte intégré).",
        statusCode: 422
      })
    })

    it('extractTextViaPdfjs - plusieurs pages avec texte - concatène dans l\'ordre, respecte hasEOL', async () => {
      mockPdfjs({
        numPages: 2,
        getPage: async (n) =>
          n === 1
            ? makeFakePage([{ str: 'Ligne 1', hasEOL: true }, { str: 'Ligne 2', hasEOL: false }])
            : makeFakePage([{ str: 'Page 2', hasEOL: false }])
      })

      const result = await PdfExtractionService.extractTextViaPdfjs(Buffer.from('%PDF-1.4'))
      expect(result.text).toBe('Ligne 1\nLigne 2\n\nPage 2')
      expect(result.hasEmbeddedImages).toBe(false)
      // Gratuit : jamais de page facturée sur ce chemin (voir AiQuota.service.js, C-01.06)
      expect(result.ocrPagesProcessed).toBe(0)
    })

    it('extractTextViaPdfjs - items sans champ "str" (marqueurs de positionnement) - ignorés', async () => {
      mockPdfjs({
        numPages: 1,
        getPage: async () => makeFakePage([{ dir: 'ltr' }, { str: 'Texte réel', hasEOL: false }])
      })

      const result = await PdfExtractionService.extractTextViaPdfjs(Buffer.from('%PDF-1.4'))
      expect(result.text).toBe('Texte réel')
    })

    it('extractTextViaPdfjs - une page peint une image - hasEmbeddedImages à true', async () => {
      mockPdfjs({
        numPages: 1,
        getPage: async () => makeFakePage([{ str: 'Texte', hasEOL: false }], [FAKE_OPS.paintJpegXObject])
      })

      const result = await PdfExtractionService.extractTextViaPdfjs(Buffer.from('%PDF-1.4'))
      expect(result.hasEmbeddedImages).toBe(true)
    })

    it('extractTextViaPdfjs - aucune page ne peint d\'image - hasEmbeddedImages à false', async () => {
      mockPdfjs({
        numPages: 1,
        getPage: async () => makeFakePage([{ str: 'Texte', hasEOL: false }], [999])
      })

      const result = await PdfExtractionService.extractTextViaPdfjs(Buffer.from('%PDF-1.4'))
      expect(result.hasEmbeddedImages).toBe(false)
    })
  })

  describe('extractTextViaOcr', () => {
    it('extractTextViaOcr - clé API absente - lève une erreur 500', async () => {
      await expect(PdfExtractionService.extractTextViaOcr(Buffer.from('%PDF-1.4'))).rejects.toMatchObject({
        message: 'Extraction OCR impossible : service IA non configuré (clé API manquante).',
        statusCode: 500
      })
    })

    it('extractTextViaOcr - appel réussi - concatène le markdown des pages, détecte les images, remonte usage_info.pages_processed', async () => {
      process.env.MISTRAL_API_KEY = 'test-key'
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(
          mockOcrFetchResponse(
            [
              { markdown: 'Page 1', images: [] },
              { markdown: 'Page 2', images: [{ id: 'img-0' }] }
            ],
            { pages_processed: 2 }
          )
        )

      const result = await PdfExtractionService.extractTextViaOcr(Buffer.from('%PDF-1.4'))

      expect(result).toEqual({ text: 'Page 1\n\nPage 2', hasEmbeddedImages: true, ocrPagesProcessed: 2 })
      const [url, options] = fetchMock.mock.calls[0]
      expect(url).toBe('https://api.mistral.ai/v1/ocr')
      const body = JSON.parse(options.body)
      expect(body.model).toBe('mistral-ocr-latest')
      expect(body.document.type).toBe('document_url')
      expect(body.document.document_url).toMatch(/^data:application\/pdf;base64,/)
    })

    it('extractTextViaOcr - usage_info absent de la réponse - retombe sur le nombre de pages retournées', async () => {
      process.env.MISTRAL_API_KEY = 'test-key'
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(mockOcrFetchResponse([{ markdown: 'Page 1', images: [] }, { markdown: 'Page 2', images: [] }]))

      const result = await PdfExtractionService.extractTextViaOcr(Buffer.from('%PDF-1.4'))
      expect(result.ocrPagesProcessed).toBe(2)
    })

    it('extractTextViaOcr - réponse HTTP en erreur - lève une erreur 502', async () => {
      process.env.MISTRAL_API_KEY = 'test-key'
      jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 500, text: async () => 'internal error' })

      await expect(PdfExtractionService.extractTextViaOcr(Buffer.from('%PDF-1.4'))).rejects.toMatchObject({
        message: "Le service d'OCR est indisponible pour le moment.",
        statusCode: 502
      })
    })

    it('extractTextViaOcr - erreur réseau - lève une erreur 502', async () => {
      process.env.MISTRAL_API_KEY = 'test-key'
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'))

      await expect(PdfExtractionService.extractTextViaOcr(Buffer.from('%PDF-1.4'))).rejects.toMatchObject({
        statusCode: 502
      })
    })

    it('extractTextViaOcr - aucune page ou markdown vide - lève une erreur 422, sans usage (0 page traitée)', async () => {
      process.env.MISTRAL_API_KEY = 'test-key'
      jest.spyOn(global, 'fetch').mockResolvedValue(mockOcrFetchResponse([]))

      const error = await PdfExtractionService.extractTextViaOcr(Buffer.from('%PDF-1.4')).catch((e) => e)
      expect(error).toMatchObject({ message: "L'OCR n'a extrait aucun texte de ce PDF.", statusCode: 422 })
      expect(error.usage).toBeUndefined()
    })

    it('extractTextViaOcr - pages réellement traitées mais markdown vide - lève une erreur 422 avec l\'usage réel attaché (C-01.06)', async () => {
      process.env.MISTRAL_API_KEY = 'test-key'
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(mockOcrFetchResponse([{ markdown: '', images: [] }], { pages_processed: 3 }))

      const error = await PdfExtractionService.extractTextViaOcr(Buffer.from('%PDF-1.4')).catch((e) => e)
      expect(error).toMatchObject({ message: "L'OCR n'a extrait aucun texte de ce PDF.", statusCode: 422 })
      expect(error.usage).toEqual({ ocrPagesProcessed: 3 })
    })
  })

  describe('extractText (orchestration)', () => {
    it('extractText - buffer absent/vide/non-Buffer - lève une erreur 400 sans appeler pdfjs-dist ni l\'OCR', async () => {
      const pdfjsSpy = jest.spyOn(PdfExtractionService, 'extractTextViaPdfjs')
      const ocrSpy = jest.spyOn(PdfExtractionService, 'extractTextViaOcr')

      await expect(PdfExtractionService.extractText(undefined)).rejects.toMatchObject({ statusCode: 400 })
      await expect(PdfExtractionService.extractText(Buffer.alloc(0))).rejects.toMatchObject({ statusCode: 400 })
      await expect(PdfExtractionService.extractText('pas un buffer')).rejects.toMatchObject({ statusCode: 400 })

      expect(pdfjsSpy).not.toHaveBeenCalled()
      expect(ocrSpy).not.toHaveBeenCalled()
    })

    it('extractText - pdfjs-dist réussit - retourne son résultat sans appeler l\'OCR', async () => {
      jest
        .spyOn(PdfExtractionService, 'extractTextViaPdfjs')
        .mockResolvedValue({ text: 'ok', hasEmbeddedImages: false, ocrPagesProcessed: 0 })
      const ocrSpy = jest.spyOn(PdfExtractionService, 'extractTextViaOcr')

      const result = await PdfExtractionService.extractText(Buffer.from('%PDF-1.4'))

      expect(result).toEqual({ text: 'ok', hasEmbeddedImages: false, ocrPagesProcessed: 0 })
      expect(ocrSpy).not.toHaveBeenCalled()
    })

    it('extractText - pdfjs-dist échoue en 400 (corrompu) - propage l\'erreur sans tenter l\'OCR', async () => {
      jest
        .spyOn(PdfExtractionService, 'extractTextViaPdfjs')
        .mockRejectedValue(Object.assign(new Error('Le fichier PDF est illisible ou corrompu.'), { statusCode: 400 }))
      const ocrSpy = jest.spyOn(PdfExtractionService, 'extractTextViaOcr')

      await expect(PdfExtractionService.extractText(Buffer.from('%PDF-1.4'))).rejects.toMatchObject({ statusCode: 400 })
      expect(ocrSpy).not.toHaveBeenCalled()
    })

    it('extractText - pdfjs-dist échoue en 422 (aucun texte, PDF scanné) - retente via l\'OCR et retourne son résultat', async () => {
      jest
        .spyOn(PdfExtractionService, 'extractTextViaPdfjs')
        .mockRejectedValue(Object.assign(new Error('aucun texte'), { statusCode: 422 }))
      jest
        .spyOn(PdfExtractionService, 'extractTextViaOcr')
        .mockResolvedValue({ text: 'texte via OCR', hasEmbeddedImages: true, ocrPagesProcessed: 3 })

      const result = await PdfExtractionService.extractText(Buffer.from('%PDF-1.4'))

      expect(result).toEqual({ text: 'texte via OCR', hasEmbeddedImages: true, ocrPagesProcessed: 3 })
    })

    it('extractText - pdfjs-dist échoue en 422 puis l\'OCR échoue aussi - propage l\'erreur de l\'OCR', async () => {
      jest
        .spyOn(PdfExtractionService, 'extractTextViaPdfjs')
        .mockRejectedValue(Object.assign(new Error('aucun texte'), { statusCode: 422 }))
      jest
        .spyOn(PdfExtractionService, 'extractTextViaOcr')
        .mockRejectedValue(Object.assign(new Error("Le service d'OCR est indisponible pour le moment."), { statusCode: 502 }))

      await expect(PdfExtractionService.extractText(Buffer.from('%PDF-1.4'))).rejects.toMatchObject({
        message: "Le service d'OCR est indisponible pour le moment.",
        statusCode: 502
      })
    })
  })
})

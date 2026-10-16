const path = require('path')
const logger = require('../helpers/logger')
const getMistralConfig = require('../helpers/mistralConfig')

// CHOIX: build "legacy" de pdfjs-dist, importé via import() dynamique plutôt que require() —
// RAISON (constatée à l'exécution, 2026-09-01) : l'export principal du package vise le navigateur
// et échoue en Node ("Please use the legacy build in Node.js environments.", puis une erreur de
// validation d'URL sur les chemins CMap/polices, des chemins filesystem classiques n'étant pas des
// URL valides pour ce build) ; le build legacy corrige ce point mais n'est plus publié qu'en ESM
// (`legacy/build/pdf.mjs`, aucun fichier `.js` CommonJS) dans cette version — un module CommonJS
// (ce projet) charge un module ESM via `import()` dynamique, pas `require()`.

// Périmètre C-01.05 (« Pipeline traitement — PDF, chunking, LLM ») : extraction de texte brut
// depuis un PDF déjà uploadé (Buffer) — pas de découpage (voir helpers/textChunker.js) ni d'appel
// LLM de génération (voir services/AiCardGeneration.service.js), orchestrés séparément par
// services/AiCardGenerationPipeline.service.js.
//
// CHOIX : pdfjs-dist (Apache-2.0, zéro dépendance runtime déclarée) comme chemin PAR DÉFAUT
// (gratuit, local, sans appel réseau) plutôt que pdf-parse (dont la v2.x embarque désormais
// @napi-rs/canvas, un binaire natif) ou unpdf (wrapper plus récent, moins éprouvé). RAISON détaillée
// dans DECISIONS.md (2026-09-01, C-01.05).
//
// REPLI OCR (décision utilisateur, 2026-09-01) : pdfjs-dist ne lit que la couche de texte
// intégrée — un PDF scanné (image pure, pas de texte encodé) ne produit rien. Sur ce cas précis
// (jamais sur un simple échec réseau ou un buffer corrompu), un second appel est tenté vers
// l'API OCR de Mistral ($4/1000 pages), qui sait lire une image. Coût nul quand pdfjs-dist suffit
// (l'immense majorité des PDF de cours — slides/notes exportées), coût uniquement sur les PDF
// scannés qui en ont réellement besoin.
//
// DÉTECTION D'IMAGES/SCHÉMAS (transparence, pas de compréhension) : les deux chemins signalent la
// présence d'images/schémas embarqués (`hasEmbeddedImages`) sans les décrire — ni pdfjs-dist ni
// l'OCR Mistral n'interprètent le contenu d'un schéma (l'OCR l'extrait comme une image, pas comme
// une description textuelle).
//
// CAPTIONING (2026-09-09, generation_ia_captioning_image.md) : la compréhension du contenu visuel
// (décrire un schéma) est faite par ImageCaptioningPipeline.service.js, PAS par ce fichier — ce
// service se limite à la RÉCUPÉRATION des images (`extractImages`, appel OCR dédié séparé de
// `extractText`) et du texte par page (`pageTexts`), l'orchestration LLM/insertion reste ailleurs
// (même séparation que PdfExtraction.service.js/AiCardGeneration.service.js).

class PdfExtractionService {
  constructor() {
    this.pdfjsModule = null
  }

  /**
   * Charge le module pdfjs-dist (build legacy, ESM) de façon paresseuse et met le résultat en
   * cache — un seul import() dynamique pour toute la durée de vie du process.
   *
   * @returns {Promise<object>} Le module pdfjs-dist (expose notamment `getDocument`, `OPS`)
   */
  async getPdfjs() {
    if (!this.pdfjsModule) {
      this.pdfjsModule = await import('pdfjs-dist/legacy/build/pdf.mjs')
    }
    return this.pdfjsModule
  }

  /**
   * Résout les chemins des polices standards et des CMap embarqués par pdfjs-dist, nécessaires au
   * rendu correct du texte de certains PDF (polices non-Latin, ligatures...).
   *
   * @returns {{ standardFontDataUrl: string, cMapUrl: string }}
   */
  resolveAssetPaths() {
    // Racine du package via son package.json plutôt que via l'entrée "build/pdf.mjs"/"legacy/build/
    // pdf.js" (profondeurs différentes selon le point d'entrée importé) — sans ambiguïté.
    const packageRoot = path.dirname(require.resolve('pdfjs-dist/package.json'))
    // pdfjs-dist valide ces chemins comme des URL (se terminant par "/") — un `path.sep` Windows
    // (backslash) échoue à cette validation même en fin de chaîne ; un "/" littéral est nécessaire
    // quel que soit l'OS (constaté à l'exécution, 2026-09-01).
    return {
      standardFontDataUrl: path.join(packageRoot, 'standard_fonts').replace(/\\/g, '/') + '/',
      cMapUrl: path.join(packageRoot, 'cmaps').replace(/\\/g, '/') + '/'
    }
  }

  /**
   * Extraction via pdfjs-dist (chemin par défaut, gratuit, local). Détecte au passage la présence
   * d'images/schémas embarqués (sans les décrire — voir en-tête de fichier).
   *
   * `pageTexts` (ajouté pour generation_ia_captioning_image.md, 2026-09-09) : texte par page, dans
   * l'ordre — permet au pipeline appelant de fusionner une description d'image générée (captioning)
   * sur la page exacte où l'image a été détectée, avant le découpage en chunks. `text` reste la
   * concaténation de `pageTexts` (comportement inchangé pour tout appelant qui l'ignore).
   *
   * @param {Buffer} pdfBuffer
   * @returns {Promise<{ text: string, hasEmbeddedImages: boolean, ocrPagesProcessed: number, pageTexts: string[] }>}
   * @throws {Error} PDF illisible/corrompu (400), ou sans texte extractible (422 — déclenche le repli OCR)
   */
  async extractTextViaPdfjs(pdfBuffer) {
    const { getDocument, OPS } = await this.getPdfjs()
    const { standardFontDataUrl, cMapUrl } = this.resolveAssetPaths()

    let pdf
    try {
      pdf = await getDocument({
        data: new Uint8Array(pdfBuffer),
        standardFontDataUrl,
        cMapUrl
      }).promise
    } catch (error) {
      logger.warn(`[PdfExtraction] Échec de lecture du PDF : ${error?.message || error}`)
      const err = new Error('Le fichier PDF est illisible ou corrompu.')
      err.statusCode = 400
      throw err
    }

    const IMAGE_OPS = new Set([OPS.paintImageXObject, OPS.paintJpegXObject, OPS.paintImageMaskXObject, OPS.paintInlineImageXObject])

    const pageTexts = []
    let hasEmbeddedImages = false

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const [textContent, operatorList] = await Promise.all([page.getTextContent(), page.getOperatorList()])

      const pageText = textContent.items
        .filter((item) => typeof item.str === 'string')
        .map((item) => item.str + (item.hasEOL ? '\n' : ''))
        .join('')
      pageTexts.push(pageText)

      if (!hasEmbeddedImages) {
        hasEmbeddedImages = operatorList.fnArray.some((op) => IMAGE_OPS.has(op))
      }
    }

    const fullText = pageTexts.join('\n\n').trim()
    if (!fullText) {
      const err = new Error("Aucun texte n'a pu être extrait de ce PDF (probablement un scan sans texte intégré).")
      err.statusCode = 422
      throw err
    }

    // Gratuit : aucune page n'est facturée via ce chemin (voir services/AiQuota.service.js, C-01.06).
    return { text: fullText, hasEmbeddedImages, ocrPagesProcessed: 0, pageTexts }
  }

  /**
   * Extraction via l'API OCR de Mistral (repli, coût réel — $4/1000 pages) : lit une image, contrairement
   * à pdfjs-dist. Détecte aussi la présence d'images/schémas (`pages[].images` de la réponse), sans les
   * décrire (voir en-tête de fichier). `ocrPagesProcessed` alimente le suivi de budget (C-01.06).
   *
   * Si l'appel a réellement traité des pages facturées avant de constater l'absence de texte (422),
   * l'erreur porte un champ `usage: { ocrPagesProcessed }` — l'appelant peut journaliser ce coût
   * réel même sur cet échec (C-01.06). Absent sur les échecs qui n'ont rien facturé (500, 502).
   *
   * `pageTexts` (voir extractTextViaPdfjs ci-dessus pour le détail) : ici, le `markdown` de chaque page
   * de la réponse OCR, dans l'ordre.
   *
   * @param {Buffer} pdfBuffer
   * @returns {Promise<{ text: string, hasEmbeddedImages: boolean, ocrPagesProcessed: number, pageTexts: string[] }>}
   * @throws {Error} Configuration manquante (500), appel réseau/API en échec (502), ou aucun texte (422)
   */
  async extractTextViaOcr(pdfBuffer) {
    const config = getMistralConfig()

    if (!config.apiKey) {
      const err = new Error("Extraction OCR impossible : service IA non configuré (clé API manquante).")
      err.statusCode = 500
      throw err
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs)

    let response
    try {
      response = await fetch(config.ocrApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.ocrModel,
          document: {
            type: 'document_url',
            document_url: `data:application/pdf;base64,${pdfBuffer.toString('base64')}`
          }
        }),
        signal: controller.signal
      })
    } catch (error) {
      logger.error(`[PdfExtraction] Appel Mistral OCR échoué : ${error?.message || error}`)
      const err = new Error("Le service d'OCR est indisponible pour le moment.")
      err.statusCode = 502
      throw err
    } finally {
      clearTimeout(timeout)
    }

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '')
      logger.error(`[PdfExtraction] Réponse Mistral OCR ${response.status} : ${bodyText}`)
      const err = new Error("Le service d'OCR est indisponible pour le moment.")
      err.statusCode = 502
      throw err
    }

    const data = await response.json()
    const pages = Array.isArray(data?.pages) ? data.pages : []
    const text = pages
      .map((p) => (typeof p.markdown === 'string' ? p.markdown : ''))
      .join('\n\n')
      .trim()
    const hasEmbeddedImages = pages.some((p) => Array.isArray(p.images) && p.images.length > 0)
    // Repli sur pages.length si usage_info est absent de la réponse (forme non garantie par tous
    // les modèles OCR) — reste une mesure réelle du nombre de pages traitées, pas une estimation.
    const ocrPagesProcessed =
      typeof data?.usage_info?.pages_processed === 'number' ? data.usage_info.pages_processed : pages.length

    if (!text) {
      const err = new Error("L'OCR n'a extrait aucun texte de ce PDF.")
      err.statusCode = 422
      // L'appel a réellement traité des pages côté Mistral (facturées) même sans texte exploitable
      // — l'usage réel est attaché pour ne pas être perdu par l'appelant (C-01.06). Attaché
      // seulement si des pages ont réellement été comptées (0 page = rien de facturé, cas peu
      // probable mais possible sur une réponse vide).
      if (ocrPagesProcessed > 0) err.usage = { ocrPagesProcessed }
      throw err
    }

    const pageTexts = pages.map((p) => (typeof p.markdown === 'string' ? p.markdown : ''))
    return { text, hasEmbeddedImages, ocrPagesProcessed, pageTexts }
  }

  /**
   * Extrait le texte brut d'un PDF. Essaie d'abord pdfjs-dist (gratuit) ; si aucun texte n'est
   * trouvé (PDF scanné), retente automatiquement via l'OCR Mistral (coût réel, voir en-tête de
   * fichier). Signale (`hasEmbeddedImages`) la présence d'images/schémas sans jamais les décrire.
   *
   * @param {Buffer} pdfBuffer
   * @returns {Promise<{ text: string, hasEmbeddedImages: boolean, ocrPagesProcessed: number, pageTexts: string[] }>}
   * @throws {Error} Buffer invalide (400), PDF illisible/corrompu (400), configuration OCR manquante
   *   (500), échec réseau/API OCR (502), ou aucun texte extractible par aucun des deux moyens (422)
   */
  async extractText(pdfBuffer) {
    if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
      const err = new Error('Le fichier PDF fourni est vide ou invalide.')
      err.statusCode = 400
      throw err
    }

    try {
      return await this.extractTextViaPdfjs(pdfBuffer)
    } catch (error) {
      if (error.statusCode !== 422) throw error

      logger.warn('[PdfExtraction] Aucun texte via pdfjs-dist (probable PDF scanné) — repli sur Mistral OCR.')
      return this.extractTextViaOcr(pdfBuffer)
    }
  }

  /**
   * Récupère les images/schémas embarqués dans un PDF, en vue de leur captioning
   * (generation_ia_captioning_image.md, 2026-09-09) — appel OCR Mistral DÉDIÉ, séparé de
   * `extractText`/`extractTextViaOcr` ci-dessus : ceux-ci ne demandent jamais `include_image_base64`
   * (pour ne pas alourdir la réponse quand seul le texte est nécessaire, cas majoritaire). Pertinent
   * uniquement si `hasEmbeddedImages` (renvoyé par `extractText`) vaut `true` — l'appelant décide quand
   * appeler cette méthode, ce service ne le décide pas lui-même.
   *
   * `pages[].images[].image_base64` est documenté par Mistral comme une chaîne base64 brute, sans
   * préfixe data URI (revue documentaire, à reconfirmer au premier appel réel — voir
   * generation_ia_captioning_image.md §9) : reconstruit ici en data URI, sauf si un préfixe est déjà
   * présent (robuste aux deux formats plutôt que de supposer lequel est correct).
   *
   * Ne lève jamais d'erreur si aucune image n'est effectivement trouvée (`images: []`) — la détection
   * qui a déclenché cet appel (`hasEmbeddedImages`) est un indice, pas une garantie.
   *
   * @param {Buffer} pdfBuffer
   * @returns {Promise<{ images: { pageIndex: number, imageBase64: string }[], ocrPagesProcessed: number }>}
   * @throws {Error} Buffer invalide (400), configuration manquante (500), ou appel réseau/API en échec (502)
   */
  async extractImages(pdfBuffer) {
    if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
      const err = new Error('Le fichier PDF fourni est vide ou invalide.')
      err.statusCode = 400
      throw err
    }

    const config = getMistralConfig()
    if (!config.apiKey) {
      const err = new Error("Extraction des images impossible : service IA non configuré (clé API manquante).")
      err.statusCode = 500
      throw err
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs)

    let response
    try {
      response = await fetch(config.ocrApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.ocrModel,
          document: {
            type: 'document_url',
            document_url: `data:application/pdf;base64,${pdfBuffer.toString('base64')}`
          },
          include_image_base64: true
        }),
        signal: controller.signal
      })
    } catch (error) {
      logger.error(`[PdfExtraction] Appel Mistral OCR (images) échoué : ${error?.message || error}`)
      const err = new Error("Le service d'extraction des images est indisponible pour le moment.")
      err.statusCode = 502
      throw err
    } finally {
      clearTimeout(timeout)
    }

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '')
      logger.error(`[PdfExtraction] Réponse Mistral OCR (images) ${response.status} : ${bodyText}`)
      const err = new Error("Le service d'extraction des images est indisponible pour le moment.")
      err.statusCode = 502
      throw err
    }

    const data = await response.json()
    const pages = Array.isArray(data?.pages) ? data.pages : []
    const images = []
    pages.forEach((page, pageIndex) => {
      const pageImages = Array.isArray(page?.images) ? page.images : []
      pageImages.forEach((image) => {
        const raw = typeof image?.image_base64 === 'string' ? image.image_base64 : null
        if (!raw) return
        const imageBase64 = raw.startsWith('data:') ? raw : `data:image/jpeg;base64,${raw}`
        images.push({ pageIndex, imageBase64 })
      })
    })

    const ocrPagesProcessed =
      typeof data?.usage_info?.pages_processed === 'number' ? data.usage_info.pages_processed : pages.length

    return { images, ocrPagesProcessed }
  }
}

module.exports = new PdfExtractionService()

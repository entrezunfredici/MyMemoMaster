const logger = require('../helpers/logger')
const pdfExtractionService = require('./PdfExtraction.service')
const imageCaptioningService = require('./ImageCaptioning.service')

// Périmètre (generation_ia_captioning_image.md, 2026-09-09) : orchestre le captioning des images/schémas
// détectés dans un PDF — récupération (PdfExtraction.service.js#extractImages) + description
// (ImageCaptioning.service.js, un appel par image) — et fusionne les descriptions retenues dans le
// texte source, PAGE PAR PAGE, avant le découpage en chunks.
//
// CHOIX : service générique et partagé par AiCardGenerationPipeline.service.js (C-01.05) ET
// AiExerciseGenerationPipeline.service.js, PAS dupliqué comme le reste de l'orchestration propre à
// chaque feature (distributeCardCount/distributeQuestionCount, wording des warnings "carte"/"question").
// RAISON : ce service n'a aucune notion de "carte" ni de "question" — il ne fait que produire un texte
// enrichi, symétrique aux deux pipelines, exactement comme PdfExtraction.service.js/textChunker.js sont
// déjà réutilisés tels quels par les deux (pas dupliqués) — même distinction que le projet applique déjà
// entre infra générique (partagée) et orchestration spécifique à une feature (dupliquée).
//
// Ce service NE fait JAMAIS échouer l'appelant : toute erreur (récupération des images, captioning d'une
// image précise) dégrade en avertissement — le texte déjà obtenu (pdfjs-dist ou OCR) reste exploitable
// seul, cohérent avec la tolérance déjà en place sur un chunk de texte en échec (C-01.05).
//
// Ticket B (2026-09-12, « images sur les questions ») : chaque image retenue (isPedagogicalContent: true)
// reçoit désormais un numéro stable (`id`, séquentiel à partir de 1) répercuté dans le marqueur texte
// (« Schéma n°X ») ET renvoyé dans un nouveau champ `images` — permet à un appelant en aval
// (AiExerciseGenerationPipeline.service.js) de faire correspondre un `imageRef` cité par le LLM à
// l'image source réelle (pour l'uploader et l'attacher à la question), sans changer le contrat déjà
// utilisé par AiCardGenerationPipeline.service.js (champ additionnel, ignoré si non consommé).

// Plafond dédié (décision utilisateur, 2026-09-09, generation_ia_captioning_image.md §6.3) : protège une
// génération individuelle d'un PDF très illustré, indépendamment du budget mensuel global déjà couvert
// par AiQuota.service.js (C-01.06).
const MAX_CAPTIONED_IMAGES_PER_GENERATION = 5

class ImageCaptioningPipelineService {
  /**
   * Fusionne la description retenue d'une image dans le texte de la page où elle a été détectée — un
   * paragraphe séparé (double saut de ligne, cohérent avec `splitIntoParagraphs` de
   * `helpers/textChunker.js`), marqué explicitement pour la traçabilité utilisateur
   * (generation_ia_captioning_image.md §5.1). Reste transparent pour la suite du pipeline (chunking,
   * prompt de génération, `sourceExcerpt`) pour un appelant qui ne s'intéresse qu'au texte enrichi
   * (AiCardGenerationPipeline.service.js) : aucune extension de contrat n'est nécessaire de ce côté.
   *
   * `id` (Ticket B) rend le schéma citable explicitement par le prompt de génération d'exercices
   * (« Schéma n°X ») — un LLM qui veut rattacher une question à ce schéma renvoie ce numéro exact dans
   * `imageRef` (AiExerciseGeneration.service.js), résolu ensuite via le champ `images` renvoyé par
   * `captionEmbeddedImages`.
   *
   * @param {string} pageText
   * @param {string} caption
   * @param {number} id - Numéro stable du schéma (séquentiel à partir de 1 parmi les images retenues)
   * @returns {string}
   */
  insertCaption(pageText, caption, id) {
    const marker = `[Schéma n°${id} détecté sur cette page — description générée automatiquement par IA, non garantie exacte : ${caption}]`
    return pageText ? `${pageText}\n\n${marker}` : marker
  }

  /**
   * Récupère et décrit les images/schémas embarqués dans un PDF, et fusionne les descriptions retenues
   * (`isPedagogicalContent: true`) dans `pageTexts`, page par page.
   *
   * @param {object} params
   * @param {Buffer} params.pdfBuffer
   * @param {string[]} params.pageTexts - Texte par page (`PdfExtraction.service.js#extractText`), dans
   *   l'ordre — jamais muté en place, une copie enrichie est renvoyée
   * @param {string|null} [params.subjectContext]
   * @param {string} [params.outputLanguage]
   * @returns {Promise<{ pageTexts: string[], warnings: string[], usage: { promptTokens: number, completionTokens: number, ocrPagesProcessed: number }, captionedCount: number, images: { id: number, pageIndex: number, caption: string, imageBase64: string }[] }>}
   */
  async captionEmbeddedImages({ pdfBuffer, pageTexts, subjectContext = null, outputLanguage = 'fr' }) {
    const warnings = []
    const usage = { promptTokens: 0, completionTokens: 0, ocrPagesProcessed: 0 }
    const updatedPageTexts = Array.isArray(pageTexts) ? [...pageTexts] : []

    let images
    try {
      const result = await pdfExtractionService.extractImages(pdfBuffer)
      images = result.images
      usage.ocrPagesProcessed += result.ocrPagesProcessed
    } catch (error) {
      logger.warn(`[ImageCaptioningPipeline] Récupération des images échouée : ${error?.message || error}`)
      warnings.push(
        "Ce contenu contient des images/schémas, mais ils n'ont pas pu être récupérés pour analyse " +
          '(service indisponible) — seul le texte est pris en compte.'
      )
      return { pageTexts: updatedPageTexts, warnings, usage, captionedCount: 0, images: [] }
    }

    if (images.length === 0) {
      // La détection qui a déclenché cet appel (hasEmbeddedImages, pdfjs-dist ou OCR) est un indice,
      // pas une garantie — rien à captionner n'est pas une erreur, pas de warning.
      return { pageTexts: updatedPageTexts, warnings, usage, captionedCount: 0, images: [] }
    }

    const truncated = images.length > MAX_CAPTIONED_IMAGES_PER_GENERATION
    const retained = images.slice(0, MAX_CAPTIONED_IMAGES_PER_GENERATION)
    if (truncated) {
      warnings.push(
        `Ce contenu comporte ${images.length} images/schémas détectés, au-delà de la limite analysée ` +
          `par génération (${MAX_CAPTIONED_IMAGES_PER_GENERATION}) — seuls les ${MAX_CAPTIONED_IMAGES_PER_GENERATION} premiers ont été pris en compte.`
      )
    }

    let captionedCount = 0
    let failedCount = 0
    let nextImageId = 1
    const retainedImages = []

    for (const image of retained) {
      const pageContext = updatedPageTexts[image.pageIndex] ?? null
      try {
        // Séquentiel, pas en parallèle : même choix que les chunks de génération (AiCardGenerationPipeline
        // .service.js) — évite un pic de charge/coût simultané sur l'API Mistral.
        const result = await imageCaptioningService.captionImage({
          imageBase64: image.imageBase64,
          pageContext,
          subjectContext,
          outputLanguage
        })
        usage.promptTokens += result.usage.promptTokens
        usage.completionTokens += result.usage.completionTokens

        if (result.isPedagogicalContent && result.caption) {
          const id = nextImageId++
          const existing = updatedPageTexts[image.pageIndex] ?? ''
          updatedPageTexts[image.pageIndex] = this.insertCaption(existing, result.caption, id)
          retainedImages.push({ id, pageIndex: image.pageIndex, caption: result.caption, imageBase64: image.imageBase64 })
          captionedCount++
        }
        // isPedagogicalContent: false → filtrée silencieusement, pas un échec (generation_ia_captioning_image.md §7).
      } catch (error) {
        logger.warn(`[ImageCaptioningPipeline] Captioning d'une image échoué : ${error?.message || error}`)
        if (error.usage) {
          usage.promptTokens += error.usage.promptTokens || 0
          usage.completionTokens += error.usage.completionTokens || 0
        }
        failedCount++
      }
    }

    if (failedCount > 0 && captionedCount === 0) {
      warnings.push(
        "Aucune des images/schémas détectés n'a pu être analysée (service de captioning IA indisponible) " +
          '— seul le texte est pris en compte.'
      )
    } else if (failedCount > 0) {
      warnings.push(
        `${failedCount} image(s)/schéma(s) sur ${retained.length} n'a/n'ont pas pu être analysé(s) — ` +
          'les autres descriptions restent prises en compte.'
      )
    }

    return { pageTexts: updatedPageTexts, warnings, usage, captionedCount, images: retainedImages }
  }
}

module.exports = new ImageCaptioningPipelineService()

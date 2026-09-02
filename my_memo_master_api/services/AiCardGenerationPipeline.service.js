const logger = require('../helpers/logger')
const { chunkText } = require('../helpers/textChunker')
const pdfExtractionService = require('./PdfExtraction.service')
const aiCardGenerationService = require('./AiCardGeneration.service')

// Périmètre C-01.05 (« Pipeline traitement — PDF, chunking, LLM ») : orchestre les trois étapes
// nommées par ce ticket — extraction PDF (services/PdfExtraction.service.js), découpage
// (helpers/textChunker.js) et appel LLM (services/AiCardGeneration.service.js, C-01.04) — sur un
// contenu source qui peut être trop long pour un seul appel de génération. Ce service NE fait PAS :
// - l'application de quotas (garde-fous techniques distincts ci-dessous, hors périmètre Quotas)
// - la persistance ni la validation utilisateur (Écran de validation, hors périmètre) — retourne
//   toujours un brouillon en mémoire, jamais d'écriture en base

// Longueur max d'un chunk (caractères) — cf. helpers/textChunker.js pour la stratégie de découpage.
const MAX_CHUNK_LENGTH = 4000

// Garde-fou technique du service (protège CE service d'un contenu source démesuré, ex. un PDF de
// plusieurs centaines de pages), PAS une implémentation de Quotas.
const MAX_CHUNKS = 20

class AiCardGenerationPipelineService {
  /**
   * Résout le texte source à traiter : exactement un des deux paramètres doit être fourni.
   * `hasEmbeddedImages` (toujours `false` pour un texte collé — pas de PDF, pas d'image) signale la
   * présence d'images/schémas dans le PDF source SANS jamais les décrire (ni pdfjs-dist ni l'OCR
   * Mistral n'interprètent le contenu visuel — voir services/PdfExtraction.service.js).
   *
   * @param {{ sourceText: string|null, pdfBuffer: Buffer|null }} params
   * @returns {Promise<{ text: string, hasEmbeddedImages: boolean, ocrPagesProcessed: number }>}
   * @throws {Error} Ni l'un ni l'autre, ou les deux à la fois fournis (400)
   */
  async resolveSourceText({ sourceText, pdfBuffer }) {
    const hasText = typeof sourceText === 'string' && Boolean(sourceText.trim())
    const hasPdf = Buffer.isBuffer(pdfBuffer) && pdfBuffer.length > 0

    if (hasText === hasPdf) {
      const err = new Error("Fournir soit un texte source, soit un fichier PDF (l'un des deux exactement).")
      err.statusCode = 400
      throw err
    }

    if (hasPdf) return pdfExtractionService.extractText(pdfBuffer)
    return { text: sourceText.trim(), hasEmbeddedImages: false, ocrPagesProcessed: 0 }
  }

  /**
   * Répartit un nombre total de cartes sur N chunks. Si N > cardCount, seuls les `cardCount`
   * premiers chunks reçoivent 1 carte (les suivants ne sont pas interrogés — évite des appels LLM
   * inutiles). Sinon, la répartition est la plus équilibrée possible (reste distribué aux premiers
   * chunks).
   *
   * @param {number} cardCount
   * @param {number} chunkCount
   * @returns {number[]} Un élément par chunk, 0 = chunk non interrogé
   */
  distributeCardCount(cardCount, chunkCount) {
    if (chunkCount <= 0) return []

    if (chunkCount >= cardCount) {
      return Array.from({ length: chunkCount }, (_, i) => (i < cardCount ? 1 : 0))
    }

    const base = Math.floor(cardCount / chunkCount)
    const remainder = cardCount % chunkCount
    return Array.from({ length: chunkCount }, (_, i) => base + (i < remainder ? 1 : 0))
  }

  /**
   * Point d'entrée du pipeline : résout le contenu source (texte ou PDF), le découpe si besoin, et
   * appelle le service d'inférence IA (C-01.04) sur chaque chunk, en répartissant le nombre de
   * cartes demandé. Agrège les résultats. Un chunk en échec ne fait pas échouer les autres (voir
   * §échec partiel ci-dessous) — seul un échec total lève une erreur.
   *
   * Contrat de sortie DÉLIBÉRÉMENT différent de celui d'un appel unique (generation_ia_prompt_cartes.md
   * §4, `warning: string|null`) : `warnings` est un tableau (un message par chunk concerné), pas une
   * chaîne unique — l'agrégation de plusieurs avertissements n'a pas de forme "chaîne unique"
   * naturelle sans perdre l'information de provenance.
   *
   * @param {object} params
   * @param {string|null} [params.sourceText] - Texte source complet (mutuellement exclusif avec pdfBuffer)
   * @param {Buffer|null} [params.pdfBuffer] - PDF source (mutuellement exclusif avec sourceText)
   * @param {string|null} [params.subjectContext]
   * @param {number} params.cardCount - Nombre total de cartes cible, réparti sur les chunks
   * @param {string} [params.cardType] - "open" | "mcq" | "mixed" (défaut "open")
   * @param {string} [params.outputLanguage] - Défaut "fr"
   * `usage` agrège la consommation réelle de tous les appels effectués (chunks LLM + OCR éventuel)
   * — alimente le suivi de budget (C-01.06, services/AiQuota.service.js). Non journalisé par ce
   * service lui-même (pas de dépendance à la persistance), seulement renvoyé à l'appelant.
   *
   * Si la génération échoue entièrement (tous les chunks en échec, ou l'extraction source elle-même
   * échoue) après qu'un usage réel a été facturé, l'erreur levée porte ce même `usage` (C-01.06) —
   * l'appelant peut journaliser le coût réel même sur un échec total. Absent si rien n'a été
   * facturé.
   *
   * @returns {Promise<{ cards: object[], warnings: string[], usage: { model: string|null, promptTokens: number, completionTokens: number, ocrPagesProcessed: number } }>}
   * @throws {Error} Contenu source invalide/vide (400/422) ou échec sur la totalité des chunks (502)
   */
  async generateCardsFromContent({
    sourceText = null,
    pdfBuffer = null,
    subjectContext = null,
    cardCount,
    cardType = 'open',
    outputLanguage = 'fr'
  }) {
    if (!Number.isInteger(cardCount) || cardCount < 1) {
      const err = new Error('Le nombre de cartes demandé doit être un entier positif.')
      err.statusCode = 400
      throw err
    }

    const {
      text: resolvedText,
      hasEmbeddedImages,
      ocrPagesProcessed = 0
    } = await this.resolveSourceText({ sourceText, pdfBuffer })

    const allChunks = chunkText(resolvedText, { maxChunkLength: MAX_CHUNK_LENGTH })
    if (allChunks.length === 0) {
      const err = new Error("Aucun contenu exploitable n'a été trouvé dans la source fournie.")
      err.statusCode = 422
      throw err
    }

    const truncated = allChunks.length > MAX_CHUNKS
    const chunks = allChunks.slice(0, MAX_CHUNKS)
    const perChunkCounts = this.distributeCardCount(cardCount, chunks.length)

    const cards = []
    const warnings = []
    const usage = { model: null, promptTokens: 0, completionTokens: 0, ocrPagesProcessed }
    let successCount = 0

    if (hasEmbeddedImages) {
      warnings.push(
        'Ce contenu contient des images/schémas qui ne sont pas analysés par la génération IA ' +
          '(seul le texte est pris en compte) — les notions illustrées uniquement par une image ' +
          'risquent de ne donner lieu à aucune carte.'
      )
    }

    if (truncated) {
      warnings.push(
        `Le contenu fourni a été tronqué à ${MAX_CHUNKS} passages sur ${allChunks.length} — ` +
          'seule la première partie a été traitée.'
      )
    }

    for (let i = 0; i < chunks.length; i++) {
      const chunkCardCount = perChunkCounts[i]
      if (!chunkCardCount) continue

      try {
        // Séquentiel, pas en parallèle : évite un pic de charge/coût simultané sur l'API LLM
        // (plusieurs appels concurrents pour une seule demande utilisateur).
        const result = await aiCardGenerationService.generateCards({
          sourceText: chunks[i],
          subjectContext,
          cardCount: chunkCardCount,
          cardType,
          outputLanguage
        })
        cards.push(...result.cards)
        if (result.warning) warnings.push(`Passage ${i + 1}/${chunks.length} : ${result.warning}`)
        usage.model = result.usage.model
        usage.promptTokens += result.usage.promptTokens
        usage.completionTokens += result.usage.completionTokens
        successCount++
      } catch (error) {
        logger.warn(
          `[AiCardGenerationPipeline] Passage ${i + 1}/${chunks.length} en échec : ${error?.message || error}`
        )
        warnings.push(`Passage ${i + 1}/${chunks.length} n'a pas pu être traité (${error?.message || 'erreur inconnue'}).`)
        // Un chunk en échec peut avoir réellement consommé des tokens facturés avant d'échouer
        // (ex. AiCardGenerationService rejette après 2 appels réels non conformes, cf. son propre
        // `error.usage`) — cet usage ne doit pas être perdu au prétexte que le chunk a échoué
        // (C-01.06). Un chunk qui échoue avant tout appel réel (validation, réseau) n'a rien à
        // fusionner (`error.usage` absent).
        if (error.usage) {
          usage.model = usage.model ?? error.usage.model ?? null
          usage.promptTokens += error.usage.promptTokens || 0
          usage.completionTokens += error.usage.completionTokens || 0
        }
      }
    }

    if (successCount === 0) {
      const err = new Error('La génération a échoué sur tous les passages du contenu fourni.')
      err.statusCode = 502
      // Le budget réel (C-01.06) ne doit pas être perdu même si la génération entière échoue —
      // l'usage cumulé peut être non nul si un ou plusieurs chunks ont réellement été facturés
      // avant d'échouer (voir le catch ci-dessus), ou si l'extraction OCR l'a déjà facturé.
      if (usage.promptTokens > 0 || usage.completionTokens > 0 || usage.ocrPagesProcessed > 0) {
        err.usage = usage
      }
      throw err
    }

    return { cards, warnings, usage }
  }
}

module.exports = new AiCardGenerationPipelineService()

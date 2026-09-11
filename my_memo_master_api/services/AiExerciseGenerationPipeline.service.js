const logger = require('../helpers/logger')
const { chunkText } = require('../helpers/textChunker')
const pdfExtractionService = require('./PdfExtraction.service')
const aiExerciseGenerationService = require('./AiExerciseGeneration.service')
const imageCaptioningPipelineService = require('./ImageCaptioningPipeline.service')

// Périmètre : ajout de l'import PDF pour la génération de questions d'exercice par IA (`C-02`),
// demandé explicitement par l'utilisateur après la livraison de C-02.07 — jusque-là, `C-02` n'avait
// aucun équivalent au pipeline PDF/chunking de `C-01` (écart d'audit documenté en C-02.06/C-02.02 :
// `AiExerciseGeneration.service.js` ne prend qu'un `sourceText` déjà résolu, aucun découpage). Ce
// service orchestre les trois mêmes étapes que `AiCardGenerationPipeline.service.js` (C-01.05) —
// extraction PDF (`services/PdfExtraction.service.js`, réutilisé tel quel, générique), découpage
// (`helpers/textChunker.js`, réutilisé tel quel) et appel LLM (`AiExerciseGeneration.service.js`,
// C-02.03) — sur un contenu source potentiellement trop long pour un seul appel de génération.
//
// CHOIX : nouveau service dédié plutôt que de généraliser `AiCardGenerationPipeline.service.js` pour
// accepter un service de génération en paramètre.
// RAISON : cohérent avec le choix déjà fait à chaque ticket `C-02` (services autonomes plutôt
// qu'extension des services `C-01`, voir DECISIONS.md, ex. C-02.03) — et modifier un service déjà
// livré pour `C-01` sans besoin réel côté cartes serait une extension d'interface hors périmètre de
// cette demande (AGENT.md §2). Voir DECISIONS.md pour le détail.
//
// Ce service NE fait PAS :
// - l'application de quotas (garde-fou technique distinct ci-dessous, pas un Quotas applicatif —
//   comme pour C-01, `C-02` n'a toujours aucun élément « Quotas » nommé dans son feature list)
// - la persistance ni l'Interface de révision (déjà livrée, C-02.07) — retourne toujours un brouillon
//   en mémoire, jamais d'écriture en base, comme `AiExerciseGeneration.service.js` lui-même
// - le dédoublonnage inter-chunks — chaque chunk applique déjà son propre filet anti-doublon
//   (`AiExerciseGeneration.service.js#applyDedupeSafetyNet`, intra-chunk uniquement) ; un doublon
//   entre deux chunks différents n'est pas retiré ici, exactement comme `AiCardGenerationPipelineService`
//   ne le fait pas non plus pour les cartes — cohérence avec ce précédent plutôt qu'un comportement
//   plus strict d'un seul côté de deux features autrement symétriques.

// Mêmes valeurs que AiCardGenerationPipeline.service.js (C-01.05) — dupliquées plutôt que partagées
// (pas de constante exportée côté cartes à réutiliser sans y toucher, voir CHOIX ci-dessus).
const MAX_CHUNK_LENGTH = 4000
const MAX_CHUNKS = 20

// Même garde-fou et même seuil que AiCardGenerationPipeline.service.js (constaté en prod le
// 2026-09-04 sur la feature voisine C-01, cf. ce fichier pour le détail du raisonnement) — un compte
// Mistral durablement rate-limité fait échouer chaque chunk de la même façon, indépendamment de la
// feature (cartes ou exercices) qui l'appelle.
const RATE_LIMIT_CIRCUIT_BREAKER_THRESHOLD = 2

class AiExerciseGenerationPipelineService {
  /**
   * Résout le texte source à traiter : exactement un des deux paramètres doit être fourni. Identique
   * à `AiCardGenerationPipeline.service.js#resolveSourceText` (même contrat, même dépendance à
   * `PdfExtraction.service.js`, générique et non spécifique aux cartes).
   *
   * `pageTexts` (texte par page, `null` pour un texte collé) permet au captioning d'images
   * (ImageCaptioningPipeline.service.js, 2026-09-09) d'insérer une description sur la bonne page.
   *
   * @param {{ sourceText: string|null, pdfBuffer: Buffer|null }} params
   * @returns {Promise<{ text: string, hasEmbeddedImages: boolean, ocrPagesProcessed: number, pageTexts: string[]|null }>}
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
    return { text: sourceText.trim(), hasEmbeddedImages: false, ocrPagesProcessed: 0, pageTexts: null }
  }

  /**
   * Répartit un nombre total de questions sur N chunks. Identique à
   * `AiCardGenerationPipeline.service.js#distributeCardCount` (même algorithme, générique au concept
   * « nombre d'éléments à répartir sur des passages », pas spécifique aux cartes).
   *
   * @param {number} questionCount
   * @param {number} chunkCount
   * @returns {number[]} Un élément par chunk, 0 = chunk non interrogé
   */
  distributeQuestionCount(questionCount, chunkCount) {
    if (chunkCount <= 0) return []

    if (chunkCount >= questionCount) {
      return Array.from({ length: chunkCount }, (_, i) => (i < questionCount ? 1 : 0))
    }

    const base = Math.floor(questionCount / chunkCount)
    const remainder = questionCount % chunkCount
    return Array.from({ length: chunkCount }, (_, i) => base + (i < remainder ? 1 : 0))
  }

  /**
   * Point d'entrée du pipeline : résout le contenu source (texte ou PDF), le découpe si besoin, et
   * appelle le Service génération (C-02.03) sur chaque chunk, en répartissant le nombre de questions
   * demandé. Agrège les résultats. Un chunk en échec ne fait pas échouer les autres — seul un échec
   * total lève une erreur. Même circuit breaker rate limit que
   * `AiCardGenerationPipeline.service.js#generateCardsFromContent` (voir ce fichier pour le détail du
   * raisonnement, identique ici).
   *
   * Contrat de sortie DÉLIBÉRÉMENT différent d'un appel unique à `AiExerciseGeneration.service.js`
   * (`warning: string|null`) : `warnings` est un tableau (un message par chunk concerné) — même choix
   * assumé que `AiCardGenerationPipeline.service.js`, pour ne pas perdre l'information de provenance
   * en fusionnant plusieurs avertissements en une seule chaîne.
   *
   * @param {object} params
   * @param {string|null} [params.sourceText] - Texte source complet (mutuellement exclusif avec pdfBuffer)
   * @param {Buffer|null} [params.pdfBuffer] - PDF source (mutuellement exclusif avec sourceText)
   * @param {string|null} [params.subjectContext]
   * @param {number} params.questionCount - Nombre total de questions cible, réparti sur les chunks
   * @param {string} [params.questionType] - "mixed" | "open" | "mcq" | "fill_blank" | "reorder" (défaut "mixed")
   * @param {string} [params.outputLanguage] - Défaut "fr"
   * @returns {Promise<{ questions: object[], warnings: string[], usage: { model: string|null, promptTokens: number, completionTokens: number, ocrPagesProcessed: number } }>}
   * @throws {Error} Contenu source invalide/vide (400/422) ou échec sur la totalité des chunks (502)
   */
  async generateExercisesFromContent({
    sourceText = null,
    pdfBuffer = null,
    subjectContext = null,
    questionCount,
    questionType = 'mixed',
    outputLanguage = 'fr'
  }) {
    if (!Number.isInteger(questionCount) || questionCount < 1) {
      const err = new Error('Le nombre de questions demandé doit être un entier positif.')
      err.statusCode = 400
      throw err
    }

    const {
      text: resolvedText,
      hasEmbeddedImages,
      ocrPagesProcessed = 0,
      pageTexts
    } = await this.resolveSourceText({ sourceText, pdfBuffer })

    const warnings = []
    const usage = { model: null, promptTokens: 0, completionTokens: 0, ocrPagesProcessed }

    // Captioning des images/schémas (ImageCaptioningPipeline.service.js, generation_ia_captioning_image.md)
    // AVANT le découpage en chunks — même wiring que AiCardGenerationPipeline.service.js (C-01.05), voir
    // ce fichier pour le détail du raisonnement (service partagé, générique, pas de notion de "question"
    // ici). Ne fait jamais échouer la génération : toute erreur dégrade en warning.
    let finalText = resolvedText
    if (hasEmbeddedImages) {
      try {
        const captioningResult = await imageCaptioningPipelineService.captionEmbeddedImages({
          pdfBuffer,
          pageTexts,
          subjectContext,
          outputLanguage
        })
        finalText = captioningResult.pageTexts.join('\n\n').trim() || resolvedText
        usage.promptTokens += captioningResult.usage.promptTokens
        usage.completionTokens += captioningResult.usage.completionTokens
        usage.ocrPagesProcessed += captioningResult.usage.ocrPagesProcessed
        warnings.push(...captioningResult.warnings)
        if (captioningResult.captionedCount === 0 && captioningResult.warnings.length === 0) {
          warnings.push(
            'Ce contenu contient des images/schémas, mais aucun ne portait de contenu pédagogique ' +
              'exploitable — seul le texte est pris en compte.'
          )
        }
      } catch (error) {
        logger.warn(`[AiExerciseGenerationPipeline] Captioning des images échoué : ${error?.message || error}`)
        warnings.push(
          'Ce contenu contient des images/schémas qui ne sont pas analysés par la génération IA ' +
            '(seul le texte est pris en compte) — les notions illustrées uniquement par une image ' +
            'risquent de ne donner lieu à aucune question.'
        )
      }
    }

    const allChunks = chunkText(finalText, { maxChunkLength: MAX_CHUNK_LENGTH })
    if (allChunks.length === 0) {
      const err = new Error("Aucun contenu exploitable n'a été trouvé dans la source fournie.")
      err.statusCode = 422
      throw err
    }

    const truncated = allChunks.length > MAX_CHUNKS
    const chunks = allChunks.slice(0, MAX_CHUNKS)
    const perChunkCounts = this.distributeQuestionCount(questionCount, chunks.length)

    const questions = []
    let successCount = 0
    let consecutiveRateLimitFailures = 0
    let stoppedOnSustainedRateLimit = false
    let lastError = null

    if (truncated) {
      warnings.push(
        `Le contenu fourni a été tronqué à ${MAX_CHUNKS} passages sur ${allChunks.length} — ` +
          'seule la première partie a été traitée.'
      )
    }

    for (let i = 0; i < chunks.length; i++) {
      const chunkQuestionCount = perChunkCounts[i]
      if (!chunkQuestionCount) continue

      try {
        // Séquentiel, pas en parallèle : évite un pic de charge/coût simultané sur l'API LLM (même
        // choix que AiCardGenerationPipeline.service.js).
        const result = await aiExerciseGenerationService.generateExercises({
          sourceText: chunks[i],
          subjectContext,
          questionCount: chunkQuestionCount,
          questionType,
          outputLanguage
        })
        questions.push(...result.questions)
        if (result.warning) warnings.push(`Passage ${i + 1}/${chunks.length} : ${result.warning}`)
        usage.model = result.usage.model
        usage.promptTokens += result.usage.promptTokens
        usage.completionTokens += result.usage.completionTokens
        successCount++
        consecutiveRateLimitFailures = 0
      } catch (error) {
        logger.warn(
          `[AiExerciseGenerationPipeline] Passage ${i + 1}/${chunks.length} en échec : ${error?.message || error}`
        )
        warnings.push(`Passage ${i + 1}/${chunks.length} n'a pas pu être traité (${error?.message || 'erreur inconnue'}).`)
        lastError = error
        if (error.usage) {
          usage.model = usage.model ?? error.usage.model ?? null
          usage.promptTokens += error.usage.promptTokens || 0
          usage.completionTokens += error.usage.completionTokens || 0
        }

        if (error.rateLimited) {
          consecutiveRateLimitFailures++
          if (consecutiveRateLimitFailures >= RATE_LIMIT_CIRCUIT_BREAKER_THRESHOLD) {
            logger.error(
              `[AiExerciseGenerationPipeline] ${consecutiveRateLimitFailures} passages consécutifs en rate limit Mistral — ` +
                `arrêt anticipé après le passage ${i + 1}/${chunks.length} plutôt que de tenter les suivants en pure perte.`
            )
            stoppedOnSustainedRateLimit = true
            warnings.push(
              'Limite de débit Mistral atteinte de façon soutenue (plusieurs passages consécutifs rejetés malgré ' +
                'plusieurs tentatives) — génération interrompue avant la fin du contenu. Vérifiez le palier/quota ' +
                'de la clé API sur console.mistral.ai, ou réessayez plus tard.'
            )
            break
          }
        } else {
          consecutiveRateLimitFailures = 0
        }
      }
    }

    if (successCount === 0) {
      // CHOIX : réutiliser le `rateLimited`/message du dernier échec de chunk plutôt qu'un message
      // toujours générique.
      // RAISON : AiExerciseDegradedMode.service.js#describeFailure classe une erreur 502 en
      // `rate_limited`/`invalid_output` en lisant `error.rateLimited`/le texte exact du message — un
      // message générique ici rendait ces deux branches inatteignables via cette route (le seul appelant
      // HTTP réel), l'utilisateur voyait toujours "service indisponible" même sur un rate limit ou une
      // sortie non exploitable.
      const rateLimited = stoppedOnSustainedRateLimit || Boolean(lastError?.rateLimited)
      const isInvalidOutput =
        typeof lastError?.message === 'string' && lastError.message.includes("n'a pas produit un résultat exploitable")

      let message = 'La génération a échoué sur tous les passages du contenu fourni.'
      if (stoppedOnSustainedRateLimit) {
        message = 'La génération a été interrompue : limite de débit Mistral atteinte de façon soutenue ' +
          '(compte probablement sur un palier restrictif ou quota épuisé — voir console.mistral.ai).'
      } else if (isInvalidOutput) {
        message = lastError.message
      }

      const err = new Error(message)
      err.statusCode = 502
      if (rateLimited) err.rateLimited = true
      if (usage.promptTokens > 0 || usage.completionTokens > 0 || usage.ocrPagesProcessed > 0) {
        err.usage = usage
      }
      throw err
    }

    return { questions, warnings, usage }
  }
}

module.exports = new AiExerciseGenerationPipelineService()

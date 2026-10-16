const logger = require('../helpers/logger')
const getMistralConfig = require('../helpers/mistralConfig')

// Périmètre (generation_ia_captioning_image.md, 2026-09-09) : décrit factuellement UNE image/schéma déjà
// extraite d'un PDF (voir PdfExtraction.service.js#extractImages), pour qu'un second appel (génération de
// cartes/exercices) puisse en tirer du contenu — ce service NE génère jamais de carte/exercice lui-même
// (même séparation de responsabilité que AiCardGeneration.service.js/AiExerciseGeneration.service.js).
//
// CHOIX : aucun modèle/config dédié à la vision — `helpers/mistralConfig.js` (apiUrl/model/apiKey/
// timeoutMs) est réutilisé tel quel.
// RAISON : `mistral-small-latest` (déjà le modèle configuré pour C-01.04/C-02.03) supporte nativement la
// vision depuis « Mistral Small 4 » (unifie Pixtral pour le multimodal) — voir DECISIONS.md, 2026-09-09.
// Format d'appel : `content` en tableau, bloc `{ type: "image_url", image_url: "data:image/...;base64,..." }`
// (chaîne, pas d'objet imbriqué `{ url }`) aux côtés d'un bloc `{ type: "text", text: "..." }` — confirmé
// par revue documentaire (docs.mistral.ai/capabilities/vision), à reconfirmer au premier appel réel.

// Filtre les images décoratives (logo, bandeau...) — cas réel déjà rencontré en C-01.05
// (image de bandeau dans 2009_Karpicke_Butler_Roediger.pdf, sans valeur pédagogique).
const MAX_CAPTION_LENGTH_HINT = 500 // indicatif, rappelé au modèle — pas une limite technique dure

// Même risque de 429 soutenu que AiCardGeneration.service.js#callModel (même API Mistral) — mêmes
// valeurs de backoff, voir ce fichier pour le détail du raisonnement.
const RATE_LIMIT_MAX_RETRIES = 3
const RATE_LIMIT_BASE_DELAY_MS = 1000

const SCHEMA_DESCRIPTION = `{
  "isPedagogicalContent": true,
  "caption": "string ou null — description factuelle du schéma",
  "warning": null
}`

class ImageCaptioningService {
  /**
   * Construit le prompt système (règles — cf. generation_ia_captioning_image.md §4.1).
   *
   * @param {string} outputLanguage - Code langue de sortie (ex. "fr")
   * @returns {string}
   */
  buildSystemPrompt(outputLanguage) {
    return `Tu analyses une image extraite d'un document pédagogique pour des étudiants post-bac, dans l'application
MyMemoMaster. Ton rôle est de décrire factuellement ce que montre l'image, pour qu'un second modèle puisse
ensuite en tirer des cartes de révision.

RÈGLES STRICTES :
1. Décris UNIQUEMENT ce qui est visible dans l'image (et, si fourni, ce que le texte de la page environnante
   dit explicitement à son sujet). N'invente jamais une légende, une valeur ou un détail que tu ne peux pas
   lire ou déduire directement.
2. Si l'image n'a AUCUNE valeur pédagogique (logo, bandeau décoratif, photo d'illustration sans contenu
   informatif, filigrane...), indique-le via "isPedagogicalContent": false et laisse "caption" à null — ne
   décris pas une image décorative comme si elle portait un contenu de cours.
3. Si l'image porte un contenu pédagogique (schéma, graphique, diagramme, formule illustrée, tableau...),
   décris-la en ${outputLanguage}, de façon factuelle et concise (recommandé ≤ ${MAX_CAPTION_LENGTH_HINT} caractères),
   dans un registre neutre, sans jugement de valeur, sans contenu sensible ou hors sujet.
4. Réponds UNIQUEMENT avec un objet JSON conforme au schéma fourni. Aucun texte avant ou après le JSON.`
  }

  /**
   * Construit le prompt utilisateur (contexte + consigne + schéma — cf.
   * generation_ia_captioning_image.md §4.2). L'image elle-même n'est PAS incluse ici (texte seul) —
   * ajoutée en tant que bloc `image_url` séparé par `captionImage`.
   *
   * @param {{ pageContext: string|null, subjectContext: string|null }} params
   * @returns {string}
   */
  buildUserPrompt({ pageContext, subjectContext }) {
    const subjectLine = subjectContext ? ` (matière : ${subjectContext})` : ''
    const contextBlock = pageContext
      ? `Texte de la page où apparaît cette image (peut contenir sa légende) :\n"""\n${pageContext}\n"""\n\n`
      : ''
    return `Voici une image extraite d'un document pédagogique${subjectLine}.
${contextBlock}Analyse cette image en respectant strictement les règles du prompt système et le schéma JSON suivant :

${SCHEMA_DESCRIPTION}`
  }

  /**
   * Valide les paramètres d'entrée de captionImage.
   *
   * @param {{ imageBase64: unknown }} params
   * @throws {Error} Entrée invalide (400)
   */
  validateInput({ imageBase64 }) {
    if (typeof imageBase64 !== 'string' || !imageBase64.trim()) {
      const err = new Error("L'image à analyser est requise.")
      err.statusCode = 400
      throw err
    }
  }

  /**
   * Valide l'objet racine renvoyé par le modèle contre le schéma de generation_ia_captioning_image.md §5.
   *
   * @param {unknown} payload
   * @returns {string[]} Liste d'erreurs (vide si le payload est valide)
   */
  validatePayload(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return ['La réponse doit être un objet JSON.']
    }
    if (typeof payload.isPedagogicalContent !== 'boolean') {
      return ['Le champ "isPedagogicalContent" doit être un booléen.']
    }

    const errors = []
    if (payload.isPedagogicalContent) {
      if (typeof payload.caption !== 'string' || !payload.caption.trim()) {
        errors.push('Le champ "caption" doit être une chaîne non vide quand "isPedagogicalContent" est true.')
      }
    } else if (payload.caption != null) {
      errors.push('Le champ "caption" doit être null quand "isPedagogicalContent" est false.')
    }
    if ('warning' in payload && payload.warning !== null && typeof payload.warning !== 'string') {
      errors.push('Le champ "warning" doit être une chaîne ou null.')
    }

    return errors
  }

  /**
   * Parse la sortie brute du modèle (texte) et la valide contre le schéma attendu.
   *
   * @param {string} rawContent
   * @returns {{ valid: true, payload: { isPedagogicalContent: boolean, caption: string|null, warning: string|null } } | { valid: false, errors: string[] }}
   */
  parseAndValidate(rawContent) {
    let payload
    try {
      payload = JSON.parse(rawContent)
    } catch {
      return { valid: false, errors: ["La réponse n'est pas un JSON valide."] }
    }

    const errors = this.validatePayload(payload)
    if (errors.length) return { valid: false, errors }

    return {
      valid: true,
      payload: {
        isPedagogicalContent: payload.isPedagogicalContent,
        caption: payload.isPedagogicalContent ? payload.caption : null,
        warning: payload.warning ?? null
      }
    }
  }

  /**
   * Attend `ms` millisecondes — mockable dans les tests (voir AiCardGeneration.service.js#sleep, même
   * raisonnement).
   *
   * @param {number} ms
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Appelle l'API Mistral (chat completions, sortie JSON forcée) avec l'historique de messages fourni
   * (peut inclure un bloc `image_url`). Ne fait aucun parsing/validation métier. Même politique de
   * retry/backoff sur 429 que AiCardGeneration.service.js#callModel (voir ce fichier pour le détail du
   * raisonnement, identique ici — même API).
   *
   * @param {{ role: string, content: string|object[] }[]} messages
   * @returns {Promise<{ content: string, usage: { promptTokens: number, completionTokens: number } }>}
   * @throws {Error} Configuration manquante (500) ou appel réseau/API en échec (502)
   */
  async callModel(messages) {
    const config = getMistralConfig()

    if (!config.apiKey) {
      const err = new Error('Service de captioning IA non configuré (clé API manquante).')
      err.statusCode = 500
      throw err
    }

    for (let attempt = 0; ; attempt++) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), config.timeoutMs)

      let response
      try {
        response = await fetch(config.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`
          },
          body: JSON.stringify({
            model: config.model,
            messages,
            response_format: { type: 'json_object' },
            // CHOIX: température basse, même raisonnement que AiCardGeneration.service.js — description
            // factuelle d'une image, pas de créativité recherchée.
            temperature: 0.3
          }),
          signal: controller.signal
        })
      } catch (error) {
        logger.error(`[ImageCaptioning] Appel Mistral échoué : ${error?.message || error}`)
        const err = new Error('Le service de captioning IA est indisponible pour le moment.')
        err.statusCode = 502
        throw err
      } finally {
        clearTimeout(timeout)
      }

      if (response.status === 429 && attempt < RATE_LIMIT_MAX_RETRIES) {
        const retryAfterSeconds = Number(response.headers?.get?.('retry-after'))
        const delayMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
          ? retryAfterSeconds * 1000
          : RATE_LIMIT_BASE_DELAY_MS * 2 ** attempt
        logger.warn(
          `[ImageCaptioning] 429 Mistral (rate limit) — nouvel essai dans ${delayMs}ms (${attempt + 1}/${RATE_LIMIT_MAX_RETRIES})`
        )
        await this.sleep(delayMs)
        continue
      }

      if (!response.ok) {
        const bodyText = await response.text().catch(() => '')
        logger.error(`[ImageCaptioning] Réponse Mistral ${response.status} : ${bodyText}`)
        const err = new Error('Le service de captioning IA est indisponible pour le moment.')
        err.statusCode = 502
        if (response.status === 429) err.rateLimited = true
        throw err
      }

      const data = await response.json()
      const content = data?.choices?.[0]?.message?.content
      if (typeof content !== 'string' || !content.trim()) {
        logger.error('[ImageCaptioning] Réponse Mistral sans contenu exploitable.')
        const err = new Error("Le service de captioning IA n'a renvoyé aucun contenu.")
        err.statusCode = 502
        err.usage = { promptTokens: data?.usage?.prompt_tokens ?? 0, completionTokens: data?.usage?.completion_tokens ?? 0 }
        throw err
      }

      return {
        content,
        usage: {
          promptTokens: data?.usage?.prompt_tokens ?? 0,
          completionTokens: data?.usage?.completion_tokens ?? 0
        }
      }
    }
  }

  /**
   * Point d'entrée du service : décrit une image déjà extraite d'un PDF (généralement via
   * PdfExtraction.service.js#extractImages). Sur sortie non conforme au schéma, un seul retry est
   * tenté avant d'échouer explicitement — même politique que AiCardGeneration.service.js#generateCards.
   *
   * Si un appel a réellement consommé des tokens facturés avant que la méthode ne lève une erreur,
   * l'erreur levée porte un champ `usage` (même forme que le `usage` renvoyé en cas de succès) —
   * l'appelant peut journaliser le coût réel même sur un échec (C-01.06). Absent si rien n'a été
   * facturé.
   *
   * @param {object} params
   * @param {string} params.imageBase64 - Image en data URI base64 (voir PdfExtraction.service.js#extractImages)
   * @param {string|null} [params.pageContext] - Texte de la page où l'image a été détectée
   * @param {string|null} [params.subjectContext] - Nom de la matière
   * @param {string} [params.outputLanguage] - Code langue de sortie (défaut "fr")
   * @returns {Promise<{ isPedagogicalContent: boolean, caption: string|null, warning: string|null, usage: { model: string, promptTokens: number, completionTokens: number } }>}
   * @throws {Error} Entrée invalide (400), configuration manquante (500) ou échec du modèle (502)
   */
  async captionImage({ imageBase64, pageContext = null, subjectContext = null, outputLanguage = 'fr' }) {
    this.validateInput({ imageBase64 })

    const messages = [
      { role: 'system', content: this.buildSystemPrompt(outputLanguage) },
      {
        role: 'user',
        content: [
          { type: 'text', text: this.buildUserPrompt({ pageContext, subjectContext }) },
          { type: 'image_url', image_url: imageBase64 }
        ]
      }
    ]

    // Usage cumulé sur les 2 appels au plus (1er essai + éventuel retry) — journalisé par l'appelant
    // (pipeline → contrôleur, C-01.06), pas par ce service. Même pattern que AiCardGeneration.service.js.
    const usage = { promptTokens: 0, completionTokens: 0 }
    const addUsage = (callUsage) => {
      if (!callUsage) return
      usage.promptTokens += callUsage.promptTokens || 0
      usage.completionTokens += callUsage.completionTokens || 0
    }
    const usageWithModel = () => ({ model: getMistralConfig().model, ...usage })

    const callAndTrackUsage = async (msgs) => {
      try {
        const result = await this.callModel(msgs)
        addUsage(result.usage)
        return result
      } catch (error) {
        addUsage(error.usage)
        if (usage.promptTokens > 0 || usage.completionTokens > 0) {
          error.usage = usageWithModel()
        }
        throw error
      }
    }

    const first = await callAndTrackUsage(messages)
    const firstResult = this.parseAndValidate(first.content)
    if (firstResult.valid) {
      return { ...firstResult.payload, usage: usageWithModel() }
    }

    logger.warn(`[ImageCaptioning] Sortie non conforme (1er essai) : ${firstResult.errors.join(' ; ')}`)

    messages.push({ role: 'assistant', content: first.content })
    messages.push({
      role: 'user',
      content:
        `Ta réponse précédente n'est pas conforme au schéma attendu : ${firstResult.errors.join(' ; ')}. ` +
        'Renvoie uniquement un objet JSON strictement conforme au schéma fourni, sans aucun texte autour.'
    })

    const second = await callAndTrackUsage(messages)
    const secondResult = this.parseAndValidate(second.content)
    if (secondResult.valid) {
      return { ...secondResult.payload, usage: usageWithModel() }
    }

    logger.error(`[ImageCaptioning] Sortie non conforme après retry : ${secondResult.errors.join(' ; ')}`)
    const err = new Error("Le captioning n'a pas produit un résultat exploitable.")
    err.statusCode = 502
    err.usage = usageWithModel()
    throw err
  }
}

module.exports = new ImageCaptioningService()

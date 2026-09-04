const logger = require('../helpers/logger')
const getMistralConfig = require('../helpers/mistralConfig')
const { dedupeCards } = require('../helpers/aiGenerationQualityChecks')

// Périmètre C-01.04 (« Service inférence IA — appel LLM, parsing ») : ce service exécute le
// prompt spécifié en C-01.01 (diagrams/generation_ia_prompt_cartes.md) sur le modèle retenu en
// C-01.03 (diagrams/generation_ia_llm_benchmark.md), et parse/valide la sortie. Il NE fait PAS :
// - le découpage du contenu source (Chunking PDF, hors périmètre — sourceText est déjà un chunk)
// - l'application de quotas (hors périmètre — voir garde-fou technique ci-dessous, distinct)
// - la persistance ni la validation utilisateur (Écran de validation, hors périmètre — ce service
//   ne retourne qu'un brouillon en mémoire, jamais d'écriture en base)

const CARD_TYPES = ['open', 'mcq', 'mixed']

// Garde-fou technique du service (protège CE service d'un appel manifestement aberrant), PAS une
// implémentation de Quotas (hors périmètre — arbitrage produit/coût encore à faire séparément).
const MAX_CARD_COUNT = 30

// Constaté en prod (2026-09-04) : une génération sur un contenu source long (plusieurs dizaines de
// chunks, AiCardGenerationPipeline.service.js) déclenche des appels séquentiels rapprochés — sans
// délai entre eux, une réponse 429 de Mistral atteinte sur un chunk se reproduit immédiatement sur
// tous les suivants (observé : 10 chunks en échec sur ~1,2 s, tous "429 Rate limit exceeded"), la
// génération entière échoue alors qu'un simple ralentissement l'aurait absorbée. Backoff exponentiel
// borné à 3 tentatives, respecte l'en-tête `Retry-After` de Mistral quand il est fourni.
const RATE_LIMIT_MAX_RETRIES = 3
const RATE_LIMIT_BASE_DELAY_MS = 1000

// Reproduit tel quel le schéma de sortie documenté dans generation_ia_prompt_cartes.md §4, injecté
// dans le prompt utilisateur pour réduire le risque de sortie non conforme (plus fiable qu'un
// simple renvoi au nom du schéma — cf. document, §3.2).
const SCHEMA_DESCRIPTION = `{
  "cards": [
    {
      "statement": "string — l'énoncé de la carte (le recto)",
      "type": "open",
      "answer": "string — réponse de référence (type \\"open\\" uniquement)",
      "acceptedAnswers": ["string", "..."],
      "options": null,
      "sourceExcerpt": "string — extrait exact du texte source justifiant la carte"
    },
    {
      "statement": "string",
      "type": "mcq",
      "answer": null,
      "acceptedAnswers": null,
      "options": [
        { "text": "string", "correct": true },
        { "text": "string", "correct": false },
        { "text": "string", "correct": false }
      ],
      "sourceExcerpt": "string"
    }
  ],
  "warning": null
}`

class AiCardGenerationService {
  /**
   * Construit le prompt système (règles de génération — cf. generation_ia_prompt_cartes.md §3.1).
   *
   * @param {string} outputLanguage - Code langue de sortie (ex. "fr")
   * @returns {string}
   */
  buildSystemPrompt(outputLanguage) {
    return `Tu es un générateur de cartes de révision pour des étudiants post-bac, dans l'application MyMemoMaster.
Ton rôle est de transformer un extrait de contenu pédagogique en cartes de type question/réponse
pour un système de répétition espacée (méthode Leitner).

RÈGLES STRICTES :
1. N'utilise QUE les informations présentes dans le texte source fourni. N'invente jamais un fait,
   une date, une définition ou un chiffre absent du texte. Si une carte nécessiterait une information
   non présente dans le texte, ne la génère pas.
2. Une carte = une notion atomique. N'empile jamais plusieurs questions dans un même énoncé.
3. Ne produis jamais deux cartes portant sur exactement la même notion — y compris en la reformulant
   sous un angle différent (ex : "Quelle est la valeur de X ?", "Dans quel contexte X est-elle vraie ?"
   et "Citez X" portent sur UNE SEULE notion, jamais trois cartes séparées).
4. Formule les questions et réponses en langue ${outputLanguage}, dans un registre neutre,
   sans jugement de valeur, sans contenu sensible, discriminatoire ou hors sujet. Si le texte source
   contient un tel passage, ignore-le plutôt que de le retranscrire dans une carte.
5. Chaque carte doit citer, dans le champ "sourceExcerpt", le passage exact du texte source qui
   justifie la carte (traçabilité pour la relecture utilisateur).
6. Réponds UNIQUEMENT avec un objet JSON conforme au schéma fourni. Aucun texte avant ou après le JSON.
7. Si le texte source ne contient pas assez de faits distincts pour atteindre le nombre de cartes
   demandé SANS enfreindre la règle 3, génère MOINS de cartes que demandé plutôt que de combler par
   reformulation, paraphrase ou découpage artificiel d'un même fait. Un nombre de cartes inférieur à
   la demande, accompagné d'un "warning" expliquant pourquoi, est une sortie valide et préférable à
   des cartes redondantes.`
  }

  /**
   * Construit le prompt utilisateur (contenu source + consigne + schéma — cf.
   * generation_ia_prompt_cartes.md §3.2).
   *
   * @param {{ sourceText: string, subjectContext: string|null, cardCount: number, cardType: string }} params
   * @returns {string}
   */
  buildUserPrompt({ sourceText, subjectContext, cardCount, cardType }) {
    const subjectLine = subjectContext ? ` (matière : ${subjectContext})` : ''
    return `Voici un extrait de contenu pédagogique${subjectLine} :

"""
${sourceText}
"""

Génère ${cardCount} carte(s) de révision de type "${cardType}" à partir de ce texte,
en respectant strictement les règles du prompt système et le schéma JSON suivant.
Rappel (règle 7) : si ce texte ne permet pas de justifier ${cardCount} cartes réellement distinctes,
génère-en moins et explique pourquoi dans "warning" — ne multiplie jamais les angles sur un même fait
pour atteindre ${cardCount}.

${SCHEMA_DESCRIPTION}`
  }

  /**
   * Valide les paramètres d'entrée de generateCards. Lève une erreur (statusCode 400) au premier
   * champ invalide — messages en français, destinés à remonter tels quels côté appelant.
   *
   * @param {{ sourceText: unknown, cardCount: unknown, cardType: unknown }} params
   * @throws {Error}
   */
  validateInput({ sourceText, cardCount, cardType }) {
    if (typeof sourceText !== 'string' || !sourceText.trim()) {
      const err = new Error('Le contenu source est requis.')
      err.statusCode = 400
      throw err
    }
    if (!Number.isInteger(cardCount) || cardCount < 1) {
      const err = new Error('Le nombre de cartes demandé doit être un entier positif.')
      err.statusCode = 400
      throw err
    }
    if (cardCount > MAX_CARD_COUNT) {
      const err = new Error(`Le nombre de cartes demandé ne peut pas dépasser ${MAX_CARD_COUNT}.`)
      err.statusCode = 400
      throw err
    }
    if (!CARD_TYPES.includes(cardType)) {
      const err = new Error(`Le type de carte doit être l'un de : ${CARD_TYPES.join(', ')}.`)
      err.statusCode = 400
      throw err
    }
  }

  /**
   * Valide une carte individuelle contre le schéma de generation_ia_prompt_cartes.md §4.
   *
   * @param {unknown} card
   * @param {number} index
   * @returns {string[]} Liste d'erreurs (vide si la carte est valide)
   */
  validateCard(card, index) {
    const prefix = `Carte #${index + 1}`
    if (!card || typeof card !== 'object' || Array.isArray(card)) {
      return [`${prefix} : doit être un objet.`]
    }

    const errors = []
    if (typeof card.statement !== 'string' || !card.statement.trim()) {
      errors.push(`${prefix} : "statement" manquant ou vide.`)
    }
    if (typeof card.sourceExcerpt !== 'string' || !card.sourceExcerpt.trim()) {
      errors.push(`${prefix} : "sourceExcerpt" manquant ou vide.`)
    }

    if (card.type === 'open') {
      if (typeof card.answer !== 'string' || !card.answer.trim()) {
        errors.push(`${prefix} : "answer" manquant ou vide pour une carte "open".`)
      }
      if (card.acceptedAnswers != null && !Array.isArray(card.acceptedAnswers)) {
        errors.push(`${prefix} : "acceptedAnswers" doit être un tableau ou null.`)
      }
    } else if (card.type === 'mcq') {
      if (!Array.isArray(card.options) || card.options.length < 3 || card.options.length > 4) {
        errors.push(`${prefix} : "options" doit contenir 3 à 4 entrées pour une carte "mcq".`)
      } else {
        const correctCount = card.options.filter((o) => o && o.correct === true).length
        if (correctCount !== 1) {
          errors.push(
            `${prefix} : "options" doit contenir exactement une entrée "correct: true" (trouvé ${correctCount}).`
          )
        }
        const hasInvalidOption = card.options.some((o) => !o || typeof o.text !== 'string' || !o.text.trim())
        if (hasInvalidOption) {
          errors.push(`${prefix} : chaque option doit avoir un "text" non vide.`)
        }
      }
    } else {
      errors.push(`${prefix} : "type" doit être "open" ou "mcq" (reçu ${JSON.stringify(card.type)}).`)
    }

    return errors
  }

  /**
   * Valide l'objet racine renvoyé par le modèle contre le schéma de generation_ia_prompt_cartes.md §4.
   *
   * @param {unknown} payload
   * @param {number} cardCount - Nombre de cartes demandé (le modèle ne doit jamais en produire plus, §5.5)
   * @param {string} [cardType] - Type demandé ("open"/"mcq"/"mixed", défaut "mixed" = aucune contrainte
   *   de type par carte). Si "open" ou "mcq", chaque carte doit avoir exactement ce `type` — un modèle
   *   qui mélange les types alors qu'un seul était demandé est traité comme une sortie non conforme
   *   (constaté en pratique : un appel réel avec `cardType: "mcq"` a renvoyé une carte "open").
   * @returns {string[]} Liste d'erreurs (vide si le payload est valide)
   */
  validatePayload(payload, cardCount, cardType = 'mixed') {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return ['La réponse doit être un objet JSON.']
    }
    if (!Array.isArray(payload.cards)) {
      return ['Le champ "cards" doit être un tableau.']
    }

    const errors = []
    if (payload.cards.length > cardCount) {
      errors.push(
        `Le nombre de cartes renvoyées (${payload.cards.length}) dépasse le nombre demandé (${cardCount}).`
      )
    }
    if ('warning' in payload && payload.warning !== null && typeof payload.warning !== 'string') {
      errors.push('Le champ "warning" doit être une chaîne ou null.')
    }
    payload.cards.forEach((card, index) => {
      errors.push(...this.validateCard(card, index))
      if (cardType !== 'mixed' && card && card.type && card.type !== cardType) {
        errors.push(
          `Carte #${index + 1} : type "${card.type}" ne correspond pas au type demandé "${cardType}".`
        )
      }
    })

    return errors
  }

  /**
   * Parse la sortie brute du modèle (texte) et la valide contre le schéma attendu.
   *
   * @param {string} rawContent
   * @param {number} cardCount
   * @param {string} [cardType] - Type demandé, transmis à validatePayload (défaut "mixed")
   * @returns {{ valid: true, payload: { cards: object[], warning: string|null } } | { valid: false, errors: string[] }}
   */
  parseAndValidate(rawContent, cardCount, cardType = 'mixed') {
    let payload
    try {
      payload = JSON.parse(rawContent)
    } catch {
      return { valid: false, errors: ["La réponse n'est pas un JSON valide."] }
    }

    const errors = this.validatePayload(payload, cardCount, cardType)
    if (errors.length) return { valid: false, errors }

    return {
      valid: true,
      payload: { cards: payload.cards, warning: payload.warning ?? null }
    }
  }

  /**
   * Filet de sécurité applicatif (C-01.10, suite à l'écart trouvé par le protocole de qualité —
   * docs/RAPPORT_QUALITE_GENERATION_IA.md §4) : retire les cartes en doublon d'un payload validé,
   * indépendamment de la discipline du modèle sur la règle 7 du prompt système. N'agit qu'après
   * validation de schéma réussie — ne remplace pas le retry sur sortie non conforme (parseAndValidate),
   * traite un problème différent (redondance de contenu, pas non-conformité de structure).
   *
   * @param {{ cards: object[], warning: string|null }} payload
   * @returns {{ cards: object[], warning: string|null }}
   */
  applyDedupeSafetyNet(payload) {
    const { cards, removedCount } = dedupeCards(payload.cards)
    if (!removedCount) return payload

    logger.warn(`[AiCardGeneration] ${removedCount} carte(s) redondante(s) filtrée(s) après génération.`)
    const extraWarning = `${removedCount} carte(s) supprimée(s) automatiquement car redondante(s) avec une autre carte du même lot.`
    return {
      cards,
      warning: payload.warning ? `${payload.warning} ${extraWarning}` : extraWarning
    }
  }

  /**
   * Attend `ms` millisecondes — extrait en méthode plutôt qu'un `setTimeout` inline pour être
   * mockable telle quelle dans les tests (évite d'attendre réellement le backoff 429 ci-dessous).
   *
   * @param {number} ms
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Appelle l'API Mistral (chat completions, sortie JSON forcée) avec l'historique de messages
   * fourni. Ne fait aucun parsing/validation métier — seulement l'appel réseau et l'extraction du
   * contenu texte de la réponse. Renvoie aussi la consommation de tokens rapportée par l'API
   * (`usage`), utilisée par le contrôleur pour journaliser le coût réel (C-01.06, Gestion quotas
   * et budget IA) — ce service ne journalise rien lui-même, il se contente de la faire remonter.
   *
   * Une réponse `429` (rate limit Mistral) déclenche jusqu'à `RATE_LIMIT_MAX_RETRIES` nouvelles
   * tentatives avec un backoff exponentiel (respecte l'en-tête `Retry-After` si Mistral le fournit)
   * avant de se comporter comme n'importe quelle autre erreur HTTP — voir le commentaire sur
   * `RATE_LIMIT_MAX_RETRIES` en tête de fichier.
   *
   * @param {{ role: string, content: string }[]} messages
   * @returns {Promise<{ content: string, usage: { promptTokens: number, completionTokens: number } }>}
   * @throws {Error} Configuration manquante (500) ou appel réseau/API en échec (502)
   */
  async callModel(messages) {
    const config = getMistralConfig()

    if (!config.apiKey) {
      const err = new Error('Service de génération IA non configuré (clé API manquante).')
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
            // CHOIX: response_format json_object plutôt qu'un schéma custom Mistral (Custom
            // Structured Outputs) pour cette première version.
            // RAISON: le schéma de generation_ia_prompt_cartes.md §4 comporte des champs
            // conditionnels selon "type" (open vs mcq) qu'un schéma JSON strict représenterait mal
            // sans dupliquer les cartes en deux variants ; json_object + rappel explicite du schéma
            // dans le prompt (voir SCHEMA_DESCRIPTION) est la même stratégie déjà documentée en
            // C-01.01. Le passage au schéma custom reste une piste d'amélioration si le taux de
            // conformité mesuré (protocole du benchmark, C-01.03 §8) s'avère insuffisant.
            response_format: { type: 'json_object' },
            // CHOIX: température basse (extraction structurée ancrée sur un texte source, pas de
            // créativité recherchée) plutôt que la valeur par défaut du modèle.
            temperature: 0.3
          }),
          signal: controller.signal
        })
      } catch (error) {
        logger.error(`[AiCardGeneration] Appel Mistral échoué : ${error?.message || error}`)
        const err = new Error('Le service de génération IA est indisponible pour le moment.')
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
          `[AiCardGeneration] 429 Mistral (rate limit) — nouvel essai dans ${delayMs}ms (${attempt + 1}/${RATE_LIMIT_MAX_RETRIES})`
        )
        await this.sleep(delayMs)
        continue
      }

      if (!response.ok) {
        const bodyText = await response.text().catch(() => '')
        logger.error(`[AiCardGeneration] Réponse Mistral ${response.status} : ${bodyText}`)
        const err = new Error('Le service de génération IA est indisponible pour le moment.')
        err.statusCode = 502
        throw err
      }

      const data = await response.json()
      const content = data?.choices?.[0]?.message?.content
      if (typeof content !== 'string' || !content.trim()) {
        logger.error('[AiCardGeneration] Réponse Mistral sans contenu exploitable.')
        const err = new Error("Le service de génération IA n'a renvoyé aucun contenu.")
        err.statusCode = 502
        // L'appel a réellement abouti côté Mistral (réponse 200, tokens facturés) même sans contenu
        // exploitable — l'usage réel est attaché à l'erreur pour ne pas être perdu par l'appelant
        // (C-01.06, cf. dette signalée dans CHANGELOG_AGENT.md).
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
   * Point d'entrée du service : exécute le prompt de génération de cartes (C-01.01) sur le modèle
   * retenu (C-01.03) et retourne un brouillon de cartes, jamais persisté par ce service (rappel
   * périmètre OUT : aucune génération sans validation utilisateur — voir generation_ia_prompt_cartes.md
   * §1 et generation_ia_ui.md).
   *
   * Sur sortie non conforme au schéma, un seul retry est tenté (le contenu invalide et le détail de
   * l'erreur sont renvoyés au modèle) avant d'échouer explicitement — jamais de brouillon partiel ou
   * reconstruit approximativement (cf. generation_ia_prompt_cartes.md §7).
   *
   * Si un appel a réellement consommé des tokens facturés avant que la méthode ne lève une erreur
   * (échec après un ou deux appels réels), l'erreur levée porte un champ `usage` (même forme que le
   * `usage` renvoyé en cas de succès) — l'appelant peut ainsi journaliser le coût réel même sur un
   * échec (C-01.06). Absent si rien n'a été facturé (erreur avant tout appel, ou appel réseau qui
   * n'a jamais atteint l'API).
   *
   * @param {object} params
   * @param {string} params.sourceText - Chunk de contenu source déjà découpé (Chunking PDF, hors périmètre)
   * @param {string|null} [params.subjectContext] - Nom de la matière, aide à lever les ambiguïtés
   * @param {number} params.cardCount - Nombre de cartes cible (1 à 30)
   * @param {string} [params.cardType] - "open" | "mcq" | "mixed" (défaut "open")
   * @param {string} [params.outputLanguage] - Code langue de sortie (défaut "fr")
   * @returns {Promise<{ cards: object[], warning: string|null, usage: { model: string, promptTokens: number, completionTokens: number } }>}
   * @throws {Error} Entrée invalide (400), configuration manquante (500) ou échec du modèle (502)
   */
  async generateCards({ sourceText, subjectContext = null, cardCount, cardType = 'open', outputLanguage = 'fr' }) {
    this.validateInput({ sourceText, cardCount, cardType })

    const messages = [
      { role: 'system', content: this.buildSystemPrompt(outputLanguage) },
      { role: 'user', content: this.buildUserPrompt({ sourceText, subjectContext, cardCount, cardType }) }
    ]

    // Usage cumulé sur les 2 appels au plus (1er essai + éventuel retry) — journalisé par
    // l'appelant (contrôleur, C-01.06), pas par ce service.
    const usage = { promptTokens: 0, completionTokens: 0 }
    const addUsage = (callUsage) => {
      if (!callUsage) return
      usage.promptTokens += callUsage.promptTokens || 0
      usage.completionTokens += callUsage.completionTokens || 0
    }
    const usageWithModel = () => ({ model: getMistralConfig().model, ...usage })

    // Point d'attention (C-01.06) : si un appel échoue APRÈS avoir réellement consommé des tokens
    // facturés (ex. callModel#"contenu vide" — réponse 200 avec usage réel mais sans texte
    // exploitable), l'usage ne doit pas être perdu même si generateCards finit par lever une
    // erreur. Chaque appel passe par ce wrapper : succès → usage ajouté normalement ; échec →
    // l'usage éventuellement porté par l'erreur (callModel) est ajouté avant de relancer, et le
    // total accumulé jusqu'ici est attaché à l'erreur (seulement s'il est réellement non nul — pas
    // la peine de journaliser un coût de zéro sur un simple échec réseau où rien n'a été facturé).
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
    const firstResult = this.parseAndValidate(first.content, cardCount, cardType)
    if (firstResult.valid) {
      return { ...this.applyDedupeSafetyNet(firstResult.payload), usage: usageWithModel() }
    }

    logger.warn(`[AiCardGeneration] Sortie non conforme (1er essai) : ${firstResult.errors.join(' ; ')}`)

    messages.push({ role: 'assistant', content: first.content })
    messages.push({
      role: 'user',
      content:
        `Ta réponse précédente n'est pas conforme au schéma attendu : ${firstResult.errors.join(' ; ')}. ` +
        'Renvoie uniquement un objet JSON strictement conforme au schéma fourni, sans aucun texte autour.'
    })

    const second = await callAndTrackUsage(messages)
    const secondResult = this.parseAndValidate(second.content, cardCount, cardType)
    if (secondResult.valid) {
      return { ...this.applyDedupeSafetyNet(secondResult.payload), usage: usageWithModel() }
    }

    logger.error(`[AiCardGeneration] Sortie non conforme après retry : ${secondResult.errors.join(' ; ')}`)
    const err = new Error("La génération n'a pas produit un résultat exploitable. Réessayez.")
    err.statusCode = 502
    // Les 2 appels ont réellement abouti (réponses exploitées, juste non conformes au schéma) —
    // l'usage réel est garanti non nul ici, toujours attaché.
    err.usage = usageWithModel()
    throw err
  }
}

module.exports = new AiCardGenerationService()

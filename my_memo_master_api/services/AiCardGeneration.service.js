const logger = require('../helpers/logger')
const getMistralConfig = require('../helpers/mistralConfig')

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
3. Ne produis jamais deux cartes portant sur exactement la même notion.
4. Formule les questions et réponses en langue ${outputLanguage}, dans un registre neutre,
   sans jugement de valeur, sans contenu sensible, discriminatoire ou hors sujet. Si le texte source
   contient un tel passage, ignore-le plutôt que de le retranscrire dans une carte.
5. Chaque carte doit citer, dans le champ "sourceExcerpt", le passage exact du texte source qui
   justifie la carte (traçabilité pour la relecture utilisateur).
6. Réponds UNIQUEMENT avec un objet JSON conforme au schéma fourni. Aucun texte avant ou après le JSON.`
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
en respectant strictement les règles du prompt système et le schéma JSON suivant :

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
   * Appelle l'API Mistral (chat completions, sortie JSON forcée) avec l'historique de messages
   * fourni. Ne fait aucun parsing/validation métier — seulement l'appel réseau et l'extraction du
   * contenu texte de la réponse.
   *
   * @param {{ role: string, content: string }[]} messages
   * @returns {Promise<string>} Contenu texte brut renvoyé par le modèle
   * @throws {Error} Configuration manquante (500) ou appel réseau/API en échec (502)
   */
  async callModel(messages) {
    const config = getMistralConfig()

    if (!config.apiKey) {
      const err = new Error('Service de génération IA non configuré (clé API manquante).')
      err.statusCode = 500
      throw err
    }

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
      throw err
    }

    return content
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
   * @param {object} params
   * @param {string} params.sourceText - Chunk de contenu source déjà découpé (Chunking PDF, hors périmètre)
   * @param {string|null} [params.subjectContext] - Nom de la matière, aide à lever les ambiguïtés
   * @param {number} params.cardCount - Nombre de cartes cible (1 à 30)
   * @param {string} [params.cardType] - "open" | "mcq" | "mixed" (défaut "open")
   * @param {string} [params.outputLanguage] - Code langue de sortie (défaut "fr")
   * @returns {Promise<{ cards: object[], warning: string|null }>}
   * @throws {Error} Entrée invalide (400), configuration manquante (500) ou échec du modèle (502)
   */
  async generateCards({ sourceText, subjectContext = null, cardCount, cardType = 'open', outputLanguage = 'fr' }) {
    this.validateInput({ sourceText, cardCount, cardType })

    const messages = [
      { role: 'system', content: this.buildSystemPrompt(outputLanguage) },
      { role: 'user', content: this.buildUserPrompt({ sourceText, subjectContext, cardCount, cardType }) }
    ]

    const firstContent = await this.callModel(messages)
    const firstResult = this.parseAndValidate(firstContent, cardCount, cardType)
    if (firstResult.valid) return firstResult.payload

    logger.warn(`[AiCardGeneration] Sortie non conforme (1er essai) : ${firstResult.errors.join(' ; ')}`)

    messages.push({ role: 'assistant', content: firstContent })
    messages.push({
      role: 'user',
      content:
        `Ta réponse précédente n'est pas conforme au schéma attendu : ${firstResult.errors.join(' ; ')}. ` +
        'Renvoie uniquement un objet JSON strictement conforme au schéma fourni, sans aucun texte autour.'
    })

    const secondContent = await this.callModel(messages)
    const secondResult = this.parseAndValidate(secondContent, cardCount, cardType)
    if (secondResult.valid) return secondResult.payload

    logger.error(`[AiCardGeneration] Sortie non conforme après retry : ${secondResult.errors.join(' ; ')}`)
    const err = new Error("La génération n'a pas produit un résultat exploitable. Réessayez.")
    err.statusCode = 502
    throw err
  }
}

module.exports = new AiCardGenerationService()

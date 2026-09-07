const logger = require('../helpers/logger')
const getMistralConfig = require('../helpers/mistralConfig')
const { dedupeCards } = require('../helpers/aiGenerationQualityChecks')
const { QUESTION_TYPES, validateContentByType } = require('../helpers/exerciseContentValidation')

// Périmètre C-02.03 (« Service génération exercices — LLM, parsing ») : ce service exécute le
// prompt spécifié en C-02.01 (diagrams/generation_ia_exercices_types.md) sur le modèle retenu pour
// la feature voisine C-01 (diagrams/generation_ia_llm_benchmark.md — orientation Mistral AI étendue
// à C-02, cf. generation_ia_exercices_types.md §12), et parse/valide la sortie. Il NE fait PAS :
// - le découpage du contenu source (Chunking PDF, hors périmètre — sourceText est déjà un chunk,
//   même limite que AiCardGeneration.service.js#C-01.04)
// - l'application de quotas (hors périmètre — voir garde-fou technique ci-dessous, distinct ;
//   generation_ia_exercices_types.md §12 : aucun arbitrage de quotas propre à C-02 n'est encore tranché)
// - la persistance ni la validation utilisateur (Interface de révision, hors périmètre — ce service
//   ne retourne qu'un brouillon en mémoire, jamais d'écriture en base ; le mapping vers
//   POST /tests + POST /questions reste une hypothèse de travail, generation_ia_exercices_types.md §7)
// - la revalidation d'un brouillon édité juste avant import (Validation format sortie avant import,
//   C-02.04, services/AiExerciseImportValidation.service.js) — ce service valide la sortie BRUTE du
//   LLM (avant toute édition utilisateur), pas un brouillon potentiellement modifié en Interface de
//   révision ; les deux services partagent néanmoins les mêmes règles de forme pour `content`
//   (helpers/exerciseContentValidation.js), un seul endroit à faire évoluer si le contrat change.

// Garde-fou technique du service (protège CE service d'un appel manifestement aberrant), PAS une
// implémentation de Quotas — même statut que MAX_CARD_COUNT dans AiCardGeneration.service.js
// (C-01.04). CHOIX : reprendre la même valeur (30) par cohérence avec la feature voisine, en
// l'absence de toute borne chiffrée actée pour C-02 (generation_ia_exercices_types.md §12, « Aucune
// borne chiffrée sur questionCount n'est fixée ici » — dépend d'un futur arbitrage de quotas).
// RAISON : hypothèse de départ raisonnable, pas une décision mesurée pour ce prompt précis — à
// documenter dans DECISIONS.md et à revoir si un ticket Quotas dédié à C-02 tranche autrement.
const MAX_QUESTION_COUNT = 30

// Même stratégie de résilience que AiCardGeneration.service.js#callModel (constatée en prod le
// 2026-09-04 sur la feature voisine C-01) : backoff exponentiel borné à 3 tentatives, respecte
// l'en-tête `Retry-After` de Mistral quand il est fourni.
const RATE_LIMIT_MAX_RETRIES = 3
const RATE_LIMIT_BASE_DELAY_MS = 1000

// Reproduit tel quel le schéma de sortie documenté dans generation_ia_exercices_types.md §5, injecté
// dans le prompt utilisateur pour réduire le risque de sortie non conforme (même stratégie que
// generation_ia_prompt_cartes.md §3.2 / AiCardGeneration.service.js).
const SCHEMA_DESCRIPTION = `{
  "questions": [
    {
      "statement": "string — l'énoncé de la question",
      "type": "open",
      "content": { "correct_answer": "string", "accepted_answers": ["string", "..."] },
      "sourceExcerpt": "string — extrait exact du texte source justifiant la question"
    },
    {
      "statement": "string",
      "type": "mcq",
      "content": {
        "options": [
          { "text": "string", "correct": true },
          { "text": "string", "correct": false },
          { "text": "string", "correct": false }
        ]
      },
      "sourceExcerpt": "string"
    },
    {
      "statement": "string",
      "type": "fill_blank",
      "content": {
        "template": "string avec marqueurs {{0}}, {{1}}...",
        "blanks": ["string", "..."]
      },
      "sourceExcerpt": "string"
    },
    {
      "statement": "string",
      "type": "reorder",
      "content": { "fragments": ["string", "..."] },
      "sourceExcerpt": "string"
    }
  ],
  "warning": null
}`

class AiExerciseGenerationService {
  /**
   * Construit le prompt système (règles de génération — cf. generation_ia_exercices_types.md §4.1).
   *
   * @param {string} outputLanguage - Code langue de sortie (ex. "fr")
   * @returns {string}
   */
  buildSystemPrompt(outputLanguage) {
    return `Tu es un générateur d'exercices de révision pour des étudiants post-bac, dans l'application MyMemoMaster.
Ton rôle est de transformer un extrait de contenu pédagogique en questions d'exercice, réparties entre
4 types possibles : question ouverte, QCM, texte à trous, remise en ordre.

RÈGLES STRICTES :
1. N'utilise QUE les informations présentes dans le texte source fourni. N'invente jamais un fait,
   une date, une définition ou un chiffre absent du texte. Si une question nécessiterait une information
   non présente dans le texte, ne la génère pas.
2. Une question = une notion atomique. Ne produis jamais deux questions portant sur exactement la même
   notion — y compris entre deux types différents (ex : une question "open" et une question "mcq"
   posant, au fond, la même question, ne sont jamais toutes les deux valables).
3. Formule les questions en langue ${outputLanguage}, dans un registre neutre, sans jugement de valeur,
   sans contenu sensible, discriminatoire ou hors sujet. Si le texte source contient un tel passage,
   ignore-le plutôt que de le retranscrire dans une question.
4. Chaque question doit citer, dans le champ "sourceExcerpt", le passage exact du texte source qui la
   justifie (traçabilité pour la relecture utilisateur).
5. Pour le type "open" : "correct_answer" doit être une phrase complète et autoportante, jamais un mot
   ou groupe nominal isolé. Tu peux ajouter des variantes dans "accepted_answers" UNIQUEMENT si le texte
   source justifie réellement plusieurs formulations distinctes de la même notion (ex. une formule
   symbolique et son énoncé en toutes lettres) — jamais pour remplacer une réponse principale mal formulée.
6. Pour le type "mcq" : produis 3 à 4 options, dont EXACTEMENT une marquée correcte. Les distracteurs
   doivent être plausibles (même registre, longueur comparable) sans jamais être également défendables
   comme corrects.
7. Pour le type "fill_blank" : le champ "template" doit contenir des marqueurs "{{0}}", "{{1}}", etc.,
   strictement séquentiels à partir de 0, en nombre EXACTEMENT égal à la longueur du tableau "blanks". Ne
   retire jamais un mot dont l'absence laisse la phrase devinable sans connaître la notion (ex. jamais un
   simple article ou mot de liaison) — retire un terme porteur de sens (nom propre, terme technique, chiffre).
8. Pour le type "reorder" : le tableau "fragments" doit avoir un ordre unique et non ambigu — deux
   fragments ne doivent jamais pouvoir être permutés sans changer le sens de la phrase reconstituée. Au
   moins 2 fragments distincts sont requis.
9. Si "questionType" vaut "mixed", choisis le type le plus adapté à chaque question individuellement, en
   fonction de la nature de la notion source — jamais une répartition forcée en proportions fixes entre
   types.
10. Réponds UNIQUEMENT avec un objet JSON conforme au schéma fourni. Aucun texte avant ou après le JSON.
11. Si le texte source ne contient pas assez de faits distincts pour atteindre le nombre de questions
    demandé SANS enfreindre la règle 2, génère MOINS de questions que demandé plutôt que de combler par
    reformulation, paraphrase ou découpage artificiel d'un même fait. Un nombre de questions inférieur à
    la demande, accompagné d'un "warning" expliquant pourquoi, est une sortie valide et préférable à des
    questions redondantes.`
  }

  /**
   * Construit le prompt utilisateur (contenu source + consigne + schéma — cf.
   * generation_ia_exercices_types.md §4.2).
   *
   * @param {{ sourceText: string, subjectContext: string|null, questionCount: number, questionType: string }} params
   * @returns {string}
   */
  buildUserPrompt({ sourceText, subjectContext, questionCount, questionType }) {
    const subjectLine = subjectContext ? ` (matière : ${subjectContext})` : ''
    return `Voici un extrait de contenu pédagogique${subjectLine} :

"""
${sourceText}
"""

Génère ${questionCount} question(s) d'exercice de type "${questionType}" à partir de ce texte,
en respectant strictement les règles du prompt système et le schéma JSON suivant.
Rappel (règle 11) : si ce texte ne permet pas de justifier ${questionCount} questions réellement
distinctes, génère-en moins et explique pourquoi dans "warning" — ne multiplie jamais les angles sur un
même fait pour atteindre ${questionCount}.

${SCHEMA_DESCRIPTION}`
  }

  /**
   * Valide les paramètres d'entrée de generateExercises. Lève une erreur (statusCode 400) au premier
   * champ invalide — messages en français, destinés à remonter tels quels côté appelant.
   *
   * @param {{ sourceText: unknown, questionCount: unknown, questionType: unknown }} params
   * @throws {Error}
   */
  validateInput({ sourceText, questionCount, questionType }) {
    if (typeof sourceText !== 'string' || !sourceText.trim()) {
      const err = new Error('Le contenu source est requis.')
      err.statusCode = 400
      throw err
    }
    if (!Number.isInteger(questionCount) || questionCount < 1) {
      const err = new Error('Le nombre de questions demandé doit être un entier positif.')
      err.statusCode = 400
      throw err
    }
    if (questionCount > MAX_QUESTION_COUNT) {
      const err = new Error(`Le nombre de questions demandé ne peut pas dépasser ${MAX_QUESTION_COUNT}.`)
      err.statusCode = 400
      throw err
    }
    if (!['mixed', ...QUESTION_TYPES].includes(questionType)) {
      const err = new Error(`Le type de question doit être l'un de : ${['mixed', ...QUESTION_TYPES].join(', ')}.`)
      err.statusCode = 400
      throw err
    }
  }

  /**
   * Valide une question individuelle contre le schéma de generation_ia_exercices_types.md §5. La
   * conformité de `content` par type est déléguée à helpers/exerciseContentValidation.js (partagée
   * avec AiExerciseImportValidation.service.js, C-02.04) — ce service y ajoute les deux champs
   * propres à la sortie LLM brute : `statement` et `sourceExcerpt` (traçabilité de génération,
   * jamais persistée — voir helpers/exerciseContentValidation.js, en-tête).
   *
   * @param {unknown} question
   * @param {number} index
   * @returns {string[]} Liste d'erreurs (vide si la question est valide)
   */
  validateQuestion(question, index) {
    const prefix = `Question #${index + 1}`
    if (!question || typeof question !== 'object' || Array.isArray(question)) {
      return [`${prefix} : doit être un objet.`]
    }

    const errors = []
    if (typeof question.statement !== 'string' || !question.statement.trim()) {
      errors.push(`${prefix} : "statement" manquant ou vide.`)
    }
    if (typeof question.sourceExcerpt !== 'string' || !question.sourceExcerpt.trim()) {
      errors.push(`${prefix} : "sourceExcerpt" manquant ou vide.`)
    }

    errors.push(...validateContentByType(question.type, question.content, prefix))

    return errors
  }

  /**
   * Valide l'objet racine renvoyé par le modèle contre le schéma de generation_ia_exercices_types.md §5.
   *
   * @param {unknown} payload
   * @param {number} questionCount - Nombre de questions demandé (le modèle ne doit jamais en produire plus)
   * @param {string} [questionType] - Type demandé ("open"/"mcq"/"fill_blank"/"reorder"/"mixed", défaut
   *   "mixed" = aucune contrainte de type par question). Si un type précis, chaque question doit avoir
   *   exactement ce `type` (même contrôle que AiCardGeneration.service.js#validatePayload, C-01.04).
   * @returns {string[]} Liste d'erreurs (vide si le payload est valide)
   */
  validatePayload(payload, questionCount, questionType = 'mixed') {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return ['La réponse doit être un objet JSON.']
    }
    if (!Array.isArray(payload.questions)) {
      return ['Le champ "questions" doit être un tableau.']
    }

    const errors = []
    if (payload.questions.length > questionCount) {
      errors.push(
        `Le nombre de questions renvoyées (${payload.questions.length}) dépasse le nombre demandé (${questionCount}).`
      )
    }
    if ('warning' in payload && payload.warning !== null && typeof payload.warning !== 'string') {
      errors.push('Le champ "warning" doit être une chaîne ou null.')
    }
    payload.questions.forEach((question, index) => {
      errors.push(...this.validateQuestion(question, index))
      if (questionType !== 'mixed' && question && question.type && question.type !== questionType) {
        errors.push(
          `Question #${index + 1} : type "${question.type}" ne correspond pas au type demandé "${questionType}".`
        )
      }
    })

    return errors
  }

  /**
   * Parse la sortie brute du modèle (texte) et la valide contre le schéma attendu.
   *
   * @param {string} rawContent
   * @param {number} questionCount
   * @param {string} [questionType] - Type demandé, transmis à validatePayload (défaut "mixed")
   * @returns {{ valid: true, payload: { questions: object[], warning: string|null } } | { valid: false, errors: string[] }}
   */
  parseAndValidate(rawContent, questionCount, questionType = 'mixed') {
    let payload
    try {
      payload = JSON.parse(rawContent)
    } catch {
      return { valid: false, errors: ["La réponse n'est pas un JSON valide."] }
    }

    const errors = this.validatePayload(payload, questionCount, questionType)
    if (errors.length) return { valid: false, errors }

    return {
      valid: true,
      payload: { questions: payload.questions, warning: payload.warning ?? null }
    }
  }

  /**
   * Filet de sécurité applicatif (même stratégie que AiCardGeneration.service.js#applyDedupeSafetyNet,
   * C-01.10) : retire les questions en doublon d'un payload validé — un doublon peut survenir entre
   * deux questions du même type ou de types différents (règle 2 du prompt système, propre au mode
   * "mixed", generation_ia_exercices_types.md §6.5). `dedupeCards` compare uniquement `statement`,
   * donc générique aux cartes comme aux questions — pas de duplication de logique nécessaire.
   *
   * @param {{ questions: object[], warning: string|null }} payload
   * @returns {{ questions: object[], warning: string|null }}
   */
  applyDedupeSafetyNet(payload) {
    const { cards: questions, removedCount } = dedupeCards(payload.questions)
    if (!removedCount) return payload

    logger.warn(`[AiExerciseGeneration] ${removedCount} question(s) redondante(s) filtrée(s) après génération.`)
    const extraWarning = `${removedCount} question(s) supprimée(s) automatiquement car redondante(s) avec une autre question du même lot.`
    return {
      questions,
      warning: payload.warning ? `${payload.warning} ${extraWarning}` : extraWarning
    }
  }

  /**
   * Attend `ms` millisecondes — extrait en méthode pour être mockable dans les tests (même pattern
   * que AiCardGeneration.service.js#sleep).
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
   * (`usage`), pour un futur suivi de budget (hors périmètre de ce service, qui se contente de la
   * faire remonter — même contrat que AiCardGeneration.service.js#callModel, C-01.06).
   *
   * CHOIX : logique d'appel HTTP/backoff dupliquée depuis AiCardGeneration.service.js plutôt que
   * factorisée dans un helper partagé.
   * RAISON : chaque service de génération IA de ce projet est jusqu'ici autonome (aucun
   * "MistralClient" partagé n'existe) ; en extraire un modifierait AiCardGeneration.service.js
   * (hors périmètre de ce ticket, AGENT.md §2 — modification d'un module existant hors ticket
   * courant). Piste de refactorisation à envisager si un 3e service de génération IA voit le jour.
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
            // CHOIX/RAISON : identiques à AiCardGeneration.service.js#callModel (json_object +
            // rappel du schéma dans le prompt, température basse) — voir ce fichier pour le détail.
            response_format: { type: 'json_object' },
            temperature: 0.3
          }),
          signal: controller.signal
        })
      } catch (error) {
        logger.error(`[AiExerciseGeneration] Appel Mistral échoué : ${error?.message || error}`)
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
          `[AiExerciseGeneration] 429 Mistral (rate limit) — nouvel essai dans ${delayMs}ms (${attempt + 1}/${RATE_LIMIT_MAX_RETRIES})`
        )
        await this.sleep(delayMs)
        continue
      }

      if (!response.ok) {
        const bodyText = await response.text().catch(() => '')
        logger.error(`[AiExerciseGeneration] Réponse Mistral ${response.status} : ${bodyText}`)
        const err = new Error('Le service de génération IA est indisponible pour le moment.')
        err.statusCode = 502
        if (response.status === 429) err.rateLimited = true
        throw err
      }

      const data = await response.json()
      const content = data?.choices?.[0]?.message?.content
      if (typeof content !== 'string' || !content.trim()) {
        logger.error('[AiExerciseGeneration] Réponse Mistral sans contenu exploitable.')
        const err = new Error("Le service de génération IA n'a renvoyé aucun contenu.")
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
   * Point d'entrée du service : exécute le prompt de génération d'exercices
   * (generation_ia_exercices_types.md §4) sur le modèle configuré et retourne un brouillon de
   * questions, jamais persisté par ce service (rappel périmètre OUT : aucune génération sans
   * validation utilisateur — Interface de révision, hors périmètre).
   *
   * Sur sortie non conforme au schéma, un seul retry est tenté (le contenu invalide et le détail de
   * l'erreur sont renvoyés au modèle) avant d'échouer explicitement — jamais de brouillon partiel ou
   * reconstruit approximativement (cf. generation_ia_exercices_types.md §8, même politique que
   * generation_ia_prompt_cartes.md §7).
   *
   * Si un appel a réellement consommé des tokens facturés avant que la méthode ne lève une erreur,
   * l'erreur levée porte un champ `usage` (même forme que le `usage` renvoyé en cas de succès) — un
   * futur appelant pourra journaliser le coût réel même sur un échec (même contrat que
   * AiCardGeneration.service.js#generateCards, C-01.06). Absent si rien n'a été facturé.
   *
   * @param {object} params
   * @param {string} params.sourceText - Chunk de contenu source déjà découpé (Chunking, hors périmètre)
   * @param {string|null} [params.subjectContext] - Nom de la matière, aide à lever les ambiguïtés
   * @param {number} params.questionCount - Nombre de questions cible (1 à 30)
   * @param {string} [params.questionType] - "open" | "mcq" | "fill_blank" | "reorder" | "mixed" (défaut "mixed")
   * @param {string} [params.outputLanguage] - Code langue de sortie (défaut "fr")
   * @returns {Promise<{ questions: object[], warning: string|null, usage: { model: string, promptTokens: number, completionTokens: number } }>}
   * @throws {Error} Entrée invalide (400), configuration manquante (500) ou échec du modèle (502)
   */
  async generateExercises({
    sourceText,
    subjectContext = null,
    questionCount,
    questionType = 'mixed',
    outputLanguage = 'fr'
  }) {
    this.validateInput({ sourceText, questionCount, questionType })

    const messages = [
      { role: 'system', content: this.buildSystemPrompt(outputLanguage) },
      { role: 'user', content: this.buildUserPrompt({ sourceText, subjectContext, questionCount, questionType }) }
    ]

    // Usage cumulé sur les 2 appels au plus (1er essai + éventuel retry).
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
    const firstResult = this.parseAndValidate(first.content, questionCount, questionType)
    if (firstResult.valid) {
      return { ...this.applyDedupeSafetyNet(firstResult.payload), usage: usageWithModel() }
    }

    logger.warn(`[AiExerciseGeneration] Sortie non conforme (1er essai) : ${firstResult.errors.join(' ; ')}`)

    messages.push({ role: 'assistant', content: first.content })
    messages.push({
      role: 'user',
      content:
        `Ta réponse précédente n'est pas conforme au schéma attendu : ${firstResult.errors.join(' ; ')}. ` +
        'Renvoie uniquement un objet JSON strictement conforme au schéma fourni, sans aucun texte autour.'
    })

    const second = await callAndTrackUsage(messages)
    const secondResult = this.parseAndValidate(second.content, questionCount, questionType)
    if (secondResult.valid) {
      return { ...this.applyDedupeSafetyNet(secondResult.payload), usage: usageWithModel() }
    }

    logger.error(`[AiExerciseGeneration] Sortie non conforme après retry : ${secondResult.errors.join(' ; ')}`)
    const err = new Error("La génération n'a pas produit un résultat exploitable. Réessayez.")
    err.statusCode = 502
    err.usage = usageWithModel()
    throw err
  }
}

module.exports = new AiExerciseGenerationService()

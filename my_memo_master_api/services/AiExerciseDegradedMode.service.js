const logger = require('../helpers/logger')
const getMistralConfig = require('../helpers/mistralConfig')
const aiExerciseGenerationService = require('./AiExerciseGeneration.service')
const aiExerciseGenerationPipelineService = require('./AiExerciseGenerationPipeline.service')

// Périmètre C-02.05 (« Mode dégradé sans IA ») : définit le comportement de l'application quand le
// Service génération (C-02.03) est indisponible — LLM en panne, non configuré, ou en échec après
// retry — conformément à l'interface déjà posée par generation_ia_exercices_types.md §9 (« Mécanisme
// de repli, ex. proposer la création manuelle en substitution, messages utilisateur ») et §8 (cas
// d'erreur du prompt). Ce service NE fait PAS :
// - la Validation format (hors périmètre, déjà livré en C-02.04 — un échec de FORMAT après retry
//   (« La génération n'a pas produit un résultat exploitable ») est reconnu ici comme un des cas
//   déclenchant le mode dégradé, mais ce service ne revalide rien lui-même)
// - l'Interface de révision (hors périmètre — pas d'écran, seulement le contrat de message/code que
//   celle-ci pourra afficher)
// - le repli lui-même côté UI (proposer la création manuelle) : `generation_ia_exercices_ui.md` §8
//   note déjà que ce repli est TRIVIALEMENT possible (même modal « Nouvel exercice » que la création
//   manuelle, §5.1) — rien à construire côté navigation, seulement le message à afficher côté modal
//   d'erreur (Vue 2, réutilisée de C-01.08) quand ce service signale `suggestManualCreation: true`.
// - un mécanisme de Quotas pour `C-02` (hors périmètre, aucun élément « Quotas » nommé dans le
//   feature list fourni pour `C-02` — voir C-02.01 §12 et DECISIONS.md) : `rate_limited` ci-dessous
//   couvre uniquement le rate limit Mistral déjà détecté par `AiExerciseGeneration.service.js`, pas
//   un quota applicatif propre à `C-02`.

// Messages utilisateur (français) par code de dégradation — un seul endroit à faire évoluer, plutôt
// que de reconstruire un message ad hoc à chaque appelant (cohérence garantie entre un futur
// controller HTTP et l'affichage front, quel qu'il soit).
const DEGRADED_MODE_MESSAGES = {
  not_configured:
    "La génération d'exercices par IA n'est pas disponible pour le moment (service non configuré). " +
    'Vous pouvez créer votre exercice manuellement.',
  rate_limited:
    'Le service de génération IA est momentanément surchargé. Réessayez dans quelques instants, ou ' +
    'créez votre exercice manuellement.',
  invalid_output:
    "La génération IA n'a pas pu produire un résultat exploitable à partir de ce contenu. Réessayez, " +
    'ou créez votre exercice manuellement.',
  service_unavailable:
    'Le service de génération IA est indisponible pour le moment. Vous pouvez créer votre exercice manuellement.',
  unknown:
    'La génération IA a rencontré un problème inattendu. Vous pouvez créer votre exercice manuellement.'
}

class AiExerciseDegradedModeService {
  /**
   * Vérifie, sans appel réseau, si le Service génération est configuré (clé API Mistral présente —
   * même vérification que `AiExerciseGeneration.service.js#callModel`, mais exposée ici pour être
   * consultée à l'avance, avant toute tentative de génération). Un futur point d'entrée (controller,
   * état initial de l'Interface de révision) peut s'en servir pour proposer directement la création
   * manuelle plutôt que d'exposer un bouton de génération voué à échouer.
   *
   * Ne détecte QUE l'indisponibilité par configuration manquante — un LLM configuré mais en panne
   * réseau (`service_unavailable`) ou en rate limit soutenu (`rate_limited`) ne peut être détecté
   * qu'après une tentative réelle, via `describeFailure`.
   *
   * @returns {{ available: boolean, reason: string|null, message: string|null }}
   */
  isAvailable() {
    const { apiKey } = getMistralConfig()
    if (!apiKey) {
      return { available: false, reason: 'not_configured', message: DEGRADED_MODE_MESSAGES.not_configured }
    }
    return { available: true, reason: null, message: null }
  }

  /**
   * Classifie une erreur levée par `AiExerciseGeneration.service.js#generateExercises` (ou
   * `callModel`) en un code de dégradation stable, avec un message utilisateur prêt à afficher.
   *
   * Distingue explicitement une erreur de **saisie utilisateur** (400 `invalid_input` —
   * `sourceText`/`questionCount`/`questionType` invalides, cf. C-02.03 `validateInput` ; ou 422
   * `invalid_content` — contenu source résolu mais vide/inexploitable) : ce n'est PAS un mode dégradé,
   * l'IA reste disponible, l'utilisateur doit juste corriger sa saisie/son fichier —
   * `suggestManualCreation` reste `false` et le message d'origine (déjà en français, déjà actionnable)
   * est renvoyé tel quel.
   *
   * Toute autre erreur (500 config manquante, 502 service indisponible/rate limit soutenu/sortie non
   * conforme après retry, ou une erreur inattendue sans `statusCode` reconnu) est traitée comme un
   * mode dégradé : ne jamais laisser l'utilisateur sans alternative, même sur un cas non prévu
   * explicitement (`unknown`) — dernier repli volontairement large plutôt qu'un code qui ne
   * couvrirait que les cas déjà rencontrés.
   *
   * @param {Error & { statusCode?: number, rateLimited?: boolean }} error
   * @returns {{ degraded: boolean, code: string, message: string, suggestManualCreation: boolean }}
   */
  describeFailure(error) {
    const statusCode = error?.statusCode

    if (statusCode === 400) {
      return { degraded: false, code: 'invalid_input', message: error.message, suggestManualCreation: false }
    }

    // 422 : contenu source résolu mais vide/inexploitable (PDF scanné sans texte, texte filtré au
    // chunking) — cf. AiExerciseGenerationPipeline.service.js#generateExercisesFromContent. Comme le
    // 400, ce n'est pas un mode dégradé (l'IA reste disponible) : message déjà actionnable, transmis
    // tel quel plutôt que de tomber sur le message générique `unknown`. Code distinct de
    // `invalid_input` (le controller y répond 422, conformément au contrat déjà documenté dans le
    // swagger de la route — voir routes/AiExerciseGeneration.routes.js).
    if (statusCode === 422) {
      return { degraded: false, code: 'invalid_content', message: error.message, suggestManualCreation: false }
    }

    if (statusCode === 500) {
      return this._degraded('not_configured')
    }

    if (statusCode === 502) {
      if (error?.rateLimited) return this._degraded('rate_limited')
      if (typeof error?.message === 'string' && error.message.includes("n'a pas produit un résultat exploitable")) {
        return this._degraded('invalid_output')
      }
      return this._degraded('service_unavailable')
    }

    logger.warn(
      `[AiExerciseDegradedMode] Erreur non reconnue, repli sur le mode dégradé générique : ${error?.message || error}`
    )
    return this._degraded('unknown')
  }

  /**
   * Construit la réponse de dégradation pour un `code` connu de `DEGRADED_MODE_MESSAGES`.
   * @param {string} code
   * @returns {{ degraded: true, code: string, message: string, suggestManualCreation: true }}
   */
  _degraded(code) {
    return { degraded: true, code, message: DEGRADED_MODE_MESSAGES[code], suggestManualCreation: true }
  }

  /**
   * Enveloppe `AiExerciseGeneration.service.js#generateExercises` (C-02.03) pour ne jamais laisser
   * une erreur non gérée atteindre l'appelant : succès et échec renvoient tous deux un objet
   * `{ success, ... }`, discriminé sur ce champ plutôt que par une exception à catcher — pratique pour
   * un futur controller qui doit de toute façon traduire l'échec en réponse HTTP avec repli, jamais
   * en 500 générique. Ne fait la génération elle-même (C-02.03) ni la validation de saisie qu'elle
   * embarque déjà — délègue entièrement, se contente d'intercepter et classifier l'échec éventuel.
   *
   * @param {object} params - Transmis tel quel à `AiExerciseGeneration.service.js#generateExercises`
   * @returns {Promise<
   *   { success: true, questions: object[], warning: string|null, usage: object } |
   *   { success: false, degraded: boolean, code: string, message: string, suggestManualCreation: boolean }
   * >}
   */
  async attemptGeneration(params) {
    try {
      const result = await aiExerciseGenerationService.generateExercises(params)
      return { success: true, ...result }
    } catch (error) {
      return { success: false, ...this.describeFailure(error) }
    }
  }

  /**
   * Ajout demandé par l'utilisateur après C-02.07 (import PDF pour la génération d'exercices) :
   * même rôle que `attemptGeneration`, mais enveloppe `AiExerciseGenerationPipeline.service.js`
   * (texte OU PDF, avec chunking) plutôt que `AiExerciseGeneration.service.js#generateExercises`
   * directement (un seul appel, sans chunking). `describeFailure` reste inchangé : les deux services
   * lèvent des erreurs `{ statusCode, rateLimited? }` de même forme, la classification est donc
   * réutilisable telle quelle.
   *
   * CHOIX : nouvelle méthode plutôt que modifier `attemptGeneration` pour accepter `pdfBuffer`.
   * RAISON : `attemptGeneration` reste un wrapper direct autour d'un seul appel LLM (pas de
   * chunking) — changer sa signature/son comportement aurait modifié une interface déjà livrée
   * (C-02.05) sans nécessité, contrairement à `AGENT.md` §2. Voir DECISIONS.md.
   *
   * Contrat de sortie différent sur succès : `warnings` (tableau, un message par chunk concerné) au
   * lieu de `warning` (chaîne unique) — même différence assumée qu'entre
   * `AiExerciseGeneration.service.js#generateExercises` et
   * `AiExerciseGenerationPipeline.service.js#generateExercisesFromContent`.
   *
   * @param {object} params - Transmis tel quel à `AiExerciseGenerationPipeline.service.js#generateExercisesFromContent`
   * @returns {Promise<
   *   { success: true, questions: object[], warnings: string[], usage: object } |
   *   { success: false, degraded: boolean, code: string, message: string, suggestManualCreation: boolean }
   * >}
   */
  async attemptGenerationFromContent(params) {
    try {
      const result = await aiExerciseGenerationPipelineService.generateExercisesFromContent(params)
      return { success: true, ...result }
    } catch (error) {
      return { success: false, ...this.describeFailure(error) }
    }
  }
}

module.exports = new AiExerciseDegradedModeService()

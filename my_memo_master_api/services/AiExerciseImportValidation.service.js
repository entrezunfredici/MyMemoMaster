const logger = require('../helpers/logger')
const { validateContentByType } = require('../helpers/exerciseContentValidation')

// Périmètre C-02.04 (« Validation format sortie avant import ») : ce service revalide le FORMAT
// d'une question de brouillon (générée par AiExerciseGeneration.service.js, C-02.03, puis
// potentiellement ÉDITÉE par l'utilisateur en Interface de révision — accept/edit/reject, hors
// périmètre) juste avant l'import réel — c'est-à-dire juste avant que le mapping vers
// POST /tests + POST /questions (generation_ia_exercices_types.md §7) n'envoie `statement`/`type`/
// `content` en persistance.
//
// Distinct de la validation déjà faite par AiExerciseGeneration.service.js#validatePayload (C-02.03) :
// - celle-là s'applique à la sortie BRUTE du modèle, avant toute édition utilisateur, et couvre en
//   plus `sourceExcerpt` (traçabilité de génération) ainsi que la cohérence avec `questionType`/
//   `questionCount` demandés — des notions qui n'ont plus de sens une fois la question éditée et
//   individuellement acceptée.
// - celle-ci s'applique au moment de l'import, sur CE qui sera réellement persisté
//   (`statement`/`type`/`content`) — une édition utilisateur peut réintroduire une non-conformité
//   que la génération n'avait pas (ex. suppression de la seule option `correct: true` d'un mcq,
//   désynchronisation `template`/`blanks` après une modification manuelle).
// Les deux services partagent les mêmes règles de forme pour `content` par type
// (helpers/exerciseContentValidation.js) — un seul endroit à faire évoluer si le contrat change.
//
// Ce service NE fait PAS :
// - l'import lui-même (aucun appel à POST /tests ou POST /questions — hors périmètre, mapping non
//   encore tranché, cf. generation_ia_exercices_types.md §7)
// - l'Interface de révision (accept/edit/reject, hors périmètre)
// - le Mode dégradé (hors périmètre)

class AiExerciseImportValidationService {
  /**
   * Valide le format d'UNE question de brouillon, sur les seuls champs réellement envoyés à
   * l'import (`statement`, `type`, `content`) — contrairement à
   * AiExerciseGeneration.service.js#validateQuestion (C-02.03), ne vérifie PAS `sourceExcerpt` (champ
   * de traçabilité de génération, jamais transmis à `POST /questions`).
   *
   * @param {unknown} question
   * @param {number} [index] - Position dans le lot en cours d'import, pour préfixer les erreurs
   * @returns {string[]} Liste d'erreurs (vide si la question est importable telle quelle)
   */
  validateQuestionFormat(question, index = 0) {
    const prefix = `Question #${index + 1}`
    if (!question || typeof question !== 'object' || Array.isArray(question)) {
      return [`${prefix} : doit être un objet.`]
    }

    const errors = []
    if (typeof question.statement !== 'string' || !question.statement.trim()) {
      errors.push(`${prefix} : "statement" manquant ou vide.`)
    }

    errors.push(...validateContentByType(question.type, question.content, prefix))

    return errors
  }

  /**
   * Partitionne un lot de questions de brouillon entre celles importables telles quelles et celles
   * rejetées (avec le détail des erreurs). Échec partiel toléré par construction — une question
   * éditée de travers ne bloque jamais l'import des autres questions du même lot (même politique que
   * la promotion des cartes Leitner générées, C-01.09 : « cartes en échec gardées avec badge,
   * réessayables ») ; jamais de correction silencieuse d'une question rejetée (ex. retirer le
   * marqueur `{{n}}` en trop d'un `fill_blank`) — l'appelant décide (réédition, abandon).
   *
   * @param {object[]} questions
   * @returns {{ importable: object[], rejected: { index: number, question: object, errors: string[] }[] }}
   */
  validateBatchForImport(questions) {
    const importable = []
    const rejected = []

    ;(questions || []).forEach((question, index) => {
      const errors = this.validateQuestionFormat(question, index)
      if (errors.length) {
        rejected.push({ index, question, errors })
      } else {
        importable.push(question)
      }
    })

    if (rejected.length) {
      logger.warn(
        `[AiExerciseImportValidation] ${rejected.length}/${questions?.length ?? 0} question(s) rejetée(s) au format avant import.`
      )
    }

    return { importable, rejected }
  }

  /**
   * Variante stricte pour un import unitaire (ex. un futur endpoint qui persiste une question à la
   * fois) : lève une erreur (400) si la question n'est pas conforme, plutôt que de renvoyer un
   * tableau d'erreurs à traiter par l'appelant.
   *
   * @param {unknown} question
   * @param {number} [index]
   * @throws {Error} Format non conforme (400) — message en français, prêt à remonter tel quel
   */
  assertValidForImport(question, index = 0) {
    const errors = this.validateQuestionFormat(question, index)
    if (errors.length) {
      const err = new Error(`Le format de la question n'est pas valide avant import : ${errors.join(' ; ')}`)
      err.statusCode = 400
      throw err
    }
  }
}

module.exports = new AiExerciseImportValidationService()

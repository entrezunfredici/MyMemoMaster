// Vérifications de conformité du champ `content` d'une question d'exercice, par type — reprend le
// contrat de generation_ia_exercices_types.md §5 (identique à Question.content déjà persisté par la
// création manuelle, exercices_types_correction.md §3). Extrait en helper (C-02.04) pour être
// partagé par les deux moments où cette forme doit être vérifiée :
// - AiExerciseGeneration.service.js (C-02.03) : sortie brute du LLM, avant de l'exposer à
//   l'Interface de révision (en plus de `content`, vérifie aussi `statement`/`sourceExcerpt`).
// - AiExerciseImportValidation.service.js (C-02.04) : brouillon potentiellement édité par
//   l'utilisateur, juste avant l'import réel (`sourceExcerpt` n'est pas persisté, donc pas vérifié
//   à ce stade-là — voir ce fichier).
// Fonctions pures, sans dépendance — mêmes règles dans les deux cas, un seul endroit à faire évoluer
// si le contrat de `content` change.

const QUESTION_TYPES = ['open', 'mcq', 'fill_blank', 'reorder']

/**
 * Valide le `content` d'une question "open" (generation_ia_exercices_types.md §5).
 *
 * @param {unknown} content
 * @param {string} prefix
 * @returns {string[]}
 */
function validateOpenContent(content, prefix) {
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    return [`${prefix} : "content" manquant ou invalide pour une question "open".`]
  }
  const errors = []
  if (typeof content.correct_answer !== 'string' || !content.correct_answer.trim()) {
    errors.push(`${prefix} : "content.correct_answer" manquant ou vide pour une question "open".`)
  }
  if (content.accepted_answers != null && !Array.isArray(content.accepted_answers)) {
    errors.push(`${prefix} : "content.accepted_answers" doit être un tableau ou null.`)
  }
  return errors
}

/**
 * Valide le `content` d'une question "mcq" (generation_ia_exercices_types.md §5).
 *
 * @param {unknown} content
 * @param {string} prefix
 * @returns {string[]}
 */
function validateMcqContent(content, prefix) {
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    return [`${prefix} : "content" manquant ou invalide pour une question "mcq".`]
  }
  const errors = []
  if (!Array.isArray(content.options) || content.options.length < 3 || content.options.length > 4) {
    errors.push(`${prefix} : "content.options" doit contenir 3 à 4 entrées pour une question "mcq".`)
  } else {
    const correctCount = content.options.filter((o) => o && o.correct === true).length
    if (correctCount !== 1) {
      errors.push(
        `${prefix} : "content.options" doit contenir exactement une entrée "correct: true" (trouvé ${correctCount}).`
      )
    }
    const hasInvalidOption = content.options.some((o) => !o || typeof o.text !== 'string' || !o.text.trim())
    if (hasInvalidOption) {
      errors.push(`${prefix} : chaque option doit avoir un "text" non vide.`)
    }
  }
  return errors
}

/**
 * Valide le `content` d'une question "fill_blank" : cohérence stricte entre les marqueurs `{{n}}`
 * de `template` et la longueur de `blanks` (generation_ia_exercices_types.md §6.2 — sans cette
 * cohérence, le player front ne peut pas initialiser `userAnswers[i]`, cf. exercices_types_correction.md §5).
 *
 * @param {unknown} content
 * @param {string} prefix
 * @returns {string[]}
 */
function validateFillBlankContent(content, prefix) {
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    return [`${prefix} : "content" manquant ou invalide pour une question "fill_blank".`]
  }
  if (typeof content.template !== 'string' || !content.template.trim()) {
    return [`${prefix} : "content.template" manquant ou vide pour une question "fill_blank".`]
  }
  if (
    !Array.isArray(content.blanks) ||
    content.blanks.length === 0 ||
    content.blanks.some((b) => typeof b !== 'string' || !b.trim())
  ) {
    return [`${prefix} : "content.blanks" doit être un tableau non vide de chaînes non vides.`]
  }

  const markers = [...content.template.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]))
  const expected = content.blanks.map((_, i) => i)
  const isConsistent =
    markers.length === expected.length && expected.every((n) => markers.includes(n))
  if (!isConsistent) {
    return [
      `${prefix} : "content.template" doit contenir exactement un marqueur {{n}} par entrée de ` +
        `"content.blanks" (0 à ${content.blanks.length - 1}), sans doublon ni omission.`
    ]
  }
  return []
}

/**
 * Valide le `content` d'une question "reorder" : au moins 2 fragments non vides et non tous
 * identiques (generation_ia_exercices_types.md §8 — un fragment unique ou des fragments strictement
 * identiques rendent l'exercice dégénéré).
 *
 * @param {unknown} content
 * @param {string} prefix
 * @returns {string[]}
 */
function validateReorderContent(content, prefix) {
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    return [`${prefix} : "content" manquant ou invalide pour une question "reorder".`]
  }
  if (!Array.isArray(content.fragments) || content.fragments.length < 2) {
    return [`${prefix} : "content.fragments" doit contenir au moins 2 fragments pour une question "reorder".`]
  }
  if (content.fragments.some((f) => typeof f !== 'string' || !f.trim())) {
    return [`${prefix} : chaque fragment doit être une chaîne non vide.`]
  }
  const distinct = new Set(content.fragments.map((f) => f.trim()))
  if (distinct.size < 2) {
    return [`${prefix} : "content.fragments" ne peut pas être composé de fragments strictement identiques.`]
  }
  return []
}

/**
 * Dispatch générique : valide `content` selon `type`. Un `type` hors des 4 valeurs connues renvoie
 * une erreur dédiée plutôt que de lever — laisse l'appelant décider comment l'agréger avec ses
 * propres vérifications (`statement`, `sourceExcerpt`...).
 *
 * @param {string} type
 * @param {unknown} content
 * @param {string} prefix
 * @returns {string[]}
 */
function validateContentByType(type, content, prefix) {
  switch (type) {
    case 'open':
      return validateOpenContent(content, prefix)
    case 'mcq':
      return validateMcqContent(content, prefix)
    case 'fill_blank':
      return validateFillBlankContent(content, prefix)
    case 'reorder':
      return validateReorderContent(content, prefix)
    default:
      return [`${prefix} : "type" doit être l'un de : ${QUESTION_TYPES.join(', ')} (reçu ${JSON.stringify(type)}).`]
  }
}

module.exports = {
  QUESTION_TYPES,
  validateOpenContent,
  validateMcqContent,
  validateFillBlankContent,
  validateReorderContent,
  validateContentByType
}

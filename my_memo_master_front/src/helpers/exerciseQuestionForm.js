// Champs de formulaire par type de question d'exercice (open/mcq/fill_blank/reorder) — extrait de
// pages/ExercisesPage.vue (C-02.07) pour être réutilisé tel quel par l'Écran de révision des
// questions générées par IA (components/AiExerciseReviewModalComponent.vue). Fonctions pures, aucun
// changement de comportement par rapport au code original de ExercisesPage.vue — voir DECISIONS.md
// (entrée C-02.07) pour le choix d'extraction.

/**
 * Valeurs par défaut des champs de formulaire spécifiques à chaque type de question. Toujours toutes
 * présentes quel que soit le type actif — évite d'avoir à tester quels champs existent sur l'objet
 * côté template.
 *
 * @returns {object}
 */
export function defaultQuestionFormFields() {
  return {
    openAnswer: '',
    openAltAnswers: [],
    mcqOptions: [{ text: '' }, { text: '' }],
    mcqCorrectIdx: 0,
    fillTemplate: '',
    fillBlanks: [],
    reorderFragments: ['', ''],
  }
}

/**
 * Convertit un `content` (forme `Question.content`, voir `exercices_types_correction.md` §3 — même
 * forme que `content` dans le contrat de sortie de la génération IA, `generation_ia_exercices_types.md`
 * §5) en champs de formulaire éditables, pour un type de question donné. Utilisé pour charger un
 * exercice existant en édition et pour convertir une question générée par IA avant relecture.
 *
 * @param {{type: string, content?: object}} q
 * @returns {object} Les mêmes clés que `defaultQuestionFormFields()`, remplies depuis `content`.
 */
export function contentToFormState(q) {
  const c = q.content ?? {}
  const fields = defaultQuestionFormFields()
  switch (q.type) {
    case 'open':
      return { ...fields, openAnswer: c.correct_answer ?? '', openAltAnswers: [...(c.accepted_answers ?? [])] }
    case 'mcq': {
      const opts = c.options ?? [{ text: '', correct: true }, { text: '', correct: false }]
      const correctIdx = opts.findIndex((o) => o.correct)
      return { ...fields, mcqOptions: opts.map((o) => ({ text: o.text })), mcqCorrectIdx: correctIdx >= 0 ? correctIdx : 0 }
    }
    case 'fill_blank':
      return { ...fields, fillTemplate: c.template ?? '', fillBlanks: [...(c.blanks ?? [])] }
    case 'reorder':
      return { ...fields, reorderFragments: [...(c.fragments ?? ['', ''])] }
    default:
      return fields
  }
}

/**
 * Reconstruit le `content` attendu par `POST /questions`/`PUT /questions/edit/:id` à partir des champs
 * de formulaire d'une question (mapping inverse de `contentToFormState`).
 *
 * @param {object} q - Objet portant `type` + les champs de `defaultQuestionFormFields()`.
 * @returns {object|null}
 */
export function buildQuestionContent(q) {
  switch (q.type) {
    case 'open': {
      const alts = (q.openAltAnswers ?? []).map((a) => a.trim()).filter(Boolean)
      return { correct_answer: q.openAnswer, ...(alts.length ? { accepted_answers: alts } : {}) }
    }
    case 'mcq':
      return { options: q.mcqOptions.map((o, i) => ({ text: o.text, correct: i === q.mcqCorrectIdx })) }
    case 'fill_blank':
      return { template: q.fillTemplate, blanks: q.fillBlanks }
    case 'reorder':
      return { fragments: q.reorderFragments, solution: q.reorderFragments.map((_, i) => i) }
    default:
      return null
  }
}

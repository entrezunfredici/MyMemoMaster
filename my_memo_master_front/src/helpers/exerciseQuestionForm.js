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

// Ticket C (2026-09-12, « images sur les questions ») : champs image d'une question — colonnes dédiées
// sur `Question` (Ticket A), PAS une partie de `content`. Séparés de `defaultQuestionFormFields()` à
// dessein : contrairement aux champs de contenu, l'image n'est jamais réinitialisée par un changement
// de type de question (onTypeChange n'appelle que `defaultQuestionFormFields()`).

/**
 * Valeurs par défaut des champs image d'une question de formulaire (aucune image rattachée).
 *
 * @returns {object}
 */
export function defaultQuestionImageFields() {
  return {
    imageUrl: null,
    imageKey: null,
    imageMimeType: null,
    imageOriginalName: null,
    imageSize: null,
    imageSource: null,
  }
}

/**
 * Copie les champs image d'un objet source (question générée par IA, `AiExerciseGenerationPipeline
 * .service.js#attachImagesToQuestions` — ou question existante chargée pour édition) vers la
 * représentation de formulaire. Un champ absent de `q` vaut `null` (pas de valeur par défaut différente
 * de `defaultQuestionImageFields()`).
 *
 * @param {object} q
 * @returns {object} Les mêmes clés que `defaultQuestionImageFields()`.
 */
export function questionImageFieldsFrom(q) {
  const fields = defaultQuestionImageFields()
  for (const key of Object.keys(fields)) {
    if (q[key] !== undefined) fields[key] = q[key]
  }
  return fields
}

/**
 * Sous-ensemble des champs image d'une question de formulaire à transmettre à
 * `POST /questions`/`PUT /questions/edit/:id` — objet vide (aucune clé, pas `null`) quand aucune image
 * n'est rattachée, pour ne jamais écraser une image existante lors d'une édition qui ne la concerne pas
 * (`Question.service.js#extractImageFields` : un champ absent est ignoré, un `null` explicite retire
 * l'image). `imageSource` n'est transmis que s'il vaut `'ai'` — seule valeur acceptée du client par
 * `Question.validators.js` (`'manual'` reste dérivé côté serveur de la présence d'`imageUrl`).
 *
 * @param {object} q
 * @returns {object}
 */
export function questionImagePayload(q) {
  if (!q.imageUrl) return {}
  return {
    imageUrl: q.imageUrl,
    imageKey: q.imageKey,
    imageMimeType: q.imageMimeType,
    imageOriginalName: q.imageOriginalName,
    imageSize: q.imageSize,
    ...(q.imageSource === 'ai' ? { imageSource: 'ai' } : {}),
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

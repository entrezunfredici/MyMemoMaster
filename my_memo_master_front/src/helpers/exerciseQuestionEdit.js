// Édition d'une question d'exercice dans le formulaire (ExerciseFormModal) : création d'une question
// vierge et opérations qui modifient l'objet de formulaire EN PLACE. Extrait de pages/ExercisesPage.vue
// sans changement de comportement ; la conversion contenu ↔ formulaire reste dans exerciseQuestionForm.js.

import { defaultQuestionFormFields, defaultQuestionImageFields } from '@/helpers/exerciseQuestionForm'

// Clé de rendu (`v-for :key`) : stable pour une question donnée, indépendante de sa position (qui change
// à la suppression d'une question précédente). Jamais envoyée à l'API.
let keyCounter = 0
export const nextQuestionKey = () => ++keyCounter

export const defaultQuestion = () => ({
  _key: nextQuestionKey(),
  idQuestion: null,
  statement: '',
  type: 'open',
  ...defaultQuestionFormFields(),
  // Ticket C : jamais rempli manuellement dans ce formulaire (pas d'upload d'image ici, seul
  // CreateTestPage.vue en a un, Ticket A) — présent pour que le merge `{ ...defaultQuestion(), ...q }`
  // (questions générées par l'IA) ait une forme cohérente, image rattachée ou non par l'IA.
  ...defaultQuestionImageFields(),
})

/** Changement de type : remet à zéro les champs propres à chaque type (l'image n'est pas touchée). */
export function resetQuestionFields(q) {
  Object.assign(q, defaultQuestionFormFields())
}

export function setOptionText(q, idx, value) {
  q.mcqOptions = q.mcqOptions.map((o, i) => (i === idx ? { ...o, text: value } : o))
}

export function addOption(q) {
  q.mcqOptions = [...q.mcqOptions, { text: '' }]
}

/** Retire une option en gardant `mcqCorrectIdx` pointé sur la même option (ou la dernière si c'était elle). */
export function removeOption(q, oi) {
  q.mcqOptions = q.mcqOptions.filter((_, i) => i !== oi)
  if (q.mcqCorrectIdx >= q.mcqOptions.length) q.mcqCorrectIdx = q.mcqOptions.length - 1
  else if (oi < q.mcqCorrectIdx) q.mcqCorrectIdx--
}

/** Texte à trous : ajuste le nombre de réponses attendues au plus grand `{{n}}` du modèle (+1). */
export function syncFillBlanks(q) {
  const matches = [...q.fillTemplate.matchAll(/\{\{(\d+)\}\}/g)]
  const count = matches.length ? Math.max(...matches.map((m) => parseInt(m[1]))) + 1 : 0
  while (q.fillBlanks.length < count) q.fillBlanks.push('')
  if (q.fillBlanks.length > count) q.fillBlanks.splice(count)
}

/**
 * Une question de formulaire encore à sa valeur d'origine (`defaultQuestion()`, jamais éditée) — sert à
 * retirer la question vide ouverte automatiquement à la création du formulaire quand des questions
 * générées par IA sont ajoutées, sans jamais toucher à une question que l'utilisateur a commencé à
 * renseigner (énoncé, réponse, changement de type...). BUG TROUVÉ EN CONDITIONS RÉELLES : sans ce
 * filtre, cette question vide restait en tête de `form.questions` et faisait échouer la création
 * (« Erreur question 1. », `statement`/`openAnswer` requis côté serveur) — pas seulement un résidu visuel.
 */
export function isBlankUntouchedQuestion(q) {
  return q.type === 'open' && !q.statement.trim() && !q.openAnswer.trim() && q.openAltAnswers.length === 0
}

/**
 * Message d'erreur à afficher pour une réponse HTTP en échec : priorité au message métier du controller
 * (`{ message }`), puis au premier message de validation express-validator (`{ errors: [{ msg }] }`),
 * sinon `fallback` (aussi pour une réponse absente).
 */
export function extractErrorMessage(resp, fallback) {
  return resp?.data?.message || resp?.data?.errors?.[0]?.msg || fallback
}

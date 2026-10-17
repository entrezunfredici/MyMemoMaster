import { parseCalendarDate } from '@/helpers/dates'

// Logique pure du quiz d'un exercice (page de détail) : état de réponse de chaque question, formatage de la
// correction et de la note. Extrait de pages/ExerciseDetailPage.vue sans changement de comportement.

/** Mélange un tableau EN PLACE (Fisher-Yates, `Math.random`). */
export function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

/**
 * État de réponse initial d'une question :
 *  - `answer`   : '' (ouverte), null (QCM), un tableau de trous vides (texte à trous), [] (phrase à constituer) ;
 *  - `order`    : indices des options dans l'ordre d'AFFICHAGE (mélangés pour un QCM : sans cela la bonne réponse
 *                 apparaîtrait toujours dans l'ordre de saisie, souvent en premier) ;
 *  - `shuffled` : fragments mélangés (phrase à constituer), sinon [] ;
 *  - `selected` : indices (dans `shuffled`) des fragments déjà placés, dans l'ordre choisi.
 * L'ordre des appels à `Math.random` (options d'abord, puis fragments) est celui de la page d'origine.
 */
export function createQuestionState(q) {
  const order = (q.content?.options ?? []).map((_, i) => i)
  if (q.type === 'mcq') shuffleInPlace(order)

  const state = { answer: null, order, shuffled: [], selected: [] }
  if (q.type === 'open') {
    state.answer = ''
  } else if (q.type === 'mcq') {
    state.answer = null
  } else if (q.type === 'fill_blank') {
    state.answer = Array((q.content?.blanks ?? []).length).fill('')
  } else if (q.type === 'reorder') {
    state.answer = []
    const frags = [...(q.content?.fragments ?? [])]
    shuffleInPlace(frags)
    state.shuffled = frags
  }
  return state
}

/** Place un fragment (par son indice dans `shuffled`) à la suite des fragments choisis. */
export function selectFragment(state, fragIdx) {
  state.selected.push(fragIdx)
  state.answer = state.selected.map((fi) => state.shuffled[fi])
}

/** Retire le fragment placé à la position `pos`. */
export function unselectFragment(state, pos) {
  state.selected.splice(pos, 1)
  state.answer = state.selected.map((fi) => state.shuffled[fi])
}

/** Découpe le modèle d'un texte à trous (`{{0}}`, `{{1}}`…) en morceaux { type: 'text'|'blank', … }. */
export function parseFillTemplate(question) {
  const template = question.content?.template ?? ''
  const parts = []
  let lastIndex = 0
  const regex = /\{\{(\d+)\}\}/g
  let match
  while ((match = regex.exec(template)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: template.slice(lastIndex, match.index) })
    }
    parts.push({ type: 'blank', index: parseInt(match[1]) })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < template.length) {
    parts.push({ type: 'text', value: template.slice(lastIndex) })
  }
  return parts
}

/**
 * Normalise la syntaxe des formules d'une réponse avant envoi (chaîne ou tableau de chaînes — les indices de
 * QCM restent intacts). `normalize` est la fonction de normalisation (injectée : elle vit dans l'interpréteur).
 */
export function normalizeAnswer(answer, normalize) {
  if (typeof answer === 'string') return normalize(answer)
  if (Array.isArray(answer)) {
    return answer.map((a) => (typeof a === 'string' ? normalize(a) : a))
  }
  return answer
}

/** Nombre de points à la française, 2 décimales au plus (« 2,4 »). */
export function formatPoints(value) {
  return Number(value ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })
}

/**
 * Crédit partiel d'une question corrigée (note strictement entre 0 et 1, ex. 0,6 pour une réponse ouverte
 * incomplète), ou `null` pour un résultat binaire (0 ou 1 : QCM, texte à trous…).
 */
export function partialPoints(result) {
  const points = result?.points
  return typeof points === 'number' && points > 0 && points < 1 ? points : null
}

/**
 * Aspect d'une question corrigée : correcte (vert), partielle (ambre : pas correcte mais crédit > 0), ou
 * incorrecte (rouge).
 */
export function resultTone(result) {
  if (result?.correct) return { label: 'Correct', badge: 'bg-green-500', border: 'border-green-500' }
  if (partialPoints(result) !== null) return { label: 'Partiel', badge: 'bg-amber-700', border: 'border-amber-500' }
  return { label: 'Incorrect', badge: 'bg-red-500', border: 'border-red-500' }
}

/** Réponse de l'étudiant, en texte, pour l'écran de correction. */
export function formatUserAnswer(question, answer) {
  switch (question.type) {
    case 'open':
      return answer || '(Pas de réponse)'
    case 'mcq': {
      const opts = question.content?.options ?? []
      return answer !== null && opts[answer] ? opts[answer].text : '(Pas de réponse)'
    }
    case 'fill_blank':
      return (answer ?? []).join(' / ') || '(Pas de réponse)'
    case 'reorder':
      return (answer ?? []).join(' ') || '(Pas de réponse)'
    default:
      return '—'
  }
}

/** Réponse attendue, en texte, pour l'écran de correction. */
export function formatCorrectAnswer(question) {
  const content = question.content ?? {}
  switch (question.type) {
    case 'open':
      return content.correct_answer ?? '—'
    case 'mcq': {
      const correct = (content.options ?? []).find((o) => o.correct)
      return correct?.text ?? '—'
    }
    case 'fill_blank':
      return (content.blanks ?? []).join(' / ')
    case 'reorder':
      return (content.fragments ?? []).join(' ')
    default:
      return '—'
  }
}

/** Date et heure numériques (historique des résultats). */
export function formatResultDate(isoDate) {
  if (!isoDate) return '—'
  return new Date(isoDate).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

/** Date d'échéance courte. */
export function formatDeadlineDate(dueDate) {
  if (!dueDate) return '—'
  return parseCalendarDate(dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

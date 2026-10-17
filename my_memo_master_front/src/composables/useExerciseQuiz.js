// État et actions du quiz d'un exercice : réponses de l'étudiant, envoi pour correction, résultats, nouvel essai.
// Extrait de pages/ExerciseDetailPage.vue sans changement de comportement.

import { reactive, ref } from 'vue'
import { notif } from '@/helpers/notif'
import { normalizeFormulaSyntax } from '@/components/interpreter/interpreter.js'
import { createQuestionState, normalizeAnswer } from '@/helpers/exerciseQuiz'
import { useTestResultStore } from '@/stores/testResults'

/**
 * @param {{ test: import('vue').Ref<object|null>, questions: import('vue').Ref<object[]> }} deps
 */
export function useExerciseQuiz({ test, questions }) {
  const testResultStore = useTestResultStore()

  // Un objet d'état par question (voir createQuestionState), dans l'ordre des questions
  const states = reactive([])
  // Résultat de correction par question, dans le même ordre
  const results = reactive([])
  const correctCount = ref(0)
  const resultsShown = ref(false)

  // Chronométrage du temps réellement passé sur le quiz (alimente le KPI « Temps total de révision ») —
  // démarré quand les questions deviennent interactives, pas pendant le chargement de la page ni
  // l'affichage des résultats précédents.
  const startedAt = ref(null)

  /** (Ré)initialise toutes les réponses et démarre le chronomètre. */
  function start() {
    states.splice(0)
    questions.value.forEach((q) => states.push(createQuestionState(q)))
    startedAt.value = Date.now()
  }

  async function submit() {
    const answers = questions.value.map((q, idx) => ({
      questionId: q.idQuestion,
      answer: normalizeAnswer(states[idx]?.answer ?? null, normalizeFormulaSyntax),
    }))

    const durationSeconds = startedAt.value ? Math.round((Date.now() - startedAt.value) / 1000) : null
    const result = await testResultStore.submitTest(test.value.testId, answers, durationSeconds)
    if (!result) {
      notif.notify('Erreur lors de la correction.', 'error')
      return
    }

    results.splice(0)
    const resultMap = Object.fromEntries(result.results.map((r) => [r.questionId, r]))
    questions.value.forEach((q) => {
      results.push(resultMap[q.idQuestion] ?? { correct: false, correctAnswer: '—' })
    })
    correctCount.value = result.score
    resultsShown.value = true
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function reset() {
    resultsShown.value = false
    start()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return { states, results, correctCount, resultsShown, start, submit, reset }
}

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import { useExerciseQuiz } from '@/composables/useExerciseQuiz'
import { useTestResultStore } from '@/stores/testResults'

const { mockNotify } = vi.hoisted(() => ({ mockNotify: vi.fn() }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: mockNotify } }))

const QUESTIONS = [
  { idQuestion: 10, type: 'open', statement: 'Q1', content: {} },
  { idQuestion: 11, type: 'mcq', statement: 'Q2', content: { options: [{ text: 'a' }, { text: 'b' }] } },
  { idQuestion: 12, type: 'fill_blank', statement: 'Q3', content: { blanks: ['x', 'y'] } },
]

function setup() {
  const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true })
  setActivePinia(pinia)
  const store = useTestResultStore()
  const quiz = useExerciseQuiz({ test: ref({ testId: 5 }), questions: ref(QUESTIONS) })
  return { quiz, store }
}

describe('useExerciseQuiz', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.scrollTo = vi.fn()
  })

  it('start : un état par question et le chronomètre démarre', () => {
    const { quiz } = setup()
    expect(quiz.states).toHaveLength(0)
    quiz.start()
    expect(quiz.states.map((s) => s.answer)).toEqual(['', null, ['', '']])
  })

  it('submit : envoie les réponses normalisées dans l’ordre des questions, avec la durée', async () => {
    const { quiz, store } = setup()
    store.submitTest.mockResolvedValue({ score: 1, results: [] })
    quiz.start()
    quiz.states[0].answer = 'frac(1,2)'
    quiz.states[1].answer = 1
    quiz.states[2].answer = ['frac(a,b)', 'y']
    await quiz.submit()
    const [testId, answers, duration] = store.submitTest.mock.calls[0]
    expect(testId).toBe(5)
    expect(answers).toEqual([
      { questionId: 10, answer: 'over(1,2)' },
      { questionId: 11, answer: 1 },
      { questionId: 12, answer: ['over(a,b)', 'y'] },
    ])
    expect(duration).toBeGreaterThanOrEqual(0)
  })

  it('submit : une question sans état est envoyée avec une réponse nulle', async () => {
    const { quiz, store } = setup()
    store.submitTest.mockResolvedValue({ score: 0, results: [] })
    await quiz.submit() // start() jamais appelé : aucun état
    expect(store.submitTest.mock.calls[0][1].map((a) => a.answer)).toEqual([null, null, null])
  })

  it('submit réussi : résultats rangés par question, score, affichage et remontée en haut de page', async () => {
    const { quiz, store } = setup()
    store.submitTest.mockResolvedValue({ score: 1.5, results: [{ questionId: 11, correct: true }, { questionId: 10, correct: false, points: 0.5 }] })
    quiz.start()
    await quiz.submit()
    expect(quiz.resultsShown.value).toBe(true)
    expect(quiz.correctCount.value).toBe(1.5)
    expect(quiz.results[0]).toMatchObject({ correct: false, points: 0.5 })
    expect(quiz.results[1]).toMatchObject({ correct: true })
    expect(quiz.results[2]).toEqual({ correct: false, correctAnswer: '—' }) // pas de résultat renvoyé pour Q3
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })

  it('submit en échec : notification, aucun résultat affiché', async () => {
    const { quiz, store } = setup()
    store.submitTest.mockResolvedValue(null)
    quiz.start()
    await quiz.submit()
    expect(mockNotify).toHaveBeenCalledWith('Erreur lors de la correction.', 'error')
    expect(quiz.resultsShown.value).toBe(false)
    expect(quiz.results).toHaveLength(0)
  })

  it('reset : masque les résultats, efface les réponses, remonte en haut', async () => {
    const { quiz, store } = setup()
    store.submitTest.mockResolvedValue({ score: 0, results: [] })
    quiz.start()
    quiz.states[0].answer = 'ancienne'
    await quiz.submit()
    quiz.reset()
    expect(quiz.resultsShown.value).toBe(false)
    expect(quiz.states[0].answer).toBe('')
    expect(window.scrollTo).toHaveBeenCalledTimes(2)
  })
})

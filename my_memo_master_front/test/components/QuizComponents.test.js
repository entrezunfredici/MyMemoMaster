import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { reactive } from 'vue'
import QuizQuestion from '@/components/exercises/quiz/QuizQuestion.vue'
import QuizResults from '@/components/exercises/quiz/QuizResults.vue'
import ExerciseLinkedDeadlines from '@/components/exercises/quiz/ExerciseLinkedDeadlines.vue'
import ExerciseResultHistory from '@/components/exercises/quiz/ExerciseResultHistory.vue'
import { createQuestionState } from '@/helpers/exerciseQuiz'

const stubs = { FormulaHelper: { template: '<div><slot /></div>' }, FormulaHelperComponent: { template: '<div><slot /></div>' } }

// L'état de réponse appartient au quiz parent et est édité en place : on le monte donc réactif
function mountQuestion(question, { index = 0, patch = {} } = {}) {
  vi.spyOn(Math, 'random').mockReturnValue(0.999) // mélange neutre : ordre d'origine conservé
  const state = reactive({ ...createQuestionState(question), ...patch })
  const wrapper = mount(QuizQuestion, { props: { question, index, state }, global: { stubs } })
  return { wrapper, state }
}

afterEach(() => vi.restoreAllMocks())

describe('QuizQuestion', () => {
  it('numéro (1-based), énoncé identifié pour l’accessibilité', () => {
    const { wrapper } = mountQuestion({ idQuestion: 1, type: 'open', statement: 'Capitale ?' }, { index: 2 })
    expect(wrapper.text()).toContain('Question 3')
    expect(wrapper.find('#question-statement-2').text()).toContain('Capitale ?')
  })

  it('image de la question : alt du fichier, sinon alt générique numéroté', () => {
    const named = mountQuestion({ type: 'open', statement: 'Q', imageUrl: '/i.png', imageOriginalName: 'carte.png' }).wrapper
    expect(named.find('img').attributes('alt')).toBe('carte.png')
    const generic = mountQuestion({ type: 'open', statement: 'Q', imageUrl: '/i.png' }, { index: 1 }).wrapper
    expect(generic.find('img').attributes('alt')).toBe('Illustration de la question 2')
    expect(mountQuestion({ type: 'open', statement: 'Q' }).wrapper.find('img').exists()).toBe(false)
  })

  it('question ouverte : la saisie est écrite dans l’état de la question', async () => {
    const { wrapper, state } = mountQuestion({ type: 'open', statement: 'Q' })
    await wrapper.find('textarea[aria-label="Entrez votre réponse ici"]').setValue('Paris')
    expect(state.answer).toBe('Paris')
  })

  describe('QCM', () => {
    const q = { type: 'mcq', statement: 'Q', content: { options: [{ text: 'A' }, { text: 'B' }, { text: 'C' }] } }

    it('options dans l’ordre d’affichage de l’état, groupe radio nommé par l’énoncé (RGAA 11.6)', () => {
      const { wrapper } = mountQuestion(q, { patch: { order: [2, 0, 1] } })
      expect(wrapper.findAll('label').map((l) => l.text())).toEqual(['C', 'A', 'B'])
      expect(wrapper.find('[role="radiogroup"]').attributes('aria-labelledby')).toBe('question-statement-0')
    })

    it('choisir une option enregistre son indice D’ORIGINE, quelle que soit sa position à l’écran', async () => {
      const { wrapper, state } = mountQuestion(q, { patch: { order: [2, 0, 1] } })
      await wrapper.findAll('input[type="radio"]')[0].setValue(true) // affichée en premier = option d'indice 2
      expect(state.answer).toBe(2)
    })

    it('l’option choisie est cochée et mise en évidence', () => {
      const { wrapper } = mountQuestion(q, { patch: { answer: 1 } })
      const checked = wrapper.findAll('input[type="radio"]').map((r) => r.element.checked)
      expect(checked).toEqual([false, true, false])
      expect(wrapper.findAll('label')[1].classes()).toContain('border-blue-500')
    })
  })

  describe('texte à trous', () => {
    const q = { type: 'fill_blank', statement: 'Q', content: { template: 'Le {{0}} mange du {{1}}.', blanks: ['', ''] } }

    it('texte et champs de saisie nommés par trou', () => {
      const { wrapper } = mountQuestion(q)
      expect(wrapper.text()).toContain('Le')
      expect(wrapper.find('input[aria-label="Réponse du trou 0"]').exists()).toBe(true)
      expect(wrapper.find('input[aria-label="Réponse du trou 1"]').exists()).toBe(true)
    })

    it('la saisie d’un trou est écrite à son indice', async () => {
      const { wrapper, state } = mountQuestion(q)
      await wrapper.find('input[aria-label="Réponse du trou 1"]').setValue('poisson')
      expect(state.answer).toEqual(['', 'poisson'])
    })
  })

  describe('phrase à constituer', () => {
    const q = { type: 'reorder', statement: 'Q', content: { fragments: ['Il', 'était', 'une'] } }

    it('fragments proposés, zone d’attente vide au départ', () => {
      const { wrapper } = mountQuestion(q)
      expect(wrapper.text()).toContain('Sélectionne les fragments ci-dessus...')
      expect(wrapper.findAll('button').map((b) => b.text())).toEqual(['Il', 'était', 'une'])
    })

    it('cliquer un fragment le place dans la réponse et le désactive', async () => {
      const { wrapper, state } = mountQuestion(q)
      await wrapper.findAll('button')[1].trigger('click')
      expect(state.answer).toEqual(['était'])
      expect(wrapper.findAll('button')[1].attributes('disabled')).toBeDefined()
    })

    it('cliquer un fragment placé le retire', async () => {
      const { wrapper, state } = mountQuestion(q)
      await wrapper.findAll('button')[0].trigger('click')
      await wrapper.find('button[title="Cliquer pour retirer"]').trigger('click')
      expect(state.answer).toEqual([])
      expect(wrapper.findAll('button')[0].attributes('disabled')).toBeUndefined()
    })
  })
})

describe('QuizResults', () => {
  const questions = [
    { idQuestion: 1, type: 'open', statement: 'Q1', imageUrl: '/i.png', content: { correct_answer: 'Paris' } },
    { idQuestion: 2, type: 'mcq', statement: 'Q2', content: { options: [{ text: '3' }, { text: '4', correct: true }] } },
    { idQuestion: 3, type: 'fill_blank', statement: 'Q3', content: { blanks: ['chat'] } },
  ]
  const states = [{ answer: 'Parix' }, { answer: 0 }, { answer: ['chat'] }]
  const results = [
    { correct: false, points: 0.6, explanation: 'Presque.' },
    { correct: false, points: 0 },
    { correct: true, points: 1, degraded: true, degradedMessage: 'Correction simplifiée.' },
  ]
  const mountResults = (props = {}) =>
    mount(QuizResults, { props: { questions, states, results, correctCount: 1.6, shown: true, ...props }, global: { stubs } })

  it('la zone aria-live est toujours montée, même sans résultats (RGAA 13.x)', () => {
    const w = mountResults({ shown: false })
    expect(w.find('[aria-live="polite"]').exists()).toBe(true)
    expect(w.text()).toBe('')
  })

  it('score annoncé : points français et pourcentage', () => {
    const live = mountResults().find('[aria-live="polite"]').text()
    expect(live).toContain('Votre score')
    expect(live).toContain('1,6/3')
    expect(live).toContain('53%')
  })

  it('badges Partiel / Incorrect / Correct et note partielle', () => {
    const text = mountResults().text()
    expect(text).toContain('Partiel')
    expect(text).toContain('Incorrect')
    expect(text).toContain('Correct')
    expect(mountResults().find('[data-testid="partial-points"]').text()).toContain('0,6 / 1')
  })

  it('votre réponse / réponse attendue / explication / avertissement de correction dégradée', () => {
    const text = mountResults().text()
    expect(text).toContain('Parix')
    expect(text).toContain('Paris')
    expect(text).toContain('Presque.')
    expect(mountResults().find('[data-testid="degraded-notice"]').text()).toBe('Correction simplifiée.')
  })

  it('« Recommencer » émet « reset »', async () => {
    const w = mountResults()
    await w.findAll('button').find((b) => b.text() === 'Recommencer').trigger('click')
    expect(w.emitted('reset')).toHaveLength(1)
  })
})

describe('ExerciseLinkedDeadlines', () => {
  const mountDeadlines = (deadlines) => mount(ExerciseLinkedDeadlines, { global: { plugins: [createTestingPinia({ createSpy: vi.fn, initialState: { deadlines: { testDeadlines: deadlines } } })] } })

  it('rien quand l’exercice n’a pas d’échéance', () => {
    expect(mountDeadlines([]).text()).toBe('')
  })

  it('échéances avec séance, date, heure et type', () => {
    const text = mountDeadlines([
      { id: 1, name: 'DS 1', type: 'ds', dueDate: '2026-11-10T12:00:00', dueTime: '14:30:00', occurrence: { calendarEvent: { name: 'Maths' } } },
      { id: 2, name: 'Exposé', type: 'exposé', dueDate: null, dueTime: null, occurrence: null },
    ]).text()
    expect(text).toContain('Échéances liées à cet exercice')
    expect(text).toContain('Maths')
    expect(text).toContain('à 14:30')
    expect(text).toContain('Exposé')
    expect(text).toContain('—')
  })
})

describe('ExerciseResultHistory', () => {
  it('rien quand l’historique est vide', () => {
    expect(mount(ExerciseResultHistory, { props: { history: [] } }).text()).toBe('')
  })

  it('tableau accessible (légende, en-têtes), score et pourcentage, pastille verte à partir de 50 %', () => {
    const w = mount(ExerciseResultHistory, {
      props: { history: [{ resultId: 1, score: 3, total: 4, completedAt: '2026-10-01T10:00:00' }, { resultId: 2, score: 1.5, total: 4, completedAt: '2026-09-01T10:00:00' }] },
    })
    expect(w.find('caption.sr-only').text()).toBe('Historique de vos résultats')
    w.findAll('thead th').forEach((th) => expect(th.attributes('scope')).toBe('col'))
    const rows = w.findAll('tbody tr')
    expect(rows[0].text()).toContain('3/4')
    expect(rows[0].text()).toContain('75%')
    expect(rows[1].text()).toContain('1,5/4')
    expect(rows[0].find('span').classes()).toContain('bg-green-100')
    expect(rows[1].find('span').classes()).toContain('bg-red-100')
  })
})

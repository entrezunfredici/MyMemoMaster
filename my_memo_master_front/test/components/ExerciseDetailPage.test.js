import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import ExerciseDetailPage from '@/pages/ExerciseDetailPage.vue'
import { useTestStore } from '@/stores/tests'
import { useTestResultStore } from '@/stores/testResults'

// ── Mocks globaux ─────────────────────────────────────────────────────────────

const { mockNotify } = vi.hoisted(() => ({ mockNotify: vi.fn() }))

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useRoute: () => ({ params: { id: '1' } })
  }
})

vi.mock('@/helpers/notif', () => ({ notif: { notify: mockNotify } }))

// ── Données de test ────────────────────────────────────────────────────────────

const mockQuestions = [
  {
    idQuestion: 1,
    type: 'open',
    statement: 'Quelle est la capitale de la France ?',
    content: { correct_answer: 'Paris' }
  },
  {
    idQuestion: 2,
    type: 'mcq',
    statement: 'Quel est le résultat de 2+2 ?',
    content: { options: [{ text: '3', correct: false }, { text: '4', correct: true }] }
  }
]

const mockTest = {
  testId: 1,
  name: 'Test Géographie',
  subjectId: 1,
  subject: { name: 'Géographie' },
  question: mockQuestions
}

const SUBMIT_RESULT = {
  score: 2,
  total: 2,
  resultId: 1,
  results: [
    { questionId: 1, correct: true,  correctAnswer: 'Paris', explanation: null },
    { questionId: 2, correct: false, correctAnswer: '4',     explanation: null }
  ]
}

const HISTORY_FIXTURE = [
  { resultId: 1, score: 2, total: 2, completedAt: '2026-06-21T10:00:00.000Z' }
]

// ── Factory de montage ────────────────────────────────────────────────────────

function mountPage({ testData = mockTest, results = [], fetchOk = true } = {}) {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
    initialState: {
      tests:       { test: testData ?? {}, tests: [] },
      testResults: { results, history: [] }
    }
  })
  // setActivePinia permet d'accéder aux stores (et de configurer les spies)
  // avant le montage du composant, pour que onMounted trouve les bons retours
  setActivePinia(pinia)

  const testStore       = useTestStore()
  const testResultStore = useTestResultStore()
  testStore.fetchTestById.mockResolvedValue(fetchOk)
  testResultStore.fetchByTest.mockResolvedValue(true)

  const wrapper = mount(ExerciseDetailPage, {
    global: {
      plugins: [pinia],
      stubs:   { RouterLink: { template: '<a><slot /></a>' } }
    }
  })

  return { wrapper, testStore, testResultStore }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('ExerciseDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })

  // ── Chargement ───────────────────────────────────────────────────────────────

  it('affiche "Chargement" pendant onMounted puis le masque', async () => {
    const { wrapper } = mountPage()

    expect(wrapper.text()).toContain('Chargement')

    await flushPromises()

    expect(wrapper.text()).not.toContain('Chargement...')
  })

  it('affiche "introuvable" et notifie si fetchTestById retourne false', async () => {
    const { wrapper } = mountPage({ testData: null, fetchOk: false })
    await flushPromises()

    expect(wrapper.text()).toContain('introuvable')
    expect(mockNotify).toHaveBeenCalledWith('Exercice introuvable.', 'error')
  })

  // ── Rendu des questions ───────────────────────────────────────────────────────

  it('affiche le titre et le sujet de l\'exercice', async () => {
    const { wrapper } = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('Test Géographie')
    expect(wrapper.text()).toContain('Géographie')
  })

  it('question ouverte — affiche le statement et un textarea', async () => {
    const { wrapper } = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('Quelle est la capitale de la France ?')
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('question MCQ — affiche les options et les inputs radio', async () => {
    const { wrapper } = mountPage()
    await flushPromises()

    const radios = wrapper.findAll('input[type="radio"]')
    expect(radios).toHaveLength(2)
    expect(wrapper.text()).toContain('3')
    expect(wrapper.text()).toContain('4')
  })

  it('affiche le bouton "Vérifier les résultats"', async () => {
    const { wrapper } = mountPage()
    await flushPromises()

    const btn = wrapper.findAll('button').find(b => b.text().includes('Vérifier'))
    expect(btn).toBeDefined()
  })

  // ── Soumission ────────────────────────────────────────────────────────────────

  it('clic "Vérifier les résultats" — appelle submitTest avec les bonnes données', async () => {
    const { wrapper, testResultStore } = mountPage()
    await flushPromises()

    testResultStore.submitTest.mockResolvedValue(SUBMIT_RESULT)

    await wrapper.find('textarea').setValue('Paris')
    const btn = wrapper.findAll('button').find(b => b.text().includes('Vérifier'))
    await btn.trigger('click')
    await flushPromises()

    expect(testResultStore.submitTest).toHaveBeenCalledWith(
      1,
      expect.arrayContaining([expect.objectContaining({ questionId: 1 })])
    )
  })

  it('après soumission — affiche l\'écran résultats avec le score', async () => {
    const { wrapper, testResultStore } = mountPage()
    await flushPromises()

    testResultStore.submitTest.mockResolvedValue(SUBMIT_RESULT)

    const btn = wrapper.findAll('button').find(b => b.text().includes('Vérifier'))
    await btn.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Votre score')
    expect(wrapper.text()).toContain('2/2')
  })

  it('écran résultats — affiche les badges Correct et Incorrect par question', async () => {
    const { wrapper, testResultStore } = mountPage()
    await flushPromises()

    testResultStore.submitTest.mockResolvedValue(SUBMIT_RESULT)

    const btn = wrapper.findAll('button').find(b => b.text().includes('Vérifier'))
    await btn.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Correct')
    expect(wrapper.text()).toContain('Incorrect')
  })

  // ── Recommencer ───────────────────────────────────────────────────────────────

  it('bouton "Recommencer" — retour au mode quiz', async () => {
    const { wrapper, testResultStore } = mountPage()
    await flushPromises()

    testResultStore.submitTest.mockResolvedValue(SUBMIT_RESULT)

    const submitBtn = wrapper.findAll('button').find(b => b.text().includes('Vérifier'))
    await submitBtn.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Votre score')

    const resetBtn = wrapper.findAll('button').find(b => b.text().includes('Recommencer'))
    await resetBtn.trigger('click')
    await flushPromises()

    expect(wrapper.text()).not.toContain('Votre score')
    expect(wrapper.text()).toContain('Vérifier les résultats')
  })

  // ── Historique ────────────────────────────────────────────────────────────────

  it('affiche l\'historique des résultats si results non vide', async () => {
    const { wrapper } = mountPage({ results: HISTORY_FIXTURE })
    await flushPromises()

    expect(wrapper.text()).toContain('Historique de vos résultats')
    expect(wrapper.text()).toContain('2/2')
  })
})

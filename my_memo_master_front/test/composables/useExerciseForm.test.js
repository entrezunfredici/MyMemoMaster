import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import { useExerciseForm } from '@/composables/useExerciseForm'
import { useTestStore } from '@/stores/tests'
import { useTagStore } from '@/stores/tags'
import { useGuidedTourStore } from '@/stores/guidedTour'

const { mockGet, mockPost, mockPut, mockDel, mockNotify } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockDel: vi.fn(),
  mockNotify: vi.fn(),
}))
vi.mock('@/helpers/api', () => ({ api: { get: mockGet, post: mockPost, put: mockPut, del: mockDel } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: mockNotify } }))

function setup(initialState = {}) {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
    initialState: { auth: { user: { userId: 10 }, authenticated: true, token: 't' }, ...initialState },
  })
  setActivePinia(pinia)
  const testStore = useTestStore()
  testStore.fetchTests.mockResolvedValue(true)
  testStore.assignGroups.mockResolvedValue(true)
  return { exercise: useExerciseForm(), testStore, tagStore: useTagStore(), tour: useGuidedTourStore() }
}

const openQuestion = (statement) => ({ idQuestion: null, statement, type: 'open', openAnswer: 'R', openAltAnswers: [], mcqOptions: [], mcqCorrectIdx: 0, fillTemplate: '', fillBlanks: [], reorderFragments: [], imageUrl: null })

describe('useExerciseForm', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('ouverture', () => {
    it('openCreate : formulaire vierge avec une question ouverte, mode création', () => {
      const { exercise } = setup()
      exercise.openCreate()
      expect(exercise.showModal.value).toBe(true)
      expect(exercise.isEditMode.value).toBe(false)
      expect(exercise.form.name).toBe('')
      expect(exercise.form.questions).toHaveLength(1)
      expect(exercise.editingTestUserId.value).toBe(10)
    })

    it('openCreate efface l’erreur et les saisies d’une ouverture précédente', () => {
      const { exercise } = setup()
      exercise.openCreate()
      exercise.form.name = 'Ancien'
      exercise.formError.value = 'Erreur'
      exercise.addQuestion()
      exercise.openCreate()
      expect(exercise.form.name).toBe('')
      expect(exercise.formError.value).toBe('')
      expect(exercise.form.questions).toHaveLength(1)
    })

    it('parcours guidé actif : présélectionne le sujet et reprend le nom de la carte mentale', () => {
      const { exercise } = setup({
        guidedTour: { active: true, links: { subjectId: 3, mindMapId: 5 } },
        diagrammes: { diagrammes: [{ idMindMap: 5, mmName: 'Algèbre' }] },
      })
      exercise.openCreate()
      expect(exercise.form.subjectId).toBe(3)
      expect(exercise.form.name).toBe('Algèbre')
    })

    it('openEdit : charge l’exercice, convertit les questions et passe en mode édition', async () => {
      mockGet.mockResolvedValueOnce({
        status: 200,
        data: {
          name: 'Analyse', subjectId: 2, tags: [{ tagId: 9 }], classGroups: [{ id: 4 }],
          question: [{ idQuestion: 11, statement: 'Q', type: 'open', content: { correct_answer: 'R', accepted_answers: ['x'] } }],
        },
      })
      const { exercise } = setup()
      await exercise.openEdit({ testId: 7, userId: 10 })
      expect(mockGet).toHaveBeenCalledWith('tests/7')
      expect(exercise.isEditMode.value).toBe(true)
      expect(exercise.form).toMatchObject({ name: 'Analyse', subjectId: 2, tagIds: [9], groupIds: [4] })
      expect(exercise.form.questions[0]).toMatchObject({ idQuestion: 11, statement: 'Q', openAnswer: 'R', openAltAnswers: ['x'] })
      expect(exercise.showModal.value).toBe(true)
    })

    it('openEdit : exercice sans question -> une question vierge', async () => {
      mockGet.mockResolvedValueOnce({ status: 200, data: { name: 'Vide', subjectId: 1, question: [] } })
      const { exercise } = setup()
      await exercise.openEdit({ testId: 1 })
      expect(exercise.form.questions).toHaveLength(1)
      expect(exercise.form.questions[0].idQuestion).toBeNull()
    })

    it('openEdit : échec de chargement -> notification, fenêtre non ouverte', async () => {
      mockGet.mockResolvedValueOnce({ status: 500 })
      const { exercise } = setup()
      await exercise.openEdit({ testId: 1 })
      expect(mockNotify).toHaveBeenCalledWith("Impossible de charger l'exercice.", 'error')
      expect(exercise.showModal.value).toBe(false)
    })
  })

  describe('questions', () => {
    it('removeQuestion mémorise l’identifiant serveur d’une question existante (suppression à l’enregistrement)', async () => {
      mockGet.mockResolvedValueOnce({
        status: 200,
        data: { name: 'T', subjectId: 1, question: [
          { idQuestion: 11, statement: 'A', type: 'open', content: { correct_answer: 'a' } },
          { idQuestion: 12, statement: 'B', type: 'open', content: { correct_answer: 'b' } },
        ] },
      })
      mockPut.mockResolvedValue({ status: 200 })
      mockDel.mockResolvedValue(undefined)
      const { exercise } = setup()
      await exercise.openEdit({ testId: 7 })
      exercise.removeQuestion(0)
      expect(exercise.form.questions).toHaveLength(1)
      await exercise.submit()
      expect(mockDel).toHaveBeenCalledWith('questions/11')
    })

    it('removeQuestion d’une question non enregistrée ne demande aucune suppression serveur', async () => {
      mockPost.mockResolvedValueOnce({ status: 201, data: { testId: 1 } }).mockResolvedValue({ status: 201 })
      const { exercise } = setup()
      exercise.openCreate()
      exercise.addQuestion()
      exercise.removeQuestion(1)
      exercise.form.questions[0].statement = 'Q'
      exercise.form.questions[0].openAnswer = 'R'
      await exercise.submit()
      expect(mockDel).not.toHaveBeenCalled()
    })
  })

  describe('création', () => {
    function ready(exercise) {
      exercise.openCreate()
      exercise.form.name = 'Mon exercice'
      exercise.form.subjectId = '3'
      Object.assign(exercise.form.questions[0], openQuestion('Q1'))
    }

    it('crée le test, chaque question avec sa position, les étiquettes puis recharge la liste', async () => {
      mockPost.mockResolvedValueOnce({ status: 201, data: { testId: 42 } }).mockResolvedValue({ status: 201 })
      const { exercise, testStore, tagStore, tour } = setup()
      ready(exercise)
      exercise.form.tagIds = [1]
      await exercise.submit()

      expect(mockPost).toHaveBeenNthCalledWith(1, 'tests', { name: 'Mon exercice', subjectId: 3 })
      expect(mockPost).toHaveBeenNthCalledWith(2, 'questions', expect.objectContaining({ statement: 'Q1', questionPosition: 0, type: 'open', idTest: 42 }))
      expect(tagStore.setEntityTags).toHaveBeenCalledWith('test', 42, [1])
      expect(testStore.assignGroups).not.toHaveBeenCalled() // aucun groupe choisi
      expect(testStore.fetchTests).toHaveBeenCalled()
      expect(tour.recordLinks).toHaveBeenCalledWith({ testId: 42 })
      expect(mockNotify).toHaveBeenCalledWith('Exercice créé avec succès !', 'success')
      expect(exercise.showModal.value).toBe(false)
      expect(exercise.submitting.value).toBe(false)
    })

    it('partage dans les groupes choisis', async () => {
      mockPost.mockResolvedValueOnce({ status: 201, data: { testId: 42 } }).mockResolvedValue({ status: 201 })
      const { exercise, testStore } = setup()
      ready(exercise)
      exercise.form.groupIds = [4, 5]
      await exercise.submit()
      expect(testStore.assignGroups).toHaveBeenCalledWith(42, [4, 5])
    })

    it('échec à la question 2 : message précis, fenêtre ouverte, pas de notification de succès', async () => {
      mockPost
        .mockResolvedValueOnce({ status: 201, data: { testId: 42 } })
        .mockResolvedValueOnce({ status: 201 })
        .mockResolvedValueOnce({ status: 400, data: { errors: [{ msg: 'Énoncé requis.' }] } })
      const { exercise } = setup()
      ready(exercise)
      exercise.addQuestion()
      await exercise.submit()
      expect(exercise.formError.value).toBe('Énoncé requis.')
      expect(exercise.showModal.value).toBe(true)
      expect(mockNotify).not.toHaveBeenCalledWith('Exercice créé avec succès !', 'success')
      expect(exercise.submitting.value).toBe(false)
    })
  })

  describe('modification', () => {
    async function ready(exercise) {
      mockGet.mockResolvedValueOnce({
        status: 200,
        data: { name: 'Analyse', subjectId: 2, question: [{ idQuestion: 11, statement: 'A', type: 'open', content: { correct_answer: 'a' } }] },
      })
      await exercise.openEdit({ testId: 7, userId: 10 })
    }

    it('met à jour le test et ses questions existantes, crée les nouvelles, assigne les groupes', async () => {
      mockPut.mockResolvedValue({ status: 200 })
      mockPost.mockResolvedValue({ status: 201 })
      const { exercise, testStore } = setup()
      await ready(exercise)
      exercise.addQuestion()
      Object.assign(exercise.form.questions[1], openQuestion('Nouvelle'))
      await exercise.submit()

      expect(mockPut).toHaveBeenCalledWith('tests/7', { name: 'Analyse', subjectId: 2 })
      expect(mockPut).toHaveBeenCalledWith('questions/edit/11', expect.objectContaining({ questionPosition: 0 }))
      expect(mockPost).toHaveBeenCalledWith('questions', expect.objectContaining({ statement: 'Nouvelle', idTest: 7, questionPosition: 1 }))
      expect(testStore.assignGroups).toHaveBeenCalledWith(7, [])
      expect(mockNotify).toHaveBeenCalledWith('Exercice modifié avec succès !', 'success')
    })

    it('échec de mise à jour du test : message et arrêt (aucune question touchée)', async () => {
      mockPut.mockResolvedValueOnce({ status: 500, data: { message: 'Panne' } })
      const { exercise } = setup()
      await ready(exercise)
      await exercise.submit()
      expect(exercise.formError.value).toBe('Panne')
      expect(mockPut).toHaveBeenCalledTimes(1)
    })

    it('échec de suppression d’une question : message dédié', async () => {
      mockPut.mockResolvedValueOnce({ status: 200 })
      mockDel.mockResolvedValueOnce({ status: 500 })
      const { exercise } = setup()
      await ready(exercise)
      exercise.removeQuestion(0)
      exercise.addQuestion()
      await exercise.submit()
      expect(exercise.formError.value).toBe("Erreur lors de la suppression d'une question.")
    })
  })
})

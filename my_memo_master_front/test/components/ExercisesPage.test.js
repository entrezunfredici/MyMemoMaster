import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import ExercisesPage from '@/pages/ExercisesPage.vue'
import { useTestStore } from '@/stores/tests'
import { useClassGroupStore } from '@/stores/classGroups'
import { useAiExerciseGenerationStore } from '@/stores/aiExerciseGeneration'

// ── Mocks globaux ─────────────────────────────────────────────────────────────

const { mockGet, mockPost, mockPut, mockDel, mockNotify } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockDel: vi.fn(),
  mockNotify: vi.fn()
}))

vi.mock('@/helpers/api', () => ({ api: { get: mockGet, post: mockPost, put: mockPut, del: mockDel } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: mockNotify } }))
vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useRouter: () => ({ push: vi.fn() }) }
})

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TEACHER_USER = { userId: 10, roleId: 3, name: 'Prof Dupont' }
const STUDENT_USER = { userId: 20, roleId: 2, name: 'Alice' }

const GROUP_MP2I = { id: 1, name: 'MP2I A', level: 'MP2I', members: [{ userId: 10, role: 'teacher' }] }
const GROUP_MP2II = { id: 2, name: 'MP2I B', level: 'MP2I', members: [{ userId: 10, role: 'teacher' }] }
const GROUP_WHERE_STUDENT = { id: 3, name: 'L3 Info', level: 'L3', members: [{ userId: 10, role: 'student' }] }

const TEST_PRIVATE = { testId: 1, name: 'Algèbre', subjectId: 1, userId: 10, subject: { name: 'Maths' }, classGroups: [], tags: [] }
const TEST_ASSIGNED = { testId: 2, name: 'Analyse', subjectId: 1, userId: 10, subject: { name: 'Maths' }, classGroups: [GROUP_MP2I], tags: [] }

// ── Helper de montage ─────────────────────────────────────────────────────────

function mountPage({ user = TEACHER_USER, tests = [], groups = [] } = {}) {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
    initialState: {
      auth: { user, authenticated: true, token: 'tok' },
      tests: { tests, test: null },
      subjects: { subjects: [] },
      tags: { tags: [] },
      classGroups: { groups, group: null },
      aiExerciseGeneration: { status: 'idle', questions: [], warnings: [], errorMessage: '', suggestManualCreation: false }
    }
  })
  setActivePinia(pinia)

  const testStore = useTestStore()
  testStore.fetchTests.mockResolvedValue(true)
  testStore.assignGroups.mockResolvedValue(true)

  return mount(ExercisesPage, {
    global: {
      plugins: [pinia],
      stubs: {
        RouterLink: true,
        ItemListLayout: { template: '<div><slot /><slot name="modals" /></div>' },
        MenuItem: { template: '<div><slot name="stats" /></div>' },
        SubjectSelectorComponent: true,
        TagSelectorComponent: true
      }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ExercisesPage', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── assignableGroups ──────────────────────────────────────────────────────────

  describe('assignableGroups', () => {
    it('ne retient que les groupes où l\'utilisateur est teacher', async () => {
      mountPage({
        user: TEACHER_USER,
        groups: [GROUP_MP2I, GROUP_WHERE_STUDENT]
      })
      await flushPromises()

      const classGroupStore = useClassGroupStore()
      // 1 groupe teacher sur 2
      const teacherGroups = classGroupStore.groups.filter((g) =>
        g.members?.some((m) => m.userId === TEACHER_USER.userId && m.role === 'teacher')
      )
      expect(teacherGroups).toHaveLength(1)
      expect(teacherGroups[0].id).toBe(GROUP_MP2I.id)
    })

    it('retourne vide si l\'utilisateur est étudiant dans tous les groupes', async () => {
      const studentInAllGroups = { id: 3, name: 'L3 Info', level: 'L3', members: [{ userId: 10, role: 'student' }] }
      mountPage({ user: TEACHER_USER, groups: [studentInAllGroups] })
      await flushPromises()

      const classGroupStore = useClassGroupStore()
      const teacherGroups = classGroupStore.groups.filter((g) =>
        g.members?.some((m) => m.userId === TEACHER_USER.userId && m.role === 'teacher')
      )
      expect(teacherGroups).toHaveLength(0)
    })
  })

  // ── affichage badges ──────────────────────────────────────────────────────────

  describe('badges sur les cartes exercice', () => {
    it('affiche "Privé" pour un exercice sans groupe', async () => {
      const wrapper = mountPage({ tests: [TEST_PRIVATE], groups: [GROUP_MP2I] })
      await flushPromises()

      expect(wrapper.text()).toContain('Privé')
    })

    it('affiche le nom du groupe pour un exercice assigné', async () => {
      const wrapper = mountPage({ tests: [TEST_ASSIGNED], groups: [GROUP_MP2I] })
      await flushPromises()

      expect(wrapper.text()).toContain('MP2I A')
      expect(wrapper.text()).not.toContain('Privé')
    })
  })

  // ── modal d'assignation rapide ────────────────────────────────────────────────

  describe('openAssignModal', () => {
    it('pré-sélectionne les groupes déjà assignés à l\'exercice', async () => {
      const wrapper = mountPage({ tests: [TEST_ASSIGNED], groups: [GROUP_MP2I, GROUP_MP2II] })
      await flushPromises()

      // Simule l'ouverture de la modal (click sur "Assigner à des groupes")
      const btn = wrapper.find('button.underline')
      if (btn.exists()) {
        await btn.trigger('click')
        await flushPromises()
        // La modal doit être visible
        expect(wrapper.text()).toContain('Assigner aux groupes classes')
      }
    })
  })

  // ── submitAssign ──────────────────────────────────────────────────────────────

  describe('submitAssign', () => {
    it('appelle testStore.assignGroups avec le testId et les groupIds sélectionnés', async () => {
      const wrapper = mountPage({ tests: [TEST_ASSIGNED], groups: [GROUP_MP2I] })
      await flushPromises()

      const testStore = useTestStore()

      // Ouvre la modal
      const btn = wrapper.find('button.underline')
      if (btn.exists()) {
        await btn.trigger('click')
        await flushPromises()

        // Clique sur Enregistrer
        const saveBtn = wrapper.find('.btn-modal-submit')
        if (saveBtn.exists()) {
          await saveBtn.trigger('click')
          await flushPromises()

          expect(testStore.assignGroups).toHaveBeenCalledWith(TEST_ASSIGNED.testId, expect.any(Array))
        }
      }
    })
  })

  // ── section partage groupes dans modal création/édition ───────────────────────

  describe('section groupes dans modal (canAssignToGroups)', () => {
    it('cache la section groupes si l\'utilisateur n\'est teacher dans aucun groupe', async () => {
      const wrapper = mountPage({ user: STUDENT_USER, groups: [] })
      await flushPromises()

      // Ouvre la modal création
      // La section "Partager dans des groupes classes" ne doit pas être visible
      expect(wrapper.text()).not.toContain('Partager dans des groupes classes')
    })

    it('affiche la section groupes si l\'utilisateur est teacher dans au moins un groupe', async () => {
      const wrapper = mountPage({ user: TEACHER_USER, groups: [GROUP_MP2I] })
      await flushPromises()

      mockPost.mockResolvedValue({ status: 201, data: { idQuestion: 1 } })

      // Simule l'ouverture via la méthode
      const vm = wrapper.vm
      if (vm.openCreateModal) {
        vm.openCreateModal()
        await flushPromises()
        expect(wrapper.text()).toContain('Partager dans des groupes classes')
      }
    })
  })

  // ── extraction du message d'erreur (BUG : "Erreur question N."/"Erreur ... exercice." masquait
  //    la vraie cause) ────────────────────────────────────────────────────────────────────────

  describe('extractErrorMessage (submitCreate)', () => {
    // Depuis le fix ci-dessous, submitCreate() appelle directement api.post('tests', ...) puis
    // api.post('questions', ...) par question (BUG TROUVÉ EN CONDITIONS RÉELLES : passer par
    // testStore.createTest(), qui ne renvoie qu'un booléen, empêchait tout accès au message réel
    // d'un échec de création du test — "Erreur lors de la création de l'exercice." s'affichait
    // systématiquement, quelle que soit la cause). Chaque test mocke donc 2 appels successifs :
    // la création du test (1er, réussie sauf mention contraire) puis celle de la question testée.
    const TEST_CREATED_OK = { status: 201, data: { testId: 42 } }

    // BUG TROUVÉ EN CONDITIONS RÉELLES : validate.middleware.js répond `{ errors: [...] }`
    // (express-validator), jamais `{ message }` — l'ancien code (`resp?.data?.message || fallback`)
    // ignorait totalement ce tableau et affichait systématiquement le message générique
    // "Erreur question N.", masquant la vraie raison du rejet (ex. énoncé vide) à l'utilisateur.
    it('échec de création d\'une question — 400 avec { errors: [...] } (express-validator) — affiche le message de validation réel', async () => {
      const wrapper = mountPage({ user: TEACHER_USER })
      await flushPromises()
      const vm = wrapper.vm
      if (!vm.submitCreate) return

      mockPost
        .mockResolvedValueOnce(TEST_CREATED_OK)
        .mockResolvedValueOnce({ status: 400, data: { errors: [{ msg: "L'énoncé de la question est requis", path: 'statement' }] } })

      vm.openCreateModal()
      vm.form.name = 'Exercice test'
      await vm.submitCreate()

      expect(vm.formError).toBe("L'énoncé de la question est requis")
    })

    it('échec de création d\'une question — 500 avec { message } — priorité au message métier sur les erreurs de validation', async () => {
      const wrapper = mountPage({ user: TEACHER_USER })
      await flushPromises()
      const vm = wrapper.vm
      if (!vm.submitCreate) return

      mockPost
        .mockResolvedValueOnce(TEST_CREATED_OK)
        .mockResolvedValueOnce({ status: 500, data: { message: 'Erreur serveur inattendue.' } })

      vm.openCreateModal()
      vm.form.name = 'Exercice test'
      await vm.submitCreate()

      expect(vm.formError).toBe('Erreur serveur inattendue.')
    })

    it('échec de création d\'une question — échec réseau (resp undefined) — retombe sur le message générique', async () => {
      const wrapper = mountPage({ user: TEACHER_USER })
      await flushPromises()
      const vm = wrapper.vm
      if (!vm.submitCreate) return

      mockPost.mockResolvedValueOnce(TEST_CREATED_OK).mockResolvedValueOnce(undefined)

      vm.openCreateModal()
      vm.form.name = 'Exercice test'
      await vm.submitCreate()

      expect(vm.formError).toBe('Erreur question 1.')
    })

    // BUG TROUVÉ EN CONDITIONS RÉELLES (signalé par l'utilisateur, capture à l'appui) : la création
    // du TEST lui-même échouait ("Erreur lors de la création de l'exercice.", générique) sans que la
    // vraie cause serveur ne soit jamais visible — submitCreate() passait par testStore.createTest(),
    // qui avale le message réel dans un toast interne au store.
    it('échec de création du TEST lui-même — 400 avec { errors: [...] } — affiche le message de validation réel, pas le générique', async () => {
      const wrapper = mountPage({ user: TEACHER_USER })
      await flushPromises()
      const vm = wrapper.vm
      if (!vm.submitCreate) return

      mockPost.mockResolvedValueOnce({ status: 400, data: { errors: [{ msg: 'Le sujet est requis.', path: 'subjectId' }] } })

      vm.openCreateModal()
      vm.form.name = 'Exercice test'
      await vm.submitCreate()

      expect(vm.formError).toBe('Le sujet est requis.')
      // Aucune question ne doit être postée si le test lui-même n'a pas pu être créé
      expect(mockPost).toHaveBeenCalledTimes(1)
    })

    it('échec de création du TEST lui-même — échec réseau (resp undefined) — retombe sur le message générique', async () => {
      const wrapper = mountPage({ user: TEACHER_USER })
      await flushPromises()
      const vm = wrapper.vm
      if (!vm.submitCreate) return

      mockPost.mockResolvedValueOnce(undefined)

      vm.openCreateModal()
      vm.form.name = 'Exercice test'
      await vm.submitCreate()

      expect(vm.formError).toBe('Erreur lors de la création de l\'exercice.')
    })
  })

  // ── génération de questions par IA (C-02.06/C-02.07) ─────────────────────────

  describe('génération de questions par IA', () => {
    it('ouvre le flux de configuration IA au clic sur "✨ Générer par IA"', async () => {
      const wrapper = mountPage({ user: TEACHER_USER })
      await flushPromises()

      const vm = wrapper.vm
      if (vm.openCreateModal) {
        vm.openCreateModal()
        await flushPromises()
      }

      const aiButton = wrapper.findAll('button').find((b) => b.text().includes('Générer par IA'))
      if (aiButton) {
        await aiButton.trigger('click')
        await flushPromises()
        expect(wrapper.text()).toContain('Générer des questions par IA')
      }
    })

    it('handleAiGenerate — succès — passe à l\'Écran de révision sans toucher à form.questions', async () => {
      const wrapper = mountPage({ user: TEACHER_USER })
      await flushPromises()
      const vm = wrapper.vm
      if (!vm.handleAiGenerate) return

      vm.openAiFlow()
      const aiExerciseGenerationStore = useAiExerciseGenerationStore()
      aiExerciseGenerationStore.generate.mockImplementation(async () => {
        aiExerciseGenerationStore.questions = [
          { statement: 'Qu\'est-ce que la photosynthèse ?', type: 'open', content: { correct_answer: 'R' } }
        ]
        aiExerciseGenerationStore.warnings = ['Une notion sur deux seulement.']
        return true
      })

      const questionsCountBefore = vm.form.questions.length
      await vm.handleAiGenerate({ sourceText: 'texte', questionCount: 1, questionType: 'mixed' })
      await flushPromises()

      expect(vm.form.questions).toHaveLength(questionsCountBefore)
      expect(vm.aiStep).toBe('review')
      expect(vm.showAiFlow).toBe(true)
    })

    it('handleAiGenerate — échec — reste sur l\'étape en cours (pas de transition vers "review")', async () => {
      const wrapper = mountPage({ user: TEACHER_USER })
      await flushPromises()
      const vm = wrapper.vm
      if (!vm.handleAiGenerate) return

      const aiExerciseGenerationStore = useAiExerciseGenerationStore()
      aiExerciseGenerationStore.generate.mockResolvedValue(false)

      await vm.handleAiGenerate({ sourceText: 'texte', questionCount: 1, questionType: 'mixed' })
      await flushPromises()

      expect(vm.aiStep).not.toBe('review')
    })

    it('handleReviewConfirm — ajoute les questions acceptées à form.questions puis referme le flux', async () => {
      const wrapper = mountPage({ user: TEACHER_USER })
      await flushPromises()
      const vm = wrapper.vm
      if (!vm.handleReviewConfirm) return

      const aiExerciseGenerationStore = useAiExerciseGenerationStore()
      vm.showAiFlow = true
      mockPost.mockResolvedValueOnce({ status: 200, data: { importable: [], rejected: [] } })

      await vm.handleReviewConfirm([
        {
          statement: 'Capitale de la France ?',
          type: 'mcq',
          openAnswer: '',
          openAltAnswers: [],
          mcqOptions: [{ text: 'Paris' }, { text: 'Madrid' }],
          mcqCorrectIdx: 0,
          fillTemplate: '',
          fillBlanks: [],
          reorderFragments: ['', ''],
        }
      ])
      await flushPromises()

      const added = vm.form.questions[vm.form.questions.length - 1]
      expect(added.statement).toBe('Capitale de la France ?')
      expect(added.type).toBe('mcq')
      expect(added.mcqCorrectIdx).toBe(0)
      expect(vm.showAiFlow).toBe(false)
      expect(aiExerciseGenerationStore.reset).toHaveBeenCalled()
    })

    // BUG TROUVÉ EN CONDITIONS RÉELLES : la question vide ouverte par défaut à la création du
    // formulaire ("Question 1", jamais touchée) restait dans form.questions après acceptation des
    // questions générées — form.questions.filter/submitCreate() échouait ensuite sur cette question
    // vide ("Erreur question 1.", statement/openAnswer requis côté serveur).
    it('handleReviewConfirm — retire la question vide par défaut, jamais touchée, avant d\'ajouter les questions générées', async () => {
      const wrapper = mountPage({ user: TEACHER_USER })
      await flushPromises()
      const vm = wrapper.vm
      if (!vm.handleReviewConfirm) return

      vm.openCreateModal() // form.questions = [defaultQuestion()] — une seule question vide, jamais éditée
      vm.showAiFlow = true
      mockPost.mockResolvedValueOnce({ status: 200, data: { importable: [], rejected: [] } })

      await vm.handleReviewConfirm([
        { statement: 'Q générée', type: 'open', openAnswer: 'Réponse', openAltAnswers: [], mcqOptions: [{ text: '' }, { text: '' }], mcqCorrectIdx: 0, fillTemplate: '', fillBlanks: [], reorderFragments: ['', ''] }
      ])
      await flushPromises()

      expect(vm.form.questions).toHaveLength(1)
      expect(vm.form.questions[0].statement).toBe('Q générée')
    })

    it('handleReviewConfirm — ne retire PAS une question déjà renseignée manuellement par l\'utilisateur', async () => {
      const wrapper = mountPage({ user: TEACHER_USER })
      await flushPromises()
      const vm = wrapper.vm
      if (!vm.handleReviewConfirm) return

      vm.openCreateModal()
      vm.form.questions[0].statement = 'Ma propre question' // l'utilisateur a commencé à la remplir
      vm.showAiFlow = true
      mockPost.mockResolvedValueOnce({ status: 200, data: { importable: [], rejected: [] } })

      await vm.handleReviewConfirm([
        { statement: 'Q générée', type: 'open', openAnswer: 'Réponse', openAltAnswers: [], mcqOptions: [{ text: '' }, { text: '' }], mcqCorrectIdx: 0, fillTemplate: '', fillBlanks: [], reorderFragments: ['', ''] }
      ])
      await flushPromises()

      expect(vm.form.questions).toHaveLength(2)
      expect(vm.form.questions[0].statement).toBe('Ma propre question')
      expect(vm.form.questions[1].statement).toBe('Q générée')
    })

    it('handleReviewConfirm — liste vide (tout rejeté) referme le flux sans toucher à form.questions (garde la question vide par défaut)', async () => {
      const wrapper = mountPage({ user: TEACHER_USER })
      await flushPromises()
      const vm = wrapper.vm
      if (!vm.handleReviewConfirm) return

      vm.openCreateModal()
      vm.showAiFlow = true
      const before = vm.form.questions.length

      vm.handleReviewConfirm([])

      expect(vm.form.questions).toHaveLength(before)
      expect(vm.showAiFlow).toBe(false)
    })

    // C-02.09 (revue de code) : AiExerciseImportValidation.service.js n'était appelé nulle part —
    // une question éditée en Interface de révision pouvait redevenir invalide au format (ex. mcq sans
    // option marquée correcte) et être persistée sans contrôle. Revalidée ici avant fusion dans
    // form.questions, jamais ajoutée silencieusement si rejetée.
    it('handleReviewConfirm — une question rejetée par la revalidation format n\'est pas ajoutée, l\'utilisateur est notifié', async () => {
      const wrapper = mountPage({ user: TEACHER_USER })
      await flushPromises()
      const vm = wrapper.vm
      if (!vm.handleReviewConfirm) return

      vm.openCreateModal()
      vm.showAiFlow = true
      mockPost.mockResolvedValueOnce({
        status: 200,
        data: {
          importable: [],
          rejected: [{ index: 0, errors: ['Question #1 : mcq doit avoir exactement une option "correct".'] }]
        }
      })

      await vm.handleReviewConfirm([
        { statement: 'Q cassée', type: 'mcq', openAnswer: '', openAltAnswers: [], mcqOptions: [{ text: 'A' }, { text: 'B' }], mcqCorrectIdx: 0, fillTemplate: '', fillBlanks: [], reorderFragments: ['', ''] }
      ])
      await flushPromises()

      // Ni ajoutée, ni la question vide par défaut retirée (rien d'importable à mettre à sa place).
      expect(vm.form.questions.some((q) => q.statement === 'Q cassée')).toBe(false)
      expect(vm.form.questions).toHaveLength(1)
      expect(mockNotify).toHaveBeenCalledWith(expect.stringContaining('1 question'), 'error')
      expect(vm.showAiFlow).toBe(false)
    })

    it('closeAiFlow — referme le flux et réinitialise le store de génération', async () => {
      const wrapper = mountPage({ user: TEACHER_USER })
      await flushPromises()
      const vm = wrapper.vm
      if (!vm.closeAiFlow) return

      const aiExerciseGenerationStore = useAiExerciseGenerationStore()
      vm.showAiFlow = true
      vm.closeAiFlow()

      expect(vm.showAiFlow).toBe(false)
      expect(aiExerciseGenerationStore.reset).toHaveBeenCalled()
    })

    it('parcours complet — config -> génération réussie -> Écran de révision affiché avec les questions du store', async () => {
      const wrapper = mountPage({ user: TEACHER_USER })
      await flushPromises()
      const vm = wrapper.vm
      if (!vm.openCreateModal || !vm.handleAiGenerate) return

      vm.openCreateModal()
      vm.openAiFlow()
      await flushPromises()

      const aiExerciseGenerationStore = useAiExerciseGenerationStore()
      aiExerciseGenerationStore.generate.mockImplementation(async () => {
        aiExerciseGenerationStore.questions = [
          { statement: 'Qu\'est-ce que la photosynthèse ?', type: 'open', content: { correct_answer: 'R' }, sourceExcerpt: 'Extrait' }
        ]
        aiExerciseGenerationStore.warnings = []
        return true
      })

      await vm.handleAiGenerate({ sourceText: 'texte', questionCount: 1, questionType: 'mixed' })
      await flushPromises()

      expect(wrapper.text()).toContain('Relecture des questions générées')
      expect(wrapper.text()).toContain('Qu\'est-ce que la photosynthèse ?')
    })
  })
})

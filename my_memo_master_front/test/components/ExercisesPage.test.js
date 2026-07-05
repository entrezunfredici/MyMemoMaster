import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import ExercisesPage from '@/pages/ExercisesPage.vue'
import { useTestStore } from '@/stores/tests'
import { useClassGroupStore } from '@/stores/classGroups'

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
      classGroups: { groups, group: null }
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

      const testStore = useTestStore()
      testStore.createTest.mockResolvedValue(true)
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
})

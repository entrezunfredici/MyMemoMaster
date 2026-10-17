import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import ExercisesPage from '@/pages/ExercisesPage.vue'
import { useTestStore } from '@/stores/tests'

vi.mock('@/helpers/api', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: vi.fn() } }))
vi.mock('vue-router', async (importOriginal) => ({ ...(await importOriginal()), useRouter: () => ({ push: vi.fn() }) }))

const TESTS = [
  { testId: 1, name: 'Algèbre', subjectId: 1, userId: 10, subject: { name: 'Maths' }, classGroups: [], tags: [] },
  { testId: 2, name: 'Analyse', subjectId: 1, userId: 10, subject: { name: 'Maths' }, classGroups: [], tags: [] },
]

// MenuItem et ItemListLayout RÉELS : la suppression se déclenche par le vrai bouton ✕ de la carte
function mountPage() {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
    initialState: {
      auth: { user: { userId: 10, roleId: 3 }, authenticated: true, token: 't' },
      tests: { tests: TESTS, test: null },
      subjects: { subjects: [] },
      classGroups: { groups: [], group: null },
    },
  })
  const store = useTestStore(pinia)
  store.fetchTests.mockResolvedValue(true)
  const wrapper = mount(ExercisesPage, {
    attachTo: document.body,
    global: {
      plugins: [pinia],
      stubs: { RouterLink: true, SubjectSelectorComponent: true, TagSelectorComponent: true },
    },
  })
  return { wrapper, store }
}

describe('ExercisesPage — suppression d’un exercice (modale de confirmation commune)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('le bouton ✕ de chaque carte cite son exercice (RGAA 11.9)', async () => {
    const { wrapper } = mountPage()
    await flushPromises()
    expect(wrapper.find('button[aria-label="Supprimer Algèbre"]').exists()).toBe(true)
    expect(wrapper.find('button[aria-label="Supprimer Analyse"]').exists()).toBe(true)
  })

  it('« Supprimer » ouvre une confirmation nominative ; rien n’est supprimé avant la réponse', async () => {
    const { wrapper, store } = mountPage()
    await flushPromises()
    await wrapper.find('button[aria-label="Supprimer Algèbre"]').trigger('click')
    const dialog = wrapper.find('[role="dialog"]')
    expect(dialog.attributes('aria-label')).toBe("Supprimer l'exercice")
    expect(dialog.text()).toContain("Supprimer l'exercice « Algèbre » ? Cette action est irréversible.")
    expect(store.deleteTest).not.toHaveBeenCalled()
  })

  it('« Annuler » ferme sans rien supprimer', async () => {
    const { wrapper, store } = mountPage()
    await flushPromises()
    await wrapper.find('button[aria-label="Supprimer Algèbre"]').trigger('click')
    await wrapper.find('.btn-modal-cancel').trigger('click')
    expect(store.deleteTest).not.toHaveBeenCalled()
    expect(wrapper.find('[aria-label="Supprimer l\'exercice"]').exists()).toBe(false)
  })

  it('« Confirmer » supprime l’exercice choisi (et lui seul)', async () => {
    const { wrapper, store } = mountPage()
    await flushPromises()
    await wrapper.find('button[aria-label="Supprimer Analyse"]').trigger('click')
    await wrapper.find('.btn-modal-danger').trigger('click')
    await flushPromises()
    expect(store.deleteTest).toHaveBeenCalledTimes(1)
    expect(store.deleteTest).toHaveBeenCalledWith(2)
  })

  it('Échap annule la confirmation', async () => {
    const { wrapper, store } = mountPage()
    await flushPromises()
    await wrapper.find('button[aria-label="Supprimer Algèbre"]').trigger('click')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(wrapper.find('[role="dialog"][aria-label="Supprimer l\'exercice"]').exists()).toBe(false)
    expect(store.deleteTest).not.toHaveBeenCalled()
  })
})

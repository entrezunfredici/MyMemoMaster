import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import ExerciseAssignModal from '@/components/exercises/ExerciseAssignModal.vue'
import { useTestStore } from '@/stores/tests'

const GROUPS = [
  { id: 1, name: 'MP2I A', level: 'MP2I', members: [{ userId: 10, role: 'teacher' }] },
  { id: 2, name: 'L3', members: [{ userId: 10, role: 'teacher' }] },
  { id: 3, name: 'Autre', members: [{ userId: 10, role: 'student' }] }, // non assignable
]
const TEST = { testId: 7, name: 'Algèbre', classGroups: [{ id: 2 }] }

function mountModal({ groups = GROUPS, userId = 10 } = {}) {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
    initialState: {
      auth: { user: { userId, roleId: 3 }, authenticated: true, token: 't' },
      classGroups: { groups, group: null },
    },
  })
  const store = useTestStore(pinia)
  store.assignGroups.mockResolvedValue(true)
  const wrapper = mount(ExerciseAssignModal, { global: { plugins: [pinia] }, attachTo: document.body })
  return { wrapper, store }
}

describe('ExerciseAssignModal', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('fermée au départ', () => {
    expect(mountModal().wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('open(test) affiche les seuls groupes dont l’utilisateur est enseignant, déjà assignés cochés', async () => {
    const { wrapper } = mountModal()
    wrapper.vm.open(TEST)
    await flushPromises()
    const labels = wrapper.findAll('label')
    expect(labels.map((l) => l.find('span').text())).toEqual(['MP2I A', 'L3'])
    expect(wrapper.findAll('input[type="checkbox"]').map((c) => c.element.checked)).toEqual([false, true])
  })

  it('dialogue modal nommé par son titre', async () => {
    const { wrapper } = mountModal()
    wrapper.vm.open(TEST)
    await flushPromises()
    const dialog = wrapper.find('[role="dialog"]')
    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(wrapper.find(`#${dialog.attributes('aria-labelledby')}`).text()).toBe('Assigner aux groupes classes')
  })

  it('aucun groupe assignable : message explicatif', async () => {
    const { wrapper } = mountModal({ groups: [GROUPS[2]] })
    wrapper.vm.open(TEST)
    await flushPromises()
    expect(wrapper.text()).toContain("Vous n'avez aucun groupe classe")
  })

  it('« Enregistrer » assigne les groupes cochés puis ferme', async () => {
    const { wrapper, store } = mountModal()
    wrapper.vm.open(TEST)
    await flushPromises()
    await wrapper.findAll('input[type="checkbox"]')[0].setValue(true)
    await wrapper.find('.btn-modal-submit').trigger('click')
    await flushPromises()
    expect(store.assignGroups).toHaveBeenCalledWith(7, [2, 1])
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('échec de l’assignation : la fenêtre reste ouverte', async () => {
    const { wrapper, store } = mountModal()
    store.assignGroups.mockResolvedValue(false)
    wrapper.vm.open(TEST)
    await flushPromises()
    await wrapper.find('.btn-modal-submit').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    expect(wrapper.find('.btn-modal-submit').attributes('disabled')).toBeUndefined()
  })

  it('« Annuler » et Échap ferment sans assigner', async () => {
    const { wrapper, store } = mountModal()
    wrapper.vm.open(TEST)
    await flushPromises()
    await wrapper.find('.btn-modal-cancel').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    wrapper.vm.open(TEST)
    await flushPromises()
    await wrapper.find('[role="dialog"]').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(store.assignGroups).not.toHaveBeenCalled()
  })

  it('la sélection est réinitialisée à chaque ouverture', async () => {
    const { wrapper } = mountModal()
    wrapper.vm.open(TEST)
    await flushPromises()
    await wrapper.findAll('input[type="checkbox"]')[0].setValue(true)
    await wrapper.find('.btn-modal-cancel').trigger('click')
    wrapper.vm.open({ testId: 8, name: 'Autre', classGroups: [] })
    await flushPromises()
    expect(wrapper.findAll('input[type="checkbox"]').map((c) => c.element.checked)).toEqual([false, false])
  })
})

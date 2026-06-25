import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SubjectSelectorComponent from '@/components/SubjectSelectorComponent.vue'

const { mockGet, mockPost, mockNotify } = vi.hoisted(() => ({
  mockGet:    vi.fn(),
  mockPost:   vi.fn(),
  mockNotify: vi.fn()
}))

vi.mock('@/helpers/api',  () => ({ api: { get: mockGet, post: mockPost } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: mockNotify } }))

const SUBJECTS = [
  { subjectId: 1, name: 'Mathématiques' },
  { subjectId: 2, name: 'Physique' }
]

const mountComponent = (props = {}) =>
  mount(SubjectSelectorComponent, {
    props: { modelValue: null, ...props },
    attachTo: document.body
  })

describe('SubjectSelectorComponent', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockGet.mockResolvedValue({ status: 200, data: SUBJECTS })
  })

  // ── Initialisation ────────────────────────────────────────────────────────

  it('charge les sujets depuis l\'API au montage si le store est vide', async () => {
    mountComponent()
    await flushPromises()
    expect(mockGet).toHaveBeenCalledWith('subjects')
  })

  it('ne recharge pas les sujets si le store est déjà peuplé', async () => {
    const w1 = mountComponent()
    await flushPromises()
    expect(mockGet).toHaveBeenCalledTimes(1)

    mountComponent()
    await flushPromises()
    expect(mockGet).toHaveBeenCalledTimes(1)

    w1.unmount()
  })

  it('affiche les sujets du store dans le select', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const options = wrapper.findAll('option')
    const texts = options.map((o) => o.text())
    expect(texts).toContain('Mathématiques')
    expect(texts).toContain('Physique')
  })

  // ── Prop required ─────────────────────────────────────────────────────────

  it('affiche "— Sans sujet —" quand required=false (défaut)', async () => {
    const wrapper = mountComponent({ required: false })
    await flushPromises()

    const options = wrapper.findAll('option')
    expect(options[0].text()).toBe('— Sans sujet —')
  })

  it('affiche "Sélectionner un sujet" quand required=true', async () => {
    const wrapper = mountComponent({ required: true })
    await flushPromises()

    const options = wrapper.findAll('option')
    expect(options[0].text()).toBe('Sélectionner un sujet')
  })

  it('le select a l\'attribut required quand required=true', async () => {
    const wrapper = mountComponent({ required: true })
    await flushPromises()

    expect(wrapper.find('select').attributes('required')).toBeDefined()
  })

  it('le select n\'a pas l\'attribut required quand required=false', async () => {
    const wrapper = mountComponent({ required: false })
    await flushPromises()

    expect(wrapper.find('select').attributes('required')).toBeUndefined()
  })

  // ── Sélection ─────────────────────────────────────────────────────────────

  it('émet update:modelValue avec le subjectId sélectionné', async () => {
    const wrapper = mountComponent({ modelValue: null })
    await flushPromises()

    const select = wrapper.find('select')
    await select.setValue(1)

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeDefined()
    expect(emitted[0][0]).toBe(1)
  })

  it('émet null quand l\'option "— Sans sujet —" est sélectionnée', async () => {
    const wrapper = mountComponent({ modelValue: 1 })
    await flushPromises()

    const select = wrapper.find('select')
    await select.setValue(null)

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted[0][0]).toBeNull()
  })

  // ── Formulaire inline ─────────────────────────────────────────────────────

  it('affiche le bouton "+ Créer un nouveau sujet" par défaut', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.text()).toContain('+ Créer un nouveau sujet')
  })

  it('ouvre le formulaire inline au clic du bouton créer', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.subject-create-link').trigger('click')

    expect(wrapper.find('.subject-inline-form').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('+ Créer un nouveau sujet')
  })

  it('ferme le formulaire et réinitialise l\'input sur Annuler', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.subject-create-link').trigger('click')
    await wrapper.find('.subject-inline-input').setValue('Chimie')
    await wrapper.find('.subject-inline-cancel').trigger('click')

    expect(wrapper.find('.subject-inline-form').exists()).toBe(false)
    expect(wrapper.find('.subject-inline-input').exists()).toBe(false)
  })

  it('le bouton "Créer" est désactivé si le champ est vide', async () => {
    const wrapper = mountComponent()
    await flushPromises()
    await wrapper.find('.subject-create-link').trigger('click')

    const submitBtn = wrapper.find('.subject-inline-btn')
    expect(submitBtn.attributes('disabled')).toBeDefined()
  })

  it('crée un sujet et émet le nouveau subjectId', async () => {
    const newSubject = { subjectId: 3, name: 'Chimie' }
    mockPost.mockResolvedValueOnce({ status: 201, data: newSubject })
    mockGet.mockResolvedValueOnce({ status: 200, data: [...SUBJECTS, newSubject] })

    const wrapper = mountComponent({ modelValue: null })
    await flushPromises()
    await wrapper.find('.subject-create-link').trigger('click')
    await wrapper.find('.subject-inline-input').setValue('Chimie')
    await wrapper.find('.subject-inline-btn').trigger('click')
    await flushPromises()

    expect(mockPost).toHaveBeenCalledWith('subjects', { name: 'Chimie' })
    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeDefined()
    expect(emitted[emitted.length - 1][0]).toBe(3)
  })

  it('crée un sujet via la touche Entrée', async () => {
    const newSubject = { subjectId: 3, name: 'Chimie' }
    mockPost.mockResolvedValueOnce({ status: 201, data: newSubject })
    mockGet.mockResolvedValueOnce({ status: 200, data: [...SUBJECTS, newSubject] })

    const wrapper = mountComponent({ modelValue: null })
    await flushPromises()
    await wrapper.find('.subject-create-link').trigger('click')
    const input = wrapper.find('.subject-inline-input')
    await input.setValue('Chimie')
    await input.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(mockPost).toHaveBeenCalledWith('subjects', { name: 'Chimie' })
  })

  it('notifie une erreur si la création échoue et garde le formulaire ouvert', async () => {
    mockPost.mockResolvedValueOnce({ status: 400, data: { message: 'Nom trop court.' } })

    const wrapper = mountComponent()
    await flushPromises()
    await wrapper.find('.subject-create-link').trigger('click')
    await wrapper.find('.subject-inline-input').setValue('X')
    await wrapper.find('.subject-inline-btn').trigger('click')
    await flushPromises()

    expect(mockNotify).toHaveBeenCalledWith('Nom trop court.', 'error')
    expect(wrapper.find('.subject-inline-form').exists()).toBe(true)
  })

  it('ferme le formulaire inline quand modelValue repasse à null', async () => {
    // Monter avec une valeur non-null pour que le watch détecte un vrai changement
    const wrapper = mountComponent({ modelValue: 2 })
    await flushPromises()
    await wrapper.find('.subject-create-link').trigger('click')
    expect(wrapper.find('.subject-inline-form').exists()).toBe(true)

    await wrapper.setProps({ modelValue: null })
    await flushPromises()

    expect(wrapper.find('.subject-inline-form').exists()).toBe(false)
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import TagSelectorComponent from '@/components/TagSelectorComponent.vue'

const { mockGet, mockPost, mockPut, mockNotify } = vi.hoisted(() => ({
  mockGet:    vi.fn(),
  mockPost:   vi.fn(),
  mockPut:    vi.fn(),
  mockNotify: vi.fn()
}))

vi.mock('@/helpers/api',  () => ({ api: { get: mockGet, post: mockPost, put: mockPut } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: mockNotify } }))

const TAGS = [
  { tagId: 1, name: 'maths',    color: '#EF4444' },
  { tagId: 2, name: 'révision', color: '#6366F1' }
]

const mountComponent = (modelValue = []) =>
  mount(TagSelectorComponent, {
    props: { modelValue },
    attachTo: document.body
  })

describe('TagSelectorComponent', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockGet.mockResolvedValue({ status: 200, data: TAGS })
  })

  // ── Initialisation ────────────────────────────────────────────────────────

  it('charge les tags depuis l\'API au montage si le store est vide', async () => {
    mountComponent()
    await flushPromises()
    expect(mockGet).toHaveBeenCalledWith('tags')
  })

  it('ne recharge pas les tags si le store est déjà peuplé', async () => {
    const w1 = mountComponent()
    await flushPromises()
    expect(mockGet).toHaveBeenCalledTimes(1)

    mountComponent()
    await flushPromises()
    expect(mockGet).toHaveBeenCalledTimes(1)

    w1.unmount()
  })

  it('affiche les chips des tags déjà sélectionnés', async () => {
    const wrapper = mountComponent([1])
    await flushPromises()
    expect(wrapper.text()).toContain('maths')
  })

  it('n\'affiche pas de chip pour les tags non sélectionnés', async () => {
    const wrapper = mountComponent([1])
    await flushPromises()
    const chipTexts = wrapper.findAll('.rounded-full').map((el) => el.text())
    const hasRevision = chipTexts.some((t) => t.includes('révision'))
    expect(hasRevision).toBe(false)
  })

  // ── Ouverture du dropdown ─────────────────────────────────────────────────

  it('ouvre le dropdown au focus sur l\'input et liste les tags', async () => {
    const wrapper = mountComponent()
    await flushPromises()
    await wrapper.find('input').trigger('focus')
    expect(wrapper.text()).toContain('maths')
    expect(wrapper.text()).toContain('révision')
  })

  it('ferme le dropdown sur Escape', async () => {
    const wrapper = mountComponent()
    await flushPromises()
    await wrapper.find('input').trigger('focus')
    await wrapper.find('input').trigger('keydown', { key: 'Escape' })
    expect(wrapper.text()).not.toContain('révision')
  })

  // ── Sélection ─────────────────────────────────────────────────────────────

  it('émet update:modelValue avec le tagId ajouté au clic', async () => {
    const wrapper = mountComponent([])
    await flushPromises()
    await wrapper.find('input').trigger('focus')

    const dropdownBtns = wrapper.findAll('.absolute button[type="button"]')
    const mathsBtn = dropdownBtns.find((b) => b.text().includes('maths'))
    await mathsBtn.trigger('mousedown')

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeDefined()
    expect(emitted[0][0]).toContain(1)
  })

  it('émet update:modelValue sans le tagId si déjà sélectionné (bascule)', async () => {
    const wrapper = mountComponent([1, 2])
    await flushPromises()
    await wrapper.find('input').trigger('focus')

    const dropdownBtns = wrapper.findAll('.absolute button[type="button"]')
    const mathsBtn = dropdownBtns.find((b) => b.text().includes('maths'))
    await mathsBtn.trigger('mousedown')

    const emitted = wrapper.emitted('update:modelValue')[0][0]
    expect(emitted).not.toContain(1)
    expect(emitted).toContain(2)
  })

  // ── Retrait via chip ×─────────────────────────────────────────────────────

  it('émet update:modelValue sans le tag au clic × du chip', async () => {
    const wrapper = mountComponent([1, 2])
    await flushPromises()

    const removeBtn = wrapper.find('button[aria-label="Retirer maths"]')
    await removeBtn.trigger('click')

    const emitted = wrapper.emitted('update:modelValue')[0][0]
    expect(emitted).not.toContain(1)
    expect(emitted).toContain(2)
  })

  // ── Backspace ─────────────────────────────────────────────────────────────

  it('retire le dernier tag via Backspace quand l\'input est vide', async () => {
    const wrapper = mountComponent([1, 2])
    await flushPromises()

    await wrapper.find('input').trigger('keydown', { key: 'Backspace' })

    const emitted = wrapper.emitted('update:modelValue')[0][0]
    expect(emitted).toHaveLength(1)
    expect(emitted[0]).toBe(1)
  })

  it('ne retire pas de tag sur Backspace si l\'input contient du texte', async () => {
    const wrapper = mountComponent([1])
    await flushPromises()
    await wrapper.find('input').setValue('abc')
    await wrapper.find('input').trigger('keydown', { key: 'Backspace' })

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  // ── Filtre de recherche ───────────────────────────────────────────────────

  it('filtre les tags selon la saisie dans l\'input', async () => {
    const wrapper = mountComponent()
    await flushPromises()
    await wrapper.find('input').setValue('mat')
    await wrapper.find('input').trigger('input')

    expect(wrapper.text()).toContain('maths')
    expect(wrapper.text()).not.toContain('révision')
  })

  // ── Création inline ───────────────────────────────────────────────────────

  it('affiche l\'option "Créer" quand la recherche ne correspond à aucun tag', async () => {
    const wrapper = mountComponent()
    await flushPromises()
    await wrapper.find('input').setValue('nouveau-tag')
    await wrapper.find('input').trigger('input')

    expect(wrapper.text()).toContain('Créer « nouveau-tag »')
  })

  it('n\'affiche pas "Créer" quand un tag avec ce nom exact existe', async () => {
    const wrapper = mountComponent()
    await flushPromises()
    await wrapper.find('input').setValue('maths')
    await wrapper.find('input').trigger('input')

    expect(wrapper.text()).not.toContain('Créer «')
  })

  it('crée un tag et émet le nouveau tagId via createAndSelect', async () => {
    const newTag = { tagId: 3, name: 'nouveau-tag', color: '#6366F1' }
    mockPost.mockResolvedValueOnce({ status: 201, data: { data: newTag } })
    // NE PAS surcharger mockGet ici : createTag pousse directement dans le store (pas de refetch)
    // Surcharger dès le montage rendrait canCreate=false car newTag serait déjà dans le store

    const wrapper = mountComponent([])
    await flushPromises()
    await wrapper.find('input').setValue('nouveau-tag')
    await wrapper.find('input').trigger('input')
    await wrapper.vm.$nextTick()

    const createBtn = wrapper.findAll('button[type="button"]').find((b) => b.text().includes('Créer «'))
    expect(createBtn, '"Créer" button should exist in dropdown').toBeDefined()
    await createBtn.trigger('mousedown')
    await flushPromises()

    expect(mockPost).toHaveBeenCalledWith('tags', { name: 'nouveau-tag', color: '#6366F1' })
    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeDefined()
    expect(emitted[emitted.length - 1][0]).toContain(3)
  })
})

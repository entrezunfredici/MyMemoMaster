import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import MindmapsEditorView from '@/components/mindmap/MindmapsEditorView.vue'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const { mockPut, mockPost } = vi.hoisted(() => ({
  mockPut: vi.fn(),
  mockPost: vi.fn(),
}))

vi.mock('@/helpers/api', () => ({
  api: { put: mockPut, post: mockPost },
}))

const mockToast = { success: vi.fn(), error: vi.fn(), warning: vi.fn() }
vi.mock('vue-toastification', () => ({ useToast: () => mockToast }))

// ── Données ───────────────────────────────────────────────────────────────────

const subjects = [
  { subjectId: 1, name: 'Mathématiques' },
  { subjectId: 2, name: 'Physique' },
]

const mockMeta = { mmName: 'Carte Maths', subjectId: 1 }
const mockPayload = {
  title: 'Carte Maths',
  updatedAt: '2026-01-01T00:00:00.000Z',
  nodes: {},
  links: [],
  zones: [],
}

// ── Stub MindMapBuilder ───────────────────────────────────────────────────────

const MindMapBuilderStub = {
  name: 'MindMapBuilder',
  template: '<div class="mindmap-builder-stub" />',
  emits: ['save', 'export', 'new-map'],
  props: ['mapPayload', 'loading'],
}

// ── Helper ────────────────────────────────────────────────────────────────────

const mountEditorView = (props = {}, storeOverrides = {}) =>
  mount(MindmapsEditorView, {
    props: {
      diagramId: 1,
      diagramMeta: mockMeta,
      mapPayload: null,
      subjects,
      ...props,
    },
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: true,
          initialState: {
            mindmapBuilder: {
              isDirty: false,
              map: { updatedAt: '2026-01-01T00:00:00.000Z', nodes: {}, links: [], zones: [] },
              ...storeOverrides,
            },
          },
        }),
      ],
      stubs: { MindMapBuilder: MindMapBuilderStub },
    },
  })

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MindmapsEditorView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPut.mockResolvedValue({ status: 200 })
    mockPost.mockResolvedValue({ data: { idMindMap: 99 }, status: 201 })
  })

  // ── Topbar ────────────────────────────────────────────────────────────────────

  it('affiche le nom de la carte dans la topbar', () => {
    const wrapper = mountEditorView()
    expect(wrapper.find('.editor-map-name').text()).toBe('Carte Maths')
  })

  it('affiche "Nouvelle carte" si diagramMeta est absent', () => {
    const wrapper = mountEditorView({ diagramId: null, diagramMeta: null })
    expect(wrapper.find('.editor-map-name').text()).toBe('Nouvelle carte')
  })

  it('affiche "Sauvegardé ✓" quand isDirty est false', () => {
    const wrapper = mountEditorView()
    const status = wrapper.find('.editor-save-status--saved')
    expect(status.exists()).toBe(true)
    expect(status.text()).toContain('Sauvegardé')
  })

  it("n'affiche pas l'indicateur sauvegardé quand isDirty est true", () => {
    const wrapper = mountEditorView({}, { isDirty: true })
    expect(wrapper.find('.editor-save-status--saved').exists()).toBe(false)
    expect(wrapper.find('.editor-save-status--error').exists()).toBe(false)
  })

  it('le bouton "← Mes cartes mentales" émet @back', async () => {
    const wrapper = mountEditorView()
    await wrapper.find('.editor-back-btn').trigger('click')
    expect(wrapper.emitted('back')).toBeDefined()
    expect(wrapper.emitted('back')).toHaveLength(1)
  })

  // ── Modal export ──────────────────────────────────────────────────────────────

  it("ouvre la modale d'export au @export du canvas", async () => {
    const wrapper = mountEditorView()
    const builder = wrapper.findComponent({ name: 'MindMapBuilder' })
    await builder.vm.$emit('export', mockPayload)
    await nextTick()
    expect(wrapper.find('.modal-title').exists()).toBe(true)
    expect(wrapper.find('.modal-title').text()).toBe('Enregistrer la carte mentale')
  })

  it("la modale d'export pré-remplit le nom depuis diagramMeta", async () => {
    const wrapper = mountEditorView()
    const builder = wrapper.findComponent({ name: 'MindMapBuilder' })
    await builder.vm.$emit('export', mockPayload)
    await nextTick()
    expect(wrapper.find('input.form-input').element.value).toBe('Carte Maths')
  })

  it("la modale d'export liste les matières disponibles dans le select", async () => {
    const wrapper = mountEditorView()
    const builder = wrapper.findComponent({ name: 'MindMapBuilder' })
    await builder.vm.$emit('export', mockPayload)
    await nextTick()
    expect(wrapper.text()).toContain('Mathématiques')
    expect(wrapper.text()).toContain('Physique')
  })

  it("le bouton Annuler ferme la modale d'export", async () => {
    const wrapper = mountEditorView()
    const builder = wrapper.findComponent({ name: 'MindMapBuilder' })
    await builder.vm.$emit('export', mockPayload)
    await nextTick()
    await wrapper.find('.btn-modal-cancel').trigger('click')
    expect(wrapper.find('.modal-title').exists()).toBe(false)
  })

  it("confirmer l'export (carte existante) appelle api.put et ferme la modale", async () => {
    const wrapper = mountEditorView({ diagramId: 1 })
    const builder = wrapper.findComponent({ name: 'MindMapBuilder' })
    await builder.vm.$emit('export', mockPayload)
    await nextTick()
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mockPut).toHaveBeenCalledWith(
      '/diagrammes/1',
      expect.objectContaining({ mmName: 'Carte Maths' })
    )
    expect(wrapper.find('.modal-title').exists()).toBe(false)
  })

  it("confirmer l'export (nouvelle carte) appelle api.post", async () => {
    const wrapper = mountEditorView({
      diagramId: null,
      diagramMeta: { mmName: 'Nouvelle', subjectId: 1 },
    })
    const builder = wrapper.findComponent({ name: 'MindMapBuilder' })
    await builder.vm.$emit('export', { ...mockPayload, title: 'Nouvelle' })
    await nextTick()
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mockPost).toHaveBeenCalledWith(
      'diagrammes',
      expect.objectContaining({ mmName: 'Nouvelle' })
    )
    expect(wrapper.find('.modal-title').exists()).toBe(false)
  })

  // ── Indicateur sauvegarde ─────────────────────────────────────────────────────

  it('affiche "Sauvegarde…" pendant une sauvegarde manuelle en cours', async () => {
    let resolvePut
    mockPut.mockReturnValue(new Promise((resolve) => { resolvePut = resolve }))
    const wrapper = mountEditorView({ diagramId: 1 })
    const builder = wrapper.findComponent({ name: 'MindMapBuilder' })

    builder.vm.$emit('save', mockPayload)
    await nextTick()

    expect(wrapper.find('.editor-save-status').text()).toBe('Sauvegarde…')

    resolvePut({ status: 200 })
    await flushPromises()
    expect(wrapper.find('.editor-save-status--saved').exists()).toBe(true)
  })

  it("affiche un toast d'erreur en cas d'échec de sauvegarde manuelle", async () => {
    mockPut.mockRejectedValue(new Error('Network error'))
    const wrapper = mountEditorView({ diagramId: 1 })
    const builder = wrapper.findComponent({ name: 'MindMapBuilder' })

    builder.vm.$emit('save', mockPayload)
    await flushPromises()

    expect(mockToast.error).toHaveBeenCalledWith('Erreur lors de la sauvegarde.')
    expect(wrapper.find('.editor-save-status--error').exists()).toBe(false)
  })
})

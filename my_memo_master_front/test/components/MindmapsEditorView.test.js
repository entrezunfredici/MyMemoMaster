import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import MindmapsEditorView from '@/components/mindmap/MindmapsEditorView.vue'
import { useMindMapViewSessionStore } from '@/stores/mindmapViewSessions'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const { mockPut, mockPost, mockToast } = vi.hoisted(() => ({
  mockPut: vi.fn(),
  mockPost: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() }
}))

vi.mock('@/helpers/api', () => ({
  api: { put: mockPut, post: mockPost },
}))

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

  // ── Chronométrage de la consultation ─────────────────────────────────────────
  // CHOIX: Date.now() mocké (vi.spyOn) plutôt que le temps réel écoulé pendant le test —
  // rend les durées attendues déterministes (le composant mesure par segments dont la
  // durée nulle est ignorée, voir CHOIX dans MindmapsEditorView.vue).

  const setVisibility = (state) => {
    Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
  }

  it('journalise la durée du segment ouvert au montage, à la fermeture (bouton Retour / démontage)', () => {
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000_000)
    const wrapper = mountEditorView({ diagramId: 5 })
    const reviewSessionStore = useMindMapViewSessionStore()

    dateNowSpy.mockReturnValue(1_000_000 + 42_000) // +42s
    wrapper.unmount()

    expect(reviewSessionStore.logSession).toHaveBeenCalledWith(5, 42)
    dateNowSpy.mockRestore()
  })

  it("ne journalise rien à la fermeture d'une carte neuve (pas encore existante à l'ouverture)", async () => {
    const wrapper = mountEditorView({ diagramId: null, diagramMeta: null })
    const reviewSessionStore = useMindMapViewSessionStore()

    wrapper.unmount()

    expect(reviewSessionStore.logSession).not.toHaveBeenCalled()
  })

  it("journalise via logSessionBeacon (fetch keepalive) sur pagehide, pas via logSession (annulé par le navigateur pendant le déchargement)", () => {
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(2_000_000)
    const wrapper = mountEditorView({ diagramId: 5 })
    const reviewSessionStore = useMindMapViewSessionStore()

    dateNowSpy.mockReturnValue(2_000_000 + 10_000) // +10s
    window.dispatchEvent(new Event('pagehide'))

    expect(reviewSessionStore.logSessionBeacon).toHaveBeenCalledWith(5, 10)
    expect(reviewSessionStore.logSession).not.toHaveBeenCalled()

    // pagehide arrête définitivement le suivi (stopTracking) : le démontage qui suit ne rejournalise rien
    wrapper.unmount()
    expect(reviewSessionStore.logSession).not.toHaveBeenCalled()
    expect(reviewSessionStore.logSessionBeacon).toHaveBeenCalledTimes(1)
    dateNowSpy.mockRestore()
  })

  it("bascule vers une carte neuve (Nouvelle carte) : journalise (normal) le segment en cours sans le re-journaliser au démontage", async () => {
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(3_000_000)
    const wrapper = mountEditorView({ diagramId: 5 })
    const reviewSessionStore = useMindMapViewSessionStore()
    const builder = wrapper.findComponent({ name: 'MindMapBuilder' })

    dateNowSpy.mockReturnValue(3_000_000 + 7_000) // +7s
    await builder.vm.$emit('new-map', { title: 'Nouvelle carte' })

    expect(reviewSessionStore.logSession).toHaveBeenCalledWith(5, 7)

    wrapper.unmount()
    expect(reviewSessionStore.logSession).toHaveBeenCalledTimes(1)
    dateNowSpy.mockRestore()
  })

  it("visibilitychange 'hidden' clôt le segment en cours via logSessionBeacon, sans arrêter le suivi", () => {
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(4_000_000)
    const wrapper = mountEditorView({ diagramId: 5 })
    const reviewSessionStore = useMindMapViewSessionStore()

    dateNowSpy.mockReturnValue(4_000_000 + 15_000) // +15s en arrière-plan
    setVisibility('hidden')
    document.dispatchEvent(new Event('visibilitychange'))

    expect(reviewSessionStore.logSessionBeacon).toHaveBeenCalledWith(5, 15)
    expect(reviewSessionStore.logSession).not.toHaveBeenCalled()

    setVisibility('visible')
    wrapper.unmount()
    dateNowSpy.mockRestore()
  })

  it("visibilitychange 'visible' redémarre un nouveau segment après une mise en arrière-plan, journalisé (normal) à la fermeture", () => {
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(5_000_000)
    const wrapper = mountEditorView({ diagramId: 5 })
    const reviewSessionStore = useMindMapViewSessionStore()

    // Segment 1 : 20s puis mise en arrière-plan
    dateNowSpy.mockReturnValue(5_000_000 + 20_000)
    setVisibility('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(reviewSessionStore.logSessionBeacon).toHaveBeenCalledWith(5, 20)

    // Retour au premier plan : nouveau segment de 8s avant fermeture
    setVisibility('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    dateNowSpy.mockReturnValue(5_000_000 + 20_000 + 8_000)
    wrapper.unmount()

    expect(reviewSessionStore.logSession).toHaveBeenCalledWith(5, 8)
    expect(reviewSessionStore.logSessionBeacon).toHaveBeenCalledTimes(1)
    expect(reviewSessionStore.logSession).toHaveBeenCalledTimes(1)
    dateNowSpy.mockRestore()
  })

  it('ignore un segment de durée nulle (bascule de visibilité instantanée) — pas de bruit sur des changements d\'onglet trop brefs', () => {
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(6_000_000)
    const wrapper = mountEditorView({ diagramId: 5 })
    const reviewSessionStore = useMindMapViewSessionStore()

    setVisibility('hidden') // aucune avancée du temps depuis le montage
    document.dispatchEvent(new Event('visibilitychange'))

    expect(reviewSessionStore.logSessionBeacon).not.toHaveBeenCalled()

    setVisibility('visible')
    wrapper.unmount()
    dateNowSpy.mockRestore()
  })
})

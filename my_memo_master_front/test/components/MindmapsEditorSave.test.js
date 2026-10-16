import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import MindmapsEditorView from '@/components/mindmap/MindmapsEditorView.vue'
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder'
import { useGuidedTourStore } from '@/stores/guidedTour'

// Sauvegarde de l'éditeur de carte mentale : auto-sauvegarde (avec reprises), sauvegarde manuelle
// et enregistrement via la modale. Store de la carte RÉEL (isDirty, markSaved…), seul le réseau est simulé.

const { mockPut, mockPost, mockToast } = vi.hoisted(() => ({
  mockPut: vi.fn(),
  mockPost: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))
vi.mock('@/helpers/api', () => ({ api: { put: mockPut, post: mockPost } }))
vi.mock('vue-toastification', () => ({ useToast: () => mockToast }))

const MindMapBuilderStub = {
  name: 'MindMapBuilder',
  template: '<div class="mindmap-builder-stub" />',
  emits: ['save', 'export', 'new-map'],
  props: ['mapPayload', 'loading', 'idMindMap'],
}

const subjects = [{ subjectId: 1, name: 'Maths' }, { subjectId: 2, name: 'Physique' }]
const payload = (title = 'Carte') => ({ title, updatedAt: '2026-01-01T00:00:00.000Z', nodes: { a: {}, b: {}, c: {} }, links: [], zones: [] })

// dernière instance montée : les tests retrouvent le canvas (stub) à travers elle
let current = null
const mountedBuilder = () => current.findComponent({ name: 'MindMapBuilder' })

const mountEditor = (props = {}) => {
  current = mount(MindmapsEditorView, {
    props: { diagramId: 1, diagramMeta: { mmName: 'Carte', subjectId: 1 }, mapPayload: null, subjects, ...props },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: false })],
      stubs: { MindMapBuilder: MindMapBuilderStub },
    },
  })
  return current
}

const wait = (ms) => vi.advanceTimersByTimeAsync(ms)
const dirty = async (ms = 0) => {
  if (ms) await wait(ms)
  useMindMapBuilderStore().touch()
  await nextTick()
}

describe('MindmapsEditorView — sauvegarde', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    // Date figée par les faux timers : chaque horodatage `updatedAt` du store doit pourtant différer du
    // précédent (l'éditeur observe ce champ pour déclencher la sauvegarde) → compteur croissant.
    let tick = 0
    vi.spyOn(Date.prototype, 'toISOString').mockImplementation(() => `2026-01-01T00:00:00.${String(++tick).padStart(3, '0')}Z`)
    mockPut.mockResolvedValue({ status: 200 })
    mockPost.mockResolvedValue({ status: 201, data: { idMindMap: 99 } })
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('auto-sauvegarde', () => {
    it('carte existante : modification → PUT après 1,5 s, puis « Sauvegardé »', async () => {
      const wrapper = mountEditor()
      await dirty()
      expect(mockPut).not.toHaveBeenCalled()
      await wait(1500)
      expect(mockPut).toHaveBeenCalledTimes(1)
      expect(mockPut).toHaveBeenCalledWith('/diagrammes/1', expect.objectContaining({ mmName: expect.any(String), subjectId: 1, mindMapJson: expect.any(Object) }))
      expect(useMindMapBuilderStore().isDirty).toBe(false)
      expect(wrapper.find('.editor-save-status--saved').exists()).toBe(true)
    })

    it('plusieurs modifications rapprochées : une seule sauvegarde', async () => {
      mountEditor()
      await dirty()
      await dirty(500)
      await dirty(500)
      await wait(1500)
      expect(mockPut).toHaveBeenCalledTimes(1)
    })

    it('carte neuve : sauvegardée dès l’ouverture (POST), puis les suivantes mettent à jour (PUT sur le nouvel id)', async () => {
      mountEditor({ diagramId: null, diagramMeta: { mmName: 'Neuve', subjectId: 2 } })
      const recordLinks = vi.spyOn(useGuidedTourStore(), 'recordLinks')
      await wait(1500)
      expect(mockPost).toHaveBeenCalledTimes(1)
      expect(mockPost).toHaveBeenCalledWith('diagrammes', expect.objectContaining({ subjectId: 2 }))
      expect(recordLinks).toHaveBeenCalledWith({ mindMapId: 99, subjectId: 2 })
      await dirty()
      await wait(1500)
      expect(mockPut).toHaveBeenCalledWith('/diagrammes/99', expect.any(Object))
    })

    it('mémorise le nombre de nœuds pour le parcours guidé (nœud central exclu)', async () => {
      mountEditor()
      const recordLinks = vi.spyOn(useGuidedTourStore(), 'recordLinks')
      const store = useMindMapBuilderStore()
      const total = Object.keys(store.map.nodes).length
      await dirty()
      await wait(1500)
      expect(recordLinks).toHaveBeenCalledWith({ mindMapChildNodes: total - 1 })
    })

    it('échec réseau : avertissement une seule fois, réessai à 5 s, puis succès', async () => {
      mockPut.mockRejectedValueOnce(new Error('réseau'))
      const wrapper = mountEditor()
      await dirty()
      await wait(1500)
      expect(mockToast.warning).toHaveBeenCalledTimes(1)
      expect(mockToast.warning).toHaveBeenCalledWith('Sauvegarde impossible, nouvelle tentative dans 5 s…')
      expect(wrapper.find('.editor-save-status--error').exists()).toBe(true)
      expect(useMindMapBuilderStore().isDirty).toBe(true)
      await wait(5000)
      expect(mockPut).toHaveBeenCalledTimes(2)
      expect(useMindMapBuilderStore().isDirty).toBe(false)
      expect(wrapper.find('.editor-save-status--error').exists()).toBe(false)
    })

    it('échecs répétés : 3 réessais puis message d’échec définitif', async () => {
      mockPut.mockRejectedValue(new Error('réseau'))
      mountEditor()
      await dirty()
      await wait(1500)
      await wait(5000)
      await wait(5000)
      await wait(5000)
      expect(mockPut).toHaveBeenCalledTimes(4)
      expect(mockToast.warning).toHaveBeenCalledTimes(1)
      expect(mockToast.error).toHaveBeenCalledWith('Sauvegarde automatique échouée. Vérifiez votre connexion.')
    })

    it('ne sauvegarde pas pendant que la modale d’enregistrement est ouverte, puis reprend à sa fermeture', async () => {
      const wrapper = mountEditor()
      await mountedBuilder().vm.$emit('export', payload())
      await nextTick()
      await dirty()
      await wait(3000)
      expect(mockPut).not.toHaveBeenCalled()
      await wrapper.find('.btn-modal-cancel').trigger('click')
      await wait(1500)
      expect(mockPut).toHaveBeenCalledTimes(1)
    })

    it('rien à sauvegarder si la carte n’est pas modifiée', async () => {
      mountEditor()
      await wait(5000)
      expect(mockPut).not.toHaveBeenCalled()
      expect(mockPost).not.toHaveBeenCalled()
    })
  })

  describe('sauvegarde manuelle', () => {
    it('carte existante : PUT, toast de succès, carte marquée sauvegardée', async () => {
      mountEditor()
      const store = useMindMapBuilderStore()
      const p = { ...payload(), updatedAt: store.map.updatedAt }
      store.isDirty = true
      await mountedBuilder().vm.$emit('save', p)
      await wait(0)
      expect(mockPut).toHaveBeenCalledWith('/diagrammes/1', expect.objectContaining({ mindMapJson: p }))
      expect(mockToast.success).toHaveBeenCalledWith('Carte sauvegardée.')
      expect(store.isDirty).toBe(false)
    })

    it('met aussi à jour la progression du parcours guidé (comme l’auto-sauvegarde)', async () => {
      mountEditor()
      const recordLinks = vi.spyOn(useGuidedTourStore(), 'recordLinks')
      await mountedBuilder().vm.$emit('save', payload())
      await wait(0)
      expect(recordLinks).toHaveBeenCalledWith({ mindMapChildNodes: 2 }) // 3 nœuds dans la carte de test, nœud central exclu
    })

    it('modification faite pendant l’envoi : la carte reste « modifiée »', async () => {
      mountEditor()
      const store = useMindMapBuilderStore()
      store.isDirty = true
      await mountedBuilder().vm.$emit('save', { ...payload(), updatedAt: 'version-ancienne' })
      await wait(0)
      expect(store.isDirty).toBe(true)
    })

    it('carte neuve : ouvre la modale d’enregistrement au lieu d’envoyer', async () => {
      const wrapper = mountEditor({ diagramId: null, diagramMeta: { mmName: 'Neuve', subjectId: 1 } })
      await wait(0)
      mockPost.mockClear()
      await mountedBuilder().vm.$emit('save', payload('Neuve'))
      await nextTick()
      expect(wrapper.find('.modal-title').exists()).toBe(true)
      expect(mockPut).not.toHaveBeenCalled()
      expect(mockPost).not.toHaveBeenCalled()
    })

    it('échec : toast d’erreur, pas d’indicateur de connexion perdue', async () => {
      mockPut.mockRejectedValue(new Error('x'))
      const wrapper = mountEditor()
      await mountedBuilder().vm.$emit('save', payload())
      await wait(0)
      expect(mockToast.error).toHaveBeenCalledWith('Erreur lors de la sauvegarde.')
      expect(wrapper.find('.editor-save-status--error').exists()).toBe(false)
    })
  })

  describe('enregistrement via la modale', () => {
    const submit = async (wrapper) => {
      await wrapper.find('form').trigger('submit')
      await wait(0)
    }

    it('carte existante : PUT, toast « mise à jour », modale fermée', async () => {
      const wrapper = mountEditor()
      await mountedBuilder().vm.$emit('export', payload())
      await nextTick()
      await submit(wrapper)
      expect(mockPut).toHaveBeenCalledWith('/diagrammes/1', expect.any(Object))
      expect(mockToast.success).toHaveBeenCalledWith('Carte mise à jour.')
      expect(wrapper.find('.modal-title').exists()).toBe(false)
    })

    it('carte neuve : POST, toast « créée », id adopté (la sauvegarde suivante met à jour)', async () => {
      const wrapper = mountEditor({ diagramId: null, diagramMeta: { mmName: 'Neuve', subjectId: 1 } })
      await wait(1500) // auto-sauvegarde initiale (POST)
      mockPost.mockClear()
      // retour à l'état « pas encore créée » : nouvelle carte puis enregistrement par la modale
      await mountedBuilder().vm.$emit('new-map', { title: 'Autre' })
      await mountedBuilder().vm.$emit('export', payload('Autre'))
      await nextTick()
      await submit(wrapper)
      expect(mockPost).toHaveBeenCalledWith('diagrammes', expect.objectContaining({ mmName: 'Autre' }))
      expect(mockToast.success).toHaveBeenCalledWith('Carte créée.')
      await dirty()
      await wait(1500)
      expect(mockPut).toHaveBeenCalledWith('/diagrammes/99', expect.any(Object))
    })

    it('échec : toast d’erreur et modale fermée quand même', async () => {
      mockPut.mockRejectedValue(new Error('x'))
      const wrapper = mountEditor()
      await mountedBuilder().vm.$emit('export', payload())
      await nextTick()
      await submit(wrapper)
      expect(mockToast.error).toHaveBeenCalledWith('Erreur lors de la sauvegarde.')
      expect(wrapper.find('.modal-title').exists()).toBe(false)
    })

    it('le nom saisi dans la modale est celui qui est enregistré', async () => {
      const wrapper = mountEditor()
      await mountedBuilder().vm.$emit('export', payload('Titre carte'))
      await nextTick()
      await wrapper.find('input[aria-label="Nom de la carte mentale"]').setValue('Nom choisi')
      await submit(wrapper)
      expect(mockPut).toHaveBeenCalledWith('/diagrammes/1', expect.objectContaining({ mmName: 'Nom choisi' }))
    })
  })
})

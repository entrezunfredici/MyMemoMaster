import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import MindmapsPage from '@/pages/MindmapsPage.vue'
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder'
import { useSubjectStore } from '@/stores/subjects'

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }))
vi.mock('vue-toastification', () => ({ useToast: () => ({ error: toastError }) }))

const ListView = {
  name: 'MindmapsListView',
  props: ['subjects'],
  emits: ['open', 'create'],
  template: '<div data-testid="list" />',
}
const EditorView = {
  name: 'MindmapsEditorView',
  props: ['diagramId', 'diagramMeta', 'mapPayload', 'subjects'],
  emits: ['back'],
  template: '<div data-testid="editor" />',
}

const SUBJECTS = [{ idSubject: 1, name: 'Physique' }]

function mountPage() {
  return mount(MindmapsPage, {
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: true, initialState: { subjects: { subjects: SUBJECTS } } })],
      stubs: { MindmapsListView: ListView, MindmapsEditorView: EditorView },
    },
  })
}

describe('MindmapsPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('affiche la liste au départ et charge les matières', async () => {
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.find('[data-testid="list"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="editor"]').exists()).toBe(false)
    expect(useSubjectStore().fetchSubjects).toHaveBeenCalledTimes(1)
    expect(wrapper.findComponent(ListView).props('subjects')).toEqual(SUBJECTS)
  })

  describe('ouverture d’une carte', () => {
    it('JSON sous forme de chaîne - parse le contenu et ouvre l’éditeur', async () => {
      const wrapper = mountPage()
      wrapper.findComponent(ListView).vm.$emit('open', {
        idMindMap: 5,
        mmName: 'Cinématique',
        mindMapJson: JSON.stringify({ nodes: [{ id: 'a' }] }),
      })
      await flushPromises()
      const editor = wrapper.findComponent(EditorView)
      expect(editor.exists()).toBe(true)
      expect(editor.props('diagramId')).toBe(5)
      expect(editor.props('mapPayload')).toEqual({ nodes: [{ id: 'a' }] })
      expect(editor.props('diagramMeta')).toMatchObject({ mmName: 'Cinématique' })
    })

    it('JSON déjà objet - utilisé tel quel', async () => {
      const wrapper = mountPage()
      wrapper.findComponent(ListView).vm.$emit('open', { idMindMap: 6, mindMapJson: { nodes: [] } })
      await flushPromises()
      expect(wrapper.findComponent(EditorView).props('mapPayload')).toEqual({ nodes: [] })
    })

    it('JSON invalide - affiche une erreur et reste sur la liste', async () => {
      const wrapper = mountPage()
      wrapper.findComponent(ListView).vm.$emit('open', { idMindMap: 7, mindMapJson: '{pas du json' })
      await flushPromises()
      expect(toastError).toHaveBeenCalledWith('Erreur lors du chargement de la carte.')
      expect(wrapper.find('[data-testid="list"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="editor"]').exists()).toBe(false)
    })
  })

  describe('création d’une carte', () => {
    it('avec nom et matière - initialise le store et ouvre l’éditeur sans identifiant', async () => {
      const wrapper = mountPage()
      wrapper.findComponent(ListView).vm.$emit('create', { name: 'Optique', subjectId: 3 })
      await flushPromises()
      expect(useMindMapBuilderStore().new).toHaveBeenCalledWith('Optique')
      const editor = wrapper.findComponent(EditorView)
      expect(editor.props('diagramId')).toBeNull()
      expect(editor.props('mapPayload')).toBeNull()
      expect(editor.props('diagramMeta')).toEqual({ mmName: 'Optique', subjectId: 3 })
    })

    it('sans nom ni matière - valeurs par défaut', async () => {
      const wrapper = mountPage()
      wrapper.findComponent(ListView).vm.$emit('create', {})
      await flushPromises()
      expect(useMindMapBuilderStore().new).toHaveBeenCalledWith('Nouvelle carte mentale')
      expect(wrapper.findComponent(EditorView).props('diagramMeta')).toEqual({
        mmName: 'Nouvelle carte mentale',
        subjectId: 1,
      })
    })
  })

  it('« retour » depuis l’éditeur - revient à la liste', async () => {
    const wrapper = mountPage()
    wrapper.findComponent(ListView).vm.$emit('create', { name: 'X' })
    await flushPromises()
    wrapper.findComponent(EditorView).vm.$emit('back')
    await flushPromises()
    expect(wrapper.find('[data-testid="list"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="editor"]').exists()).toBe(false)
  })
})

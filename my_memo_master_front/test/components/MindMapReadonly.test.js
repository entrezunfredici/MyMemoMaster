import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import MindMapNode from '@/components/mindmap/MindMapNode.vue'
import { MINDMAP_READONLY_KEY } from '@/composables/useMindMapNodeEditing'

vi.mock('@/components/interpreter/interpreter.js', () => ({
  renderMathMultiline: vi.fn((input) => String(input)),
  toLatex: vi.fn((input) => String(input ?? '')),
}))
vi.mock('@/helpers/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }))
vi.mock('@/config', () => ({ VITE_API_URL: 'http://localhost:3000' }))

const node = {
  id: 'n1', label: 'Mon nœud', type: 'text', content: 'Contenu', mastery: 'undefined',
  idCard: null, idSystem: null, zoneId: null,
  style: { primaryColor: '#1E3A8A', secondaryColor: '#C0C5D2', shape: 'bubble', width: 220, height: 120, textColor: '#eef2ff', fontSize: 13, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none' },
  layout: { x: 0, y: 0 }, collapsed: false, meta: { isSubject: false, parentId: null },
}

const mountNode = (readonly) =>
  mount(MindMapNode, {
    props: { node },
    attachTo: document.body,
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: true })],
      provide: { [MINDMAP_READONLY_KEY]: readonly },
    },
  })

describe('MindMapNode — lecture seule (page de partage public)', () => {
  it('masque le bouton « ajouter un enfant » en lecture seule', () => {
    expect(mountNode(true).find('.mindmap-node__add').exists()).toBe(false)
    expect(mountNode(false).find('.mindmap-node__add').exists()).toBe(true)
  })

  it("le double-clic sur le titre n'ouvre pas l'édition en lecture seule", async () => {
    const wrapper = mountNode(true)
    await wrapper.find('.mindmap-node__content').trigger('dblclick')
    await wrapper.find('.mindmap-node__title, .node-title, [class*="title"]').trigger('dblclick')
    expect(wrapper.find('textarea').exists()).toBe(false)
    expect(wrapper.find('input').exists()).toBe(false)
  })

  it('un Maj+clic ne crée pas d\'enfant en lecture seule', async () => {
    const wrapper = mountNode(true)
    await wrapper.find('.mindmap-node').trigger('pointerdown', { shiftKey: true })
    const { useMindMapBuilderStore } = await import('@/stores/mindmapBuilder')
    expect(useMindMapBuilderStore().addNode).not.toHaveBeenCalled()
  })
})

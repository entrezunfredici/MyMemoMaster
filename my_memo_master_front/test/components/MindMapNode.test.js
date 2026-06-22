import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder'
import MindMapNode from '@/components/mindmap/MindMapNode.vue'
import { renderMathMultiline } from '@/components/interpreter/interpreter.js'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/components/interpreter/interpreter.js', () => ({
  renderMathMultiline: vi.fn((input) => `<span class="katex-mock">${input}</span>`),
}))
vi.mock('@/helpers/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }))
vi.mock('@/config', () => ({ VITE_API_URL: 'http://localhost:3000' }))

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeNode = (overrides = {}) => ({
  id: 'node-1',
  label: 'Mon nœud',
  type: 'text',
  content: 'Contenu texte',
  mastery: 'undefined',
  idCard: null,
  idSystem: null,
  zoneId: null,
  style: {
    primaryColor: '#1E3A8A',
    secondaryColor: '#C0C5D2',
    shape: 'bubble',
    width: 220,
    height: 120,
    textColor: '#eef2ff',
    fontSize: 13,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
  },
  layout: { x: 100, y: 100 },
  collapsed: false,
  meta: { isSubject: false, parentId: null },
  ...overrides,
})

const mountNode = (props = {}) =>
  mount(MindMapNode, {
    props: {
      node: makeNode(),
      selected: false,
      hasChildren: false,
      ...props,
    },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: true })],
    },
  })

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MindMapNode', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Rendu de base ─────────────────────────────────────────────────────────

  it('affiche le label du nœud', () => {
    const wrapper = mountNode()
    expect(wrapper.find('.mindmap-node__title').text()).toBe('Mon nœud')
  })

  it("affiche le contenu texte dans .mindmap-node__body pour un nœud de type 'text'", () => {
    const wrapper = mountNode({ node: makeNode({ content: 'Voici le corps' }) })
    expect(wrapper.find('.mindmap-node__body').html()).toContain('Voici le corps')
  })

  it("affiche .mindmap-node__formula pour un nœud de type 'formula'", () => {
    const wrapper = mountNode({ node: makeNode({ type: 'formula', content: 'E=mc^2' }) })
    expect(wrapper.find('.mindmap-node__formula').exists()).toBe(true)
    expect(wrapper.find('.mindmap-node__body').exists()).toBe(false)
  })

  it('appelle renderMathMultiline avec le contenu de la formule', () => {
    mountNode({ node: makeNode({ type: 'formula', content: 'E=mc^2' }) })
    expect(renderMathMultiline).toHaveBeenCalledWith('E=mc^2')
  })

  it("affiche .mindmap-node__image pour un nœud de type 'image'", () => {
    const wrapper = mountNode({ node: makeNode({ type: 'image', content: '' }) })
    expect(wrapper.find('.mindmap-node__image').exists()).toBe(true)
    expect(wrapper.find('.mindmap-node__body').exists()).toBe(false)
  })

  it("affiche le texte placeholder pour un nœud image sans contenu", () => {
    const wrapper = mountNode({ node: makeNode({ type: 'image', content: '' }) })
    expect(wrapper.text()).toContain('Glissez une image ici')
  })

  it("affiche une balise <img> quand le nœud image a un contenu (URL)", () => {
    const wrapper = mountNode({ node: makeNode({ type: 'image', content: 'http://example.com/img.png' }) })
    expect(wrapper.find('img').exists()).toBe(true)
    expect(wrapper.find('img').attributes('src')).toBe('http://example.com/img.png')
  })

  // ── Événements ────────────────────────────────────────────────────────────

  it("émet 'node-pointerdown' au pointerdown sur le nœud", async () => {
    const wrapper = mountNode()
    await wrapper.trigger('pointerdown')
    expect(wrapper.emitted('node-pointerdown')).toBeDefined()
    expect(wrapper.emitted('node-pointerdown')?.[0][0]).toMatchObject({ node: expect.objectContaining({ id: 'node-1' }) })
  })

  it("émet 'toggle-collapse' au clic sur le bouton repliage", async () => {
    const wrapper = mountNode({ hasChildren: true })
    await wrapper.find('.mindmap-node__collapse').trigger('pointerdown')
    expect(wrapper.emitted('toggle-collapse')).toBeDefined()
    expect(wrapper.emitted('toggle-collapse')?.[0][0]).toBe('node-1')
  })

  // ── Repliage ──────────────────────────────────────────────────────────────

  it("affiche le bouton repliage quand hasChildren=true", () => {
    const wrapper = mountNode({ hasChildren: true })
    expect(wrapper.find('.mindmap-node__collapse').exists()).toBe(true)
  })

  it("masque le bouton repliage quand hasChildren=false", () => {
    const wrapper = mountNode({ hasChildren: false })
    expect(wrapper.find('.mindmap-node__collapse').exists()).toBe(false)
  })

  it("affiche '+' quand le nœud est replié, '−' sinon", () => {
    const collapsedWrapper = mountNode({ node: makeNode({ collapsed: true }), hasChildren: true })
    expect(collapsedWrapper.find('.mindmap-node__collapse text').text()).toBe('+')

    const expandedWrapper = mountNode({ node: makeNode({ collapsed: false }), hasChildren: true })
    expect(expandedWrapper.find('.mindmap-node__collapse text').text()).toBe('−')
  })

  // ── Formule — ouverture de l'interpréteur ─────────────────────────────────

  it("dblclick sur .mindmap-node__formula appelle store.openInterpreter()", async () => {
    const wrapper = mountNode({ node: makeNode({ type: 'formula', content: 'x^2' }) })
    const store = useMindMapBuilderStore()
    await wrapper.find('.mindmap-node__formula').trigger('dblclick')
    expect(store.openInterpreter).toHaveBeenCalled()
  })

  // ── Sélection ─────────────────────────────────────────────────────────────

  it("ajoute la classe 'mindmap-node--selected' quand selected=true", () => {
    const wrapper = mountNode({ selected: true })
    expect(wrapper.classes()).toContain('mindmap-node--selected')
  })

  it("n'a pas la classe 'mindmap-node--selected' quand selected=false", () => {
    const wrapper = mountNode({ selected: false })
    expect(wrapper.classes()).not.toContain('mindmap-node--selected')
  })

  // ── Édition inline — double clic ──────────────────────────────────────────

  it("double-clic sur .mindmap-node__title active l'édition du label", async () => {
    const wrapper = mountNode()
    await wrapper.find('.mindmap-node__title').trigger('dblclick')
    expect(wrapper.find('.mindmap-node__inline-input--title').exists()).toBe(true)
    expect(wrapper.find('.mindmap-node__title').exists()).toBe(false)
  })

  it("double-clic sur .mindmap-node__body active l'édition du contenu", async () => {
    const wrapper = mountNode()
    await wrapper.find('.mindmap-node__body').trigger('dblclick')
    expect(wrapper.find('.mindmap-node__inline-input--content').exists()).toBe(true)
  })

  // ── Drag & drop sur image ─────────────────────────────────────────────────

  it("dragover sur .mindmap-node__image active l'état de survol (isDragOver)", async () => {
    const wrapper = mountNode({ node: makeNode({ type: 'image', content: '' }) })
    await wrapper.find('.mindmap-node__image').trigger('dragover')
    expect(wrapper.find('.mindmap-node__image').classes()).toContain('mindmap-node__image--drag')
    expect(wrapper.find('.mindmap-node__image-placeholder').text()).toContain('Déposer ici')
  })
})

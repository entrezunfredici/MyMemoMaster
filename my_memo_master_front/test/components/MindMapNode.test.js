import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder'
import MindMapNode from '@/components/mindmap/MindMapNode.vue'
import { renderMathMultiline } from '@/components/interpreter/interpreter.js'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/components/interpreter/interpreter.js', () => ({
  renderMathMultiline: vi.fn((input) => `<span class="katex-mock">${input}</span>`),
  toLatex: vi.fn((input) => String(input ?? '')),
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

  it("double-clic sur le symbole d'une grandeur ouvre les champs symbole et unité", async () => {
    const wrapper = mountNode({ node: makeNode({ type: 'quantity', content: '' }) })
    await wrapper.find('.mindmap-node__quantity-label').trigger('dblclick')
    expect(wrapper.find('.mindmap-node__quantity-editor').exists()).toBe(true)
    expect(wrapper.findAll('.mindmap-node__quantity-input')).toHaveLength(2)
  })

  it("Entrée dans l'éditeur de grandeur enregistre symbole et unité via store.updateNodeQuantity", async () => {
    const wrapper = mountNode({ node: makeNode({ type: 'quantity', content: '' }) })
    const store = useMindMapBuilderStore()
    await wrapper.find('.mindmap-node__quantity-label').trigger('dblclick')
    const [symbol, unit] = wrapper.findAll('.mindmap-node__quantity-input')
    await symbol.setValue('m')
    await unit.setValue('kg')
    await unit.trigger('keydown.enter')
    expect(store.updateNodeQuantity).toHaveBeenCalledWith('node-1', { symbol: 'm', unit: 'kg' })
    expect(wrapper.find('.mindmap-node__quantity-editor').exists()).toBe(false)
  })

  it("Échap dans l'éditeur de grandeur annule sans enregistrer", async () => {
    const wrapper = mountNode({ node: makeNode({ type: 'quantity', content: '' }) })
    const store = useMindMapBuilderStore()
    await wrapper.find('.mindmap-node__quantity-label').trigger('dblclick')
    await wrapper.find('.mindmap-node__quantity-input').trigger('keydown.escape')
    expect(store.updateNodeQuantity).not.toHaveBeenCalled()
    expect(wrapper.find('.mindmap-node__quantity-editor').exists()).toBe(false)
  })

  it("la valeur d'une grandeur s'édite directement, sans double-clic", async () => {
    const wrapper = mountNode({
      node: makeNode({ type: 'quantity', content: '', quantity: { symbol: 'M', value: null, unit: 'kg' } }),
    })
    const store = useMindMapBuilderStore()
    const input = wrapper.find('.mindmap-node__quantity-value')
    expect(input.exists()).toBe(true)
    await input.setValue('2')
    await input.trigger('change')
    expect(store.updateNodeQuantity).toHaveBeenCalledWith('node-1', { value: '2' })
  })

  it("affiche le résultat calculé d'une formule reliée à des grandeurs", () => {
    const wrapper = mountNode({ node: makeNode({ type: 'formula', content: 'E = M' }) })
    const store = useMindMapBuilderStore()
    store.$patch({})
    store.map.nodes['node-1'] = makeNode({ type: 'formula', content: 'E = M' })
    store.map.nodes.q = { id: 'q', type: 'quantity', kinds: [], quantity: { symbol: 'M', value: 3, unit: 'kg' } }
    store.map.links = [{ id: 'l', from: 'node-1', to: 'q' }]
    return wrapper.vm.$nextTick().then(() => {
      expect(wrapper.find('.mindmap-node__quantity--result').text()).toBe('E = 3 kg')
    })
  })

  it("dragover sur .mindmap-node__image active l'état de survol (isDragOver)", async () => {
    const wrapper = mountNode({ node: makeNode({ type: 'image', content: '' }) })
    await wrapper.find('.mindmap-node__image').trigger('dragover')
    expect(wrapper.find('.mindmap-node__image').classes()).toContain('mindmap-node__image--drag')
    expect(wrapper.find('.mindmap-node__image-placeholder').text()).toContain('Déposer ici')
  })
})

describe('MindMapNode — nœud graphique', () => {
  const graphNode = (overrides = {}) =>
    makeNode({
      type: 'graph',
      content: 'y=ax^{2}',
      graph: { xMin: -10, xMax: 10, yMin: -6, yMax: 6, params: { a: 2 }, mode: 'plot' },
      style: { ...makeNode().style, width: 340, height: 300 },
      ...overrides,
    })

  it("affiche le repère, la courbe et un curseur par paramètre pour un nœud de type 'graph'", () => {
    const wrapper = mountNode({ node: graphNode() })
    expect(wrapper.find('.mmgraph__plot').exists()).toBe(true)
    expect(wrapper.find('.mmgraph__curve').attributes('d')).toMatch(/^M/)
    expect(wrapper.findAll('input[type="range"]')).toHaveLength(1)
    expect(wrapper.find('.mindmap-node__body').exists()).toBe(false)
  })

  it('mode « formule » : affiche la formule avec la valeur du paramètre, sans tracé', () => {
    const wrapper = mountNode({ node: graphNode({ graph: { ...graphNode().graph, mode: 'formula' } }) })
    expect(wrapper.find('.mmgraph__plot').exists()).toBe(false)
    expect(renderMathMultiline).toHaveBeenCalledWith('y=2x^{2}')
  })

  it('formule vide : invite à saisir, sans tracé ni curseur', () => {
    const wrapper = mountNode({ node: graphNode({ content: '' }) })
    expect(wrapper.find('.mmgraph__empty').text()).toContain('Double-clic')
    expect(wrapper.find('.mmgraph__plot').exists()).toBe(false)
  })

  it('formule non traçable : affiche l’erreur', () => {
    const wrapper = mountNode({ node: graphNode({ content: 'y=(x+1' }) })
    expect(wrapper.find('.mmgraph__error').exists()).toBe(true)
  })

  it('les boutons du nœud appellent le store (mode, zoom, réinitialisation)', async () => {
    const wrapper = mountNode({ node: graphNode() })
    const store = useMindMapBuilderStore()
    const buttons = wrapper.findAll('.mmgraph__btn')
    await buttons.find((b) => b.text() === 'Formule').trigger('click')
    expect(store.updateNodeGraph).toHaveBeenCalledWith('node-1', { mode: 'formula' })
    await wrapper.find('[aria-label="Zoom avant"]').trigger('click')
    expect(store.updateNodeGraph).toHaveBeenLastCalledWith('node-1', expect.objectContaining({ xMin: -7, xMax: 7 }))
    await wrapper.find('[aria-label="Réinitialiser la vue"]').trigger('click')
    expect(store.updateNodeGraph).toHaveBeenLastCalledWith('node-1', { xMin: -10, xMax: 10, yMin: -6, yMax: 6 })
  })

  it('le curseur valide la valeur du paramètre au relâchement', async () => {
    const wrapper = mountNode({ node: graphNode() })
    const store = useMindMapBuilderStore()
    const slider = wrapper.find('input[type="range"]')
    slider.element.value = '3'
    await slider.trigger('input')
    expect(store.updateNodeGraph).not.toHaveBeenCalled()
    await slider.trigger('change')
    expect(store.updateNodeGraph).toHaveBeenCalledWith('node-1', { params: { a: 3 } })
  })
})

describe('MindMapNode — texte avec rôle « Formule » / « Fonction »', () => {
  it('rend le contenu comme formule (KaTeX) au lieu du texte brut', () => {
    const wrapper = mountNode({ node: makeNode({ type: 'text', kinds: ['function'], content: 'y=x^2' }) })
    expect(wrapper.find('.mindmap-node__formula').exists()).toBe(true)
    expect(wrapper.find('.mindmap-node__body').exists()).toBe(false)
    expect(renderMathMultiline).toHaveBeenCalledWith('y=x^2')
  })
})

describe("MindMapNode — texte de l'utilisateur", () => {
  it("affiche le contenu comme du texte : aucune balise HTML n'est interprétée", () => {
    const wrapper = mountNode({ node: makeNode({ type: 'text', content: '<img src=x onerror=alert(1)> si x<2 et y>3' }) })
    const body = wrapper.find('.mindmap-node__body')
    expect(body.find('img').exists()).toBe(false)
    expect(body.text()).toBe('<img src=x onerror=alert(1)> si x<2 et y>3')
  })

  it("invite d'ajout quand le contenu est vide, avec l'élément dédié", () => {
    const wrapper = mountNode({ node: makeNode({ type: 'text', content: '' }) })
    expect(wrapper.find('.mindmap-node__body .mindmap-node__placeholder').text()).toContain('Double-clic')
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder'
import MindMapPalette from '@/components/mindmap/MindMapPalette.vue'

// ── Mocks ────────────────────────────────────────────────────────────────────

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }))

vi.mock('@/helpers/api', () => ({ api: { get: mockGet, post: vi.fn() } }))
vi.mock('@/config', () => ({ VITE_API_URL: 'http://localhost:3000' }))
vi.mock('@/components/interpreter/interpreter.js', () => ({
  renderMathMultiline: vi.fn((v) => `<span class="katex-mock">${v}</span>`),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeNode = (overrides = {}) => ({
  id: 'node-1',
  label: 'Mon nœud',
  type: 'text',
  content: 'Contenu',
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
  layout: { x: 400, y: 350 },
  collapsed: false,
  meta: { isSubject: true, parentId: null },
  ...overrides,
})

const makeStoreState = (nodeOverrides = {}, extraState = {}) => ({
  mindmapBuilder: {
    map: {
      id: 'map-1',
      title: 'Test',
      subjectNodeId: 'node-1',
      nodes: { 'node-1': makeNode(nodeOverrides) },
      links: [],
      zones: [],
    },
    selectedNodeIds: ['node-1'],
    selectedLinkId: null,
    pendingLinkSource: null,
    isDirty: false,
    interpreterOpen: false,
    nodeType: 'text',
    tool: 'select',
    ...extraState,
  },
})

const mountPalette = (nodeOverrides = {}, extraState = {}) =>
  mount(MindMapPalette, {
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: true,
          initialState: makeStoreState(nodeOverrides, extraState),
        }),
      ],
      stubs: { Interpreter: { template: '<div class="interpreter-stub" />' } },
    },
    attachTo: document.body,
  })

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MindMapPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockResolvedValue({ data: [] })
  })

  // ── État vide ─────────────────────────────────────────────────────────────

  it("affiche le message d'aide quand aucun nœud n'est sélectionné", () => {
    const wrapper = mount(MindMapPalette, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            stubActions: true,
            initialState: {
              mindmapBuilder: {
                map: {
                  id: 'map-1',
                  title: 'Test',
                  subjectNodeId: 'node-1',
                  nodes: { 'node-1': makeNode() },
                  links: [],
                  zones: [],
                },
                selectedNodeIds: [],
                selectedLinkId: null,
                pendingLinkSource: null,
                isDirty: false,
                interpreterOpen: false,
                nodeType: 'text',
                tool: 'select',
              },
            },
          }),
        ],
        stubs: { Interpreter: { template: '<div class="interpreter-stub" />' } },
      },
    })
    expect(wrapper.text()).toContain('Sélectionnez un item pour modifier ses options.')
    expect(wrapper.find('.palette__section--selected').exists()).toBe(false)
  })

  // ── Nœud sélectionné ─────────────────────────────────────────────────────

  it('affiche la section Options quand un nœud est sélectionné', () => {
    const wrapper = mountPalette()
    expect(wrapper.find('.palette__section--selected').exists()).toBe(true)
    expect(wrapper.find('.palette__section--selected').text()).toContain('Options')
    expect(wrapper.find('.palette__section--selected').text()).toContain('Mon nœud')
  })

  it('affiche le sélecteur de type avec la valeur courante', () => {
    const wrapper = mountPalette({ type: 'formula' })
    const typeSelect = wrapper.find('.palette__section--selected .palette__select--inline')
    expect(typeSelect.exists()).toBe(true)
    expect(typeSelect.element.value).toBe('formula')
  })

  it('affiche le sélecteur de maîtrise avec la valeur courante', () => {
    const wrapper = mountPalette({ mastery: 'medium' })
    const masterySelect = wrapper.find('.palette__section--selected select:not(.palette__select--inline)')
    expect(masterySelect.element.value).toBe('medium')
  })

  // ── Changement de type ────────────────────────────────────────────────────

  it('changer le type appelle store.updateNode avec le nouveau type', async () => {
    const wrapper = mountPalette()
    const store = useMindMapBuilderStore()
    const typeSelect = wrapper.find('.palette__section--selected .palette__select--inline')
    typeSelect.element.value = 'formula'
    await typeSelect.trigger('change')
    expect(store.updateNode).toHaveBeenCalledWith('node-1', expect.objectContaining({ type: 'formula' }))
  })

  // ── Changement de maîtrise ────────────────────────────────────────────────

  it('changer la maîtrise appelle store.updateNode avec le niveau', async () => {
    const wrapper = mountPalette()
    const store = useMindMapBuilderStore()
    const masterySelect = wrapper.find('.palette__section--selected select:not(.palette__select--inline)')
    masterySelect.element.value = 'high'
    await masterySelect.trigger('change')
    expect(store.updateNode).toHaveBeenCalledWith('node-1', { mastery: 'high' })
  })

  // ── Options texte ─────────────────────────────────────────────────────────

  it('affiche les options de texte (couleur, taille, gras) pour un nœud texte', () => {
    const wrapper = mountPalette({ type: 'text' })
    const optionsSection = wrapper.find('.palette__section--selected')
    expect(optionsSection.find('input[type="number"]').exists()).toBe(true)
    expect(optionsSection.find('.palette__toolbar-btn').exists()).toBe(true)
  })

  it("n'affiche pas les options de texte pour un nœud formule", () => {
    const wrapper = mountPalette({ type: 'formula' })
    expect(wrapper.find('input[type="number"]').exists()).toBe(false)
  })

  // ── Section formule ───────────────────────────────────────────────────────

  it('affiche la section formule pour un nœud de type formula', () => {
    const wrapper = mountPalette({ type: 'formula', content: 'E=mc^2' })
    expect(wrapper.find('.palette__formula-preview').exists()).toBe(true)
    expect(wrapper.text()).toContain("Saisir avec l'interpréteur")
  })

  it("n'affiche pas la section formule pour un nœud texte", () => {
    const wrapper = mountPalette({ type: 'text' })
    expect(wrapper.find('.palette__formula-preview').exists()).toBe(false)
  })

  it("le bouton \"Saisir avec l'interpréteur\" appelle store.openInterpreter", async () => {
    const wrapper = mountPalette({ type: 'formula', content: 'x^2' })
    const store = useMindMapBuilderStore()
    const btn = wrapper.findAll('.palette__btn').find(b => b.text().includes("Saisir avec l'interpréteur"))
    await btn.trigger('click')
    expect(store.openInterpreter).toHaveBeenCalled()
  })

  it('affiche le picker couleur du texte pour un nœud formule', () => {
    const wrapper = mountPalette({ type: 'formula' })
    const formulaSection = wrapper.find('.palette__section--selected')
    const colorInputs = formulaSection.findAll('input[type="color"]')
    expect(colorInputs.length).toBeGreaterThanOrEqual(2) // fond + texte
  })

  // ── Section image ─────────────────────────────────────────────────────────

  it('affiche la section image pour un nœud de type image', () => {
    const wrapper = mountPalette({ type: 'image', content: '' })
    expect(wrapper.text()).toContain('Choisir une image')
  })

  it("n'affiche pas la section image pour un nœud texte", () => {
    const wrapper = mountPalette({ type: 'text' })
    expect(wrapper.findAll('.palette__btn').some(b => b.text() === 'Choisir une image')).toBe(false)
  })

  // ── Boutons de forme ──────────────────────────────────────────────────────

  it('affiche les trois boutons de forme (Bulle, Rect, Pilule)', () => {
    const wrapper = mountPalette()
    const shapeButtons = wrapper.findAll('.palette__shape-btn')
    expect(shapeButtons.length).toBe(3)
    expect(shapeButtons.map(b => b.text())).toContain('Bulle')
    expect(shapeButtons.map(b => b.text())).toContain('Rect')
    expect(shapeButtons.map(b => b.text())).toContain('Pilule')
  })

  it('le bouton de forme active a la classe --active', () => {
    const wrapper = mountPalette({ style: { shape: 'rect' } })
    const activeBtn = wrapper.findAll('.palette__shape-btn').find(b => b.text() === 'Rect')
    expect(activeBtn.classes()).toContain('palette__shape-btn--active')
  })

  // ── Suppression ───────────────────────────────────────────────────────────

  it('le bouton Supprimer appelle store.removeNode', async () => {
    const wrapper = mountPalette()
    const store = useMindMapBuilderStore()
    const deleteBtn = wrapper.findAll('.palette__btn--danger').find(b => b.text() === 'Supprimer')
    await deleteBtn.trigger('click')
    expect(store.removeNode).toHaveBeenCalledWith('node-1')
  })

  // ── Flashcard picker ──────────────────────────────────────────────────────

  it('le bouton "Lier une flashcard" ouvre le picker et charge les systèmes', async () => {
    mockGet.mockResolvedValueOnce({ data: [{ idSystem: 1, name: 'Maths' }] })
    const wrapper = mountPalette()
    const linkBtn = wrapper.findAll('.palette__btn--ghost').find(b => b.text().includes('Lier une flashcard'))
    await linkBtn.trigger('click')
    await flushPromises()
    expect(mockGet).toHaveBeenCalledWith('leitnersystems/')
    expect(wrapper.find('.palette__card-picker').exists()).toBe(true)
  })
})

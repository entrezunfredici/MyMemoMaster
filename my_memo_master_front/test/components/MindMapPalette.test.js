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
  toLatex: vi.fn((v) => String(v ?? '')),
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
    expect(wrapper.text()).toContain('Sélectionnez un item ou une branche pour modifier ses options.')
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

  it("n'affiche pas de sélecteur de maîtrise (elle vient de la flashcard liée)", () => {
    const wrapper = mountPalette({ mastery: 'medium' })
    expect(wrapper.find('select[aria-label="Niveau de maîtrise"]').exists()).toBe(false)
  })

  // ── Grandeurs proposées après saisie d'une formule ────────────────────────

  describe('proposition de grandeurs après saisie d\'une formule', () => {
    const mountWithInterpreter = () =>
      mount(MindMapPalette, {
        global: {
          plugins: [
            createTestingPinia({
              createSpy: vi.fn,
              stubActions: true,
              initialState: makeStoreState({ type: 'formula', content: 'E = M V' }, { interpreterOpen: true }),
            }),
          ],
          stubs: {
            Interpreter: {
              emits: ['apply'],
              template: '<button class="interp-apply" @click="$emit(\'apply\', \'E = M V\')">ok</button>',
            },
          },
        },
        attachTo: document.body,
      })

    it('liste les variables sans grandeur et crée celles qui restent cochées', async () => {
      const wrapper = mountWithInterpreter()
      const store = useMindMapBuilderStore()
      await document.body.querySelector('.interp-apply').click()
      await wrapper.vm.$nextTick()

      const items = [...document.body.querySelectorAll('.variable-prompt__item')]
      expect(items.map((el) => el.textContent.trim())).toEqual(['M', 'V'])

      items[1].querySelector('input').click() // décoche V
      await wrapper.vm.$nextTick()
      const create = [...document.body.querySelectorAll('.variable-prompt__actions button')][0]
      create.click()
      await wrapper.vm.$nextTick()

      expect(store.createQuantitiesForFormula).toHaveBeenCalledWith('node-1', ['M'])
      expect(document.body.querySelector('.variable-prompt__list')).toBeNull()
      wrapper.unmount()
    })

    it('« Ignorer » ferme la fenêtre sans rien créer', async () => {
      const wrapper = mountWithInterpreter()
      const store = useMindMapBuilderStore()
      await document.body.querySelector('.interp-apply').click()
      await wrapper.vm.$nextTick()
      const ignore = [...document.body.querySelectorAll('.variable-prompt__actions button')][1]
      ignore.click()
      await wrapper.vm.$nextTick()
      expect(store.createQuantitiesForFormula).not.toHaveBeenCalled()
      expect(document.body.querySelector('.variable-prompt__list')).toBeNull()
      wrapper.unmount()
    })
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

describe('MindMapPalette — rôles supplémentaires « Formule » / « Fonction »', () => {
  const clickKind = async (wrapper, label) => {
    await wrapper.findAll('.palette__kind-btn').find((b) => b.text() === label).trigger('click')
  }

  it('activer « Fonction » sur un texte ouvre l’éditeur de formule', async () => {
    const wrapper = mountPalette({ type: 'text', content: 'Contenu' })
    const store = useMindMapBuilderStore()
    await clickKind(wrapper, 'Fonction')
    expect(store.toggleNodeKind).toHaveBeenCalledWith('node-1', 'function')
    expect(store.openInterpreter).toHaveBeenCalled()
  })

  it('le texte par défaut (identique au titre) est vidé pour partir d’une saisie vide', async () => {
    const wrapper = mountPalette({ type: 'text', label: 'Nouvel item', content: 'Nouvel item' })
    const store = useMindMapBuilderStore()
    await clickKind(wrapper, 'Formule')
    expect(store.updateNode).toHaveBeenCalledWith('node-1', { content: '' })
    expect(store.openInterpreter).toHaveBeenCalled()
  })

  it('un texte déjà rédigé est conservé comme point de départ', async () => {
    const wrapper = mountPalette({ type: 'text', label: 'Titre', content: 'E=mc^2' })
    const store = useMindMapBuilderStore()
    await clickKind(wrapper, 'Formule')
    expect(store.updateNode).not.toHaveBeenCalled()
    expect(store.openInterpreter).toHaveBeenCalled()
  })

  it('désactiver le rôle (déjà actif) n’ouvre pas l’éditeur', async () => {
    const wrapper = mountPalette({ type: 'text', kinds: ['function'], content: 'f(x)=x' })
    const store = useMindMapBuilderStore()
    await clickKind(wrapper, 'Fonction')
    expect(store.toggleNodeKind).toHaveBeenCalledWith('node-1', 'function')
    expect(store.openInterpreter).not.toHaveBeenCalled()
  })

  it('« Grandeur » n’ouvre pas l’éditeur', async () => {
    const wrapper = mountPalette({ type: 'text' })
    const store = useMindMapBuilderStore()
    await clickKind(wrapper, 'Grandeur')
    expect(store.openInterpreter).not.toHaveBeenCalled()
  })

  it('un texte avec le rôle « Fonction » affiche la section formule (aperçu + éditeur)', () => {
    const wrapper = mountPalette({ type: 'text', kinds: ['function'], content: 'y=x' })
    expect(wrapper.text()).toContain('Saisir avec l\'interpréteur')
  })
})

describe('MindMapPalette — grandeur numérique ou formule', () => {
  const quantity = { symbol: 'v', value: 15, unit: 'm/s' }
  const modeBtn = (wrapper, label) =>
    wrapper.find('[aria-label="Type de grandeur"]').findAll('button').find((b) => b.text() === label)

  it('grandeur numérique : champ Valeur affiché, mode Numérique actif', () => {
    const wrapper = mountPalette({ type: 'quantity', quantity })
    expect(wrapper.find('[aria-label="Valeur de la grandeur"]').exists()).toBe(true)
    expect(modeBtn(wrapper, 'Numérique').attributes('aria-pressed')).toBe('true')
    expect(modeBtn(wrapper, 'Formule').attributes('aria-pressed')).toBe('false')
  })

  it('choisir « Formule » ajoute le rôle formule et ouvre l’éditeur', async () => {
    const wrapper = mountPalette({ type: 'quantity', label: 'v', content: '', quantity })
    const store = useMindMapBuilderStore()
    await modeBtn(wrapper, 'Formule').trigger('click')
    expect(store.toggleNodeKind).toHaveBeenCalledWith('node-1', 'formula')
    expect(store.openInterpreter).toHaveBeenCalled()
  })

  it('grandeur formule : champ Valeur remplacé par une explication, mode Formule actif', () => {
    const wrapper = mountPalette({ type: 'quantity', kinds: ['formula'], content: 'v=D/T', quantity })
    expect(wrapper.find('[aria-label="Valeur de la grandeur"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Valeur calculée par la formule')
    expect(modeBtn(wrapper, 'Formule').attributes('aria-pressed')).toBe('true')
  })

  it('choisir « Numérique » retire le rôle formule sans effacer la formule', async () => {
    const wrapper = mountPalette({ type: 'quantity', kinds: ['formula'], content: 'v=D/T', quantity })
    const store = useMindMapBuilderStore()
    await modeBtn(wrapper, 'Numérique').trigger('click')
    expect(store.toggleNodeKind).toHaveBeenCalledWith('node-1', 'formula')
    expect(store.updateNode).not.toHaveBeenCalled()
  })

  it('pas de choix de mode pour un item de type formule', () => {
    const wrapper = mountPalette({ type: 'formula', kinds: ['quantity'], content: 'v=D/T', quantity })
    expect(wrapper.find('[aria-label="Type de grandeur"]').exists()).toBe(false)
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder'
import MindMapNode from '@/components/mindmap/MindMapNode.vue'
import NodeTitle from '@/components/mindmap/node/NodeTitle.vue'
import { useNodeEditing, provideNodeEditing } from '@/composables/useMindMapNodeEditing'

const { upload, notify } = vi.hoisted(() => ({ upload: vi.fn(), notify: vi.fn() }))
vi.mock('@/helpers/mindmap/mindmapImage', async (importOriginal) => ({ ...(await importOriginal()), uploadMindmapImage: upload }))
vi.mock('@/helpers/notif', () => ({ notif: { notify } }))
vi.mock('@/components/interpreter/interpreter.js', () => ({
  renderMathMultiline: vi.fn((v) => `<span class="katex-mock">${v}</span>`),
  toLatex: vi.fn((v) => String(v ?? '')),
}))
vi.mock('@/helpers/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }))
vi.mock('@/config', () => ({ VITE_API_URL: 'http://localhost:3000' }))

const style = { primaryColor: '#1E3A8A', secondaryColor: '#C0C5D2', shape: 'bubble', width: 220, height: 120, textColor: '#eef2ff', fontSize: 13, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none' }
const node = (o = {}) => ({ id: 'n1', label: 'Mon nœud', type: 'text', content: 'Contenu', style: { ...style }, layout: { x: 0, y: 0 }, ...o })

const mountNode = (n = node(), { calculations = {}, subjectNodeId = 'root', nodeType = 'text' } = {}) => {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
    initialState: { mindmapBuilder: { map: { id: 'm', subjectNodeId, nodes: { [n.id]: n }, links: [], zones: [] }, nodeType } },
  })
  const store = useMindMapBuilderStore(pinia)
  // `calculations` est un getter : le testing pinia permet de le surcharger.
  store.calculations = calculations
  const wrapper = mount(MindMapNode, { props: { node: n }, global: { plugins: [pinia] }, attachTo: document.body })
  return { wrapper, store }
}

beforeEach(() => { vi.clearAllMocks(); document.body.innerHTML = '' })

describe('titre (NodeTitle)', () => {
  const edit = async (wrapper, value, key = 'Enter') => {
    await wrapper.find('.mindmap-node__title').trigger('dblclick')
    const input = wrapper.find('input[aria-label="Titre du nœud"]')
    await input.setValue(value)
    await input.trigger('keydown', { key })
    return input
  }

  it('Entrée enregistre le titre sans espaces autour et referme l’éditeur', async () => {
    const { wrapper, store } = mountNode()
    await edit(wrapper, '  Nouveau  ')
    expect(store.updateNode).toHaveBeenCalledWith('n1', { label: 'Nouveau' })
    expect(wrapper.find('input[aria-label="Titre du nœud"]').exists()).toBe(false)
  })

  it('titre inchangé ou vide : rien n’est enregistré', async () => {
    const { wrapper, store } = mountNode()
    await edit(wrapper, ' Mon nœud ')
    await edit(wrapper, '   ')
    expect(store.updateNode).not.toHaveBeenCalled()
    expect(wrapper.find('.mindmap-node__title').text()).toBe('Mon nœud')
  })

  it('Échap annule la saisie', async () => {
    const { wrapper, store } = mountNode()
    await edit(wrapper, 'Abandonné', 'Escape')
    expect(store.updateNode).not.toHaveBeenCalled()
    expect(wrapper.find('.mindmap-node__title').exists()).toBe(true)
  })

  it('perdre le focus enregistre aussi, une seule fois', async () => {
    const { wrapper, store } = mountNode()
    await wrapper.find('.mindmap-node__title').trigger('dblclick')
    const input = wrapper.find('input[aria-label="Titre du nœud"]')
    await input.setValue('Via blur')
    await input.trigger('blur')
    await input.trigger('blur')
    expect(store.updateNode).toHaveBeenCalledTimes(1)
  })

  it('un seul champ en édition à la fois : éditer le contenu referme le titre', async () => {
    const { wrapper } = mountNode()
    await wrapper.find('.mindmap-node__title').trigger('dblclick')
    expect(wrapper.find('input[aria-label="Titre du nœud"]').exists()).toBe(true)
    await wrapper.find('.mindmap-node__body').trigger('dblclick')
    expect(wrapper.find('input[aria-label="Titre du nœud"]').exists()).toBe(false)
    expect(wrapper.find('textarea[aria-label="Contenu du nœud"]').exists()).toBe(true)
  })

  it('le champ est mis au point à l’ouverture', async () => {
    const { wrapper } = mountNode()
    await wrapper.find('.mindmap-node__title').trigger('dblclick')
    await flushPromises()
    expect(document.activeElement).toBe(wrapper.find('input[aria-label="Titre du nœud"]').element)
  })
})

describe('corps de texte (NodeTextBody)', () => {
  const editContent = async (wrapper, value, how = 'blur') => {
    await wrapper.find('.mindmap-node__body').trigger('dblclick')
    const area = wrapper.find('textarea[aria-label="Contenu du nœud"]')
    await area.setValue(value)
    await area.trigger(how === 'blur' ? 'blur' : 'keydown', how === 'blur' ? {} : { key: 'Escape' })
  }

  it('perdre le focus enregistre le contenu modifié', async () => {
    const { wrapper, store } = mountNode()
    await editContent(wrapper, 'Autre')
    expect(store.updateNode).toHaveBeenCalledWith('n1', { content: 'Autre' })
    expect(wrapper.find('.mindmap-node__body').text()).toContain('Contenu')
  })

  it('contenu inchangé : rien n’est enregistré', async () => {
    const { wrapper, store } = mountNode()
    await editContent(wrapper, 'Contenu')
    expect(store.updateNode).not.toHaveBeenCalled()
  })

  it('Échap annule', async () => {
    const { wrapper, store } = mountNode()
    await editContent(wrapper, 'Abandonné', 'escape')
    expect(store.updateNode).not.toHaveBeenCalled()
    expect(wrapper.find('textarea').exists()).toBe(false)
  })

  it('le nœud racine ne répète pas son titre comme contenu', () => {
    const { wrapper } = mountNode(node({ content: 'Mon nœud' }), { subjectNodeId: 'n1' })
    expect(wrapper.find('.mindmap-node__placeholder').text()).toContain('Double-clic pour ajouter')
  })

  it('le style du nœud s’applique au corps', () => {
    const { wrapper } = mountNode(node({ style: { ...style, fontSize: 20, fontWeight: 'bold', fontStyle: 'italic', textDecoration: 'underline' } }))
    const css = wrapper.find('.mindmap-node__body').attributes('style')
    expect(css).toContain('font-size: 20px')
    expect(css).toContain('font-weight: bold')
    expect(css).toContain('font-style: italic')
    expect(css).toContain('text-decoration: underline')
  })
})

describe('image (NodeImage)', () => {
  const drop = (wrapper, file) => wrapper.find('.mindmap-node__image').trigger('drop', { dataTransfer: { files: [file] } })
  const imageNode = (o = {}) => node({ type: 'image', content: 'http://x/y.png', ...o })

  it('un fichier image déposé est téléversé puis devient le contenu', async () => {
    upload.mockResolvedValueOnce('data:image/png;base64,AAA')
    const { wrapper, store } = mountNode(imageNode({ content: '' }))
    await drop(wrapper, { type: 'image/png' })
    await flushPromises()
    expect(store.updateNode).toHaveBeenCalledWith('n1', { content: 'data:image/png;base64,AAA' })
  })

  it('un fichier qui n’est pas une image est ignoré', async () => {
    const { wrapper, store } = mountNode(imageNode())
    await drop(wrapper, { type: 'text/plain' })
    await flushPromises()
    expect(upload).not.toHaveBeenCalled()
    expect(store.updateNode).not.toHaveBeenCalled()
  })

  it('image trop volumineuse : refus silencieux (le message vient de l’import)', async () => {
    upload.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'IMAGE_TOO_LARGE' }))
    const { wrapper } = mountNode(imageNode())
    await drop(wrapper, { type: 'image/png' })
    await flushPromises()
    expect(notify).not.toHaveBeenCalled()
  })

  it('autre échec de téléversement : l’utilisateur est prévenu', async () => {
    upload.mockRejectedValueOnce(new Error('réseau'))
    const { wrapper, store } = mountNode(imageNode())
    await drop(wrapper, { type: 'image/png' })
    await flushPromises()
    expect(notify).toHaveBeenCalledWith("L'image n'a pas pu être téléchargée.", 'error')
    expect(store.updateNode).not.toHaveBeenCalled()
  })

  it('survol puis sortie : le texte d’invite change', async () => {
    const { wrapper } = mountNode(imageNode({ content: '' }))
    expect(wrapper.text()).toContain('Glissez une image ici')
    await wrapper.find('.mindmap-node__image').trigger('dragover')
    expect(wrapper.text()).toContain('Déposer ici')
    await wrapper.find('.mindmap-node__image').trigger('dragleave')
    expect(wrapper.text()).toContain('Glissez une image ici')
  })

  const load = async (wrapper, naturalWidth, naturalHeight) => {
    const img = wrapper.find('img')
    Object.defineProperty(img.element, 'naturalWidth', { value: naturalWidth, configurable: true })
    Object.defineProperty(img.element, 'naturalHeight', { value: naturalHeight, configurable: true })
    await img.trigger('load')
  }

  it('au chargement, l’item prend les proportions de l’image', async () => {
    const { wrapper, store } = mountNode(imageNode())
    await load(wrapper, 800, 400)
    // largeur 220 conservée (bornée à 180-400), zone image 196 de large -> 98 de haut, + titre 30 + marge 20
    expect(store.updateNodeStyle).toHaveBeenCalledWith('n1', { width: 220, height: 148 })
  })

  it('largeur bornée entre 180 et 400', async () => {
    const small = mountNode(imageNode({ style: { ...style, width: 100, height: 300 } }))
    await load(small.wrapper, 100, 100)
    expect(small.store.updateNodeStyle).toHaveBeenCalledWith('n1', { width: 180, height: 206 })
    const big = mountNode(imageNode({ style: { ...style, width: 600, height: 100 } }))
    await load(big.wrapper, 100, 100)
    expect(big.store.updateNodeStyle).toHaveBeenCalledWith('n1', { width: 400, height: 426 })
  })

  it('dimensions déjà bonnes ou image sans dimensions : aucune mise à jour', async () => {
    const ok = mountNode(imageNode({ style: { ...style, width: 220, height: 148 } }))
    await load(ok.wrapper, 800, 400)
    expect(ok.store.updateNodeStyle).not.toHaveBeenCalled()
    const empty = mountNode(imageNode())
    await load(empty.wrapper, 0, 0)
    expect(empty.store.updateNodeStyle).not.toHaveBeenCalled()
  })
})

describe('grandeur et calcul (NodeQuantity)', () => {
  const quantityNode = (o = {}) => node({ type: 'quantity', content: '', quantity: { symbol: 'm', value: 3, unit: 'kg' }, ...o })

  it('grandeur principale : symbole, valeur et unité, sans pastille', () => {
    const { wrapper } = mountNode(quantityNode())
    const row = wrapper.find('.mindmap-node__quantity')
    expect(row.classes()).not.toContain('mindmap-node__quantity--badge')
    expect(row.text()).toContain('m')
    expect(row.text()).toContain('kg')
    expect(wrapper.find('input[aria-label="Valeur de la grandeur"]').element.value).toBe('3')
  })

  it('grandeur ajoutée à un texte : affichée en pastille', () => {
    const { wrapper } = mountNode(node({ kinds: ['quantity'], quantity: { symbol: 'v', value: 2, unit: 'm/s' } }))
    expect(wrapper.find('.mindmap-node__quantity').classes()).toContain('mindmap-node__quantity--badge')
  })

  it('symbole et unité absents : invites « symbole » et « unité »', () => {
    const { wrapper } = mountNode(quantityNode({ quantity: {} }))
    const labels = wrapper.findAll('.mindmap-node__quantity-label').map((l) => l.text())
    expect(labels).toEqual(['symbole', 'unité'])
  })

  it('perdre le focus de l’éditeur enregistre symbole et unité', async () => {
    const { wrapper, store } = mountNode(quantityNode())
    await wrapper.find('.mindmap-node__quantity-label').trigger('dblclick')
    await wrapper.find('input[aria-label="Symbole de la grandeur"]').setValue('E')
    await wrapper.find('input[aria-label="Unité de la grandeur"]').setValue('J')
    await wrapper.find('.mindmap-node__quantity-editor').trigger('focusout', { relatedTarget: null })
    expect(store.updateNodeQuantity).toHaveBeenCalledWith('n1', { symbol: 'E', unit: 'J' })
    expect(wrapper.find('.mindmap-node__quantity-editor').exists()).toBe(false)
  })

  it('passer d’un champ à l’autre de l’éditeur n’enregistre pas encore', async () => {
    const { wrapper, store } = mountNode(quantityNode())
    await wrapper.find('.mindmap-node__quantity-label').trigger('dblclick')
    const unit = wrapper.find('input[aria-label="Unité de la grandeur"]')
    await wrapper.find('.mindmap-node__quantity-editor').trigger('focusout', { relatedTarget: unit.element })
    expect(store.updateNodeQuantity).not.toHaveBeenCalled()
    expect(wrapper.find('.mindmap-node__quantity-editor').exists()).toBe(true)
  })

  it('formule qui est aussi une grandeur : valeur et unité viennent du calcul, plus de champ de valeur', () => {
    const { wrapper } = mountNode(
      node({ type: 'formula', kinds: ['quantity'], content: 'a = b', quantity: { symbol: 'F', unit: 'N' } }),
      { calculations: { n1: { ok: true, value: 12, unit: 'newton', symbol: 'F' } } },
    )
    expect(wrapper.find('.mindmap-node__quantity-computed').text()).toBe('12')
    expect(wrapper.find('input[aria-label="Valeur de la grandeur"]').exists()).toBe(false)
    expect(wrapper.findAll('.mindmap-node__quantity-label')[1].text()).toBe('newton')
  })

  it('formule seule dont le calcul réussit : résultat en pastille', () => {
    const { wrapper } = mountNode(node({ type: 'formula', content: 'a = b' }), { calculations: { n1: { ok: true, value: 12, unit: 'N', symbol: 'F' } } })
    expect(wrapper.find('.mindmap-node__quantity--result').text()).toBe('F = 12 N')
  })

  it('calcul en erreur : message avec infobulle', () => {
    const { wrapper } = mountNode(node({ type: 'formula', content: 'a = b' }), { calculations: { n1: { ok: false, error: 'Variable inconnue' } } })
    const err = wrapper.find('.mindmap-node__calc-error')
    expect(err.text()).toBe('⚠ Variable inconnue')
    expect(err.attributes('title')).toBe('Variable inconnue')
  })
})

describe('item : création d’enfants et édition en cours', () => {
  it('le bouton + crée un enfant du type par défaut', async () => {
    const { wrapper, store } = mountNode(node(), { nodeType: 'formula' })
    await wrapper.find('.mindmap-node__add').trigger('pointerdown')
    expect(store.addNode).toHaveBeenCalledWith(expect.objectContaining({ type: 'formula', parentId: 'n1', content: '' }))
  })

  it('Maj + clic crée un enfant et n’émet pas « node-pointerdown »', async () => {
    const { wrapper, store } = mountNode(node(), { nodeType: 'text' })
    await wrapper.find('g.mindmap-node').trigger('pointerdown', { shiftKey: true })
    expect(store.addNode).toHaveBeenCalledWith(expect.objectContaining({ type: 'text', parentId: 'n1', content: undefined }))
    expect(wrapper.emitted('node-pointerdown')).toBeUndefined()
  })

  it('pendant l’édition d’un champ, le clic sur l’item ne déclenche ni déplacement ni création', async () => {
    const { wrapper, store } = mountNode()
    await wrapper.find('.mindmap-node__title').trigger('dblclick')
    await wrapper.find('g.mindmap-node').trigger('pointerdown')
    await wrapper.find('g.mindmap-node').trigger('pointerdown', { shiftKey: true })
    expect(wrapper.emitted('node-pointerdown')).toBeUndefined()
    expect(store.addNode).not.toHaveBeenCalled()
  })
})

describe('useNodeEditing', () => {
  it('sans item parent : erreur explicite', () => {
    expect(() => mount(NodeTitle, { props: { node: node() }, global: { plugins: [createTestingPinia({ createSpy: vi.fn })] } }))
      .toThrow(/provideNodeEditing/)
  })

  it('le champ fourni est partagé par référence avec les sous-composants', () => {
    let provided
    let injected
    const Child = defineComponent({ setup() { injected = useNodeEditing(); return () => null } })
    mount(defineComponent({ setup() { provided = provideNodeEditing(); return () => h(Child) } }))
    expect(provided.value).toBeNull()
    expect(injected).toBe(provided)
    provided.value = 'label'
    expect(injected.value).toBe('label')
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder'
import MindMapPalette from '@/components/mindmap/MindMapPalette.vue'
import PaletteTextStyle from '@/components/mindmap/palette/PaletteTextStyle.vue'
import PaletteModal from '@/components/mindmap/palette/PaletteModal.vue'
import PaletteVariablePrompt from '@/components/mindmap/palette/PaletteVariablePrompt.vue'

vi.mock('@/helpers/api', () => ({ api: { get: vi.fn().mockResolvedValue({ data: [] }), post: vi.fn() } }))
vi.mock('@/config', () => ({ VITE_API_URL: 'http://localhost:3000' }))
vi.mock('@/components/interpreter/interpreter.js', () => ({
  renderMathMultiline: vi.fn((v) => `<span class="katex-mock">${v}</span>`),
  toLatex: vi.fn((v) => String(v ?? '')),
}))

const style = { primaryColor: '#1E3A8A', textColor: '#eef2ff', fontSize: 13, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none' }
const node = (o = {}) => ({ id: 'n1', label: 'Mon nœud', type: 'text', content: 'Contenu', style: { ...style }, ...o })

const mountWithStore = (Component, options = {}, mapNode = node()) => {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
    initialState: {
      mindmapBuilder: {
        map: { id: 'm', subjectNodeId: 'n1', nodes: { n1: mapNode }, links: [], zones: [] },
        selectedNodeIds: ['n1'],
        interpreterOpen: false,
        tool: 'select',
      },
    },
  })
  const wrapper = mount(Component, {
    ...options,
    global: { plugins: [pinia], stubs: { Interpreter: { template: '<div class="interp-stub" />' } } },
    attachTo: document.body,
  })
  return { wrapper, store: useMindMapBuilderStore(pinia) }
}

afterEach(() => { document.body.innerHTML = '' })

describe('PaletteTextStyle', () => {
  it('couleur seule par défaut (formules, graphiques)', () => {
    const { wrapper } = mountWithStore(PaletteTextStyle, { props: { node: node() } })
    expect(wrapper.find('input[aria-label="Couleur du texte"]').element.value).toBe('#eef2ff')
    expect(wrapper.find('input[aria-label="Taille du texte en pixels"]').exists()).toBe(false)
    expect(wrapper.find('.palette__toolbar').exists()).toBe(false)
  })

  it('avec la police : taille et barre G / I / S initialisées depuis le style du nœud', () => {
    const styled = node({ style: { ...style, fontSize: 20, fontWeight: 'bold', fontStyle: 'italic', textDecoration: 'underline' } })
    const { wrapper } = mountWithStore(PaletteTextStyle, { props: { node: styled, withFont: true } })
    expect(wrapper.find('input[aria-label="Taille du texte en pixels"]').element.value).toBe('20')
    expect(wrapper.findAll('.palette__toolbar-btn').map((b) => b.classes('active'))).toEqual([true, true, true])
  })

  it('la couleur choisie est envoyée au store', async () => {
    const { wrapper, store } = mountWithStore(PaletteTextStyle, { props: { node: node() } })
    const input = wrapper.find('input[aria-label="Couleur du texte"]')
    input.element.value = '#123456'
    await input.trigger('input')
    expect(store.updateNodeStyle).toHaveBeenCalledWith('n1', { textColor: '#123456' })
  })

  it.each([['999', 48], ['2', 10], ['abc', 13], ['24', 24]])('taille « %s » : bornée entre 10 et 48 (reçu %s)', async (saisie, attendu) => {
    const { wrapper, store } = mountWithStore(PaletteTextStyle, { props: { node: node(), withFont: true } })
    const input = wrapper.find('input[aria-label="Taille du texte en pixels"]')
    input.element.value = saisie
    await input.trigger('change')
    expect(store.updateNodeStyle).toHaveBeenCalledWith('n1', { fontSize: attendu })
  })

  it('gras, italique et souligné : bascule du bouton et du style envoyé', async () => {
    const { wrapper, store } = mountWithStore(PaletteTextStyle, { props: { node: node(), withFont: true } })
    const [bold, italic, underline] = wrapper.findAll('.palette__toolbar-btn')
    await bold.trigger('click')
    await italic.trigger('click')
    await underline.trigger('click')
    expect(store.updateNodeStyle).toHaveBeenCalledWith('n1', { fontWeight: 'bold' })
    expect(store.updateNodeStyle).toHaveBeenCalledWith('n1', { fontStyle: 'italic' })
    expect(store.updateNodeStyle).toHaveBeenCalledWith('n1', { textDecoration: 'underline' })
    expect(bold.classes('active')).toBe(true)
    await bold.trigger('click')
    expect(store.updateNodeStyle).toHaveBeenLastCalledWith('n1', { fontWeight: 'normal' })
    expect(bold.classes('active')).toBe(false)
  })

  it('un autre nœud relit son style', async () => {
    const { wrapper } = mountWithStore(PaletteTextStyle, { props: { node: node(), withFont: true } })
    await wrapper.setProps({ node: node({ id: 'n2', style: { ...style, textColor: '#000000', fontWeight: 'bold' } }) })
    expect(wrapper.find('input[aria-label="Couleur du texte"]').element.value).toBe('#000000')
    expect(wrapper.find('.palette__toolbar-btn').classes('active')).toBe(true)
  })
})

describe('PaletteModal', () => {
  const mountModal = (props) => mount(PaletteModal, { props: { title: 'Titre', closeLabel: 'Fermer', ...props }, slots: { default: '<p class="contenu">Corps</p>' }, attachTo: document.body })

  it('téléporte la boîte dans <body> avec son titre et son contenu', () => {
    mountModal()
    const modal = document.body.querySelector('.interp-modal')
    expect(modal.querySelector('h3').textContent).toBe('Titre')
    expect(modal.querySelector('.contenu').textContent).toBe('Corps')
    expect(modal.querySelector('.interp-modal__dialog--narrow')).toBeNull()
  })

  it('sans titleId : pas de rôle dialogue (interpréteur)', () => {
    mountModal()
    expect(document.body.querySelector('.interp-modal').getAttribute('role')).toBeNull()
  })

  it('avec titleId : dialogue modal nommé par son titre', () => {
    mountModal({ titleId: 'mon-titre', narrow: true })
    const modal = document.body.querySelector('.interp-modal')
    expect(modal.getAttribute('role')).toBe('dialog')
    expect(modal.getAttribute('aria-modal')).toBe('true')
    expect(modal.getAttribute('aria-labelledby')).toBe('mon-titre')
    expect(modal.querySelector('h3').id).toBe('mon-titre')
    expect(modal.querySelector('.interp-modal__dialog--narrow')).not.toBeNull()
  })

  it('Échap ferme la modale ; une autre touche non ; l’écouteur est retiré au démontage', () => {
    const onClose = vi.fn()
    const wrapper = mountModal({ onClose })
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    expect(onClose).not.toHaveBeenCalled()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    wrapper.unmount()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('le bouton de fermeture (nommé) et le voile émettent « close »', async () => {
    const wrapper = mountModal({ closeLabel: 'Ignorer' })
    document.body.querySelector('button[aria-label="Ignorer"]').click()
    document.body.querySelector('.interp-modal__backdrop').click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('close')).toHaveLength(2)
  })
})

describe('PaletteVariablePrompt', () => {
  const mountPrompt = () => mount(PaletteVariablePrompt, { props: { symbols: ['E', 'M', 'V'] }, attachTo: document.body })
  const checkboxes = () => [...document.body.querySelectorAll('.variable-prompt__item input')]
  const actions = () => [...document.body.querySelectorAll('.variable-prompt__actions button')]

  it('une case cochée par variable, nommée', () => {
    mountPrompt()
    expect(checkboxes().map((c) => [c.getAttribute('aria-label'), c.checked])).toEqual([
      ['Créer la grandeur E', true], ['Créer la grandeur M', true], ['Créer la grandeur V', true],
    ])
    expect(document.body.querySelector('.interp-modal').getAttribute('role')).toBe('dialog')
  })

  it('« Créer » n’envoie que les variables cochées', async () => {
    const wrapper = mountPrompt()
    checkboxes()[1].click()
    actions()[0].click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('confirm')).toEqual([[['E', 'V']]])
  })

  it('« Ignorer » et la croix émettent « dismiss »', async () => {
    const wrapper = mountPrompt()
    actions()[1].click()
    document.body.querySelector('.interp-modal__close').click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('dismiss')).toHaveLength(2)
    expect(wrapper.emitted('confirm')).toBeUndefined()
  })
})

describe('MindMapPalette : sections et saisie de formule', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('texte avec rôle « Formule » : un seul sélecteur de couleur du texte', () => {
    const { wrapper } = mountWithStore(MindMapPalette, {}, node({ kinds: ['formula'], content: 'a = b' }))
    expect(wrapper.findAll('input[aria-label="Couleur du texte"]')).toHaveLength(1)
    expect(wrapper.find('input[aria-label="Taille du texte en pixels"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Formule')
  })

  it('formule seule : couleur du texte sans taille ni barre', () => {
    const { wrapper } = mountWithStore(MindMapPalette, {}, node({ type: 'formula', content: 'E = M V' }))
    expect(wrapper.findAll('input[aria-label="Couleur du texte"]')).toHaveLength(1)
    expect(wrapper.find('input[aria-label="Taille du texte en pixels"]').exists()).toBe(false)
    expect(wrapper.find('.palette__formula-preview').html()).toContain('E = M V')
  })

  it('texte simple : pas de bloc formule', () => {
    const { wrapper } = mountWithStore(MindMapPalette, {}, node())
    expect(wrapper.find('.palette__formula-preview').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Saisir avec l\'interpréteur')
  })

  it('l’interpréteur resté ouvert est refermé quand la sélection disparaît', async () => {
    const { wrapper, store } = mountWithStore(MindMapPalette, {}, node({ type: 'formula', content: 'E = M V' }))
    store.closeInterpreter.mockClear()
    store.selectedNodeIds = []
    await wrapper.vm.$nextTick()
    expect(store.closeInterpreter).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.palette__section--selected').exists()).toBe(false)
  })

  it('activer « Formule » sur un texte dont le contenu est le titre repart d’une saisie vide', async () => {
    const { wrapper, store } = mountWithStore(MindMapPalette, {}, node({ label: 'Énergie', content: 'Énergie' }))
    const btn = wrapper.findAll('.palette__kind-btn').find((b) => b.text() === 'Formule')
    await btn.trigger('click')
    expect(store.toggleNodeKind).toHaveBeenCalledWith('n1', 'formula')
    expect(store.updateNode).toHaveBeenCalledWith('n1', { content: '' })
    expect(store.openInterpreter).toHaveBeenCalledTimes(1)
  })

  it('activer « Formule » sur un texte au contenu propre conserve ce contenu', async () => {
    const { wrapper, store } = mountWithStore(MindMapPalette, {}, node({ label: 'Énergie', content: 'E = m c^2' }))
    await wrapper.findAll('.palette__kind-btn').find((b) => b.text() === 'Formule').trigger('click')
    expect(store.updateNode).not.toHaveBeenCalled()
    expect(store.openInterpreter).toHaveBeenCalledTimes(1)
  })

  it('« Effacer » vide la formule dans le store', async () => {
    const { wrapper, store } = mountWithStore(MindMapPalette, {}, node({ type: 'formula', content: 'E = M V' }))
    await wrapper.findAll('.palette__btn').find((b) => b.text() === 'Effacer').trigger('click')
    expect(store.updateNode).toHaveBeenCalledWith('n1', { content: '' })
    expect(wrapper.find('.palette__formula-preview').exists()).toBe(false)
  })
})

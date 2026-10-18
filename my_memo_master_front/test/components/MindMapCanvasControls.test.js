import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import MindMapBoard from '@/components/mindmap/MindMapBoard.vue'
import MindMapZone from '@/components/mindmap/MindMapZone.vue'
import PaletteZones from '@/components/mindmap/palette/PaletteZones.vue'
import Interpreter from '@/components/interpreter/Interpreter.vue'
import FlashcardBoxModalComponent from '@/components/flashcards/FlashcardBoxModalComponent.vue'
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder'

vi.mock('@/helpers/api', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: vi.fn() } }))
vi.mock('@/config', () => ({ VITE_API_URL: 'http://localhost:3000' }))

const style = { primaryColor: '#1E3A8A', secondaryColor: '#C0C5D2', shape: 'bubble', width: 220, height: 120, textColor: '#eef2ff', fontSize: 13, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none' }
const node = (id, x, y) => ({ id, label: id, type: 'text', content: '', style: { ...style }, layout: { x, y }, collapsed: false, meta: {} })

const mountBoard = (zones = []) => {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
    initialState: { mindmapBuilder: { map: { id: 'm', title: 'T', subjectNodeId: 's', nodes: { s: node('s', 0, 0) }, links: [], zones }, selectedNodeIds: [] } },
  })
  const wrapper = mount(MindMapBoard, { global: { plugins: [pinia] } })
  return { wrapper, store: useMindMapBuilderStore(pinia) }
}

beforeEach(() => vi.clearAllMocks())

describe('plateau — commandes de zoom', () => {
  const level = (w) => w.find('.mindmap-board__zoom-level').text()
  const zoomButton = (w, label) => w.find(`.mindmap-board__zoom button[aria-label="${label}"]`)

  it('groupe nommé, trois boutons nommés et niveau annoncé (100 % au départ)', () => {
    const { wrapper } = mountBoard()
    const group = wrapper.find('.mindmap-board__zoom')
    expect(group.attributes('role')).toBe('group')
    expect(group.attributes('aria-label')).toBe('Zoom du canevas')
    expect(group.findAll('button').map((b) => b.attributes('aria-label'))).toEqual(['Zoom avant', 'Zoom arrière', 'Réinitialiser le zoom et recentrer'])
    for (const b of group.findAll('button')) expect(b.attributes('type')).toBe('button')
    expect(level(wrapper)).toBe('100 %')
    expect(wrapper.find('.mindmap-board__zoom-level').attributes('role')).toBe('status')
  })

  it('+ et − changent le niveau de 10 points ; ⟲ revient à 100 %', async () => {
    const { wrapper } = mountBoard()
    await zoomButton(wrapper, 'Zoom avant').trigger('click')
    await zoomButton(wrapper, 'Zoom avant').trigger('click')
    expect(level(wrapper)).toBe('120 %')
    await zoomButton(wrapper, 'Zoom arrière').trigger('click')
    expect(level(wrapper)).toBe('110 %')
    await zoomButton(wrapper, 'Réinitialiser le zoom et recentrer').trigger('click')
    expect(level(wrapper)).toBe('100 %')
  })

  it('bornes 40 % et 300 % : le bouton correspondant se désactive', async () => {
    const { wrapper } = mountBoard()
    for (let i = 0; i < 30; i++) await zoomButton(wrapper, 'Zoom avant').trigger('click')
    expect(level(wrapper)).toBe('300 %')
    expect(zoomButton(wrapper, 'Zoom avant').attributes('disabled')).toBeDefined()
    expect(zoomButton(wrapper, 'Zoom arrière').attributes('disabled')).toBeUndefined()
    for (let i = 0; i < 40; i++) await zoomButton(wrapper, 'Zoom arrière').trigger('click')
    expect(level(wrapper)).toBe('40 %')
    expect(zoomButton(wrapper, 'Zoom arrière').attributes('disabled')).toBeDefined()
  })

  it('Ctrl + molette zoome toujours ; la molette seule ne zoome pas', async () => {
    const { wrapper } = mountBoard()
    const wheel = (init) => wrapper.element.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, ...init }))
    wheel({ deltaY: -100 })
    await flushPromises()
    expect(level(wrapper)).toBe('100 %')
    wheel({ deltaY: -100, ctrlKey: true })
    await flushPromises()
    expect(level(wrapper)).toBe('110 %')
    wheel({ deltaY: 100, ctrlKey: true })
    await flushPromises()
    expect(level(wrapper)).toBe('100 %')
  })

  it('un clic sur les commandes ne déclenche pas le déplacement du fond', async () => {
    const { wrapper, store } = mountBoard()
    await wrapper.find('.mindmap-board__zoom').trigger('pointerdown', { button: 0 })
    await wrapper.find('svg').trigger('pointerup')
    expect(store.resetSelection).not.toHaveBeenCalled()
  })
})

describe('zones — redimensionnement', () => {
  const ZONE = { id: 'z1', name: 'Cours', color: '#ff0000', layout: { x: 0, y: 0, width: 200, height: 100 }, collapsed: false }

  it('la zone expose une poignée qui émet « zone-resize-start » sans déclencher le déplacement', async () => {
    const wrapper = mount(MindMapZone, { props: { zone: ZONE } })
    await wrapper.find('[data-testid="zone-resize-handle"]').trigger('pointerdown')
    expect(wrapper.emitted('zone-resize-start')).toHaveLength(1)
    expect(wrapper.emitted('zone-resize-start')[0][0].zone.id).toBe('z1')
    expect(wrapper.emitted('zone-pointerdown')).toBeUndefined()
  })

  it('la poignée est dans l’angle bas-droite de la zone', () => {
    const wrapper = mount(MindMapZone, { props: { zone: ZONE } })
    const handle = wrapper.find('[data-testid="zone-resize-handle"]')
    expect(Number(handle.attributes('x'))).toBeCloseTo(100 - 14)
    expect(Number(handle.attributes('y'))).toBeCloseTo(50 - 14)
  })

  it('glisser la poignée : l’angle haut-gauche reste fixe, la taille suit le pointeur', async () => {
    const { wrapper, store } = mountBoard([ZONE])
    await wrapper.find('[data-testid="zone-resize-handle"]').trigger('pointerdown', { pointerId: 1 })
    await wrapper.find('svg').trigger('pointermove', { clientX: 300, clientY: 200 })
    // haut-gauche (-100, -50) ; pointeur (300, 200) -> 400 x 250, centre (100, 75)
    expect(store.updateZone).toHaveBeenLastCalledWith('z1', { layout: { x: 100, y: 75, width: 400, height: 250 } })
  })

  it('taille minimale 120 × 80, même en tirant la poignée vers l’angle opposé', async () => {
    const { wrapper, store } = mountBoard([ZONE])
    await wrapper.find('[data-testid="zone-resize-handle"]').trigger('pointerdown', { pointerId: 1 })
    await wrapper.find('svg').trigger('pointermove', { clientX: -500, clientY: -500 })
    expect(store.updateZone).toHaveBeenLastCalledWith('z1', { layout: { x: -40, y: -10, width: 120, height: 80 } })
  })

  it('relâcher termine le redimensionnement : un déplacement ultérieur ne change plus la zone', async () => {
    const { wrapper, store } = mountBoard([ZONE])
    await wrapper.find('[data-testid="zone-resize-handle"]').trigger('pointerdown', { pointerId: 1 })
    await wrapper.find('svg').trigger('pointerup', { pointerId: 1 })
    store.updateZone.mockClear()
    await wrapper.find('svg').trigger('pointermove', { clientX: 300, clientY: 200 })
    expect(store.updateZone).not.toHaveBeenCalled()
  })

  it('glisser le corps de la zone la déplace toujours (sans la redimensionner)', async () => {
    const { wrapper, store } = mountBoard([ZONE])
    await wrapper.find('.mindmap-zone rect').trigger('pointerdown', { pointerId: 1, clientX: 0, clientY: 0 })
    await wrapper.find('svg').trigger('pointermove', { clientX: 50, clientY: 20 })
    expect(store.updateZone).toHaveBeenLastCalledWith('z1', { layout: { x: 50, y: 20 } })
  })
})

describe('palette — taille des zones au clavier', () => {
  const mountZones = (zones) => {
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      stubActions: true,
      initialState: { mindmapBuilder: { map: { id: 'm', subjectNodeId: 's', nodes: { s: node('s', 0, 0) }, links: [], zones }, selectedNodeIds: [] } },
    })
    return { wrapper: mount(PaletteZones, { global: { plugins: [pinia] } }), store: useMindMapBuilderStore(pinia) }
  }
  const ZONES = [{ id: 'z1', name: 'Cours', color: '#f00', layout: { x: 0, y: 0, width: 300, height: 200 } }, { id: 'z2', name: 'TP', color: '#0f0' }]

  it('sans zone : pas de section de taille', () => {
    expect(mountZones([]).wrapper.find('[aria-label="Taille des zones"]').exists()).toBe(false)
  })

  it('un couple largeur / hauteur nommé par zone, avec les tailles actuelles (360 × 240 par défaut)', () => {
    const { wrapper } = mountZones(ZONES)
    expect(wrapper.find('input[aria-label="Largeur de la zone Cours"]').element.value).toBe('300')
    expect(wrapper.find('input[aria-label="Hauteur de la zone Cours"]').element.value).toBe('200')
    expect(wrapper.find('input[aria-label="Largeur de la zone TP"]').element.value).toBe('360')
    expect(wrapper.find('input[aria-label="Hauteur de la zone TP"]').element.value).toBe('240')
  })

  it.each([['500', 500], ['40', 120], ['99999', 2000]])('largeur saisie « %s » : enregistrée bornée à %i', async (saisie, attendu) => {
    const { wrapper, store } = mountZones(ZONES)
    const input = wrapper.find('input[aria-label="Largeur de la zone Cours"]')
    input.element.value = saisie
    await input.trigger('change')
    expect(store.updateZone).toHaveBeenCalledWith('z1', { layout: { width: attendu } })
  })

  it('hauteur : minimum 80 ; une saisie invalide garde la valeur actuelle', async () => {
    const { wrapper, store } = mountZones(ZONES)
    const input = wrapper.find('input[aria-label="Hauteur de la zone Cours"]')
    input.element.value = '10'
    await input.trigger('change')
    expect(store.updateZone).toHaveBeenLastCalledWith('z1', { layout: { height: 80 } })
    input.element.value = 'abc'
    await input.trigger('change')
    expect(store.updateZone).toHaveBeenLastCalledWith('z1', { layout: { height: 200 } })
  })
})

describe('interpréteur — verdict d’homogénéité', () => {
  const mountInterpreter = async (value) => {
    const wrapper = mount(Interpreter, { props: { modelValue: value } })
    await flushPromises()
    return wrapper
  }

  it('formule homogène : confirmation visible et annoncée', async () => {
    const w = await mountInterpreter('P[Pa] = F[N] / S[m^2]')
    const ok = w.find('.interpreter__units-ok')
    expect(ok.text()).toContain('Formule homogène en unités.')
    expect(ok.attributes('role')).toBe('status')
    expect(w.find('.interpreter__units-error').exists()).toBe(false)
  })

  it('formule non homogène : erreur annoncée, pas de confirmation', async () => {
    const w = await mountInterpreter('P[Pa] = F[N] * S[m^2]')
    expect(w.find('.interpreter__units-error').text()).toContain('Erreur d’homogénéité')
    expect(w.find('.interpreter__units-error').attributes('role')).toBe('alert')
    expect(w.find('.interpreter__units-ok').exists()).toBe(false)
  })

  it('variables sans unité : « non vérifiable », ni erreur ni confirmation', async () => {
    const w = await mountInterpreter('E = m c^2')
    expect(w.find('.interpreter__units-unknown').text()).toContain('Homogénéité non vérifiable')
    expect(w.find('.interpreter__units-ok').exists()).toBe(false)
    expect(w.find('.interpreter__units-error').exists()).toBe(false)
  })

  it('formule vide : aucun verdict', async () => {
    const w = await mountInterpreter('')
    for (const cls of ['units-ok', 'units-error', 'units-unknown']) expect(w.find(`.interpreter__${cls}`).exists()).toBe(false)
  })

  it('le verdict suit la saisie', async () => {
    const w = await mountInterpreter('P[Pa] = F[N] / S[m^2]')
    await w.setProps({ modelValue: 'P[Pa] = F[N] * S[m^2]' })
    expect(w.find('.interpreter__units-error').exists()).toBe(true)
    expect(w.find('.interpreter__units-ok').exists()).toBe(false)
  })
})

describe('boîte de Leitner — intervalle', () => {
  it('l’équivalent lisible de la durée saisie en secondes s’affiche sous le champ', async () => {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true })
    const wrapper = mount(FlashcardBoxModalComponent, { props: { systemId: 1, boxes: [], reload: vi.fn() }, global: { plugins: [pinia] }, attachTo: document.body })
    wrapper.vm.openAdd()
    await flushPromises()
    const input = document.body.querySelector('input[aria-label="Intervalle en secondes"]')
    expect(document.body.textContent).not.toContain('Soit ')
    for (const [seconds, text] of [['86400', 'Soit 1 j'], ['90', 'Soit 1 min 30 s'], ['10', 'Soit 10 s']]) {
      input.value = seconds
      input.dispatchEvent(new Event('input'))
      await flushPromises()
      expect(document.body.textContent).toContain(text)
    }
    input.value = ''
    input.dispatchEvent(new Event('input'))
    await flushPromises()
    expect(document.body.textContent).not.toContain('Soit ')
    wrapper.unmount()
  })
})

import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import GridComponent from '@/components/GridComponent.vue'
import NoItemComponent from '@/components/NoItemComponent.vue'

const mountGrid = (props = {}) =>
  mount(GridComponent, {
    props,
    slots: { item: '<template #item="{ item }"><b class="cell">{{ item.label }}</b></template>' },
  })

describe('NoItemComponent', () => {
  it('message par défaut en français', () => {
    const wrapper = mount(NoItemComponent)
    expect(wrapper.text()).toBe('Aucun élément trouvé.')
    expect(wrapper.text()).not.toContain('No item found')
  })

  it('message personnalisé', () => {
    expect(mount(NoItemComponent, { props: { message: 'Rien ici.' } }).text()).toBe('Rien ici.')
  })

  it('RGAA 9.1 : un paragraphe, pas un titre de niveau 1 (la page a déjà le sien)', () => {
    const wrapper = mount(NoItemComponent)
    expect(wrapper.find('h1').exists()).toBe(false)
    expect(wrapper.find('p').exists()).toBe(true)
  })
})

describe('GridComponent', () => {
  afterEach(() => vi.restoreAllMocks())

  it('affiche une cellule par élément, via le slot « item »', () => {
    const wrapper = mountGrid({ items: [{ label: 'A' }, { label: 'B' }, { label: 'C' }] })
    expect(wrapper.findAll('.cell').map((c) => c.text())).toEqual(['A', 'B', 'C'])
  })

  it.each([[undefined], [null], [[]]])('liste vide (%j) : message « aucun élément » par défaut', (items) => {
    const wrapper = mountGrid({ items })
    expect(wrapper.find('.grid').exists()).toBe(false)
    expect(wrapper.text()).toContain('Aucun élément trouvé.')
  })

  it('liste vide avec message personnalisé', () => {
    const wrapper = mountGrid({ items: [], emptyMessage: 'Aucun tutoriel.' })
    expect(wrapper.text()).toContain('Aucun tutoriel.')
  })

  it('enableNoItem=false : rien n’est affiché pour une liste vide', () => {
    const wrapper = mountGrid({ items: [], enableNoItem: false })
    expect(wrapper.text()).toBe('')
    expect(wrapper.find('.grid').exists()).toBe(false)
  })

  it('sans hauteur maximale : pas de défilement', () => {
    const wrapper = mountGrid({ items: [{ label: 'A' }] })
    expect(wrapper.find('.grid').classes()).not.toContain('overflow-y-scroll')
    expect(wrapper.find('.grid').attributes('style')).toContain('max-height: auto')
  })

  it('avec une hauteur maximale : défilement vertical et hauteur plafonnée', () => {
    const wrapper = mountGrid({ items: [{ label: 'A' }], maxHeight: 300 })
    expect(wrapper.find('.grid').classes()).toContain('overflow-y-scroll')
    expect(wrapper.find('.grid').attributes('style')).toContain('max-height: 300px')
  })

  it('cellules « cliquables » : effet de survol sur poste fixe', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
    const wrapper = mountGrid({ items: [{ label: 'A' }] })
    expect(wrapper.find('.grid > div').classes()).toContain('hover:scale-105')
  })

  it('pas d’effet de survol sur mobile', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')
    const wrapper = mountGrid({ items: [{ label: 'A' }] })
    expect(wrapper.find('.grid > div').classes()).not.toContain('hover:scale-105')
  })

  it('clickables=false : pas d’effet de survol', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Windows NT 10.0)')
    const wrapper = mountGrid({ items: [{ label: 'A' }], clickables: false })
    expect(wrapper.find('.grid > div').classes()).not.toContain('hover:scale-105')
  })
})

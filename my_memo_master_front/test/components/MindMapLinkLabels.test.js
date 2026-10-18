import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import MindMapLink from '@/components/mindmap/MindMapLink.vue'
import MindMapBoard from '@/components/mindmap/MindMapBoard.vue'
import MindMapNode from '@/components/mindmap/MindMapNode.vue'

vi.mock('@/helpers/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }))
vi.mock('@/config', () => ({ VITE_API_URL: 'http://localhost:3000' }))
vi.mock('@/components/interpreter/interpreter.js', () => ({
  renderMathMultiline: vi.fn((v) => String(v)),
  toLatex: vi.fn((v) => String(v ?? '')),
}))

const style = { primaryColor: '#1E3A8A', secondaryColor: '#C0C5D2', shape: 'bubble', width: 220, height: 120, textColor: '#eef2ff', fontSize: 13, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none' }
const node = (id, x, y, o = {}) => ({ id, label: id, type: 'text', content: '', style: { ...style }, layout: { x, y }, collapsed: false, meta: {}, ...o })

beforeEach(() => vi.clearAllMocks())

describe('MindMapLink — étiquette', () => {
  const mountLink = (props = {}) => mount(MindMapLink, {
    props: { link: { id: 'l1', from: 'a', to: 'b', type: 'appartenance', style: { shape: 'straight' } }, source: node('a', 0, 0), target: node('b', 400, 0), typeLabel: 'Appartenance', ...props },
  })
  const translate = (w) => w.find('[data-testid="link-label"]').attributes('transform')

  it('un clic sur l’étiquette sélectionne la branche, comme un clic sur le trait', async () => {
    const w = mountLink()
    await w.find('[data-testid="link-label"]').trigger('pointerdown')
    expect(w.emitted('link-pointerdown')).toHaveLength(1)
    expect(w.emitted('link-pointerdown')[0][0].link.id).toBe('l1')
    await w.find('.mindmap-link__hit').trigger('pointerdown')
    expect(w.emitted('link-pointerdown')).toHaveLength(2)
  })

  it('au-dessus du milieu de la branche, décalée de labelOffset', () => {
    const base = mountLink()
    const shifted = mountLink({ labelOffset: -26 })
    const y = (w) => Number(translate(w).match(/translate\(([-\d.]+), ([-\d.]+)\)/)[2])
    expect(y(shifted)).toBe(y(base) - 26)
  })

  it('la pastille est assez large pour le texte (« 2. Appartenance » n’est plus coupé)', () => {
    const w = mountLink({ readingRank: 2 })
    expect(w.find('[data-testid="link-label"] text').text()).toBe('2. Appartenance')
    expect(Number(w.find('[data-testid="link-label"] rect').attributes('width'))).toBeGreaterThanOrEqual(130)
  })

  it('sans type : aucune étiquette', () => {
    const w = mountLink({ typeLabel: '', link: { id: 'l1', from: 'a', to: 'b', type: '', style: { shape: 'straight' } } })
    expect(w.find('[data-testid="link-label"]').exists()).toBe(false)
  })
})

describe('MindMapBoard — étiquettes de branches voisines', () => {
  it('deux branches de même milieu ne superposent plus leurs étiquettes', () => {
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      stubActions: true,
      initialState: {
        mindmapBuilder: {
          map: {
            id: 'm', title: 'T', subjectNodeId: 's',
            nodes: { s: node('s', 0, 0), a: node('a', 400, 0), b: node('b', 400, 0) },
            links: [
              { id: 'l1', from: 's', to: 'a', type: 'appartenance', order: 0, style: { shape: 'straight' } },
              { id: 'l2', from: 's', to: 'b', type: 'calcul', order: 1, style: { shape: 'straight' } },
            ],
            zones: [],
          },
          selectedNodeIds: [],
        },
      },
    })
    const w = mount(MindMapBoard, { global: { plugins: [pinia] } })
    const ys = w.findAll('[data-testid="link-label"]').map((g) => Number(g.attributes('transform').match(/translate\(([-\d.]+), ([-\d.]+)\)/)[2]))
    expect(ys).toHaveLength(2)
    expect(Math.abs(ys[0] - ys[1])).toBeGreaterThanOrEqual(22)
  })
})

describe('titre d’un item — style du nœud', () => {
  const mountNode = (styleOverrides = {}) => mount(MindMapNode, {
    props: { node: node('n1', 0, 0, { label: 'Titre', style: { ...style, ...styleOverrides } }) },
    global: { plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: true })] },
  })
  const titleStyle = (w) => w.find('.mindmap-node__title').attributes('style')

  it('couleur, italique, souligné et taille (+ 2 px) du nœud s’appliquent au titre', () => {
    const css = titleStyle(mountNode({ textColor: '#ff0000', fontStyle: 'italic', textDecoration: 'underline', fontSize: 20 }))
    expect(css).toContain('color: rgb(255, 0, 0)')
    expect(css).toContain('font-style: italic')
    expect(css).toContain('text-decoration: underline')
    expect(css).toContain('font-size: 22px')
  })

  it('texte à 13 px (valeur par défaut) : le titre garde ses 15 px d’avant', () => {
    expect(titleStyle(mountNode({ fontSize: 13 }))).toContain('font-size: 15px')
    expect(titleStyle(mountNode({ fontSize: undefined }))).toContain('font-size: 15px')
    expect(titleStyle(mountNode({ fontSize: 'abc' }))).toContain('font-size: 15px')
  })

  it('le gras du texte ne touche pas au titre, qui reste en gras par la feuille de style', () => {
    expect(titleStyle(mountNode({ fontWeight: 'bold' }))).not.toContain('font-weight')
    expect(titleStyle(mountNode({ fontWeight: 'normal' }))).not.toContain('font-weight')
  })

  it('sans couleur de texte : pas de couleur imposée (celle de la feuille de style)', () => {
    expect(titleStyle(mountNode({ textColor: undefined }))).not.toContain('color:')
  })
})

import { describe, it, expect } from 'vitest'
import { buildNewNode, ensureGraphNodeSize, GRAPH_NODE_SIZE } from '@/helpers/mindmap/mindmapNodeFactory'
import { mindmapColors } from '@/helpers/themeColors'

const subject = { id: 's', layout: { x: 100, y: 50 }, style: { width: 220, height: 120 } }
const makeMap = (extraNodes = {}, links = []) => ({ subjectNodeId: 's', nodes: { s: subject, ...extraNodes }, links })
const build = (map, o = {}) => buildNewNode(map, { label: 'Item', type: 'text', kinds: [], content: undefined, parentId: null, position: null, ...o })

describe('buildNewNode', () => {
  it('sans parent précisé, rattache l’item au sujet et le place à 110 + 160 de son centre', () => {
    const { node, resolvedParentId, parent } = build(makeMap())
    expect(resolvedParentId).toBe('s')
    expect(parent).toBe(subject)
    expect(node.meta).toEqual({ isSubject: false, parentId: 's' })
    expect(node.layout.radius).toBe(270)
    expect(node.layout.angle).toBe(0)
    expect(node.layout.x).toBeCloseTo(370)
    expect(node.layout.y).toBeCloseTo(50)
  })

  it('l’angle suit la suite d’or : chaque enfant déjà relié écarte l’item suivant', () => {
    const map = makeMap({}, [{ from: 's', to: 'a' }, { from: 's', to: 'b' }])
    const { node } = build(map)
    expect(node.layout.radius).toBe(270 + 2 * 40)
    expect(node.layout.angle).toBeCloseTo(2 * Math.PI * (3 - Math.sqrt(5)))
  })

  it('parent inconnu : retombe sur le sujet', () => {
    const { resolvedParentId } = build(makeMap(), { parentId: 'nope' })
    expect(resolvedParentId).toBe('s')
  })

  it('carte sans sujet : pas de parent, placement autour de l’origine', () => {
    const { node, resolvedParentId, parent } = build({ subjectNodeId: null, nodes: {}, links: [] })
    expect(resolvedParentId).toBeNull()
    expect(parent).toBeNull()
    expect(node.meta.parentId).toBeNull()
    expect(node.layout.radius).toBe(260)
  })

  it('hérite du style du parent, avec des valeurs par défaut sinon', () => {
    const parent = { id: 'p', layout: { x: 0, y: 0 }, style: { primaryColor: '#010203', textColor: '#040506', fontSize: '18px', fontWeight: 'bold', fontStyle: 'italic', textDecoration: 'underline' } }
    expect(build(makeMap({ p: parent }), { parentId: 'p' }).node.style).toMatchObject({
      primaryColor: '#010203', textColor: '#040506', fontSize: 18, fontWeight: 'bold', fontStyle: 'italic', textDecoration: 'underline', shape: 'bubble', width: 220, height: 120,
    })
    expect(build({ subjectNodeId: null, nodes: {}, links: [] }).node.style).toMatchObject({
      primaryColor: mindmapColors.nodeBg, textColor: mindmapColors.nodeText, fontSize: 14, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none',
    })
  })

  it('le contenu vaut le titre quand il n’est pas fourni, y compris « vide » s’il l’est', () => {
    expect(build(makeMap(), { label: 'Titre' }).node.content).toBe('Titre')
    expect(build(makeMap(), { label: 'Titre', content: '' }).node.content).toBe('')
  })

  it('une position fournie remplace le placement et recalcule rayon et angle par rapport au parent', () => {
    const { node } = build(makeMap(), { position: { x: 100, y: 150 } })
    expect(node.layout).toMatchObject({ x: 100, y: 150, radius: 100, angle: Math.PI / 2 })
  })

  it('position invalide ignorée ; sans parent, seuls x et y changent', () => {
    expect(build(makeMap(), { position: { x: 'a', y: 1 } }).node.layout.radius).toBe(270)
    const free = build({ subjectNodeId: null, nodes: {}, links: [] }, { position: { x: 5, y: 6 } }).node.layout
    expect(free).toMatchObject({ x: 5, y: 6, radius: 260 })
  })

  it('grandeur : objet quantity ; rôle grandeur ajouté : idem ; texte simple : aucun', () => {
    expect(build(makeMap(), { type: 'quantity' }).node.quantity).toEqual({ symbol: '', value: null, unit: '' })
    expect(build(makeMap(), { type: 'formula', kinds: ['quantity'] }).node.quantity).toBeDefined()
    expect(build(makeMap()).node.quantity).toBeUndefined()
  })

  it('graphique : état du repère et taille minimale', () => {
    const { node } = build(makeMap(), { type: 'graph' })
    expect(node.graph).toBeDefined()
    expect(node.style).toMatchObject(GRAPH_NODE_SIZE)
  })

  it('ne modifie pas la carte', () => {
    const map = makeMap()
    const before = JSON.stringify(map)
    build(map)
    expect(JSON.stringify(map)).toBe(before)
  })
})

describe('ensureGraphNodeSize', () => {
  it('agrandit un nœud trop petit', () => {
    const node = { style: { width: 100, height: 100 } }
    ensureGraphNodeSize(node)
    expect(node.style).toMatchObject(GRAPH_NODE_SIZE)
  })

  it('ne rétrécit pas un nœud déjà plus grand et garde les autres propriétés', () => {
    const node = { style: { width: 500, height: 100, shape: 'rect' } }
    ensureGraphNodeSize(node)
    expect(node.style).toEqual({ width: 500, height: GRAPH_NODE_SIZE.height, shape: 'rect' })
  })

  it('nœud sans style : prend la taille minimale', () => {
    const node = {}
    ensureGraphNodeSize(node)
    expect(node.style).toEqual(GRAPH_NODE_SIZE)
  })
})

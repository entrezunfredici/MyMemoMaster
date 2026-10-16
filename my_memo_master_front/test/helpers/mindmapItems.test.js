import { describe, it, expect } from 'vitest'
import {
  getNodeKinds,
  hasKind,
  isMathNode,
  hasFormulaContent,
  normalizeNodeItem,
  formatQuantity,
  createQuantity,
} from '@/helpers/mindmap/mindmapItems'

describe('mindmapItems', () => {
  it('getNodeKinds — rôle principal en tête, sans doublon', () => {
    expect(getNodeKinds({ type: 'formula', kinds: ['quantity', 'formula'] })).toEqual(['formula', 'quantity'])
  })

  it('getNodeKinds — retombe sur text sans type', () => {
    expect(getNodeKinds({})).toEqual(['text'])
    expect(getNodeKinds(null)).toEqual(['text'])
  })

  it('hasKind / isMathNode', () => {
    expect(hasKind({ type: 'text', kinds: ['quantity'] }, 'quantity')).toBe(true)
    expect(isMathNode({ type: 'function' })).toBe(true)
    expect(isMathNode({ type: 'text', kinds: ['formula'] })).toBe(false)
  })

  it('normalizeNodeItem — filtre les rôles inconnus et ajoute quantity si besoin', () => {
    const node = normalizeNodeItem({ id: 'a', type: 'formula', kinds: ['quantity', 'zzz', 'formula'] })
    expect(node.kinds).toEqual(['quantity'])
    expect(node.quantity).toEqual({ symbol: '', value: null, unit: '' })
  })

  it('normalizeNodeItem — item sans rôle supplémentaire inchangé hors kinds', () => {
    const node = normalizeNodeItem({ id: 'a', label: 'x' })
    expect(node).toMatchObject({ type: 'text', kinds: [] })
    expect(node.quantity).toBeUndefined()
  })

  it('createQuantity — valeur non numérique devient null, 0 est conservé', () => {
    expect(createQuantity({ value: 'x' }).value).toBeNull()
    expect(createQuantity({ value: 0 }).value).toBe(0)
  })

  it('formatQuantity', () => {
    expect(formatQuantity({ symbol: 'v', value: 12, unit: 'm/s' })).toBe('v = 12 m/s')
    expect(formatQuantity({ symbol: 'v' })).toBe('v')
    expect(formatQuantity({ value: 3, unit: 'kg' })).toBe('3 kg')
    expect(formatQuantity(null)).toBe('')
  })
})

describe('mindmapItems — graphique', () => {
  it('normalizeNodeItem — un item graph reçoit un état de graphique par défaut', () => {
    const node = normalizeNodeItem({ id: 'g', type: 'graph', content: 'y=x' })
    expect(node.graph).toMatchObject({ xMin: -10, xMax: 10, yMin: -6, yMax: 6, mode: 'plot', params: {} })
  })

  it('normalizeNodeItem — le graphique n’est jamais un rôle supplémentaire', () => {
    expect(normalizeNodeItem({ id: 'a', type: 'text', kinds: ['graph', 'quantity'] }).kinds).toEqual(['quantity'])
  })
})

describe('mindmapItems — hasFormulaContent', () => {
  it('formule/fonction en rôle principal, ou texte/grandeur avec ce rôle ajouté', () => {
    expect(hasFormulaContent({ type: 'formula' })).toBe(true)
    expect(hasFormulaContent({ type: 'text', kinds: ['function'] })).toBe(true)
    expect(hasFormulaContent({ type: 'quantity', kinds: ['formula'] })).toBe(true)
  })

  it('faux pour un texte simple, une image ou un graphique', () => {
    expect(hasFormulaContent({ type: 'text', kinds: ['quantity'] })).toBe(false)
    expect(hasFormulaContent({ type: 'image', kinds: ['formula'] })).toBe(false)
    expect(hasFormulaContent({ type: 'graph' })).toBe(false)
  })
})

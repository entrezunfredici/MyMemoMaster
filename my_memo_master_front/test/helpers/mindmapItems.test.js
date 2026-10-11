import { describe, it, expect } from 'vitest'
import {
  getNodeKinds,
  hasKind,
  isMathNode,
  normalizeNodeItem,
  formatQuantity,
  createQuantity,
} from '@/helpers/mindmapItems'

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

import { describe, it, expect } from 'vitest'
import {
  normalizeLink,
  createBranchType,
  getBranchTypeLabel,
  getOutgoingLinks,
  computeLinkGeometry,
} from '@/helpers/mindmap/mindmapLinks'

const node = (x, y, w = 200, h = 100) => ({ layout: { x, y }, style: { width: w, height: h } })

describe('mindmapLinks', () => {
  it('normalizeLink — valeurs par défaut', () => {
    const link = normalizeLink({ id: 'l', from: 'a', to: 'b' })
    expect(link).toMatchObject({ type: 'appartenance', direction: 'forward', order: 0 })
    expect(link.style).toMatchObject({ shape: 'curve', bezier: true })
    expect(link.interactions).toEqual({ transfersValue: false, togglesVisibility: false })
  })

  it('normalizeLink — ancien bezier:false devient droite, sens inconnu devient forward', () => {
    const link = normalizeLink({ id: 'l', direction: 'zzz', style: { bezier: false } })
    expect(link.style.shape).toBe('straight')
    expect(link.direction).toBe('forward')
  })

  it('createBranchType — slug sans accent, null si vide ou doublon', () => {
    const types = [{ id: 'causalite', label: 'Causalité' }]
    expect(createBranchType(types, '  Équivalence ')).toEqual({ id: 'equivalence', label: 'Équivalence', custom: true })
    expect(createBranchType(types, 'causalité')).toBeNull()
    expect(createBranchType(types, '   ')).toBeNull()
    expect(createBranchType(types, '!!!')).toBeNull()
  })

  it('getBranchTypeLabel — retombe sur l\'id', () => {
    expect(getBranchTypeLabel([{ id: 'x', label: 'Ex' }], 'x')).toBe('Ex')
    expect(getBranchTypeLabel([], 'inconnu')).toBe('inconnu')
  })

  it('getOutgoingLinks — trié par order, stable', () => {
    const links = [
      { id: '1', from: 'a', order: 1 },
      { id: '2', from: 'b', order: 0 },
      { id: '3', from: 'a', order: 0 },
      { id: '4', from: 'a', order: 1 },
    ]
    expect(getOutgoingLinks(links, 'a').map((l) => l.id)).toEqual(['3', '1', '4'])
  })

  it('computeLinkGeometry — extrémités ramenées au bord des items', () => {
    const { d, mid } = computeLinkGeometry('straight', node(0, 0), node(400, 0))
    expect(d).toBe('M 100 0 L 300 0')
    expect(mid).toEqual({ x: 200, y: 0 })
  })

  it('computeLinkGeometry — courbe : milieu entre les deux bords', () => {
    const { d, mid } = computeLinkGeometry('curve', node(0, 0), node(400, 0))
    expect(d.startsWith('M 100 0 C')).toBe(true)
    expect(mid.x).toBeCloseTo(200)
    expect(mid.y).toBeCloseTo(0)
  })

  it('computeLinkGeometry — coudée : chemin orthogonal', () => {
    const { d } = computeLinkGeometry('elbow', node(0, 0), node(400, 200))
    expect(d).toBe('M 100 0 H 200 V 200 H 300')
  })

  it('computeLinkGeometry — items superposés : pas de NaN', () => {
    const { d } = computeLinkGeometry('curve', node(0, 0), node(0, 0))
    expect(d).not.toContain('NaN')
  })
})

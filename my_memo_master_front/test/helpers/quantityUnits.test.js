import { describe, it, expect } from 'vitest'
import { parseUnit, formatDim, addDim, scaleDim } from '@/helpers/mindmap/quantityUnits'

describe('quantityUnits', () => {
  it('parse les unités de base, avec préfixe et casse tolérée', () => {
    expect(parseUnit('kg')).toEqual({ dim: [0, 1, 0, 0, 0, 0, 0], factor: 1 })
    expect(parseUnit('Kg').dim).toEqual([0, 1, 0, 0, 0, 0, 0])
    expect(parseUnit('g').factor).toBeCloseTo(1e-3)
    expect(parseUnit('km').factor).toBe(1000)
  })

  it('parse les unités composées', () => {
    expect(parseUnit('m/s').dim).toEqual([1, 0, -1, 0, 0, 0, 0])
    expect(parseUnit('m/s²').dim).toEqual([1, 0, -2, 0, 0, 0, 0])
    expect(parseUnit('kg·m2.s-2').dim).toEqual(parseUnit('J').dim)
    expect(parseUnit('km/h').factor).toBeCloseTo(1000 / 3600)
  })

  it('retourne null pour une unité inconnue et une dimension nulle pour une unité vide', () => {
    expect(parseUnit('zorglub')).toBeNull()
    expect(parseUnit('').dim).toEqual([0, 0, 0, 0, 0, 0, 0])
  })

  it('formatDim donne le nom propre quand il existe, sinon une écriture composée', () => {
    expect(formatDim(parseUnit('kg·m²/s²').dim)).toBe('J')
    expect(formatDim(parseUnit('kg·m/s²').dim)).toBe('N')
    expect(formatDim(parseUnit('m/s').dim)).toBe('m/s')
    expect(formatDim(parseUnit('kg·m').dim)).toBe('kg·m')
    expect(formatDim(parseUnit('m/m').dim)).toBe('')
  })

  it('addDim / scaleDim', () => {
    expect(addDim([1, 0], [0, 2])).toEqual([1, 2])
    expect(scaleDim([1, 2], 2)).toEqual([2, 4])
  })
})

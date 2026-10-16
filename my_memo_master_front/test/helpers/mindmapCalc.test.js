import { describe, it, expect } from 'vitest'
import { computeFormula, computeAllFormulas, missingVariables, formatCalculation } from '@/helpers/mindmapCalc'

const quantityNode = (id, symbol, value, unit) => ({
  id, label: id, type: 'quantity', kinds: [], quantity: { symbol, value, unit },
})
const formulaNode = (id, content, extra = {}) => ({ id, label: id, type: 'formula', kinds: [], content, ...extra })
const link = (from, to) => ({ id: `${from}-${to}`, from, to })

const energyMap = (content = String.raw`E = \frac{1}{2}MV^2`) => ({
  nodes: {
    f: formulaNode('f', content),
    m: quantityNode('m', 'M', 2, 'Kg'),
    v: quantityNode('v', 'V', 5, 'm/s'),
  },
  links: [link('f', 'm'), link('f', 'v')],
})

describe('mindmapCalc — calcul des formules', () => {
  it('calcule l’énergie cinétique avec son unité (kg × (m/s)² = J)', () => {
    const result = computeFormula(energyMap(), 'f')
    expect(result).toMatchObject({ ok: true, symbol: 'E', value: 25, unit: 'J' })
    expect(formatCalculation(result)).toBe('E = 25 J')
  })

  it('accepte la saisie en raccourcis (1/2 * M * V^2) et la multiplication implicite', () => {
    expect(computeFormula(energyMap('E = 1/2 * M * V^2'), 'f').value).toBe(25)
    expect(computeFormula(energyMap('E = 1/2 M V^2'), 'f').value).toBe(25)
  })

  it('accepte les raccourcis MathLive sans accolades (\\frac12, \\sqrt2)', () => {
    expect(computeFormula(energyMap(String.raw`E=\frac12MV^2`), 'f')).toMatchObject({ ok: true, value: 25, unit: 'J' })
    expect(computeFormula(energyMap(String.raw`E=\frac{1}2MV^2`), 'f').value).toBe(25)
    expect(computeFormula(energyMap(String.raw`E=\sqrt4MV`), 'f').value).toBe(20)
  })

  it('fonctionne quand la branche part de la grandeur vers la formule', () => {
    const map = energyMap()
    map.links = [link('m', 'f'), link('v', 'f')]
    expect(computeFormula(map, 'f').value).toBe(25)
  })

  it('convertit les unités vers le SI (g, km/h)', () => {
    const map = energyMap()
    map.nodes.m.quantity = { symbol: 'M', value: 2000, unit: 'g' }
    map.nodes.v.quantity = { symbol: 'V', value: 18, unit: 'km/h' }
    expect(computeFormula(map, 'f')).toMatchObject({ value: 25, unit: 'J' })
  })

  it('déduit une unité composée quand il n’y a pas de nom propre', () => {
    const map = {
      nodes: {
        f: formulaNode('f', 'p = m v'),
        m: quantityNode('m', 'm', 3, 'kg'),
        v: quantityNode('v', 'v', 4, 'm/s'),
      },
      links: [link('f', 'm'), link('f', 'v')],
    }
    expect(computeFormula(map, 'f')).toMatchObject({ ok: true, value: 12, unit: 'kg·m/s' })
  })

  it('reconnaît les symboles à plusieurs lettres et indices (E_c, rho)', () => {
    const map = {
      nodes: {
        f: formulaNode('f', String.raw`P = \rho g h`),
        r: quantityNode('r', 'ρ', 1000, 'kg/m3'),
        g: quantityNode('g', 'g', 10, 'm/s²'),
        h: quantityNode('h', 'h', 2, 'm'),
      },
      links: [link('f', 'r'), link('f', 'g'), link('f', 'h')],
    }
    expect(computeFormula(map, 'f')).toMatchObject({ value: 20000, unit: 'Pa' })
  })

  it('chaîne les formules : le résultat d’une formule alimente une autre', () => {
    const map = {
      nodes: {
        f1: formulaNode('f1', 'v = d / t'),
        d: quantityNode('d', 'd', 100, 'm'),
        t: quantityNode('t', 't', 10, 's'),
        f2: formulaNode('f2', 'p = m v'),
        m: quantityNode('m', 'm', 2, 'kg'),
      },
      links: [link('f1', 'd'), link('f1', 't'), link('f2', 'f1'), link('f2', 'm')],
    }
    expect(computeFormula(map, 'f2')).toMatchObject({ value: 20, unit: 'kg·m/s' })
  })

  it('signale une variable non reliée, une valeur manquante et une unité inconnue', () => {
    const map = energyMap()
    map.links = [link('f', 'm')]
    expect(computeFormula(map, 'f')).toEqual({ ok: false, error: 'Variable « V » non reliée à une grandeur' })

    const empty = energyMap()
    empty.nodes.v.quantity.value = null
    expect(computeFormula(empty, 'f').error).toBe('Valeur de « V » à renseigner')

    const badUnit = energyMap()
    badUnit.nodes.v.quantity.unit = 'zorglub'
    expect(computeFormula(badUnit, 'f').error).toContain('Unité inconnue')
  })

  it('refuse d’additionner des unités différentes et de diviser par zéro', () => {
    const add = energyMap('E = M + V')
    expect(computeFormula(add, 'f').error).toContain('unités différentes')
    const zero = energyMap('E = M / 0')
    expect(computeFormula(zero, 'f').error).toBe('Division par zéro')
  })

  it('ne boucle pas sur des formules qui se référencent', () => {
    const map = {
      nodes: { a: formulaNode('a', 'x = y'), b: formulaNode('b', 'y = x') },
      links: [link('a', 'b')],
    }
    expect(computeFormula(map, 'a').ok).toBe(false)
  })

  it('computeAllFormulas ignore les formules sans grandeur reliée', () => {
    const map = energyMap()
    map.nodes.alone = formulaNode('alone', 'a = b')
    const all = computeAllFormulas(map)
    expect(Object.keys(all)).toEqual(['f'])
  })
})

describe('mindmapCalc — grandeur qui reçoit le résultat d’une formule', () => {
  // V = D / T, avec D et T reliées à la formule, et une grandeur « v » reliée au résultat.
  const speedMap = (resultSymbol = 'v') => ({
    nodes: {
      f: formulaNode('f', 'V = D / T'),
      d: quantityNode('d', 'D', 70, 'm'),
      t: quantityNode('t', 'T', 14, 's'),
      v: quantityNode('v', resultSymbol, 15, 'm/s'),
    },
    links: [link('f', 'd'), link('f', 't'), link('v', 'f')],
  })

  it('la grandeur de même symbole (casse ignorée) prend la valeur calculée', () => {
    const all = computeAllFormulas(speedMap('v'))
    expect(all.f).toMatchObject({ ok: true, value: 5, unit: 'm/s' })
    expect(all.v).toBe(all.f)
  })

  it('une grandeur de symbole différent n’est pas touchée', () => {
    expect(computeAllFormulas(speedMap('w')).v).toBeUndefined()
  })

  it('une grandeur non reliée à la formule n’est pas touchée', () => {
    const map = speedMap('v')
    map.links = map.links.filter((l) => l.from !== 'v')
    expect(computeAllFormulas(map).v).toBeUndefined()
  })

  it('si la formule échoue, la valeur saisie reste utilisée', () => {
    const map = speedMap('v')
    map.nodes.t.quantity.value = null
    const all = computeAllFormulas(map)
    expect(all.f.ok).toBe(false)
    expect(all.v).toBeUndefined()
  })

  it('une autre formule utilise le résultat calculé, pas la valeur saisie (15)', () => {
    const map = speedMap('v')
    map.nodes.e = formulaNode('e', 'W = v * U')
    map.nodes.u = quantityNode('u', 'U', 2, 's')
    map.links.push(link('e', 'v'), link('e', 'u'))
    // v = 70 / 14 = 5 m/s (et non 15) → W = 5 × 2 = 10 m
    expect(computeFormula(map, 'e')).toMatchObject({ ok: true, value: 10, unit: 'm' })
  })

  it('une grandeur qui porte sa propre formule garde son calcul', () => {
    const map = speedMap('v')
    map.nodes.v.kinds = ['formula']
    map.nodes.v.content = 'v = D'
    map.links.push(link('v', 'd'))
    const all = computeAllFormulas(map)
    expect(all.v).toMatchObject({ ok: true, value: 70 })
    expect(all.v).not.toBe(all.f)
  })
})

describe('mindmapCalc — variables sans grandeur', () => {
  it('liste les variables de la formule qui n’ont pas de grandeur reliée', () => {
    const map = {
      nodes: { f: formulaNode('f', String.raw`E = \frac{1}{2}MV^2`), m: quantityNode('m', 'M', 2, 'kg') },
      links: [link('f', 'm')],
    }
    expect(missingVariables(map, 'f')).toEqual(['V'])
  })

  it('ne propose rien quand tout est relié, et ignore le membre de gauche', () => {
    expect(missingVariables(energyMap(), 'f')).toEqual([])
  })

  it('dédoublonne et reconnaît les symboles à indice', () => {
    const map = { nodes: { f: formulaNode('f', 'E_c = m v^2 + m v') }, links: [] }
    expect(missingVariables(map, 'f')).toEqual(['m', 'v'])
    const sub = { nodes: { f: formulaNode('f', 'P = E_c / t') }, links: [] }
    expect(missingVariables(sub, 'f')).toEqual(['Ec', 't'])
  })

  it('retourne une liste vide pour un item qui n’est pas une formule ou une formule vide', () => {
    const map = { nodes: { q: quantityNode('q', 'a', 1, 'm'), f: formulaNode('f', '') }, links: [] }
    expect(missingVariables(map, 'q')).toEqual([])
    expect(missingVariables(map, 'f')).toEqual([])
    expect(missingVariables(map, 'absent')).toEqual([])
  })
})

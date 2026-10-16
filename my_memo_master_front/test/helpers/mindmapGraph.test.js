import { describe, it, expect } from 'vitest'
import {
  parseGraphFormula,
  substituteParams,
  createGraph,
  zoomView,
  panView,
  niceTicks,
  buildPlotPath,
} from '@/helpers/mindmapGraph'

const evalAt = (latex, x, params) => parseGraphFormula(latex).fn(x, params)

describe('mindmapGraph — analyse de formule', () => {
  it('évalue y = x^2 avec ou sans préfixe', () => {
    expect(evalAt('y=x^{2}', 3)).toBe(9)
    expect(evalAt('x^{2}+1', 2)).toBe(5)
    expect(evalAt('f(x)=2x-1', 4)).toBe(7)
  })

  it('gère fractions, racines, valeur absolue et constantes', () => {
    expect(evalAt(String.raw`y=\frac{x}{2}`, 5)).toBe(2.5)
    expect(evalAt(String.raw`y=\sqrt{x}`, 9)).toBe(3)
    expect(evalAt(String.raw`y=\frac12x^2`, 4)).toBe(8) // raccourci MathLive sans accolades
    expect(evalAt(String.raw`y=\left|x\right|`, -4)).toBe(4)
    expect(evalAt(String.raw`y=2\pi`, 0)).toBeCloseTo(2 * Math.PI)
    expect(evalAt('y=e^{x}', 0)).toBe(1)
  })

  it('gère les fonctions usuelles, avec ou sans parenthèses', () => {
    expect(evalAt(String.raw`y=\sin(x)`, Math.PI / 2)).toBeCloseTo(1)
    expect(evalAt(String.raw`y=\sin x`, Math.PI / 2)).toBeCloseTo(1)
    expect(evalAt(String.raw`y=\ln(x)`, Math.E)).toBeCloseTo(1)
    expect(evalAt(String.raw`y=\sin^{2}(x)+\cos^{2}(x)`, 0.7)).toBeCloseTo(1)
  })

  it('détecte les paramètres et les applique (multiplication implicite)', () => {
    const parsed = parseGraphFormula('y=ax^{2}+b')
    expect(parsed.ok).toBe(true)
    expect(parsed.params).toEqual(['a', 'b'])
    expect(parsed.fn(2, { a: 3, b: -1 })).toBe(11)
    expect(parsed.fn(2, {})).toBe(5) // valeur par défaut 1
  })

  it('ne confond pas x, e et les fonctions avec des paramètres', () => {
    expect(parseGraphFormula(String.raw`y=e^{x}+\sin(x)`).params).toEqual([])
  })

  it('formule vide, mal formée ou non traçable : erreur sans exception', () => {
    expect(parseGraphFormula('').ok).toBe(false)
    expect(parseGraphFormula('').empty).toBe(true)
    expect(parseGraphFormula('y=(x+1').ok).toBe(false)
    expect(parseGraphFormula('x^{2}+y^{2}=1').error).toMatch(/y = f\(x\)/)
    expect(parseGraphFormula('y=x?').ok).toBe(false)
    expect(parseGraphFormula('y=').ok).toBe(false)
    expect(parseGraphFormula(String.raw`y=\foo(x)`).ok).toBe(false)
  })

  it('limite le nombre de paramètres', () => {
    expect(parseGraphFormula('y=a+b+c+d+f+g+h').ok).toBe(false)
  })
})

describe('mindmapGraph — formule avec les valeurs des paramètres', () => {
  it('remplace les paramètres, parenthèse les négatifs, garde x', () => {
    const parsed = parseGraphFormula('y=ax^{2}+b')
    expect(substituteParams(parsed, { a: 2, b: -1 })).toBe(String.raw`y=2x^{2}+\left(-1\right)`)
  })

  it('formule sans « = » : préfixe y=', () => {
    expect(substituteParams(parseGraphFormula('ax'), { a: 3 })).toBe('y=3x')
  })

  it('chaîne vide si la formule est invalide', () => {
    expect(substituteParams(parseGraphFormula('y=('), {})).toBe('')
  })
})

describe('mindmapGraph — état et vue', () => {
  it('createGraph — valeurs par défaut et nettoyage', () => {
    const g = createGraph()
    expect(g).toMatchObject({ xMin: -10, xMax: 10, yMin: -6, yMax: 6, mode: 'plot', params: {} })
    expect(createGraph({ mode: 'n’importe quoi', params: { a: 'x', b: '2' } })).toMatchObject({
      mode: 'plot',
      params: { a: 1, b: 2 },
    })
    expect(createGraph({ xMin: 5, xMax: 5 })).toMatchObject({ xMin: -10, xMax: 10 })
  })

  it('zoomView — centre conservé', () => {
    const v = zoomView({ xMin: -10, xMax: 10, yMin: -6, yMax: 6 }, 0.5)
    expect(v).toEqual({ xMin: -5, xMax: 5, yMin: -3, yMax: 3 })
  })

  it('panView — translation', () => {
    expect(panView({ xMin: 0, xMax: 10, yMin: 0, yMax: 4 }, 2, -1)).toEqual({ xMin: 2, xMax: 12, yMin: -1, yMax: 3 })
  })

  it('niceTicks — pas rond, bornes respectées', () => {
    expect(niceTicks(-10, 10, 5)).toEqual([-10, -5, 0, 5, 10])
    expect(niceTicks(0, 0)).toEqual([])
  })
})

describe('mindmapGraph — tracé', () => {
  const view = { xMin: -5, xMax: 5, yMin: -5, yMax: 5 }

  it('produit un chemin pour une droite', () => {
    const d = buildPlotPath((x) => x, view, {}, 100, 100)
    expect(d.startsWith('M0.00 100.00')).toBe(true)
    expect(d).toContain('L')
  })

  it('interrompt le tracé aux valeurs non définies', () => {
    const d = buildPlotPath((x) => Math.sqrt(x), view, {}, 100, 100)
    expect(d.startsWith('M')).toBe(true)
    expect(d.match(/M/g)).toHaveLength(1) // seule la partie x >= 0 est tracée
  })

  it('coupe aux asymptotes (1/x)', () => {
    const d = buildPlotPath((x) => 1 / x, view, {}, 200, 100)
    expect(d.match(/M/g).length).toBeGreaterThanOrEqual(2)
  })

  it('chemin vide sans fonction ou sans dimensions', () => {
    expect(buildPlotPath(null, view, {}, 100, 100)).toBe('')
    expect(buildPlotPath((x) => x, view, {}, 0, 100)).toBe('')
  })
})

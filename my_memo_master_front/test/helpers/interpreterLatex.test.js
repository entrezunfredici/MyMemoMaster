import { describe, it, expect } from 'vitest'
import { toLatex, renderMath, renderInlineMath } from '@/components/interpreter/interpreter.js'

// Exposants : sans accolades, LaTeX ne met en exposant que le premier caractère
// (s^-2 affichait le 2 en taille normale) — toLatex doit toujours les poser.
describe('toLatex — exposants', () => {
  it('puissance négative : s^-2 -> s^{-2}', () => {
    expect(toLatex('s^-2')).toBe('s^{-2}')
  })

  it('puissance à plusieurs chiffres : x^10 -> x^{10}', () => {
    expect(toLatex('x^10')).toBe('x^{10}')
  })

  it('puissance simple : x^2 -> x^{2}', () => {
    expect(toLatex('x^2')).toBe('x^{2}')
  })

  it('puissance décimale : y^1.5 -> y^{1.5}', () => {
    expect(toLatex('y^1.5')).toBe('y^{1.5}')
  })

  it('puissance parenthésée : x^(n+1) -> x^{n+1}', () => {
    expect(toLatex('x^(n+1)')).toBe('x^{n+1}')
  })

  it('exposants Unicode simples : x² -> x^{2}, m³ -> m^{3}', () => {
    expect(toLatex('x²')).toBe('x^{2}')
    expect(toLatex('m³')).toBe('m^{3}')
  })

  it('exposant Unicode négatif : s⁻¹ -> s^{-1}', () => {
    expect(toLatex('s⁻¹')).toBe('s^{-1}')
  })

  it('suite d’exposants Unicode : s⁻¹² -> s^{-12}', () => {
    expect(toLatex('s⁻¹²')).toBe('s^{-12}')
  })

  it('unités composées : m*s^-2 -> m*s^{-2}', () => {
    expect(toLatex('m*s^-2')).toBe('m*s^{-2}')
  })

  it('formule complète : v = d*t^-1 — l’exposant est accolé, le reste inchangé', () => {
    expect(toLatex('v = d*t^-1')).toBe('v = d*t^{-1}')
  })
})

// L'éditeur V2 (MathLive) produit du LaTeX stocké tel quel : il repasse par
// toLatex au rendu, qui doit donc être transparent pour du LaTeX déjà formé
// (les lookbehind empêchent de re-transformer \ln(, \infty, \sqrt…).
describe('toLatex — idempotence sur du LaTeX (éditeur V2)', () => {
  const latexSamples = [
    '\\frac{1}{2}',
    '\\ln(x)',
    '\\sqrt{x+1}',
    'E = \\frac{1}{2} m v^{2}',
    '\\int_{0}^{1} x \\, \\mathrm{d}x',
    '\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}',
    '\\mathbb{R}, x \\to \\infty',
    '\\vec{u} \\cdot \\vec{v}',
    '\\oint_{C} \\placeholder{} \\, \\mathrm{d}\\placeholder{}',
    '\\left\\lVert x \\right\\rVert \\le \\varepsilon',
  ]
  for (const sample of latexSamples) {
    it(`laisse inchangé : ${sample}`, () => {
      expect(toLatex(sample)).toBe(sample)
    })
  }

  it('convertit toujours les raccourcis V1 mélangés à du LaTeX', () => {
    expect(toLatex('\\frac{1}{2} + over(1, 3)')).toBe('\\frac{1}{2} + \\frac{1}{3}')
  })
})

// Accessibilité (RGAA) : le rendu doit toujours embarquer le MathML parallèle
// lisible par les lecteurs d'écran, quel que soit le défaut de KaTeX.
describe('renderMath — sortie MathML', () => {
  it('le rendu bloc contient un arbre MathML', () => {
    const html = renderMath('over(1, 2)')
    expect(html).toContain('<math xmlns="http://www.w3.org/1998/Math/MathML"')
    expect(html).toContain('display="block"')
  })

  it('le rendu inline contient un arbre MathML', () => {
    const html = renderMath('sqrt(x)', { displayMode: false })
    expect(html).toContain('<math xmlns="http://www.w3.org/1998/Math/MathML"')
    expect(html).not.toContain('display="block"')
  })

  it('les segments $…$ d’un texte mixte sont rendus avec MathML', () => {
    const html = renderInlineMath('Calculer $over(1, 2)$ de la somme')
    expect(html).toContain('<math xmlns="http://www.w3.org/1998/Math/MathML"')
  })
})

// Les \placeholder{} (trous MathLive de l'éditeur V2) sont inconnus de KaTeX :
// le rendu lecture seule doit les convertir, jamais afficher d'erreur rouge.
describe('renderMath — placeholders MathLive', () => {
  it('un trou vide est rendu comme un carré, sans erreur KaTeX', () => {
    const html = renderMath('\\frac{\\placeholder{}}{2}')
    expect(html).not.toContain('katex-error')
    expect(html).toContain('\\square')
  })

  it('un trou rempli rend son contenu', () => {
    const html = renderMath('\\frac{\\placeholder{x}}{2}')
    expect(html).not.toContain('katex-error')
    expect(html).not.toContain('\\square')
  })
})

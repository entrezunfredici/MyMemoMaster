import { describe, it, expect } from 'vitest'
import { toLatex } from '@/components/interpreter/interpreter.js'

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

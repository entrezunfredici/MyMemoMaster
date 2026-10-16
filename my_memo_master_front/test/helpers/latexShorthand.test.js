import { describe, it, expect } from 'vitest'
import { normalizeLatexShorthand } from '@/helpers/mindmap/latexShorthand'

describe('latexShorthand', () => {
  it('ajoute les accolades manquantes de \\frac', () => {
    expect(normalizeLatexShorthand(String.raw`\frac12mv^2`)).toBe(String.raw`\frac{1}{2}mv^2`)
    expect(normalizeLatexShorthand(String.raw`\frac{a+b}2`)).toBe(String.raw`\frac{a+b}{2}`)
    expect(normalizeLatexShorthand(String.raw`\frac a{b}`)).toBe(String.raw`\frac{a}{b}`)
  })

  it('ajoute les accolades de \\sqrt, avec ou sans racine n-ième', () => {
    expect(normalizeLatexShorthand(String.raw`\sqrt2`)).toBe(String.raw`\sqrt{2}`)
    expect(normalizeLatexShorthand(String.raw`\sqrt[3]8`)).toBe(String.raw`\sqrt[3]{8}`)
  })

  it('laisse intact le LaTeX déjà correct et traite les fractions imbriquées', () => {
    const ok = String.raw`E=\frac{1}{2}mv^{2}`
    expect(normalizeLatexShorthand(ok)).toBe(ok)
    expect(normalizeLatexShorthand(String.raw`\frac{\frac12}{3}`)).toBe(String.raw`\frac{\frac{1}{2}}{3}`)
  })

  it('ne confond pas avec une autre commande commençant par \\frac ou \\sqrt', () => {
    expect(normalizeLatexShorthand(String.raw`\fraction x`)).toBe(String.raw`\fraction x`)
  })

  it('entrée vide ou incomplète sans exception', () => {
    expect(normalizeLatexShorthand('')).toBe('')
    expect(normalizeLatexShorthand(null)).toBe('')
    expect(normalizeLatexShorthand(String.raw`\frac`)).toBe(String.raw`\frac`)
  })
})

import { describe, it, expect } from 'vitest'
import { checkUnitHomogeneity, sanitizeForUnits } from '@/components/interpreter/units.js'

describe('checkUnitHomogeneity', () => {
  // ── formules symboliques : indéterminées, jamais de fausse erreur ────────────

  it('P = over(F , S) - variables sans unité déclarée - aucune erreur (cas du bug)', () => {
    expect(checkUnitHomogeneity('P = over(F , S)')).toBeNull()
  })

  it('U = R × I - formule symbolique - aucune erreur', () => {
    expect(checkUnitHomogeneity('U = R × I')).toBeNull()
  })

  it('E = m*c^2 - formule symbolique - aucune erreur', () => {
    expect(checkUnitHomogeneity('E = m*c^2')).toBeNull()
  })

  // ── annotations d'unité : vérification réelle ────────────────────────────────

  it('P[Pa] = F[N] / S[m^2] - homogène - aucune erreur', () => {
    expect(checkUnitHomogeneity('P[Pa] = F[N] / S[m^2]')).toBeNull()
  })

  it('P[Pa] = F[N] * S[m^2] - non homogène - erreur signalée', () => {
    const err = checkUnitHomogeneity('P[Pa] = F[N] * S[m^2]')
    expect(err).toContain('homogénéité')
  })

  it('E[J] = m[kg] * c[m^2/s^2] - homogène (annotation composée) - aucune erreur', () => {
    expect(checkUnitHomogeneity('E[J] = m[kg] * c[m^2/s^2]')).toBeNull()
  })

  it('U[V] = R[Ω] * I[A] - homogène (unités dérivées) - aucune erreur', () => {
    expect(checkUnitHomogeneity('U[V] = R[Ω] * I[A]')).toBeNull()
  })

  // ── unités littérales : comportement historique préservé ────────────────────

  it('1 N = 1 kg*m/s^2 - homogène - aucune erreur', () => {
    expect(checkUnitHomogeneity('1 N = 1 kg*m/s^2')).toBeNull()
  })

  it('3 m + 2 s - addition non homogène - erreur avec les bonnes dimensions', () => {
    const err = checkUnitHomogeneity('3 m + 2 s')
    expect(err).toContain('Addition non homogène')
    expect(err).toContain('L')
    expect(err).toContain('T')
  })

  it('2 m + 3 m = 5 m - addition homogène - aucune erreur (et pas de boucle infinie)', () => {
    expect(checkUnitHomogeneity('2 m + 3 m = 5 m')).toBeNull()
  })

  it('3 + 2 = 5 - nombres sans unité - aucune erreur (et pas de boucle infinie)', () => {
    expect(checkUnitHomogeneity('3 + 2 = 5')).toBeNull()
  })

  it('1 m = 1 s - unités incompatibles - erreur signalée', () => {
    const err = checkUnitHomogeneity('1 m = 1 s')
    expect(err).toContain('homogénéité')
  })

  // ── mélange variables/unités ─────────────────────────────────────────────────

  it('x = F/F - les variables identiques s’annulent - aucune erreur', () => {
    expect(checkUnitHomogeneity('x = F/F')).toBeNull()
  })

  it('F + 3 m - somme avec variable indéterminée - aucune erreur', () => {
    expect(checkUnitHomogeneity('F + 3 m')).toBeNull()
  })

  // ── LaTeX (éditeur V2 MathLive) : converti puis vérifié comme la syntaxe V1 ──

  it('LaTeX homogène avec annotations et multiplication implicite - aucune erreur', () => {
    expect(checkUnitHomogeneity('E[J] = \\frac{1}{2}m[kg]c[m^2/s^2]')).toBeNull()
  })

  it('LaTeX non homogène avec annotations - erreur signalée', () => {
    const err = checkUnitHomogeneity('E[J] = \\frac{1}{2}m[kg]v[m/s]')
    expect(err).toContain('homogénéité')
  })

  it('LaTeX symbolique sans annotation - abstention, aucune erreur', () => {
    expect(checkUnitHomogeneity('\\frac{P}{S}')).toBeNull()
    expect(checkUnitHomogeneity('E = \\frac{1}{2}mv^{2}')).toBeNull()
  })

  it('LaTeX avec annotations \\lbrack…\\rbrack (sérialisation MathLive) - vérifié', () => {
    expect(checkUnitHomogeneity('P\\lbrack Pa\\rbrack = \\frac{F\\lbrack N\\rbrack}{S\\lbrack m^2\\rbrack}')).toBeNull()
  })

  it('LaTeX addition non homogène (espaces \\, ) - erreur signalée', () => {
    const err = checkUnitHomogeneity('3\\,m + 2\\,s')
    expect(err).toContain('Addition non homogène')
  })

  it('LaTeX hors périmètre (matrice, grec) - abstention, aucune erreur', () => {
    expect(checkUnitHomogeneity('\\begin{pmatrix}1 & 2\\end{pmatrix}')).toBeNull()
    expect(checkUnitHomogeneity('\\alpha + \\beta')).toBeNull()
  })
})

describe('sanitizeForUnits', () => {
  it('remplace les annotations Var[unité] par leur unité parenthésée', () => {
    expect(sanitizeForUnits('P[Pa] = F[N] / S[m^2]')).toContain('(Pa)')
    expect(sanitizeForUnits('P[Pa] = F[N] / S[m^2]')).toContain('(N)')
    expect(sanitizeForUnits('P[Pa] = F[N] / S[m^2]')).toContain('(m^2)')
  })

  it('convertit over(a, b) en (a)/(b)', () => {
    expect(sanitizeForUnits('over(F , S)')).toContain('(F)/(S)')
  })
})

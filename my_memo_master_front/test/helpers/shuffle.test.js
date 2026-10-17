import { describe, it, expect, vi } from 'vitest'
import { shuffledIndices } from '@/helpers/shuffle'

describe('shuffledIndices', () => {
  it('retourne une permutation de 0..n-1 (aucun indice perdu ni dupliqué)', () => {
    for (let n = 0; n <= 8; n++) {
      const order = shuffledIndices(n)
      expect([...order].sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, i) => i))
    }
  })

  it('tirage déterministe avec un générateur injecté', () => {
    // toujours l'indice 0 : chaque échange ramène l'élément courant en tête
    expect(shuffledIndices(4, () => 0)).toEqual([1, 2, 3, 0])
  })

  it('un générateur qui renvoie toujours ~1 laisse l’ordre inchangé', () => {
    expect(shuffledIndices(5, () => 0.999)).toEqual([0, 1, 2, 3, 4])
  })

  it('mélange réellement : sur beaucoup de tirages, chaque position reçoit chaque indice', () => {
    const seen = Array.from({ length: 3 }, () => new Set())
    for (let k = 0; k < 300; k++) shuffledIndices(3).forEach((v, pos) => seen[pos].add(v))
    seen.forEach((s) => expect(s.size).toBe(3))
  })

  it('utilise Math.random par défaut', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.999)
    expect(shuffledIndices(3)).toEqual([0, 1, 2])
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})

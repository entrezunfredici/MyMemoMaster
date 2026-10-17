import { describe, it, expect } from 'vitest'
import { plural } from '@/helpers/plural'

describe('plural (accord français)', () => {
  it.each([
    [0, 'contenu'],
    [1, 'contenu'],
    [0.5, 'contenu'],
    [-1, 'contenu'],
    [2, 'contenus'],
    [10, 'contenus'],
    [-2, 'contenus'],
  ])('%s -> %s', (n, expected) => {
    expect(plural(n, 'contenu')).toBe(expected)
  })

  it('pluriel irrégulier fourni', () => {
    expect(plural(3, 'cheval', 'chevaux')).toBe('chevaux')
    expect(plural(1, 'cheval', 'chevaux')).toBe('cheval')
  })

  it('valeur absente ou non numérique : singulier (pas de « NaN contenus »)', () => {
    expect(plural(undefined, 'sujet')).toBe('sujet')
    expect(plural(null, 'sujet')).toBe('sujet')
    expect(plural('abc', 'sujet')).toBe('sujet')
  })

  it('nombre sous forme de chaîne', () => {
    expect(plural('3', 'carte')).toBe('cartes')
    expect(plural('1', 'carte')).toBe('carte')
  })
})

import { describe, it, expect } from 'vitest'
import { formatDuration } from '@/helpers/functions'

describe('formatDuration', () => {
  it('formatDuration - secondes - affiche en jours / heures / minutes', () => {
    expect(formatDuration(86400)).toBe('1 j')
    expect(formatDuration(259200)).toBe('3 j')
    expect(formatDuration(604800)).toBe('7 j')
    expect(formatDuration(90)).toBe('1 min 30 s')
    expect(formatDuration(10)).toBe('10 s')
  })

  it('formatDuration - valeur invalide ou nulle - retourne une chaîne vide', () => {
    expect(formatDuration(0)).toBe('')
    expect(formatDuration(-5)).toBe('')
    expect(formatDuration('abc')).toBe('')
    expect(formatDuration(undefined)).toBe('')
  })
})

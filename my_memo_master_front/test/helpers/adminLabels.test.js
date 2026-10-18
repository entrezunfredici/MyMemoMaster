import { describe, it, expect } from 'vitest'
import { SYSTEM_ROLE_IDS, isSystemRole, AUDIT_ENTITY_TYPES, auditActionLabel, auditEntityLabel } from '@/helpers/adminLabels'

describe('rôles système', () => {
  it('ce sont les identifiants 1 à 5 de ROLE_IDS (le miroir de l’API)', () => {
    expect([...SYSTEM_ROLE_IDS].sort()).toEqual([1, 2, 3, 4, 5])
  })

  it.each([1, 2, 3, 4, 5, '3'])('%s est un rôle système', (id) => expect(isSystemRole(id)).toBe(true))
  it.each([0, 6, 10, '10', null, undefined, 'abc'])('%s n’est pas un rôle système', (id) => expect(isSystemRole(id)).toBe(false))
})

describe('journal d’audit — libellés', () => {
  it('actions connues traduites, inconnues rendues telles quelles', () => {
    expect(auditActionLabel('USER_ROLE_CHANGED')).toBe('Rôle d’un compte modifié')
    expect(auditActionLabel('ACTION_FUTURE')).toBe('ACTION_FUTURE')
  })

  it('types d’entité connus traduits, inconnus rendus tels quels', () => {
    expect(auditEntityLabel('Etablissement')).toBe('Établissement')
    expect(auditEntityLabel('Autre')).toBe('Autre')
  })

  it('chaque type filtrable a une valeur et un libellé', () => {
    for (const type of AUDIT_ENTITY_TYPES) {
      expect(type.value).toBeTruthy()
      expect(type.label).toBeTruthy()
    }
    expect(AUDIT_ENTITY_TYPES.map((t) => t.value)).toContain('User')
  })
})

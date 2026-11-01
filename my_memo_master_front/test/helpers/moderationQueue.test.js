import { describe, it, expect } from 'vitest'
import {
  DECISION_NOTE_MAX, REPORT_STATUSES, availableActions, reasonLabel, statusLabel, validateDecisionNote,
} from '@/helpers/moderation'

const ctx = (over = {}) => ({ status: 'pending', contentExists: true, authorActive: true, roleId: 5, ...over })

describe('moderation helpers — interface modérateur', () => {
  describe('libellés', () => {
    it('reasonLabel - motif connu - retourne le libellé français', () => {
      expect(reasonLabel('harassment')).toBe('Harcèlement ou insulte')
    })

    it('reasonLabel - motif inconnu - retourne le code', () => {
      expect(reasonLabel('zzz')).toBe('zzz')
    })

    it.each([
      ['pending', 'En attente'], ['in_review', 'En cours'], ['hidden', 'Masqué'],
      ['dismissed', 'Rejeté'], ['actioned', 'Supprimé'], ['autre', 'autre'],
    ])('statusLabel - %s - retourne %s', (status, label) => {
      expect(statusLabel(status)).toBe(label)
    })

    it('REPORT_STATUSES - statuts ouverts - pending, in_review et hidden uniquement', () => {
      const open = Object.entries(REPORT_STATUSES).filter(([, s]) => s.open).map(([k]) => k)
      expect(open).toEqual(['pending', 'in_review', 'hidden'])
    })
  })

  describe('availableActions', () => {
    it('dossier en attente, modérateur - claim, dismiss, hide, remove ; ni restauration ni suspension', () => {
      expect(availableActions(ctx())).toEqual({
        claim: true, dismiss: true, hide: true, restore: false, remove: true, suspend: false,
      })
    })

    it('dossier en cours - mêmes actions de traitement qu\'en attente', () => {
      expect(availableActions(ctx({ status: 'in_review' }))).toMatchObject({ claim: true, dismiss: true, hide: true, remove: true })
    })

    it('contenu masqué - restauration et suppression possibles, plus de masquage ni de rejet', () => {
      expect(availableActions(ctx({ status: 'hidden' }))).toMatchObject({
        claim: false, dismiss: false, hide: false, restore: true, remove: true,
      })
    })

    it('dossier clos (rejeté ou supprimé) - aucune action', () => {
      for (const status of ['dismissed', 'actioned']) {
        expect(Object.values(availableActions(ctx({ status, roleId: 1 }))).some(Boolean)).toBe(false)
      }
    })

    it('contenu déjà supprimé - ni masquage ni restauration', () => {
      expect(availableActions(ctx({ contentExists: false }))).toMatchObject({ hide: false, restore: false, remove: true })
      expect(availableActions(ctx({ status: 'hidden', contentExists: false }))).toMatchObject({ restore: false })
    })

    it.each([[1, true], [4, true], [5, false], [2, false]])('suspension - rôle %i - %s', (roleId, expected) => {
      expect(availableActions(ctx({ roleId })).suspend).toBe(expected)
    })

    it('suspension - compte déjà suspendu ou auteur inconnu - indisponible', () => {
      expect(availableActions(ctx({ roleId: 1, authorActive: false })).suspend).toBe(false)
      expect(availableActions(ctx({ roleId: 1, authorActive: null })).suspend).toBe(false)
    })

    it('suspension - dossier masqué, admin - possible (le dossier reste ouvert)', () => {
      expect(availableActions(ctx({ status: 'hidden', roleId: 4 })).suspend).toBe(true)
    })
  })

  describe('validateDecisionNote', () => {
    it('motif renseigné - valide', () => {
      expect(validateDecisionNote('Propos injurieux')).toBe('')
    })

    it.each(['', '   ', undefined, null])('motif %j - requis', (note) => {
      expect(validateDecisionNote(note)).toBe('Le motif de la décision est requis.')
    })

    it('motif à la limite - valide', () => {
      expect(validateDecisionNote('x'.repeat(DECISION_NOTE_MAX))).toBe('')
    })

    it('motif au-delà de la limite - refusé', () => {
      expect(validateDecisionNote('x'.repeat(DECISION_NOTE_MAX + 1))).toContain('500')
    })
  })
})

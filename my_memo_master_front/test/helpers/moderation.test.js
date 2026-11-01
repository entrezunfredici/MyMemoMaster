import { describe, it, expect } from 'vitest'
import { REPORT_REASONS, REPORT_COMMENT_MAX, isCommentRequired, validateReport } from '@/helpers/moderation'

describe('moderation helpers', () => {
  describe('REPORT_REASONS', () => {
    it('REPORT_REASONS - liste - reprend les six motifs de l\'API dans l\'ordre', () => {
      expect(REPORT_REASONS.map((r) => r.value)).toEqual([
        'illegal', 'harassment', 'copyright', 'spam', 'personal_data', 'other',
      ])
    })

    it('REPORT_REASONS - chaque motif - a un libellé et une aide non vides', () => {
      for (const r of REPORT_REASONS) {
        expect(r.label.length).toBeGreaterThan(0)
        expect(r.hint.length).toBeGreaterThan(0)
      }
    })
  })

  describe('isCommentRequired', () => {
    it('isCommentRequired - motif other - retourne true', () => {
      expect(isCommentRequired('other')).toBe(true)
    })

    it.each(['illegal', 'spam', '', undefined])('isCommentRequired - motif %s - retourne false', (reason) => {
      expect(isCommentRequired(reason)).toBe(false)
    })
  })

  describe('validateReport', () => {
    it('validateReport - motif valide sans commentaire - retourne une chaîne vide', () => {
      expect(validateReport({ reason: 'spam', comment: '' })).toBe('')
    })

    it('validateReport - aucun motif - demande de choisir un motif', () => {
      expect(validateReport({ reason: '', comment: '' })).toBe('Choisissez un motif de signalement.')
    })

    it('validateReport - motif inconnu - demande de choisir un motif', () => {
      expect(validateReport({ reason: 'nope', comment: '' })).toBe('Choisissez un motif de signalement.')
    })

    it('validateReport - motif other sans commentaire - exige une précision', () => {
      expect(validateReport({ reason: 'other', comment: '' })).toContain('obligatoire')
    })

    it('validateReport - motif other avec commentaire d\'espaces - exige une précision', () => {
      expect(validateReport({ reason: 'other', comment: '   ' })).toContain('obligatoire')
    })

    it('validateReport - motif other avec commentaire - valide', () => {
      expect(validateReport({ reason: 'other', comment: 'Précision' })).toBe('')
    })

    it('validateReport - commentaire à la limite - valide', () => {
      expect(validateReport({ reason: 'spam', comment: 'x'.repeat(REPORT_COMMENT_MAX) })).toBe('')
    })

    it('validateReport - commentaire au-delà de la limite - refusé', () => {
      expect(validateReport({ reason: 'spam', comment: 'x'.repeat(REPORT_COMMENT_MAX + 1) })).toContain('500')
    })
  })
})

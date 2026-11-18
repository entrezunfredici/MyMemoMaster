const { isValidZone, inZone, dayString, dayBounds } = require('../../helpers/badges/zone')

describe('helpers/badges/zone', () => {
  describe('isValidZone', () => {
    it.each(['Europe/Paris', 'Asia/Tokyo', 'UTC', 'America/Argentina/Buenos_Aires'])('%s - fuseau connu - vrai', (zone) => {
      expect(isValidZone(zone)).toBe(true)
    })

    it.each([null, undefined, '', 'Mars/Olympus', 42, {}, 'x'.repeat(65)])('%p - invalide - faux', (zone) => {
      expect(isValidZone(zone)).toBe(false)
    })
  })

  describe('dayString', () => {
    const instant = new Date('2026-11-18T03:00:00Z')

    it('même instant, jours différents selon le fuseau', () => {
      expect(dayString(instant, 'Pacific/Auckland')).toBe('2026-11-18')
      expect(dayString(instant, 'America/Los_Angeles')).toBe('2026-11-17')
    })

    it('fuseau absent ou inconnu - repli sur le fuseau du serveur', () => {
      expect(dayString(instant, null)).toBe(inZone(instant).format('YYYY-MM-DD'))
      expect(dayString(instant, 'Mars/Olympus')).toBe(inZone(instant).format('YYYY-MM-DD'))
    })

    it('changement d’heure - le jour reste celui du calendrier local', () => {
      // Paris passe à l'heure d'hiver le 25 octobre 2026 à 03 h : 23 h 30 le 24 (UTC+2) reste le 24
      expect(dayString(new Date('2026-10-24T21:30:00Z'), 'Europe/Paris')).toBe('2026-10-24')
      expect(dayString(new Date('2026-10-24T22:30:00Z'), 'Europe/Paris')).toBe('2026-10-25')
    })
  })

  describe('dayBounds', () => {
    it('début et fin du jour local, en instants absolus', () => {
      const { start, end } = dayBounds(new Date('2026-11-18T10:00:00Z'), 'America/Los_Angeles')

      expect(start.toISOString()).toBe('2026-11-18T08:00:00.000Z') // minuit à Los Angeles (UTC-8)
      expect(end.toISOString()).toBe('2026-11-19T07:59:59.999Z')
    })

    it('jour de 25 h (retour à l’heure d’hiver) - la fin reste la dernière milliseconde du jour local', () => {
      const { start, end } = dayBounds(new Date('2026-10-25T12:00:00Z'), 'Europe/Paris')

      expect(start.toISOString()).toBe('2026-10-24T22:00:00.000Z')
      expect(end.toISOString()).toBe('2026-10-25T22:59:59.999Z')
    })
  })
})

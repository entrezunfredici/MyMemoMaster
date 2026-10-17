import { describe, it, expect } from 'vitest'
import {
  MONTHS,
  DAYS_SHORT,
  EVENT_TYPES,
  eventTypeLabel,
  eventTypeColor,
  getDaysInMonth,
  getFirstDay,
  eventKey,
  parseDateToKey,
  formatSessionDate,
  toInputDate,
} from '@/helpers/calendar'

describe('helpers/calendar', () => {
  it('12 mois et 7 jours, lundi en premier', () => {
    expect(MONTHS).toHaveLength(12)
    expect(DAYS_SHORT).toEqual(['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'])
  })

  it('getDaysInMonth — mois de 28 à 31 jours, bissextile, bornes -1 et 12', () => {
    expect(getDaysInMonth(2026, 0)).toBe(31)
    expect(getDaysInMonth(2026, 1)).toBe(28)
    expect(getDaysInMonth(2028, 1)).toBe(29)
    expect(getDaysInMonth(2026, 3)).toBe(30)
    expect(getDaysInMonth(2026, -1)).toBe(31) // décembre précédent
    expect(getDaysInMonth(2026, 12)).toBe(31) // janvier suivant
  })

  it('getFirstDay — lundi = 0 … dimanche = 6', () => {
    expect(getFirstDay(2026, 5)).toBe(0) // 1er juin 2026 : lundi
    expect(getFirstDay(2026, 2)).toBe(6) // 1er mars 2026 : dimanche
  })

  it('eventKey / parseDateToKey — mois à partir de 0 en interne, à partir de 1 pour l’API', () => {
    expect(eventKey(2026, 5, 2)).toBe('2026-05-02')
    expect(parseDateToKey('2026-06-02')).toBe('2026-05-02')
    expect(parseDateToKey('2026-01-31')).toBe('2026-00-31')
  })

  it('toInputDate — jour du calendrier → valeur d’un champ date', () => {
    expect(toInputDate(2026, 5, 2)).toBe('2026-06-02')
    expect(toInputDate(2026, 11, 31)).toBe('2026-12-31')
  })

  it('formatSessionDate — date seule ou avec horaires tronqués à HH:MM', () => {
    expect(formatSessionDate({ date: '2026-06-02' })).toBe('2 Juin 2026')
    expect(formatSessionDate({ date: '2026-06-02', startTime: '09:00:00', endTime: '10:30:00' })).toBe('2 Juin 2026 · 09:00 – 10:30')
    expect(formatSessionDate({ date: '2026-06-02', startTime: '09:00' })).toBe('2 Juin 2026 · 09:00')
  })

  it('types d’événements : libellé et couleur, repli sur « Événement »', () => {
    expect(Object.keys(EVENT_TYPES)).toEqual(['calendar', 'deadline', 'revision'])
    expect(eventTypeLabel('deadline')).toBe('Échéance')
    expect(eventTypeLabel('revision')).toBe('Révision')
    expect(eventTypeColor('revision')).toBe('green')
    expect(eventTypeLabel('inconnu')).toBe('Événement')
    expect(eventTypeColor('inconnu')).toBe('blue')
  })
})

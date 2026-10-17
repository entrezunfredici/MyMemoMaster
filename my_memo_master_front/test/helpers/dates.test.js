/* eslint-env node */
import { describe, it, expect, afterEach } from 'vitest'
import { parseCalendarDate } from '@/helpers/dates'
import { formatDate } from '@/helpers/classroomFormat'
import { formatDeadlineDate } from '@/helpers/exerciseQuiz'

describe('parseCalendarDate', () => {
  it('une date sans heure est minuit LOCAL, donc le bon jour dans tous les fuseaux', () => {
    const d = parseCalendarDate('2026-11-20')
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 10, 20])
    expect([d.getHours(), d.getMinutes()]).toEqual([0, 0])
  })

  it('une date avec heure reste l’instant désigné', () => {
    expect(parseCalendarDate('2026-11-20T10:00:00Z').toISOString()).toBe('2026-11-20T10:00:00.000Z')
  })

  it('accepte un objet Date ou un horodatage', () => {
    const now = new Date()
    expect(parseCalendarDate(now).getTime()).toBe(now.getTime())
    expect(parseCalendarDate(now.getTime()).getTime()).toBe(now.getTime())
  })

  it('une chaîne qui ressemble à une date sans l’être est laissée à Date', () => {
    expect(Number.isNaN(parseCalendarDate('2026-13-45x').getTime())).toBe(true)
  })
})

describe('affichage d’une date sans heure (régression : « 20 nov. 2026, 01:00 » / veille à l’ouest d’UTC)', () => {
  const original = process.env.TZ
  afterEach(() => {
    process.env.TZ = original
  })

  it.each(['Europe/Paris', 'America/New_York', 'Pacific/Auckland', 'UTC'])('formatDate(« 2026-11-20 ») affiche le 20 en %s', (tz) => {
    process.env.TZ = tz
    expect(formatDate('2026-11-20')).toMatch(/^20 nov\.? 2026$/)
    expect(formatDeadlineDate('2026-11-20')).toMatch(/^20 nov\.? 2026$/)
  })

  it('aucune heure n’apparaît pour une date sans heure', () => {
    expect(formatDate('2026-11-20')).not.toMatch(/\d{2}:\d{2}/)
  })
})

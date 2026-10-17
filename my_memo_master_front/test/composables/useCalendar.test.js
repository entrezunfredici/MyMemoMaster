import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useCalendar } from '@/composables/useCalendar'
import { useCalendarEventStore } from '@/stores/calendarEvents'
import { useRevisionSessionStore } from '@/stores/revisionSessions'
import { useDeadlineStore } from '@/stores/deadlines'
import { usePlanningStore } from '@/stores/planning'

vi.mock('@/helpers/api', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() } }))

const withStores = (data = {}) => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const stores = {
    calendar: useCalendarEventStore(),
    revisions: useRevisionSessionStore(),
    deadlines: useDeadlineStore(),
    planning: usePlanningStore(),
  }
  stores.calendar.events = data.events || []
  stores.deadlines.deadlines = data.deadlines || []
  stores.revisions.sessions = data.sessions || []
  Object.values(stores).forEach((s) => {
    for (const name of ['fetchEvents', 'fetchSessions', 'fetchDeadlines', 'fetchPriorities']) {
      if (typeof s[name] === 'function') s[name] = vi.fn().mockResolvedValue(true)
    }
  })
  return stores
}

describe('useCalendar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 15, 12)) // 15 juin 2026
  })
  afterEach(() => vi.useRealTimers())

  describe('événements', () => {
    it('regroupe événements, échéances et séances par jour (mois API à partir de 1 → clé à partir de 0)', () => {
      withStores({
        events: [{ id: 1, name: 'Cours', occurrences: [{ date: '2026-06-02' }, { date: '2026-06-09' }] }],
        deadlines: [{ id: 2, name: 'Devoir', dueDate: '2026-06-02', dueTime: '18:30:00' }],
        sessions: [
          { id: 3, name: 'Révision maths', date: '2026-06-02', startTime: '09:00:00', endTime: '10:30:00', leitnerSystem: { name: 'Maths' } },
        ],
      })
      const { getEvents, hasEvent } = useCalendar()
      const day = getEvents(2026, 5, 2)
      expect(day.map((e) => [e.type, e.label, e.color])).toEqual([
        ['calendar', 'Cours', 'blue'],
        ['deadline', 'Devoir', 'red'],
        ['revision', 'Révision maths', 'green'],
      ])
      expect(day[1].meta).toBe('À rendre avant 18:30')
      expect(day[2].meta).toBe('09:00 – 10:30 · Maths')
      expect(day[2].session.id).toBe(3)
      expect(getEvents(2026, 5, 9)).toHaveLength(1)
      expect(hasEvent(2026, 5, 2)).toBe(true)
      expect(hasEvent(2026, 5, 3)).toBe(false)
    })

    it('événement sans occurrence, échéance sans heure, séance sans horaires ni système : pas de ligne d’information', () => {
      withStores({
        events: [{ id: 1, name: 'Vide' }],
        deadlines: [{ id: 2, name: 'D', dueDate: '2026-06-02' }],
        sessions: [{ id: 3, name: 'S', date: '2026-06-02' }],
      })
      const { getEvents } = useCalendar()
      expect(getEvents(2026, 5, 2).map((e) => e.meta)).toEqual([null, null])
    })

    it('jour sans événement : liste vide', () => {
      withStores()
      expect(useCalendar().getEvents(2026, 5, 20)).toEqual([])
    })

    it('suit les stores : une séance ajoutée apparaît sans recharger', () => {
      const stores = withStores()
      const { getEvents } = useCalendar()
      expect(getEvents(2026, 5, 2)).toHaveLength(0)
      stores.revisions.sessions = [{ id: 1, name: 'Nouvelle', date: '2026-06-02' }]
      expect(getEvents(2026, 5, 2)).toHaveLength(1)
    })
  })

  describe('chargement', () => {
    it('load() charge les 4 sources et gère l’indicateur de chargement', async () => {
      const stores = withStores()
      const { load, loading } = useCalendar()
      const done = load()
      expect(loading.value).toBe(true)
      await done
      expect(loading.value).toBe(false)
      expect(stores.calendar.fetchEvents).toHaveBeenCalled()
      expect(stores.revisions.fetchSessions).toHaveBeenCalled()
      expect(stores.deadlines.fetchDeadlines).toHaveBeenCalled()
      expect(stores.planning.fetchPriorities).toHaveBeenCalled()
    })

    it('refreshSessions() recharge les séances et l’agenda seulement', () => {
      const stores = withStores()
      useCalendar().refreshSessions()
      expect(stores.revisions.fetchSessions).toHaveBeenCalledTimes(1)
      expect(stores.planning.fetchPriorities).toHaveBeenCalledTimes(1)
      expect(stores.calendar.fetchEvents).not.toHaveBeenCalled()
    })
  })

  describe('navigation', () => {
    it('démarre sur le mois courant en vue mensuelle, aucun jour sélectionné', () => {
      withStores()
      const c = useCalendar()
      expect([c.view.value, c.currentYear.value, c.currentMonth.value, c.selectedDay.value]).toEqual(['month', 2026, 5, null])
    })

    it('prevMonth / nextMonth — changent d’année aux bornes et referment le panneau', () => {
      withStores()
      const c = useCalendar()
      c.currentMonth.value = 0
      c.selectedDay.value = { y: 2026, m: 0, d: 3 }
      c.prevMonth()
      expect([c.currentYear.value, c.currentMonth.value, c.selectedDay.value]).toEqual([2025, 11, null])
      c.nextMonth()
      expect([c.currentYear.value, c.currentMonth.value]).toEqual([2026, 0])
      c.currentMonth.value = 5
      c.nextMonth()
      expect(c.currentMonth.value).toBe(6)
    })

    it('goToMonth — passe en vue mensuelle sur le mois demandé', () => {
      withStores()
      const c = useCalendar()
      c.view.value = 'year'
      c.goToMonth(8)
      expect([c.view.value, c.currentMonth.value]).toEqual(['month', 8])
    })

    it('changer de vue (mois ↔ année) referme le panneau du jour', async () => {
      withStores()
      const c = useCalendar()
      c.selectDay(2026, 5, 9)
      c.view.value = 'year'
      await nextTick()
      expect(c.selectedDay.value).toBeNull()
    })

    it('trailingDays — jours de remplissage de la dernière semaine', () => {
      withStores()
      const c = useCalendar()
      // juin 2026 : commence un lundi, 30 jours → 2 jours de remplissage (30 % 7 = 2 → 5)
      expect(c.trailingDays.value).toBe(5)
      c.currentMonth.value = 1 // février 2026 : 28 jours, commence un dimanche → 6 + 28 = 34
      expect(c.trailingDays.value).toBe(1)
    })
  })

  describe('sélection d’un jour', () => {
    it('selectDay sélectionne, recliquer le même jour désélectionne', () => {
      withStores()
      const c = useCalendar()
      c.selectDay(2026, 5, 9)
      expect(c.selectedDay.value).toEqual({ y: 2026, m: 5, d: 9 })
      expect(c.isSelected(2026, 5, 9)).toBe(true)
      expect(c.isSelected(2026, 5, 10)).toBe(false)
      c.selectDay(2026, 5, 10)
      expect(c.selectedDay.value).toEqual({ y: 2026, m: 5, d: 10 })
      c.selectDay(2026, 5, 10)
      expect(c.selectedDay.value).toBeNull()
    })

    it('isToday et isWeekend', () => {
      withStores()
      const c = useCalendar()
      expect(c.isToday(2026, 5, 15)).toBe(true)
      expect(c.isToday(2026, 5, 16)).toBe(false)
      expect(c.isWeekend(2026, 5, 6)).toBe(true) // samedi 6 juin 2026
      expect(c.isWeekend(2026, 5, 7)).toBe(true) // dimanche
      expect(c.isWeekend(2026, 5, 8)).toBe(false) // lundi
    })
  })
})

import { ref, computed, watch } from 'vue'
import { useCalendarEventStore } from '@/stores/calendarEvents'
import { useRevisionSessionStore } from '@/stores/revisionSessions'
import { useDeadlineStore } from '@/stores/deadlines'
import { usePlanningStore } from '@/stores/planning'
import {
  getDaysInMonth,
  getFirstDay,
  eventKey,
  parseDateToKey,
  eventTypeColor,
} from '@/helpers/calendar'

const hhmm = (time) => (time ? String(time).slice(0, 5) : '')

/**
 * État du calendrier : vue (année / mois), navigation, jour sélectionné et événements du jour,
 * calculés à partir des stores (événements de calendrier, échéances, séances de révision).
 *
 * Un événement affiché : `{ label, type, color, id, meta, session? }` — `meta` est la ligne
 * d'information du panneau de détail (horaires, système lié), `session` la séance de révision d'origine.
 */
export function useCalendar() {
  const calendarStore = useCalendarEventStore()
  const revisionStore = useRevisionSessionStore()
  const deadlineStore = useDeadlineStore()
  const planningStore = usePlanningStore()

  const today = new Date()
  const view = ref('month')
  const currentYear = ref(today.getFullYear())
  const currentMonth = ref(today.getMonth())
  const selectedDay = ref(null) // { y, m, d } | null
  const loading = ref(false)

  // ── Données ───────────────────────────────────────────────────────────────────
  async function load() {
    loading.value = true
    await Promise.all([
      calendarStore.fetchEvents(),
      revisionStore.fetchSessions(),
      deadlineStore.fetchDeadlines(),
      planningStore.fetchPriorities(),
    ])
    loading.value = false
  }

  // Après la création d'une séance : séances et agenda sont rechargés.
  function refreshSessions() {
    revisionStore.fetchSessions()
    planningStore.fetchPriorities()
  }

  const allEvents = computed(() => {
    const dict = {}
    const add = (key, entry) => {
      if (!dict[key]) dict[key] = []
      dict[key].push({ ...entry, color: eventTypeColor(entry.type) })
    }

    calendarStore.events.forEach((ev) => {
      ev.occurrences?.forEach((occ) => {
        add(parseDateToKey(occ.date), { label: ev.name, type: 'calendar', id: ev.id, meta: null })
      })
    })

    deadlineStore.deadlines.forEach((dl) => {
      add(parseDateToKey(dl.dueDate), {
        label: dl.name,
        type: 'deadline',
        id: dl.id,
        meta: dl.dueTime ? `À rendre avant ${hhmm(dl.dueTime)}` : null,
      })
    })

    revisionStore.sessions.forEach((rs) => {
      const hours = [rs.startTime, rs.endTime].filter(Boolean).map(hhmm).join(' – ')
      const meta = [hours, rs.leitnerSystem?.name].filter(Boolean).join(' · ')
      add(parseDateToKey(rs.date), { label: rs.name, type: 'revision', id: rs.id, meta: meta || null, session: rs })
    })

    return dict
  })

  // ── Lecture ───────────────────────────────────────────────────────────────────
  const getEvents = (y, m, d) => allEvents.value[eventKey(y, m, d)] || []
  const hasEvent = (y, m, d) => getEvents(y, m, d).length > 0

  const isToday = (y, m, d) => y === today.getFullYear() && m === today.getMonth() && d === today.getDate()
  const isWeekend = (y, m, d) => (getFirstDay(y, m) + d - 1) % 7 >= 5
  const isSelected = (y, m, d) =>
    selectedDay.value !== null && selectedDay.value.y === y && selectedDay.value.m === m && selectedDay.value.d === d

  // Jours de remplissage de la dernière semaine du mois affiché.
  const trailingDays = computed(() => {
    const total = getFirstDay(currentYear.value, currentMonth.value) + getDaysInMonth(currentYear.value, currentMonth.value)
    return (7 - (total % 7)) % 7
  })

  // ── Sélection et navigation ───────────────────────────────────────────────────
  function closePanel() {
    selectedDay.value = null
  }

  // Cliquer le jour déjà sélectionné referme le panneau.
  function selectDay(y, m, d) {
    if (isSelected(y, m, d)) closePanel()
    else selectedDay.value = { y, m, d }
  }

  function prevMonth() {
    if (currentMonth.value === 0) {
      currentMonth.value = 11
      currentYear.value--
    } else currentMonth.value--
    closePanel()
  }

  function nextMonth() {
    if (currentMonth.value === 11) {
      currentMonth.value = 0
      currentYear.value++
    } else currentMonth.value++
    closePanel()
  }

  function goToMonth(idx) {
    currentMonth.value = idx
    view.value = 'month'
    closePanel()
  }

  // Le panneau d'un jour n'a pas de sens dans la vue annuelle : changer de vue le referme.
  watch(view, closePanel)

  return {
    today,
    view,
    currentYear,
    currentMonth,
    selectedDay,
    loading,
    allEvents,
    trailingDays,
    load,
    refreshSessions,
    getEvents,
    hasEvent,
    isToday,
    isWeekend,
    isSelected,
    selectDay,
    closePanel,
    prevMonth,
    nextMonth,
    goToMonth,
  }
}

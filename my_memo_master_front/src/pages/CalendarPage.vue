<template>
  <div class="calendar-page">

    <!-- Main -->
    <main class="cal-main">
      <header class="cal-header">
        <div class="view-toggle">
          <button :class="{ active: view === 'year' }" @click="view = 'year'">Année</button>
          <button :class="{ active: view === 'month' }" @click="view = 'month'">Mois</button>
        </div>
        <button class="add-btn" @click="openCreateModal()" title="Nouvelle séance de révision">+</button>
      </header>

      <div class="cal-content">
        <!-- ────────── VUE ANNUELLE ────────── -->
        <template v-if="view === 'year'">
          <div class="year-toolbar">
            <div class="year-nav">
              <button class="icon-btn" @click="currentYear--">&#8592;</button>
              <span class="year-label">{{ currentYear }}</span>
              <button class="icon-btn" @click="currentYear++">&#8594;</button>
            </div>
          </div>

          <div class="year-grid">
            <!-- RGAA 7.x — pattern bouton ARIA (un <button> natif est invalide ici : contient h3 + grille) -->
            <div
              v-for="(m, idx) in MONTHS"
              :key="idx"
              class="month-block"
              role="button"
              tabindex="0"
              :aria-label="`Afficher le mois de ${m}`"
              @click="goToMonth(idx)"
              @keydown.enter.prevent="goToMonth(idx)"
              @keydown.space.prevent="goToMonth(idx)"
            >
              <h3>{{ m.toUpperCase() }}</h3>
              <div class="mini-grid">
                <span v-for="d in DAYS_SHORT" :key="d" class="mini-label">{{ d[0] }}</span>
                <span v-for="_ in getFirstDay(currentYear, idx)" :key="'e' + _" class="mini-cell" />
                <span
                  v-for="day in getDaysInMonth(currentYear, idx)"
                  :key="day"
                  class="mini-cell"
                  :class="{
                    today: isToday(currentYear, idx, day),
                    'has-event': hasEvent(currentYear, idx, day)
                  }"
                  >{{ day }}</span
                >
              </div>
            </div>
            <!-- Cellule année en bas à droite -->
            <div class="year-number-cell" style="grid-column: span 3">
              <span class="year-number">{{ currentYear }}</span>
            </div>
          </div>
        </template>

        <!-- ────────── VUE MENSUELLE ────────── -->
        <template v-else>
          <div class="month-nav">
            <button class="icon-btn" @click="prevMonth">&#8592;</button>
            <h2>{{ MONTHS[currentMonth] }}</h2>
            <button class="icon-btn" @click="nextMonth">&#8594;</button>
          </div>

          <div class="month-grid">
            <div v-for="d in DAYS_SHORT" :key="d" class="month-day-label">{{ d }}</div>

            <!-- Jours du mois précédent -->
            <div
              v-for="i in getFirstDay(currentYear, currentMonth)"
              :key="'prev' + i"
              class="month-day-cell other-month"
            >
              <div class="day-num">
                {{
                  getDaysInMonth(currentYear, currentMonth - 1) -
                  getFirstDay(currentYear, currentMonth) +
                  i
                }}
              </div>
            </div>

            <!-- Jours du mois courant -->
            <div
              v-for="day in getDaysInMonth(currentYear, currentMonth)"
              :key="day"
              class="month-day-cell"
              :class="{
                today: isToday(currentYear, currentMonth, day),
                weekend: isWeekend(currentYear, currentMonth, day)
              }"
              role="button"
              tabindex="0"
              :aria-label="`Créer une séance le ${day} ${MONTHS[currentMonth]}`"
              @click="openCreateModal(currentYear, currentMonth, day)"
              @keydown.enter.prevent="openCreateModal(currentYear, currentMonth, day)"
              @keydown.space.prevent="openCreateModal(currentYear, currentMonth, day)"
            >
              <div class="day-num">{{ day }}</div>
              <div
                v-for="(ev, ei) in getEvents(currentYear, currentMonth, day)"
                :key="ei"
                class="event-pill"
                :class="`event-pill--${ev.type}`"
                role="button"
                tabindex="0"
                :aria-label="`Détail de ${ev.label}`"
                @click.stop="openDetail(ev)"
                @keydown.enter.stop.prevent="openDetail(ev)"
              >
                {{ ev.label }}
              </div>
            </div>

            <!-- Jours du mois suivant -->
            <div v-for="i in trailingDays" :key="'next' + i" class="month-day-cell other-month">
              <div class="day-num">{{ i }}</div>
            </div>
          </div>
        </template>
      </div>
    </main>

    <!-- ────────── Modale création séance ────────── -->
    <Transition
      enter-active-class="transition ease-out duration-150"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div v-if="showCreateModal" class="detail-overlay" @click.self="showCreateModal = false">
        <div class="detail-modal">
          <div class="detail-modal__header">
            <div class="detail-modal__meta">
              <span class="detail-modal__badge detail-modal__badge--revision">Révision</span>
              <h3 class="detail-modal__title">Nouvelle séance</h3>
            </div>
            <button class="detail-modal__close" @click="showCreateModal = false">
              <XMarkIcon class="size-5" />
            </button>
          </div>

          <form class="create-form" @submit.prevent="submitCreate">
            <div class="create-form__field">
              <label>Nom <span class="required">*</span></label>
              <input aria-label="Nom de la séance" v-model="createForm.name" type="text" placeholder="Ex: Maths — Chapitre 3" maxlength="150" required />
            </div>

            <div class="create-form__row">
              <div class="create-form__field">
                <label>Date <span class="required">*</span></label>
                <input aria-label="Date de la séance" v-model="createForm.date" type="date" required />
              </div>
            </div>

            <div class="create-form__row">
              <div class="create-form__field">
                <label>Début <span class="required">*</span></label>
                <input aria-label="Heure de début" v-model="createForm.startTime" type="time" required />
              </div>
              <div class="create-form__field">
                <label>Fin <span class="required">*</span></label>
                <input aria-label="Heure de fin" v-model="createForm.endTime" type="time" required />
              </div>
            </div>

            <div class="create-form__field">
              <label>Description</label>
              <textarea aria-label="Notes optionnelles" v-model="createForm.description" placeholder="Notes optionnelles…" rows="2" maxlength="1000" />
            </div>

            <div class="create-form__actions">
              <button type="button" class="btn-cancel" @click="showCreateModal = false">Annuler</button>
              <button type="submit" class="btn-submit" :disabled="creating">
                {{ creating ? 'Création…' : 'Créer la séance' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- ────────── Modale détail événement ────────── -->
    <Transition
      enter-active-class="transition ease-out duration-150"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div v-if="selectedEvent" class="detail-overlay" @click.self="selectedEvent = null">
        <div class="detail-modal">
          <!-- En-tête -->
          <div class="detail-modal__header">
            <div class="detail-modal__meta">
              <span class="detail-modal__badge" :class="`detail-modal__badge--${selectedEvent.type}`">
                {{ typeLabel(selectedEvent.type) }}
              </span>
              <h3 class="detail-modal__title">{{ selectedEvent.label }}</h3>
            </div>
            <button class="detail-modal__close" @click="selectedEvent = null">
              <XMarkIcon class="size-5" />
            </button>
          </div>

          <!-- Rappels (deadline et revision_session uniquement) -->
          <div v-if="selectedEvent.type !== 'calendar'" class="detail-modal__body">
            <p class="detail-modal__section-title">Rappels</p>
            <ReminderWidget
              :entity-type="reminderEntityType(selectedEvent.type)"
              :entity-id="selectedEvent.id"
            />
          </div>
          <div v-else class="detail-modal__body">
            <p class="detail-modal__info">Les rappels ne sont pas disponibles pour les événements de calendrier.</p>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ────────── Agenda latéral ────────── -->
    <aside class="cal-agenda">
      <!-- Onglets Agenda / To-do -->
      <div class="sidebar-tabs">
        <button
          class="sidebar-tab"
          :class="{ active: sidebarTab === 'agenda' }"
          @click="sidebarTab = 'agenda'"
        >Agenda</button>
        <button
          class="sidebar-tab"
          :class="{ active: sidebarTab === 'todo' }"
          @click="sidebarTab = 'todo'"
        >To-do</button>
      </div>

      <!-- Contenu To-do -->
      <template v-if="sidebarTab === 'todo'">
        <TodoWidget />
      </template>

      <!-- Contenu Agenda -->
      <template v-else>

      <!-- En retard -->
      <div v-if="!loading && planningStore.priorities.overdue.length > 0" class="agenda-section">
        <h4 class="agenda-title agenda-title--overdue">En retard</h4>
        <div
          v-for="item in planningStore.priorities.overdue"
          :key="String(item.id || item.systemId) + item.type"
          class="agenda-item agenda-item--overdue"
        >
          <span class="agenda-badge agenda-badge--overdue">-{{ item.daysOverdue }}j</span>
          <span class="agenda-name">{{ item.name }}</span>
        </div>
      </div>

      <!-- Aujourd'hui -->
      <div class="agenda-section">
        <h4 class="agenda-title">Aujourd'hui</h4>
        <div v-if="loading" class="agenda-loading">
          <span class="agenda-spinner" />
        </div>
        <template v-else-if="planningStore.priorities.today.length > 0">
          <div
            v-for="item in planningStore.priorities.today"
            :key="String(item.id || item.systemId) + item.type"
            class="agenda-item"
            :class="agendaItemClass(item.type)"
          >
            <span class="agenda-time">{{ itemTime(item) }}</span>
            <span class="agenda-name">
              {{ item.name }}{{ item.type === 'leitner' ? ` (${item.cardsDue})` : '' }}
            </span>
          </div>
        </template>
        <p v-else class="agenda-empty">Rien aujourd'hui</p>
      </div>

      <!-- À venir -->
      <div class="agenda-section">
        <h4 class="agenda-title">À venir</h4>
        <div v-if="loading" class="agenda-loading">
          <span class="agenda-spinner" />
        </div>
        <template v-else-if="planningStore.priorities.upcoming.length > 0">
          <div
            v-for="item in planningStore.priorities.upcoming"
            :key="String(item.id || item.systemId) + item.type"
            class="agenda-item"
            :class="agendaItemClass(item.type)"
          >
            <span class="agenda-badge">+{{ item.daysUntil }}j</span>
            <span class="agenda-name">{{ item.name }}</span>
          </div>
        </template>
        <p v-else class="agenda-empty">Aucun élément</p>
      </div>

      <!-- Légende -->
      <div class="agenda-section agenda-legend">
        <h4 class="agenda-title">Légende</h4>
        <div class="legend-item">
          <span class="legend-dot legend-dot--calendar" />
          <span>Événement</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot legend-dot--deadline" />
          <span>Échéance</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot legend-dot--revision" />
          <span>Révision</span>
        </div>
      </div>

      </template>
    </aside>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { useCalendarEventStore } from '@/stores/calendarEvents'
import { useRevisionSessionStore } from '@/stores/revisionSessions'
import { useDeadlineStore } from '@/stores/deadlines'
import { usePlanningStore } from '@/stores/planning'
import { useGuidedTourStore } from '@/stores/guidedTour'
import ReminderWidget from '@/components/ReminderWidget.vue'
import TodoWidget from '@/components/TodoWidget.vue'

/* ── Stores ── */
const calendarStore = useCalendarEventStore()
const revisionStore = useRevisionSessionStore()
const deadlineStore = useDeadlineStore()
const planningStore = usePlanningStore()
const guidedTourStore = useGuidedTourStore()

/* ── Constantes ── */
const MONTHS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre'
]
const DAYS_SHORT = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di']

/* ── État ── */
const today = new Date()
const view = ref('month')
const sidebarTab = ref('agenda')
const currentYear = ref(today.getFullYear())
const currentMonth = ref(today.getMonth())
const loading = ref(false)
const selectedEvent = ref(null)

/* ── Création séance ── */
const showCreateModal = ref(false)
const creating = ref(false)
const createForm = ref({ name: '', date: '', startTime: '', endTime: '', description: '' })

function openCreateModal(y, m, d) {
  createForm.value = {
    name: '',
    date: y != null ? `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` : '',
    startTime: '',
    endTime: '',
    description: '',
  }
  showCreateModal.value = true
}

async function submitCreate() {
  creating.value = true
  const payload = {
    name: createForm.value.name,
    date: createForm.value.date,
    startTime: createForm.value.startTime,
    endTime: createForm.value.endTime,
    ...(createForm.value.description ? { description: createForm.value.description } : {}),
    // Parcours guidé : lie la séance au système de Leitner créé pendant le parcours
    ...(guidedTourStore.active && guidedTourStore.links.leitnerSystemId
      ? { idSystem: guidedTourStore.links.leitnerSystemId }
      : {}),
  }
  const ok = await revisionStore.createSession(payload)
  creating.value = false
  if (ok) {
    const created = revisionStore.sessions[revisionStore.sessions.length - 1]
    guidedTourStore.recordLinks({ revisionSessionId: created?.id ?? -1 })
    showCreateModal.value = false
    revisionStore.fetchSessions()
    planningStore.fetchPriorities()
  }
}

/* ── Chargement ── */
onMounted(async () => {
  loading.value = true
  await Promise.all([
    calendarStore.fetchEvents(),
    revisionStore.fetchSessions(),
    deadlineStore.fetchDeadlines(),
    planningStore.fetchPriorities(),
  ])
  loading.value = false
})

/* ── Conversion date API (mois 1-indexé) → clé interne (mois 0-indexé) ── */
function parseDateToKey(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${y}-${String(m - 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/* ── Dictionnaire calculé depuis les stores ── */
const allEvents = computed(() => {
  const dict = {}
  const add = (key, entry) => {
    if (!dict[key]) dict[key] = []
    dict[key].push(entry)
  }

  calendarStore.events.forEach((ev) => {
    ev.occurrences?.forEach((occ) => {
      add(parseDateToKey(occ.date), { label: ev.name, type: 'calendar', id: ev.id })
    })
  })

  deadlineStore.deadlines.forEach((dl) => {
    add(parseDateToKey(dl.dueDate), { label: dl.name, type: 'deadline', id: dl.id })
  })

  revisionStore.sessions.forEach((rs) => {
    add(parseDateToKey(rs.date), { label: rs.name, type: 'revision', id: rs.id })
  })

  return dict
})

/* ── Helpers planning ── */
function agendaItemClass(type) {
  if (type === 'deadline') return 'agenda-item--deadline'
  if (type === 'revision_session') return 'agenda-item--revision'
  if (type === 'leitner') return 'agenda-item--leitner'
  return ''
}

function itemTime(item) {
  if (item.startTime) return item.startTime.slice(0, 5)
  if (item.dueTime) return item.dueTime.slice(0, 5)
  return ''
}

/* ── Helpers ── */
function getDaysInMonth(y, m) {
  return new Date(y, (((m % 12) + 12) % 12) + 1, 0).getDate()
}

function getFirstDay(y, m) {
  const d = new Date(y, m, 1).getDay()
  return d === 0 ? 6 : d - 1 // Lundi = 0
}

function isToday(y, m, d) {
  return y === today.getFullYear() && m === today.getMonth() && d === today.getDate()
}

function isWeekend(y, m, d) {
  const dow = (getFirstDay(y, m) + d - 1) % 7
  return dow >= 5
}

function eventKey(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function hasEvent(y, m, d) {
  return !!allEvents.value[eventKey(y, m, d)]?.length
}

function getEvents(y, m, d) {
  return allEvents.value[eventKey(y, m, d)] || []
}

/* ── Modale détail ── */
function openDetail(ev) {
  selectedEvent.value = ev
}

function typeLabel(type) {
  if (type === 'deadline') return 'Échéance'
  if (type === 'revision') return 'Révision'
  return 'Événement'
}

function reminderEntityType(type) {
  return type === 'revision' ? 'revision_session' : type
}

/* ── Navigation ── */
function prevMonth() {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else currentMonth.value--
}

function nextMonth() {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else currentMonth.value++
}

function goToMonth(idx) {
  currentMonth.value = idx
  view.value = 'month'
}

/* ── Jours de remplissage fin de mois ── */
const trailingDays = computed(() => {
  const total =
    getFirstDay(currentYear.value, currentMonth.value) +
    getDaysInMonth(currentYear.value, currentMonth.value)
  return (7 - (total % 7)) % 7
})
</script>

<style scoped>
/* ── Layout ── */
.calendar-page {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: #f5f6fb;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #0f172a;
  border: 10px solid #1a1aff;
  border-radius: 16px;
}

/* ── Main ── */
.cal-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.cal-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 24px 12px;
  background: #ffffff;
  border-bottom: 0.5px solid #e2e8f0;
}

.cal-header h1 {
  font-size: 22px;
  font-weight: 500;
  color: #1a1aff;
  margin: 0;
}

.view-toggle {
  margin-left: auto;
  display: flex;
  border: 0.5px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.view-toggle button {
  padding: 6px 14px;
  font-size: 13px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #64748b;
  font-weight: 500;
  transition:
    background 0.15s,
    color 0.15s;
}

.view-toggle button.active {
  background: #1a1aff;
  color: #ffffff;
}

.cal-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

/* ── Vue annuelle ── */
.year-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.year-nav {
  display: flex;
  align-items: center;
  gap: 10px;
}

.year-label {
  font-size: 15px;
  font-weight: 500;
}

.year-number-cell {
  display: flex;
  align-items: flex-end;
  justify-content: end;
  padding: 12px;
  background: none;
}

.year-number {
  font-size: 140px;
  font-weight: 600;
  color: #1a1aff;
  line-height: 1;
  letter-spacing: -4px;
}

.icon-btn {
  width: 30px;
  height: 30px;
  border: 0.5px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-size: 14px;
  transition: background 0.15s;
}

.icon-btn:hover {
  background: #f1f5f9;
}

.year-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
}

.month-block {
  background: #ffffff;
  border: 0.5px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.month-block:hover {
  border-color: #1a1aff;
}

.month-block h3 {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  margin: 0 0 8px;
  letter-spacing: 0.5px;
}

.mini-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
}

.mini-label {
  font-size: 9px;
  color: #94a3b8;
  text-align: center;
  padding: 1px 0;
}

.mini-cell {
  font-size: 9px;
  text-align: center;
  padding: 2px 1px;
  border-radius: 3px;
  color: #334155;
}

.mini-cell.today {
  background: #1a1aff;
  color: #ffffff;
  border-radius: 3px;
}

.mini-cell.has-event {
  background: rgba(26, 26, 255, 0.12);
  color: #1a1aff;
}

/* ── Vue mensuelle ── */
.month-nav {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.month-nav h2 {
  font-size: 18px;
  font-weight: 500;
  margin: 0;
  color: #1a1aff;
  min-width: 120px;
}

.month-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border: 0.5px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  background: #e2e8f0;
  gap: 0.5px;
}

.month-day-label {
  font-size: 12px;
  font-weight: 500;
  text-align: center;
  padding: 8px 4px;
  background: #f8fafc;
  color: #64748b;
}

.month-day-cell {
  min-height: 90px;
  padding: 8px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.month-day-cell.other-month {
  background: #f8fafc;
}
.month-day-cell.other-month .day-num {
  color: #cbd5e1;
}
.month-day-cell.weekend {
  background: #fafaff;
}

.day-num {
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
}

.month-day-cell.today .day-num {
  background: #1a1aff;
  color: #ffffff;
}

/* Pills d'événements colorées par type */
.event-pill {
  font-size: 11px;
  border-radius: 4px;
  padding: 2px 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.event-pill--calendar {
  background: rgba(26, 26, 255, 0.1);
  color: #1a1aff;
}

.event-pill--deadline {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.event-pill--revision {
  background: rgba(22, 163, 74, 0.1);
  color: #16a34a;
}

/* ── Onglets sidebar ── */
.sidebar-tabs {
  display: flex;
  border-bottom: 0.5px solid #e2e8f0;
  flex-shrink: 0;
}

.sidebar-tab {
  flex: 1;
  padding: 10px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  background: none;
  border: none;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: color 0.15s;
  border-bottom: 2px solid transparent;
}

.sidebar-tab.active {
  color: #1a1aff;
  border-bottom-color: #1a1aff;
}

/* ── Agenda latéral ── */
.cal-agenda {
  width: 220px;
  flex-shrink: 0;
  background: #ffffff;
  border-left: 0.5px solid #e2e8f0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.agenda-section {
  padding: 14px 14px 12px;
  border-bottom: 0.5px solid #f1f5f9;
}

.agenda-legend {
  margin-top: auto;
  border-bottom: none;
}

.agenda-title {
  font-size: 10px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.7px;
  margin: 0 0 10px;
}

.agenda-empty {
  font-size: 12px;
  color: #cbd5e1;
  margin: 0;
}

.agenda-loading {
  display: flex;
  justify-content: center;
  padding: 6px 0;
}

.agenda-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid #e2e8f0;
  border-top-color: #1a1aff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.agenda-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 5px 0;
  border-top: 0.5px solid #f8fafc;
}

.agenda-item:first-of-type {
  border-top: none;
}

.agenda-time {
  font-size: 11px;
  color: #94a3b8;
  flex-shrink: 0;
  min-width: 34px;
  padding-top: 1px;
}

.agenda-name {
  font-size: 12px;
  font-weight: 500;
  line-height: 1.3;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.agenda-item--revision .agenda-name {
  color: #16a34a;
}

.agenda-item--deadline .agenda-name {
  color: #dc2626;
}

.agenda-item--leitner .agenda-name {
  color: #7c3aed;
}

.agenda-item--overdue .agenda-name {
  color: #dc2626;
  font-weight: 600;
}

.agenda-title--overdue {
  color: #dc2626;
}

.agenda-badge {
  font-size: 10px;
  font-weight: 700;
  color: #94a3b8;
  flex-shrink: 0;
  min-width: 26px;
  padding-top: 1px;
}

.agenda-badge--overdue {
  color: #dc2626;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
}

.legend-item span:last-child {
  font-size: 12px;
  color: #64748b;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-dot--calendar {
  background: #1a1aff;
}

.legend-dot--deadline {
  background: #dc2626;
}

.legend-dot--revision {
  background: #16a34a;
}

/* ── Modale détail ── */
.detail-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
}

.detail-modal {
  background: #ffffff;
  border-radius: 16px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}

.detail-modal__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 18px 14px;
  border-bottom: 0.5px solid #f1f5f9;
}

.detail-modal__meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.detail-modal__badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  padding: 2px 8px;
  border-radius: 99px;
}

.detail-modal__badge--deadline {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
}

.detail-modal__badge--revision {
  background: rgba(22, 163, 74, 0.12);
  color: #16a34a;
}

.detail-modal__badge--calendar {
  background: rgba(26, 26, 255, 0.1);
  color: #1a1aff;
}

.detail-modal__title {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
  line-height: 1.3;
}

.detail-modal__close {
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: #94a3b8;
  padding: 2px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  transition: color 0.15s;
}

.detail-modal__close:hover {
  color: #0f172a;
}

.detail-modal__body {
  padding: 16px 18px 20px;
}

.detail-modal__section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #94a3b8;
  margin: 0 0 12px;
}

.detail-modal__info {
  font-size: 13px;
  color: #94a3b8;
  margin: 0;
}

/* pills cliquables */
.event-pill {
  cursor: pointer;
}

.event-pill:hover {
  filter: brightness(0.92);
}

/* ── Bouton + ── */
.add-btn {
  margin-left: 12px;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: #1a1aff;
  color: #fff;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
  flex-shrink: 0;
}

.add-btn:hover {
  background: #0000cc;
}

/* ── Cellule jour cliquable ── */
.month-day-cell {
  cursor: pointer;
}

.month-day-cell:hover {
  background: #f0f0ff;
}

/* ── Formulaire création ── */
.create-form {
  padding: 16px 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.create-form__row {
  display: flex;
  gap: 12px;
}

.create-form__row .create-form__field {
  flex: 1;
}

.create-form__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.create-form__field label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #94a3b8;
}

.required {
  color: #dc2626;
}

.create-form__field input,
.create-form__field textarea {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
  color: #0f172a;
  background: #f8fafc;
  outline: none;
  transition: border-color 0.15s;
  font-family: inherit;
  resize: none;
}

.create-form__field input:focus,
.create-form__field textarea:focus {
  border-color: #1a1aff;
  background: #fff;
}

.create-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.btn-cancel {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #64748b;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-cancel:hover {
  background: #f1f5f9;
}

.btn-submit {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  background: #1a1aff;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-submit:hover:not(:disabled) {
  background: #0000cc;
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ── Responsive ── */
@media (max-width: 900px) {
  .year-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .year-number {
    font-size: 32px;
  }
  .cal-agenda {
    display: none;
  }
}

@media (max-width: 600px) {
  .year-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .cal-content {
    padding: 12px 12px;
  }
  .cal-header {
    padding: 12px;
  }
}
</style>

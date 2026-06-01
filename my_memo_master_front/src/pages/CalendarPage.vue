<template>
  <div class="calendar-page">

    <!-- Main -->
    <main class="cal-main">
      <header class="cal-header">
        <div class="view-toggle">
          <button :class="{ active: view === 'year' }" @click="view = 'year'">Année</button>
          <button :class="{ active: view === 'month' }" @click="view = 'month'">Mois</button>
        </div>
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
            <div v-for="(m, idx) in MONTHS" :key="idx" class="month-block" @click="goToMonth(idx)">
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
            >
              <div class="day-num">{{ day }}</div>
              <div
                v-for="(ev, ei) in getEvents(currentYear, currentMonth, day)"
                :key="ei"
                class="event-pill"
              >
                {{ ev }}
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
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

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
const currentYear = ref(today.getFullYear())
const currentMonth = ref(today.getMonth())

/**
 * Dictionnaire d'événements — clé : "YYYY-MM-DD"
 */
const events = ref({
  [`${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`]:
    ['Contrôle math']
})

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
  return !!events.value[eventKey(y, m, d)]?.length
}

function getEvents(y, m, d) {
  return events.value[eventKey(y, m, d)] || []
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

/* ── Sidebar ── */
.sidebar {
  width: 52px;
  background: #ffffff;
  border-right: 0.5px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
  flex-shrink: 0;
}

.sidebar__logo {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: #1a1aff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.sidebar__logo svg {
  width: 20px;
  height: 20px;
}
.sidebar__logo--sm {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.sidebar__nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.sidebar__bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding-bottom: 8px;
}

.nav-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  transition:
    background 0.15s,
    color 0.15s;
}

.nav-icon svg {
  width: 18px;
  height: 18px;
}
.nav-icon:hover,
.nav-icon.active {
  background: #eff6ff;
  color: #1a1aff;
}

/* ── Main ── */
.cal-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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

.event-pill {
  font-size: 11px;
  background: rgba(26, 26, 255, 0.1);
  color: #1a1aff;
  border-radius: 4px;
  padding: 2px 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

/* ── Responsive ── */
@media (max-width: 900px) {
  .year-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .year-number {
    font-size: 32px;
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

<template>
  <div class="calendar-page">
    <main class="cal-main">
      <header class="cal-header">
        <div class="view-toggle" role="group" aria-label="Affichage du calendrier">
          <button type="button" :class="{ active: view === 'year' }" :aria-pressed="view === 'year'" @click="view = 'year'">Année</button>
          <button type="button" :class="{ active: view === 'month' }" :aria-pressed="view === 'month'" @click="view = 'month'">Mois</button>
        </div>
        <button
          type="button"
          class="add-btn"
          aria-label="Nouvelle séance de révision"
          title="Nouvelle séance de révision"
          @click="openCreate()"
        >+</button>
      </header>

      <div class="cal-body">
        <div class="cal-content">
          <CalendarYearView
            v-if="view === 'year'"
            :year="currentYear"
            :is-today="isToday"
            :has-event="hasEvent"
            @update:year="currentYear = $event"
            @go-to-month="goToMonth"
          />

          <CalendarMonthView
            v-else
            :year="currentYear"
            :month="currentMonth"
            :trailing-days="trailingDays"
            :is-today="isToday"
            :is-weekend="isWeekend"
            :is-selected="isSelected"
            :get-events="getEvents"
            @prev-month="prevMonth"
            @next-month="nextMonth"
            @select-day="selectDay"
          />
        </div>

        <CalendarDetailPanel
          :day="selectedDay"
          :get-events="getEvents"
          @close="closePanel"
          @open-event="selectedEvent = $event"
          @create="openCreate"
        />
      </div>
    </main>

    <CalendarAgenda :loading="loading" />

    <CalendarCreateModal :open="showCreate" :day="createDay" @close="showCreate = false" @created="refreshSessions" />
    <CalendarEventModal :event="selectedEvent" @close="selectedEvent = null" />
  </div>
</template>

<script setup>
// Page Calendrier : vues année / mois, panneau du jour sélectionné, agenda latéral et fenêtres de
// création de séance et de détail d'un événement. L'état et les données sont dans useCalendar.
import { ref, onMounted } from 'vue'
import { useCalendar } from '@/composables/useCalendar'
import CalendarYearView from '@/components/calendar/CalendarYearComponent.vue'
import CalendarMonthView from '@/components/calendar/CalendarMonthComponent.vue'
import CalendarDetailPanel from '@/components/calendar/CalendarDetailPanelComponent.vue'
import CalendarAgenda from '@/components/calendar/CalendarAgendaComponent.vue'
import CalendarCreateModal from '@/components/calendar/CalendarCreateModalComponent.vue'
import CalendarEventModal from '@/components/calendar/CalendarEventModalComponent.vue'
import '@/components/calendar/calendar.css'

const {
  view,
  currentYear,
  currentMonth,
  selectedDay,
  loading,
  trailingDays,
  load,
  refreshSessions,
  isToday,
  isWeekend,
  isSelected,
  hasEvent,
  getEvents,
  selectDay,
  closePanel,
  prevMonth,
  nextMonth,
  goToMonth,
} = useCalendar()

const selectedEvent = ref(null) // événement dont la fiche est ouverte
const showCreate = ref(false)
const createDay = ref(null) // jour proposé pour la nouvelle séance ({ y, m, d }) ou null

// Depuis le bouton « + » (aucun jour) ou depuis le panneau d'un jour.
function openCreate(day = null) {
  createDay.value = day
  showCreate.value = true
}

onMounted(load)
</script>

<style scoped>
.calendar-page {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--surface-muted);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: var(--slate-900);
  border: 10px solid rgb(var(--accent));
  border-radius: 16px;
}

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
  background: rgb(var(--white));
  border-bottom: 0.5px solid var(--slate-200);
}

.view-toggle {
  margin-left: auto;
  display: flex;
  border: 0.5px solid var(--slate-200);
  border-radius: 8px;
  overflow: hidden;
}

.view-toggle button {
  padding: 6px 14px;
  font-size: 13px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--slate-500);
  font-weight: 500;
  transition:
    background 0.15s,
    color 0.15s;
}

.view-toggle button.active {
  background: rgb(var(--accent));
  color: rgb(var(--white));
}

.cal-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.cal-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  min-width: 0;
}

@media (max-width: 600px) {
  .cal-header {
    padding: 12px;
  }
  .cal-content {
    padding: 12px;
  }
}
</style>

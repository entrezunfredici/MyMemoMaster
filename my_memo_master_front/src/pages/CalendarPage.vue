<template>
  <div class="calendar-page">
    <main class="cal-main">
      <header class="cal-header">
        <div class="view-toggle">
          <button :class="{ active: view === 'year' }" @click="view = 'year'">Année</button>
          <button :class="{ active: view === 'month' }" @click="view = 'month'">Mois</button>
        </div>
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

        <CalendarDetailPanel :day="selectedDay" :get-events="getEvents" @close="closePanel" />
      </div>
    </main>
  </div>
</template>

<script setup>
import { useCalendar } from '../stores/calendar.js'
import CalendarYearView from '../components/CalendarYearComponent.vue'
import CalendarMonthView from '../components/CalendarMonthComponent.vue'
import CalendarDetailPanel from '../components/CalendarDetailPanelComponent.vue'

const {
  view,
  currentYear,
  currentMonth,
  selectedDay,
  trailingDays,
  isToday,
  isWeekend,
  isSelected,
  hasEvent,
  getEvents,
  selectDay,
  closePanel,
  prevMonth,
  nextMonth,
  goToMonth
} = useCalendar()
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

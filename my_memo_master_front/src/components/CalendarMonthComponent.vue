<template>
  <div>
    <div class="month-nav">
      <button class="icon-btn" @click="$emit('prev-month')">&#8592;</button>
      <h2>{{ MONTHS[month] }}</h2>
      <button class="icon-btn" @click="$emit('next-month')">&#8594;</button>
    </div>

    <div class="month-grid">
      <div v-for="d in DAYS_SHORT" :key="d" class="month-day-label">{{ d }}</div>

      <!-- Jours du mois précédent -->
      <div
        v-for="i in getFirstDay(year, month)"
        :key="'prev' + i"
        class="month-day-cell other-month"
      >
        <div class="day-num">
          {{ getDaysInMonth(year, month - 1) - getFirstDay(year, month) + i }}
        </div>
      </div>

      <!-- Jours du mois courant -->
      <div
        v-for="day in getDaysInMonth(year, month)"
        :key="day"
        class="month-day-cell"
        :class="{
          today: isToday(year, month, day),
          weekend: isWeekend(year, month, day),
          selected: isSelected(year, month, day)
        }"
        @click="$emit('select-day', year, month, day)"
      >
        <div class="day-num">{{ day }}</div>
        <div
          v-for="(ev, ei) in getEvents(year, month, day).slice(0, 2)"
          :key="ei"
          class="event-pill"
          :class="`pill-${ev.color}`"
        >
          {{ ev.title }}
        </div>
        <div v-if="getEvents(year, month, day).length > 2" class="more-badge">
          +{{ getEvents(year, month, day).length - 2 }} autres
        </div>
      </div>

      <!-- Jours du mois suivant -->
      <div v-for="i in trailingDays" :key="'next' + i" class="month-day-cell other-month">
        <div class="day-num">{{ i }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { MONTHS, DAYS_SHORT, getDaysInMonth, getFirstDay } from '../stores/calendar.js'

defineProps({
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  trailingDays: { type: Number, required: true },
  isToday: { type: Function, required: true },
  isWeekend: { type: Function, required: true },
  isSelected: { type: Function, required: true },
  getEvents: { type: Function, required: true }
})

defineEmits(['prev-month', 'next-month', 'select-day'])
</script>

<style scoped>
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
  cursor: pointer;
  transition: background 0.12s;
}

.month-day-cell:hover {
  background: #f0f4ff;
}

.month-day-cell.other-month {
  background: #f8fafc;
  cursor: default;
}

.month-day-cell.other-month:hover {
  background: #f8fafc;
}
.month-day-cell.other-month .day-num {
  color: #cbd5e1;
}
.month-day-cell.weekend {
  background: #fafaff;
}

.month-day-cell.selected {
  background: #eef0ff !important;
  outline: 1.5px solid #1a1aff;
  outline-offset: -1.5px;
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
  border-radius: 4px;
  padding: 2px 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.pill-blue {
  background: rgba(26, 26, 255, 0.1);
  color: #1a1aff;
}
.pill-green {
  background: #eaf3de;
  color: #3b6d11;
}
.pill-amber {
  background: #faeeda;
  color: #854f0b;
}
.pill-red {
  background: #fcebeb;
  color: #a32d2d;
}
.pill-purple {
  background: #eeedfe;
  color: #3c3489;
}

.more-badge {
  font-size: 10px;
  color: #94a3b8;
  padding: 0 2px;
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

@media (max-width: 600px) {
  .month-day-cell {
    min-height: 60px;
    padding: 4px;
  }
}
</style>

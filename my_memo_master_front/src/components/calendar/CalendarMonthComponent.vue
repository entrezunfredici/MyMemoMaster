<template>
  <div>
    <div class="month-nav">
      <button class="icon-btn" aria-label="Mois précédent" @click="$emit('prev-month')">&#8592;</button>
      <h2>{{ MONTHS[month] }}</h2>
      <button class="icon-btn" aria-label="Mois suivant" @click="$emit('next-month')">&#8594;</button>
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
        role="button"
        tabindex="0"
        :aria-label="dayLabel(day)"
        :aria-pressed="isSelected(year, month, day)"
        @click="$emit('select-day', year, month, day)"
        @keydown.enter.prevent="$emit('select-day', year, month, day)"
        @keydown.space.prevent="$emit('select-day', year, month, day)"
      >
        <div class="day-num">{{ day }}</div>
        <div
          v-for="(ev, ei) in getEvents(year, month, day).slice(0, 2)"
          :key="ei"
          class="event-pill"
          :class="`pill-${ev.color}`"
        >
          {{ ev.label }}
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
import { MONTHS, DAYS_SHORT, getDaysInMonth, getFirstDay } from '@/helpers/calendar'

const props = defineProps({
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  trailingDays: { type: Number, required: true },
  isToday: { type: Function, required: true },
  isWeekend: { type: Function, required: true },
  isSelected: { type: Function, required: true },
  getEvents: { type: Function, required: true }
})

defineEmits(['prev-month', 'next-month', 'select-day'])

// « 9 Juin 2026, 3 événements » : le jour est un bouton, son nom annonce ce qu'il contient.
const dayLabel = (day) => {
  const count = props.getEvents(props.year, props.month, day).length
  const base = `${day} ${MONTHS[props.month]} ${props.year}`
  return count ? `${base}, ${count} événement${count > 1 ? 's' : ''}` : base
}
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
  color: rgb(var(--accent));
  min-width: 120px;
}

.month-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border: 0.5px solid var(--slate-200);
  border-radius: 12px;
  overflow: hidden;
  background: var(--slate-200);
  gap: 0.5px;
}

.month-day-label {
  font-size: 12px;
  font-weight: 500;
  text-align: center;
  padding: 8px 4px;
  background: var(--slate-50);
  color: var(--slate-500);
}

.month-day-cell {
  min-height: 90px;
  padding: 8px;
  background: rgb(var(--white));
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
  transition: background 0.12s;
}

.month-day-cell:hover {
  background: var(--surface-blue-soft);
}

.month-day-cell.other-month {
  background: var(--slate-50);
  cursor: default;
}

.month-day-cell.other-month:hover {
  background: var(--slate-50);
}
.month-day-cell.other-month .day-num {
  color: var(--slate-500);
}
.month-day-cell.weekend {
  background: var(--surface-tint);
}

.month-day-cell.selected {
  background: var(--surface-indigo-soft) !important;
  outline: 1.5px solid rgb(var(--accent));
  outline-offset: -1.5px;
}

.day-num {
  font-size: 13px;
  font-weight: 500;
  color: var(--slate-700);
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
}

.month-day-cell.today .day-num {
  background: rgb(var(--accent));
  color: rgb(var(--white));
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
  background: rgb(var(--accent) / 0.1);
  color: rgb(var(--accent));
}
.pill-green {
  background: var(--status-green-bg);
  color: var(--status-green-text);
}
.pill-amber {
  background: var(--status-amber-bg);
  color: var(--status-amber-text);
}
.pill-red {
  background: var(--status-red-bg);
  color: var(--status-red-text);
}
.pill-purple {
  background: var(--status-purple-bg);
  color: var(--status-purple-text);
}

.more-badge {
  font-size: 10px;
  /* slate-600 : le jour survolé ou sélectionné a un fond teinté (4,2:1 seulement en slate-500) */
  color: var(--slate-600);
  padding: 0 2px;
}

.icon-btn {
  width: 30px;
  height: 30px;
  border: 0.5px solid var(--slate-200);
  border-radius: 8px;
  background: rgb(var(--white));
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--slate-500);
  font-size: 14px;
  transition: background 0.15s;
}

.icon-btn:hover {
  background: var(--slate-100);
}

@media (max-width: 600px) {
  .month-day-cell {
    min-height: 60px;
    padding: 4px;
  }
}
</style>

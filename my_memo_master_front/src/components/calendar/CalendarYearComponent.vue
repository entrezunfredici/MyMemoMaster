<template>
  <div>
    <div class="year-toolbar">
      <div class="year-nav">
        <button class="icon-btn" aria-label="Année précédente" @click="$emit('update:year', year - 1)">&#8592;</button>
        <span class="year-label">{{ year }}</span>
        <button class="icon-btn" aria-label="Année suivante" @click="$emit('update:year', year + 1)">&#8594;</button>
      </div>
    </div>

    <div class="year-grid">
      <div
        v-for="(m, idx) in MONTHS"
        :key="idx"
        class="month-block"
        role="button"
        tabindex="0"
        :aria-label="`${MONTHS[idx]} ${year}`"
        @click="$emit('go-to-month', idx)"
        @keydown.enter.prevent="$emit('go-to-month', idx)"
        @keydown.space.prevent="$emit('go-to-month', idx)"
      >
        <h3>{{ m.toUpperCase() }}</h3>
        <div class="mini-grid">
          <span v-for="d in DAYS_SHORT" :key="d" class="mini-label">{{ d[0] }}</span>
          <span v-for="_ in getFirstDay(year, idx)" :key="'e' + _" class="mini-cell" />
          <span
            v-for="day in getDaysInMonth(year, idx)"
            :key="day"
            class="mini-cell"
            :class="{
              today: isToday(year, idx, day),
              'has-event': hasEvent(year, idx, day)
            }"
            >{{ day }}</span
          >
        </div>
      </div>

      <div class="year-number-cell" style="grid-column: span 3">
        <span class="year-number">{{ year }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { MONTHS, DAYS_SHORT, getDaysInMonth, getFirstDay } from '@/helpers/calendar'

defineProps({
  year: { type: Number, required: true },
  isToday: { type: Function, required: true },
  hasEvent: { type: Function, required: true }
})

defineEmits(['update:year', 'go-to-month'])
</script>

<style scoped>
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

.year-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
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
  color: rgb(var(--accent));
  line-height: 1;
  letter-spacing: -4px;
}

.month-block {
  background: rgb(var(--white));
  border: 0.5px solid var(--slate-200);
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
  transition: border-color 0.15s;
}

.month-block:hover {
  border-color: rgb(var(--accent));
}

.month-block h3 {
  font-size: 11px;
  font-weight: 600;
  color: var(--slate-500);
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
  color: var(--slate-500);
  text-align: center;
  padding: 1px 0;
}

.mini-cell {
  font-size: 9px;
  text-align: center;
  padding: 2px 1px;
  border-radius: 3px;
  color: var(--slate-700);
}

.mini-cell.today {
  background: rgb(var(--accent));
  color: rgb(var(--white));
}

.mini-cell.has-event {
  background: rgb(var(--accent) / 0.12);
  color: rgb(var(--accent));
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
}
</style>

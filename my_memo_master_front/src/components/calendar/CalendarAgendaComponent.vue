<template>
  <aside class="cal-agenda" aria-label="Agenda et à-faire">
    <!-- Onglets Agenda / To-do -->
    <div class="sidebar-tabs">
      <button
        type="button"
        class="sidebar-tab"
        :class="{ active: tab === 'agenda' }"
        :aria-pressed="tab === 'agenda'"
        @click="tab = 'agenda'"
      >Agenda</button>
      <button
        type="button"
        class="sidebar-tab"
        :class="{ active: tab === 'todo' }"
        :aria-pressed="tab === 'todo'"
        @click="tab = 'todo'"
      >To-do</button>
    </div>

    <!-- Contenu To-do -->
    <template v-if="tab === 'todo'">
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

      <!-- Légende : même registre de types que le calendrier -->
      <div class="agenda-section agenda-legend">
        <h4 class="agenda-title">Légende</h4>
        <div v-for="(def, type) in EVENT_TYPES" :key="type" class="legend-item">
          <span class="legend-dot" :class="`legend-dot--${type}`" />
          <span>{{ def.label }}</span>
        </div>
      </div>
    </template>
  </aside>
</template>

<script setup>
// Agenda latéral : en retard, aujourd'hui, à venir (planning), onglet To-do et légende des types.
// Rendu dans `.calendar-page` : ses classes viennent de calendar.css.
import { ref } from 'vue'
import { usePlanningStore } from '@/stores/planning'
import TodoWidget from '@/components/TodoWidget.vue'
import { EVENT_TYPES } from '@/helpers/calendar'

defineProps({
  loading: { type: Boolean, default: false },
})

const planningStore = usePlanningStore()
const tab = ref('agenda')

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
</script>

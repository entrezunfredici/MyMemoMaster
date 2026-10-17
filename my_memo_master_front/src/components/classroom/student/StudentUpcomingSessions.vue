<template>
  <section class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-3">
    <h2 class="text-lg font-semibold text-dark">Prochaines séances</h2>
    <div v-if="loading" class="text-sm text-dark/60">Chargement...</div>
    <div v-else-if="upcomingOccurrences.length === 0" class="text-sm text-dark/60">Aucune séance prévue.</div>
    <div v-else class="space-y-2">
      <div v-for="occ in upcomingOccurrences" :key="occ.id"
        class="rounded-xl border border-gray px-4 py-3 flex items-center justify-between">
        <div>
          <p class="text-sm font-semibold text-dark">{{ occ.calendarEvent?.name }}</p>
          <p class="text-xs text-dark/60">{{ formatDate(occ.date) }} · {{ occ.startTime?.slice(0,5) }} – {{ occ.endTime?.slice(0,5) }}</p>
        </div>
        <span :class="eventTypeBadgeClass(occ.calendarEvent?.type)">{{ eventTypeLabel(occ.calendarEvent?.type) }}</span>
      </div>
    </div>
  </section>
</template>

<script setup>
// Prochaines séances du groupe (jamais filtrées par la recherche). Extrait de pages/ClassroomEtudiantView.vue.
import { computed } from 'vue'
import { useCalendarEventStore } from '@/stores/calendarEvents'
import { formatDate, eventTypeBadgeClass, eventTypeLabel } from '@/helpers/classroomFormat'

defineProps({
  loading: { type: Boolean, default: false },
})

const calendarStore = useCalendarEventStore()

// Les 10 prochaines séances à venir du groupe, de la plus proche à la plus lointaine
const upcomingOccurrences = computed(() => {
  const now = new Date()
  const all = calendarStore.groupEvents.flatMap((ev) =>
    (ev.occurrences ?? []).map((o) => ({ ...o, calendarEvent: ev }))
  )
  return all
    .filter((o) => new Date(`${o.date}T${o.startTime}`) > now)
    .sort((a, b) => new Date(`${a.date}T${a.startTime}`) - new Date(`${b.date}T${b.startTime}`))
    .slice(0, 10)
})
</script>

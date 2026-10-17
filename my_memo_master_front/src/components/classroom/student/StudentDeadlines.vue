<template>
  <section class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-3">
    <h2 class="text-lg font-semibold text-dark">Échéances à venir</h2>
    <div v-if="loading" class="text-sm text-dark/60">Chargement...</div>
    <div v-else-if="upcomingDeadlines.length === 0" class="text-sm text-dark/60">Aucune échéance prévue.</div>
    <div v-else class="space-y-2">
      <div v-for="dl in upcomingDeadlines" :key="dl.id"
        :class="['rounded-xl border px-4 py-3', isUrgent(dl.dueDate) ? 'border-secondary/50 bg-secondary/5' : 'border-gray']">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-semibold text-dark">{{ dl.name }}</p>
            <p class="text-xs text-dark/60">
              Séance : {{ dl.occurrence?.calendarEvent?.name }} ·
              <span :class="isUrgent(dl.dueDate) ? 'text-secondary font-semibold' : ''">
                {{ formatDate(dl.dueDate) }}{{ dl.dueTime ? ' à ' + dl.dueTime.slice(0,5) : '' }}
              </span>
            </p>
            <router-link v-if="dl.test"
              :to="{ name: 'exercise-detail', params: { id: dl.test.testId } }"
              class="mt-1 inline-block text-xs text-primary underline hover:text-primary/80">
              Voir l'exercice : {{ dl.test.name }}
            </router-link>
          </div>
          <span class="rounded-full bg-gray px-2 py-1 text-xs text-dark/70">{{ deadlineTypeLabel(dl.type) }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
// Échéances à venir sur les séances du groupe (jamais filtrées par la recherche). Extrait de pages/ClassroomEtudiantView.vue.
import { computed } from 'vue'
import { useDeadlineStore } from '@/stores/deadlines'
import { deadlineTypeLabel, formatDate, isUrgent } from '@/helpers/classroomFormat'

defineProps({
  loading: { type: Boolean, default: false },
})

const deadlineStore = useDeadlineStore()

// Les 10 prochaines échéances du groupe
const upcomingDeadlines = computed(() => {
  const now = new Date()
  return deadlineStore.groupDeadlines
    .filter((d) => new Date(d.dueDate) >= now)
    .slice(0, 10)
})
</script>

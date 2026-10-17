<template>
  <!-- Échéances liées à cet exercice -->
  <div v-if="deadlineStore.testDeadlines.length" class="mt-12 border-t border-gray-200 pt-8">
    <h2 class="text-xl font-bold text-heading mb-4">Échéances liées à cet exercice</h2>
    <div class="space-y-2">
      <div v-for="dl in deadlineStore.testDeadlines" :key="dl.id"
        class="rounded-lg border border-gray-200 px-4 py-3 flex items-center justify-between">
        <div>
          <p class="text-sm font-semibold text-gray-800">{{ dl.name }}</p>
          <p class="text-xs text-gray-500">
            {{ dl.occurrence?.calendarEvent?.name }} ·
            {{ formatDeadlineDate(dl.dueDate) }}
            <span v-if="dl.dueTime"> à {{ dl.dueTime.slice(0,5) }}</span>
          </p>
        </div>
        <span class="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">{{ deadlineTypeLabel(dl.type) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
// Échéances posées par des enseignants sur cet exercice. Extrait de pages/ExerciseDetailPage.vue.
import { useDeadlineStore } from '@/stores/deadlines'
import { deadlineTypeLabel } from '@/helpers/classroomFormat'
import { formatDeadlineDate } from '@/helpers/exerciseQuiz'

const deadlineStore = useDeadlineStore()
</script>

<template>
  <!-- Historique des résultats -->
  <div v-if="history.length" class="mt-12 border-t border-gray-200 pt-8">
    <h2 class="text-xl font-bold text-heading mb-4">Historique de vos résultats</h2>
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <caption class="sr-only">Historique de vos résultats</caption>
        <thead>
          <tr class="bg-gray-100 text-left">
            <th scope="col" class="px-4 py-2 rounded-tl-lg font-semibold text-gray-600">Date</th>
            <th scope="col" class="px-4 py-2 font-semibold text-gray-600">Score</th>
            <th scope="col" class="px-4 py-2 rounded-tr-lg font-semibold text-gray-600">Résultat</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="r in history"
            :key="r.resultId"
            class="border-b border-gray-100 hover:bg-gray-50"
          >
            <td class="px-4 py-3 text-gray-600">{{ formatResultDate(r.completedAt) }}</td>
            <td class="px-4 py-3 font-semibold">{{ formatPoints(r.score) }}/{{ r.total }}</td>
            <td class="px-4 py-3">
              <span
                class="px-2 py-1 rounded-full text-xs font-bold"
                :class="(r.score / r.total) >= 0.5 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
              >
                {{ Math.round((r.score / r.total) * 100) }}%
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
// Historique des résultats de l'étudiant sur cet exercice (tableau). Extrait de pages/ExerciseDetailPage.vue.
import { formatPoints, formatResultDate } from '@/helpers/exerciseQuiz'

defineProps({
  // Résultats précédents de l'étudiant pour cet exercice
  history: { type: Array, required: true },
})
</script>

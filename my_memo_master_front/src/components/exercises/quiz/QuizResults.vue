<template>
  <!-- Mode résultats -->
  <!-- RGAA 13.x — zone aria-live toujours montée : le score est annoncé aux
       lecteurs d'écran quand il apparaît (la zone doit précéder le changement) -->
  <div aria-live="polite">
    <div v-if="shown" class="bg-gradient-to-r from-blue-600 to-blue-700 p-8 rounded-lg text-white text-center mb-8">
      <h2 class="text-3xl font-bold mb-2">Votre score</h2>
      <p class="text-5xl font-bold">{{ formatPoints(correctCount) }}/{{ questions.length }}</p>
      <p class="text-lg mt-2">{{ Math.round((correctCount / questions.length) * 100) }}%</p>
    </div>
  </div>
  <div v-if="shown" class="space-y-6">

    <!-- Détail par question -->
    <div
      v-for="(question, idx) in questions"
      :key="question.idQuestion"
      class="bg-gray-50 p-6 rounded-lg border-l-4"
      :class="resultTone(results[idx]).border"
    >
      <div class="flex items-start justify-between mb-3">
        <h3 class="text-lg font-semibold text-heading">Question {{ idx + 1 }}</h3>
        <div class="flex items-center gap-2">
          <span
            v-if="partialPoints(results[idx]) !== null"
            class="text-sm font-semibold text-gray-700"
            data-testid="partial-points"
          >
            Note : {{ formatPoints(partialPoints(results[idx])) }} / 1
          </span>
          <span
            class="font-bold py-1 px-3 rounded text-white text-sm"
            :class="resultTone(results[idx]).badge"
          >
            {{ resultTone(results[idx]).label }}
          </span>
        </div>
      </div>
      <p class="text-base text-body mb-4"><FormulaText :text="question.statement || ''" /></p>
      <img
        v-if="question.imageUrl"
        :src="question.imageUrl"
        :alt="question.imageOriginalName || `Illustration de la question ${idx + 1}`"
        class="max-w-full rounded-lg border border-gray-200 mb-4"
      />

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-white p-4 rounded-lg border border-gray-200">
          <p class="font-semibold text-gray-700 mb-2 text-sm">Votre réponse</p>
          <p class="text-gray-600 text-sm"><FormulaText :text="formatUserAnswer(question, states[idx]?.answer)" /></p>
        </div>
        <div class="bg-white p-4 rounded-lg border border-gray-200">
          <p class="font-semibold text-gray-700 mb-2 text-sm">Réponse attendue</p>
          <p class="text-gray-600 text-sm"><FormulaText :text="formatCorrectAnswer(question)" /></p>
        </div>
      </div>
      <p
        v-if="question.type === 'open' && results[idx]?.explanation"
        class="mt-3 text-xs text-gray-500 italic"
      >
        {{ results[idx].explanation }}
      </p>
      <p
        v-if="results[idx]?.degraded"
        class="mt-1 text-xs text-amber-700"
        role="status"
        data-testid="degraded-notice"
      >
        {{ results[idx].degradedMessage }}
      </p>
    </div>

    <button
      @click="emit('reset')"
      class="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition border-2 border-gray-800"
    >
      Recommencer
    </button>
  </div>
</template>

<script setup>
// Écran de résultats : score annoncé aux lecteurs d'écran, détail de chaque question, bouton « Recommencer ».
// Extrait de pages/ExerciseDetailPage.vue.
import FormulaText from '@/components/FormulaTextComponent.vue'
import { formatCorrectAnswer, formatPoints, formatUserAnswer, partialPoints, resultTone } from '@/helpers/exerciseQuiz'

defineProps({
  questions: { type: Array, required: true },
  // États de réponse et résultats de correction, dans l'ordre des questions
  states: { type: Array, required: true },
  results: { type: Array, required: true },
  correctCount: { type: Number, default: 0 },
  // Les résultats sont-ils affichés ? (la zone aria-live, elle, est TOUJOURS montée)
  shown: { type: Boolean, default: false },
})
const emit = defineEmits(['reset'])
</script>

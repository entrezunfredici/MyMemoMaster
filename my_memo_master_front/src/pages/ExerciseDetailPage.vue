<template>
  <div class="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
    <router-link
      to="/exercises"
      class="mb-6 inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 border-2 border-blue-800 shadow-lg"
    >
      <span class="mr-2">←</span> Retour aux exercices
    </router-link>

    <div v-if="loading" class="text-center text-gray-500 py-16">Chargement...</div>

    <div v-else-if="!test" class="text-center text-gray-500 py-16">Exercice introuvable.</div>

    <div v-else class="bg-white rounded-lg shadow-lg p-4 sm:p-8">
      <h1 class="text-2xl sm:text-4xl font-bold mb-2 text-heading break-words">{{ test.name }}</h1>
      <p class="text-sm text-gray-500 mb-8">{{ test.subject?.name }}</p>

      <!-- Mode quiz -->
      <div v-if="!quiz.resultsShown.value" class="space-y-8">
        <QuizQuestion
          v-for="(question, idx) in questions"
          :key="question.idQuestion"
          :question="question"
          :index="idx"
          :state="quiz.states[idx]"
        />

        <button
          @click="quiz.submit"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition mt-4 border-2 border-blue-800 hover:scale-105"
        >
          Vérifier les résultats
        </button>
      </div>

      <!-- Mode résultats -->
      <QuizResults
        :questions="questions"
        :states="quiz.states"
        :results="quiz.results"
        :correct-count="quiz.correctCount.value"
        :shown="quiz.resultsShown.value"
        @reset="quiz.reset"
      />

      <ExerciseLinkedDeadlines />
      <ExerciseResultHistory :history="resultHistory" />
    </div>
  </div>
</template>

<script setup>
// Page de détail d'un exercice : chargement, puis le quiz (QuizQuestion), l'écran de résultats (QuizResults), les
// échéances liées et l'historique. L'état du quiz (réponses, envoi, résultats, chronomètre) est dans
// useExerciseQuiz ; la logique pure (mélange, formatage, notes) dans helpers/exerciseQuiz.js.
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useTestStore } from '@/stores/tests'
import { useTestResultStore } from '@/stores/testResults'
import { useDeadlineStore } from '@/stores/deadlines'
import { notif } from '@/helpers/notif'
import QuizQuestion from '@/components/exercises/quiz/QuizQuestion.vue'
import QuizResults from '@/components/exercises/quiz/QuizResults.vue'
import ExerciseLinkedDeadlines from '@/components/exercises/quiz/ExerciseLinkedDeadlines.vue'
import ExerciseResultHistory from '@/components/exercises/quiz/ExerciseResultHistory.vue'
import { useExerciseQuiz } from '@/composables/useExerciseQuiz'

const route = useRoute()
const testStore = useTestStore()
const testResultStore = useTestResultStore()
const deadlineStore = useDeadlineStore()

const loading = ref(true)

const test = computed(() => testStore.test?.testId ? testStore.test : null)
const questions = computed(() => test.value?.question ?? [])
const resultHistory = computed(() => testResultStore.results)

const quiz = useExerciseQuiz({ test, questions })

onMounted(async () => {
  const id = Number(route.params.id)
  const [ok] = await Promise.all([
    testStore.fetchTestById(id),
    testResultStore.fetchByTest(id),
    deadlineStore.fetchByTest(id),
  ])
  if (!ok) {
    notif.notify('Exercice introuvable.', 'error')
    loading.value = false
    return
  }
  quiz.start()
  loading.value = false
})
</script>

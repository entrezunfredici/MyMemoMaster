<template>
  <div class="container mx-auto px-4 py-8">
    <router-link to="/exercises" class="mb-6 inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 border-2 border-blue-800 shadow-lg hover:shadow-xl hover:scale-105">
      <span class="mr-2">←</span> Retour aux exercices
    </router-link>

    <div class="bg-white rounded-lg shadow-lg p-8">
      <h1 class="text-4xl font-bold mb-4 text-heading">{{ exercise.title }}</h1>
      <p class="text-lg text-body mb-8">{{ exercise.description }}</p>

      <!-- Quiz Mode - Before submission -->
      <div v-if="!resultsShown" class="space-y-6">
        <div v-for="(question, idx) in exercise.questions" :key="idx" class="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h3 class="text-xl font-semibold text-heading mb-4">Question {{ idx + 1 }}</h3>
          <p class="text-lg text-body mb-4">{{ question.text }}</p>

          <textarea
            v-model="userAnswers[idx]"
            placeholder="Entrez votre réponse ici..."
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            rows="3"
          ></textarea>
        </div>

        <button
          @click="submitAnswers"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200 mt-8 border-2 border-blue-800 hover:scale-105 hover:shadow-xl"
        >
          Vérifier les résultats
        </button>
      </div>

      <!-- Results Mode - After submission -->
      <div v-if="resultsShown" class="space-y-6">
        <!-- Score Card -->
        <div class="bg-gradient-to-r from-blue-500 to-blue-700 p-8 rounded-lg text-white text-center mb-8">
          <h2 class="text-3xl font-bold mb-2">Votre score</h2>
          <p class="text-5xl font-bold">{{ correctCount }}/{{ exercise.questions.length }}</p>
          <p class="text-lg mt-2">{{ Math.round((correctCount / exercise.questions.length) * 100) }}%</p>
        </div>

        <!-- Results for each question -->
        <div v-for="(question, idx) in exercise.questions" :key="idx" class="bg-gray-50 p-6 rounded-lg border-l-4" :class="checkAnswerStatus(idx).borderColor">
          <div class="flex items-start justify-between mb-4">
            <h3 class="text-xl font-semibold text-heading">Question {{ idx + 1 }}</h3>
            <span :class="['font-bold py-1 px-3 rounded text-white text-sm', checkAnswerStatus(idx).badgeColor]">
              {{ checkAnswerStatus(idx).label }}
            </span>
          </div>

          <p class="text-lg text-body mb-6">{{ question.text }}</p>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- User's Answer -->
            <div class="bg-white p-4 rounded-lg border border-gray-300">
              <p class="font-semibold text-gray-700 mb-2">Votre réponse :</p>
              <p class="text-gray-600">{{ userAnswers[idx] || '(Pas de réponse)' }}</p>
            </div>

            <!-- Correct Answer -->
            <div class="bg-green-50 p-4 rounded-lg border border-green-300">
              <p class="font-semibold text-green-700 mb-2">Réponse correcte :</p>
              <p class="text-green-600">{{ question.answer }}</p>
            </div>
          </div>
        </div>

        <button
          @click="restartQuiz"
          class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200 mt-8 border-2 border-green-800 hover:scale-105 hover:shadow-xl"
        >
          Recommencer l'exercice
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'
import { ref, onMounted, computed } from 'vue'

const route = useRoute()
const resultsShown = ref(false)
const userAnswers = ref({})
const exercise = ref({
  title: 'Exercice',
  description: 'Description de l\'exercice',
  questions: [],
})

// Load exercise data from sessionStorage
onMounted(() => {
  const exerciseId = parseInt(route.params.id)
  const savedExercises = sessionStorage.getItem('exercises')

  if (savedExercises) {
    const exercises = JSON.parse(savedExercises)
    const found = exercises.find(ex => ex.id === exerciseId)

    if (found) {
      exercise.value = found
      // Initialize userAnswers object
      found.questions.forEach((_, idx) => {
        userAnswers.value[idx] = ''
      })
    }
  }
})

// Compute correct count
const correctCount = computed(() => {
  let count = 0
  exercise.value.questions.forEach((question, idx) => {
    if (userAnswers.value[idx] && userAnswers.value[idx].toLowerCase().trim() === question.answer.toLowerCase().trim()) {
      count++
    }
  })
  return count
})

const submitAnswers = () => {
  resultsShown.value = true
}

const restartQuiz = () => {
  resultsShown.value = false
  exercise.value.questions.forEach((_, idx) => {
    userAnswers.value[idx] = ''
  })
}

const checkAnswerStatus = (index) => {
  const userAnswer = userAnswers.value[index] || ''
  const correctAnswer = exercise.value.questions[index].answer
  const isCorrect = userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim()

  return {
    isCorrect,
    label: isCorrect ? '✓ Correct' : '✗ Incorrect',
    badgeColor: isCorrect ? 'bg-green-500' : 'bg-red-500',
    borderColor: isCorrect ? 'border-green-500' : 'border-red-500',
  }
}
</script>

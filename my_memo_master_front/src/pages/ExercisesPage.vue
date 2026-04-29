<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->

    <!-- Search Bar and Button -->
    <div class="mb-8 flex gap-4 items-center">
      <div class="relative flex-1 max-w-2xl">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Rechercher un exercice..."
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
        <span class="absolute right-4 top-3.5 text-gray-400">🔍</span>
      </div>
      <button
        @click="openModal"
        class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition duration-200 whitespace-nowrap ml-auto shadow-lg hover:shadow-xl hover:scale-105 border-2 border-blue-800"
      >
        + Ajouter un exercice
      </button>
    </div>


    <!-- Module Filter and Counter -->
    <div class="mb-8">
      <div class="flex gap-4 flex-wrap items-center mb-4">
        <label class="text-sm font-semibold text-heading">Filtrer par module :</label>
        <button
          v-for="mod in allModules"
          :key="mod"
          @click="selectedModule = selectedModule === mod ? null : mod"
          :class="['px-4 py-2 rounded-lg font-semibold transition duration-200 border-2 hover:scale-105', selectedModule === mod ? 'bg-blue-700 text-white border-blue-900 shadow-xl scale-105 ring-2 ring-blue-400' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-lg border-gray-300']"
        >
          {{ mod }}
        </button>
        <button
          v-if="selectedModule"
          @click="selectedModule = null"
          class="px-4 py-2 rounded-lg font-semibold transition duration-200 bg-red-600 hover:bg-red-700 text-white border-2 border-red-800 hover:scale-105 hover:shadow-lg"
        >
          Réinitialiser les filtres
        </button>
      </div>
      <div class="text-sm text-gray-600">
        <strong>{{ filteredExercises.length }}</strong> exercice<span v-if="filteredExercises.length !== 1">s</span> trouvé<span v-if="filteredExercises.length !== 1">s</span>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="exercise in filteredExercises"
        :key="exercise.id"
        class="bg-neutral-primary-soft block p-6 border border-default rounded-base shadow-xs hover:bg-neutral-secondary-medium hover:shadow-lg transition-all duration-200 flex flex-col h-full"
      >
        <!-- Header with title and action buttons -->
        <div class="flex items-start justify-between gap-4 mb-4">
          <h5 class="text-2xl font-semibold tracking-tight text-heading leading-8">{{ exercise.title }}</h5>
          <!-- Edit and Delete buttons -->
          <div class="flex gap-2 flex-shrink-0">
            <button
              @click="editExercise(exercise)"
              class="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-1 px-2 rounded transition duration-200 border-2 border-yellow-800 hover:scale-110 hover:shadow-lg"
              title="Modifier"
            >
              ✎
            </button>
            <button
              @click="deleteExercise(exercise.id)"
              class="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded transition duration-200 border-2 border-red-800 hover:scale-110 hover:shadow-lg"
              title="Supprimer"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Exercise content -->
        <div class="mb-4 flex-1">
          <p class="text-body">{{ exercise.description }}</p>
          <div class="flex items-center gap-3 mt-4">
            <p class="text-sm text-gray-500">{{ exercise.questions.length }} questions</p>
            <span class="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">{{ exercise.module }}</span>
          </div>
        </div>

        <!-- Start Exercise button at bottom -->
        <button
          @click="navigateToExercise(exercise.id)"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 mt-4 border-2 border-blue-800 hover:scale-105 hover:shadow-lg"
        >
          Commencer l'exercice
        </button>
      </div>
    </div>

    <!-- Modal Backdrop -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-gray-500 flex items-center justify-center z-50"

      @click="closeModal"
    >
      <!-- Modal Content -->
      <div
        class="bg-white rounded-lg shadow-lg p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        style="background-color:white"
        @click.stop
      >
        <h2 class="text-2xl font-bold mb-6 text-heading">{{ editingId ? 'Modifier l\'exercice' : 'Ajouter un nouvel exercice' }}</h2>

        <form @submit.prevent="submitExercise">
          <div class="mb-4">
            <label class="block text-sm font-semibold text-heading mb-2">Titre</label>
            <input
              v-model="newExercise.title"
              type="text"
              placeholder="Titre de l'exercice"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>

          <div class="mb-4">
            <label class="block text-sm font-semibold text-heading mb-2">Module</label>
            <select
              v-model="newExercise.module"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            >
              <option value="">Sélectionner un module</option>
              <option value="Mathématiques">Mathématiques</option>
              <option value="Physique">Physique</option>
              <option value="Science Ingénieur">Science Ingénieur</option>
              <option value="Anglais">Anglais</option>
              <option value="Communication">Communication</option>
              <option value="Informatique">Informatique</option>
            </select>
          </div>

          <div class="mb-4">
            <label class="block text-sm font-semibold text-heading mb-2">Description</label>
            <textarea
              v-model="newExercise.description"
              placeholder="Description de l'exercice"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              rows="3"
              required
            ></textarea>
          </div>

          <div class="mb-6">
            <div class="flex justify-between items-center mb-4">
              <label class="block text-sm font-semibold text-heading">Questions</label>
              <button
                type="button"
                @click="addQuestion"
                class="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm transition duration-200 border-2 border-green-800 hover:scale-105 hover:shadow-lg"
              >
                + Ajouter une question
              </button>
            </div>

            <div class="space-y-4">
              <div v-for="(q, idx) in newExercise.questions" :key="idx" class="bg-gray-100 p-4 rounded-lg">
                <div class="mb-3">
                  <label class="block text-sm font-semibold text-heading mb-2">Question {{ idx + 1 }}</label>
                  <input
                    v-model="q.text"
                    type="text"
                    placeholder="Entrez la question"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>

                <div class="mb-3">
                  <label class="block text-sm font-semibold text-heading mb-2">Réponse/Solution</label>
                  <textarea
                    v-model="q.answer"
                    placeholder="Entrez la réponse"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    rows="2"
                    required
                  ></textarea>
                </div>

                <button
                  v-if="newExercise.questions.length > 1"
                  type="button"
                  @click="removeQuestion(idx)"
                  class="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm transition duration-200 border-2 border-red-800 hover:scale-105 hover:shadow-lg"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>

          <div class="flex gap-4">
            <button
              type="submit"
              class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 border-2 border-blue-800 hover:scale-105 hover:shadow-lg"
            >
              {{ editingId ? 'Modifier l\'exercice' : 'Ajouter un exercice' }}
            </button>
            <button
              type="button"
              @click="closeModal"
              class="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 border-2 border-gray-800 hover:scale-105 hover:shadow-lg"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import Button from '@/components/ButtonComponent.vue'

const router = useRouter()
const showModal = ref(false)
const nextId = ref(5)
const editingId = ref(null)
const selectedModule = ref(null)
const searchQuery = ref('')

const allModules = [
  'Mathématiques',
  'Physique',
  'Science Ingénieur',
  'Anglais',
  'Communication',
  'Informatique',
]

const newExercise = reactive({
  title: '',
  description: '',
  module: '',
  questions: [{ text: '', answer: '' }],
})

const defaultExercises = [
  {
    id: 1,
    title: 'Équations du second degré',
    description: 'Résoudre des équations quadratiques et trouver les racines',
    module: 'Mathématiques',
    questions: [
      {
        text: 'Résoudre l\'équation: x² - 5x + 6 = 0',
        answer: 'Les solutions sont x = 2 et x = 3'
      },
      {
        text: 'Trouver le discriminant de: 2x² + 3x - 5 = 0',
        answer: 'Le discriminant est 49'
      }
    ]
  },
  {
    id: 2,
    title: 'Variables et Types en Python',
    description: 'Comprendre les variables, les types de données et les opérations basiques en Python',
    module: 'Informatique',
    questions: [
      {
        text: 'Quelle est la différence entre int et float en Python?',
        answer: 'int représente les nombres entiers, float représente les nombres décimaux'
      },
      {
        text: 'Comment créer une variable "nom" avec la valeur "Alice"?',
        answer: 'nom = "Alice"'
      }
    ]
  },
  {
    id: 3,
    title: 'Les Structures de Contrôle',
    description: 'Maîtriser les boucles et les conditions en programmation',
    module: 'Informatique',
    questions: [
      {
        text: 'Expliquer la différence entre une boucle for et une boucle while',
        answer: 'La boucle for itère sur une séquence connue, while répète tant qu\'une condition est vraie'
      },
      {
        text: 'Écrire un code qui affiche les nombres de 1 à 5',
        answer: 'for i in range(1, 6):\n    print(i)'
      }
    ]
  },
  {
    id: 4,
    title: 'Present Simple Tense',
    description: 'Master the usage and formation of present simple tense in English',
    module: 'Anglais',
    questions: [
      {
        text: 'What is the present simple tense used for?',
        answer: 'It is used to describe habits, general truths, and regular actions that happen repeatedly'
      },
      {
        text: 'Fill in the blank: She _____ coffee every morning. (drink)',
        answer: 'drinks (third person singular form)'
      }
    ]
  }
]

const exercises = reactive([...defaultExercises])

// Computed property for filtered exercises
const filteredExercises = computed(() => {
  let filtered = exercises

  // Apply module filter
  if (selectedModule.value) {
    filtered = filtered.filter(ex => ex.module === selectedModule.value)
  }

  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(ex => ex.title.toLowerCase().includes(query))
  }

  return filtered
})

// Load exercises from sessionStorage on mount
onMounted(() => {
  const savedExercises = sessionStorage.getItem('exercises')
  if (savedExercises) {
    try {
      const parsed = JSON.parse(savedExercises)
      // Merge with default exercises, avoiding duplicates
      const defaultIds = new Set(defaultExercises.map(e => e.id))
      const additionalExercises = parsed.filter(e => !defaultIds.has(e.id))

      // Clear and repopulate with defaults + additional exercises
      exercises.splice(0, exercises.length, ...defaultExercises, ...additionalExercises)

      // Update nextId based on all exercises
      if (exercises.length > 0) {
        nextId.value = Math.max(...exercises.map(e => e.id)) + 1
      }
    } catch (e) {
      console.error('Error parsing saved exercises:', e)
      exercises.splice(0, exercises.length, ...defaultExercises)
    }
  } else {
    exercises.splice(0, exercises.length, ...defaultExercises)
  }

  // Always save the current state to sessionStorage (ensures defaults are persisted)
  sessionStorage.setItem('exercises', JSON.stringify(exercises))
})

const navigateToExercise = (exerciseId) => {
  router.push({ name: 'exercise-detail', params: { id: exerciseId } })
}

const openModal = () => {
  editingId.value = null
  resetForm()
  showModal.value = true
}

const editExercise = (exercise) => {
  editingId.value = exercise.id
  newExercise.title = exercise.title
  newExercise.description = exercise.description
  newExercise.module = exercise.module || ''
  newExercise.questions = JSON.parse(JSON.stringify(exercise.questions))
  showModal.value = true
}

const deleteExercise = (id) => {
  if (confirm('Êtes-vous sûr de vouloir supprimer cet exercice?')) {
    const index = exercises.findIndex(e => e.id === id)
    if (index > -1) {
      exercises.splice(index, 1)
      sessionStorage.setItem('exercises', JSON.stringify(exercises))
    }
  }
}

const closeModal = () => {
  showModal.value = false
  editingId.value = null
  resetForm()
}

const resetForm = () => {
  newExercise.title = ''
  newExercise.description = ''
  newExercise.module = ''
  newExercise.questions = [{ text: '', answer: '' }]
}

const addQuestion = () => {
  newExercise.questions.push({ text: '', answer: '' })
}

const removeQuestion = (index) => {
  newExercise.questions.splice(index, 1)
}

const submitExercise = () => {
  // Validate all questions are filled
  const allQuestionsFilled = newExercise.questions.every(q => q.text && q.answer)

  if (newExercise.title && newExercise.description && newExercise.module && newExercise.questions.length > 0 && allQuestionsFilled) {
    if (editingId.value) {
      // Update existing exercise
      const exerciseIndex = exercises.findIndex(e => e.id === editingId.value)
      if (exerciseIndex > -1) {
        exercises[exerciseIndex] = {
          id: editingId.value,
          title: newExercise.title,
          description: newExercise.description,
          module: newExercise.module,
          questions: JSON.parse(JSON.stringify(newExercise.questions)),
        }
      }
    } else {
      // Add new exercise
      const newEx = {
        id: nextId.value,
        title: newExercise.title,
        description: newExercise.description,
        module: newExercise.module,
        questions: JSON.parse(JSON.stringify(newExercise.questions)),
      }
      exercises.push(newEx)
      nextId.value++
    }

    // Save to sessionStorage
    sessionStorage.setItem('exercises', JSON.stringify(exercises))

    closeModal()
  } else {
    alert('Veuillez remplir tous les champs')
  }
}
</script>

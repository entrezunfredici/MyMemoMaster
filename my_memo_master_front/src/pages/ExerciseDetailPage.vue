<template>
  <div class="container mx-auto px-4 py-8">
    <router-link
      to="/exercises"
      class="mb-6 inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 border-2 border-blue-800 shadow-lg"
    >
      <span class="mr-2">←</span> Retour aux exercices
    </router-link>

    <div v-if="loading" class="text-center text-gray-400 py-16">Chargement...</div>

    <div v-else-if="!test" class="text-center text-gray-400 py-16">Exercice introuvable.</div>

    <div v-else class="bg-white rounded-lg shadow-lg p-8">
      <h1 class="text-4xl font-bold mb-2 text-heading">{{ test.name }}</h1>
      <p class="text-sm text-gray-400 mb-8">{{ test.subject?.name }}</p>

      <!-- Mode quiz -->
      <div v-if="!resultsShown" class="space-y-8">
        <div
          v-for="(question, idx) in questions"
          :key="question.idQuestion"
          class="bg-gray-50 p-6 rounded-lg border border-gray-200"
        >
          <h3 class="text-lg font-semibold text-heading mb-4">Question {{ idx + 1 }}</h3>
          <p class="text-base text-body mb-5">{{ question.statement }}</p>

          <!-- open -->
          <template v-if="question.type === 'open'">
            <textarea
              v-model="userAnswers[idx]"
              placeholder="Entrez votre réponse ici..."
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              rows="3"
            />
          </template>

          <!-- mcq -->
          <template v-else-if="question.type === 'mcq'">
            <div class="space-y-2">
              <label
                v-for="(opt, oi) in question.content?.options"
                :key="oi"
                class="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition"
                :class="userAnswers[idx] === oi ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'"
              >
                <input
                  type="radio"
                  :name="`q-${idx}`"
                  :checked="userAnswers[idx] === oi"
                  @change="userAnswers[idx] = oi"
                  class="accent-blue-600"
                />
                <span>{{ opt.text }}</span>
              </label>
            </div>
          </template>

          <!-- fill_blank -->
          <template v-else-if="question.type === 'fill_blank'">
            <div class="prose text-base mb-4 leading-relaxed">
              <span
                v-for="(part, pi) in parsedTemplate(question)"
                :key="pi"
              >
                <span v-if="part.type === 'text'">{{ part.value }}</span>
                <input
                  v-else
                  v-model="userAnswers[idx][part.index]"
                  type="text"
                  :placeholder="`trou ${part.index}`"
                  class="inline-block border-b-2 border-blue-400 bg-transparent text-center w-28 mx-1 focus:outline-none focus:border-blue-600"
                />
              </span>
            </div>
          </template>

          <!-- reorder -->
          <template v-else-if="question.type === 'reorder'">
            <p class="text-sm text-gray-500 mb-3">Clique sur les fragments dans le bon ordre :</p>
            <!-- Fragments disponibles -->
            <div class="flex flex-wrap gap-2 mb-4">
              <button
                v-for="(frag, fi) in shuffledFragments[idx]"
                :key="fi"
                type="button"
                :disabled="selectedFragments[idx].includes(fi)"
                @click="selectFragment(idx, fi)"
                class="px-3 py-1.5 border-2 rounded-lg text-sm font-medium transition"
                :class="selectedFragments[idx].includes(fi) ? 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed' : 'border-blue-400 text-blue-700 hover:bg-blue-50'"
              >
                {{ frag }}
              </button>
            </div>
            <!-- Réponse en cours de construction -->
            <div class="min-h-10 flex flex-wrap gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg">
              <span class="text-gray-400 text-sm italic" v-if="!selectedFragments[idx].length">Sélectionne les fragments ci-dessus...</span>
              <button
                v-for="(fi, pos) in selectedFragments[idx]"
                :key="pos"
                type="button"
                @click="unselectFragment(idx, pos)"
                class="px-3 py-1.5 border-2 border-green-400 text-green-700 rounded-lg text-sm font-medium hover:bg-red-50 hover:border-red-400 hover:text-red-700 transition"
                title="Cliquer pour retirer"
              >
                {{ shuffledFragments[idx][fi] }}
              </button>
            </div>
          </template>
        </div>

        <button
          @click="submitAnswers"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition mt-4 border-2 border-blue-800 hover:scale-105"
        >
          Vérifier les résultats
        </button>
      </div>

      <!-- Mode résultats -->
      <div v-if="resultsShown" class="space-y-6">
        <!-- Score -->
        <div class="bg-gradient-to-r from-blue-500 to-blue-700 p-8 rounded-lg text-white text-center mb-8">
          <h2 class="text-3xl font-bold mb-2">Votre score</h2>
          <p class="text-5xl font-bold">{{ correctCount }}/{{ questions.length }}</p>
          <p class="text-lg mt-2">{{ Math.round((correctCount / questions.length) * 100) }}%</p>
        </div>

        <!-- Détail par question -->
        <div
          v-for="(question, idx) in questions"
          :key="question.idQuestion"
          class="bg-gray-50 p-6 rounded-lg border-l-4"
          :class="questionResults[idx]?.correct ? 'border-green-500' : 'border-red-500'"
        >
          <div class="flex items-start justify-between mb-3">
            <h3 class="text-lg font-semibold text-heading">Question {{ idx + 1 }}</h3>
            <span
              class="font-bold py-1 px-3 rounded text-white text-sm"
              :class="questionResults[idx]?.correct ? 'bg-green-500' : 'bg-red-500'"
            >
              {{ questionResults[idx]?.correct ? 'Correct' : 'Incorrect' }}
            </span>
          </div>
          <p class="text-base text-body mb-4">{{ question.statement }}</p>

          <!-- Réponse utilisateur + correction selon type -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-white p-4 rounded-lg border border-gray-200">
              <p class="font-semibold text-gray-700 mb-2 text-sm">Votre réponse</p>
              <p class="text-gray-600 text-sm">{{ formatUserAnswer(question, idx) }}</p>
            </div>
            <div class="bg-white p-4 rounded-lg border border-gray-200">
              <p class="font-semibold text-gray-700 mb-2 text-sm">Réponse attendue</p>
              <p class="text-gray-600 text-sm">{{ formatCorrectAnswer(question) }}</p>
            </div>
          </div>
        </div>

        <button
          @click="resetQuiz"
          class="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition border-2 border-gray-800"
        >
          Recommencer
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useTestStore } from '@/stores/tests'
import { notif } from '@/helpers/notif'

const route = useRoute()
const testStore = useTestStore()

const loading = ref(true)
const resultsShown = ref(false)

const test = computed(() => testStore.test?.testId ? testStore.test : null)
const questions = computed(() => test.value?.question ?? [])

// Réponses utilisateur (structure varie par type)
const userAnswers = reactive([])
// Pour reorder : indices des fragments sélectionnés dans l'ordre
const selectedFragments = reactive([])
// Pour reorder : fragments mélangés
const shuffledFragments = reactive([])

const questionResults = reactive([])
const correctCount = ref(0)

// ── lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  const id = Number(route.params.id)
  const ok = await testStore.fetchTestById(id)
  if (!ok) {
    notif.notify('Exercice introuvable.', 'error')
    loading.value = false
    return
  }
  initAnswers()
  loading.value = false
})

function initAnswers() {
  userAnswers.splice(0)
  selectedFragments.splice(0)
  shuffledFragments.splice(0)

  questions.value.forEach((q) => {
    if (q.type === 'open') {
      userAnswers.push('')
    } else if (q.type === 'mcq') {
      userAnswers.push(null)
    } else if (q.type === 'fill_blank') {
      const count = (q.content?.blanks ?? []).length
      userAnswers.push(Array(count).fill(''))
    } else if (q.type === 'reorder') {
      userAnswers.push([])
      selectedFragments.push([])
      // mélanger les fragments
      const frags = [...(q.content?.fragments ?? [])]
      shuffled(frags)
      shuffledFragments.push(frags)
      return
    }
    // placeholder pour les autres types (alignement d'index)
    if (q.type !== 'reorder') {
      selectedFragments.push([])
      shuffledFragments.push([])
    }
  })
}

// Fisher-Yates shuffle in-place
function shuffled(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

// ── fill_blank : parsing du template ─────────────────────────────────────────

function parsedTemplate(question) {
  const template = question.content?.template ?? ''
  const parts = []
  let lastIndex = 0
  const regex = /\{\{(\d+)\}\}/g
  let match
  while ((match = regex.exec(template)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: template.slice(lastIndex, match.index) })
    }
    parts.push({ type: 'blank', index: parseInt(match[1]) })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < template.length) {
    parts.push({ type: 'text', value: template.slice(lastIndex) })
  }
  return parts
}

// ── reorder : sélection des fragments ────────────────────────────────────────

function selectFragment(qIdx, fragIdx) {
  selectedFragments[qIdx].push(fragIdx)
  userAnswers[qIdx] = selectedFragments[qIdx].map(fi => shuffledFragments[qIdx][fi])
}

function unselectFragment(qIdx, pos) {
  selectedFragments[qIdx].splice(pos, 1)
  userAnswers[qIdx] = selectedFragments[qIdx].map(fi => shuffledFragments[qIdx][fi])
}

// ── correction ────────────────────────────────────────────────────────────────

function checkAnswer(question, idx) {
  const content = question.content ?? {}
  switch (question.type) {
    case 'open': {
      const userAns = (userAnswers[idx] ?? '').trim().toLowerCase()
      const correct = (content.correct_answer ?? '').trim().toLowerCase()
      return userAns === correct
    }
    case 'mcq': {
      const chosen = userAnswers[idx]
      const opts = content.options ?? []
      return chosen !== null && opts[chosen]?.correct === true
    }
    case 'fill_blank': {
      const blanks = content.blanks ?? []
      const answers = userAnswers[idx] ?? []
      return blanks.every((b, i) =>
        (answers[i] ?? '').trim().toLowerCase() === b.trim().toLowerCase()
      )
    }
    case 'reorder': {
      const expected = content.fragments ?? []
      const given = userAnswers[idx] ?? []
      return (
        given.length === expected.length &&
        expected.every((frag, i) => frag === given[i])
      )
    }
    default:
      return false
  }
}

function submitAnswers() {
  questionResults.splice(0)
  let score = 0
  questions.value.forEach((q, idx) => {
    const correct = checkAnswer(q, idx)
    questionResults.push({ correct })
    if (correct) score++
  })
  correctCount.value = score
  resultsShown.value = true
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function resetQuiz() {
  resultsShown.value = false
  initAnswers()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// ── affichage correction ──────────────────────────────────────────────────────

function formatUserAnswer(question, idx) {
  const ans = userAnswers[idx]
  switch (question.type) {
    case 'open':
      return ans || '(Pas de réponse)'
    case 'mcq': {
      const opts = question.content?.options ?? []
      return ans !== null && opts[ans] ? opts[ans].text : '(Pas de réponse)'
    }
    case 'fill_blank':
      return (ans ?? []).join(' / ') || '(Pas de réponse)'
    case 'reorder':
      return (ans ?? []).join(' ') || '(Pas de réponse)'
    default:
      return '—'
  }
}

function formatCorrectAnswer(question) {
  const content = question.content ?? {}
  switch (question.type) {
    case 'open':
      return content.correct_answer ?? '—'
    case 'mcq': {
      const correct = (content.options ?? []).find(o => o.correct)
      return correct?.text ?? '—'
    }
    case 'fill_blank':
      return (content.blanks ?? []).join(' / ')
    case 'reorder':
      return (content.fragments ?? []).join(' ')
    default:
      return '—'
  }
}
</script>

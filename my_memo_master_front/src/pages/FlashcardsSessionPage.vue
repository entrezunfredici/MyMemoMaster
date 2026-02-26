<template>
  <div class="grid grid-cols-1 grid-rows-2 lg:grid-cols-2 lg:grid-rows-1 gap-1.5 bg-primary rounded-[10px] p-1.5">
    
    <section class="col-span-1 lg:col-span-2 order-2 lg:order-1 p-5 bg-light rounded-[7px] flex flex-col h-full">
      <div class="w-full flex-grow">
        <div class="flex justify-between items-center pb-4">
          <button
            @click="confirmExit"
            class="text-primary font-semibold hover:underline"
          >
            ← Retour
          </button>
          <h4 class="text-primary text-2xl neue-haas-grotesk-r font-semibold">
            Session : {{ sessionName }}
          </h4>
          <span class="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
            {{ currentIndex + 1 }} / {{ cards.length }}
          </span>
        </div>

        <div class="grid grid-cols-5 gap-2 mb-6 text-center">
          <div
            v-for="(count, group) in groupCounts"
            :key="group"
            class="bg-white rounded border border-gray p-1"
          >
            <div class="text-[10px] uppercase text-gray-light font-bold">
              {{ groupLabels[group] }}
            </div>
            <div class="text-sm font-semibold text-primary">
              {{ count }}
            </div>
          </div>
        </div>

        <div v-if="!isFinished" class="space-y-4">
          <div class="py-2">
            <span class="text-sm font-medium text-gray-light uppercase">Question</span>
            <div class="w-full p-3 bg-white border border-gray rounded-lg text-dark font-medium mt-1">
              {{ currentCard.question }}
            </div>
          </div>

          <div class="py-2">
            <span class="text-sm font-medium text-gray-light uppercase">Ta Réponse</span>
            
            <textarea 
              v-if="currentCard.type === 'text'"
              v-model="userAnswer"
              :disabled="showFeedback"
              placeholder="Saisissez votre réponse..." 
              class="w-full p-3 rounded-lg text-dark border-2 border-gray focus:border-primary outline-none transition mt-1"
              rows="3"
            />

            <div v-else class="grid gap-2 mt-1">
              <button 
                v-for="opt in currentCard.options" :key="opt"
                @click="userAnswer = opt"
                :disabled="showFeedback"
                :class="[
                  'w-full p-3 text-left rounded-lg border-2 transition',
                  userAnswer === opt ? 'border-primary bg-primary/5' : 'border-gray bg-white',
                  showFeedback && opt === currentCard.answer ? 'border-green-500 bg-green-50' : '',
                  showFeedback && userAnswer === opt && opt !== currentCard.answer ? 'border-red-500 bg-red-50' : ''
                ]"
              >
                {{ opt }}
              </button>
            </div>
          </div>

          <div v-if="showFeedback" class="p-4 rounded-lg transition-all" :class="isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
            <p class="font-bold mb-1">{{ isCorrect ? '✅ Excellent !' : '❌ À revoir' }}</p>
            <p v-if="!isCorrect" class="text-sm italic">Réponse : {{ currentCard.answer }}</p>
            <Button class="mt-4 w-full" :callback="nextStep">Continuer</Button>
          </div>

          <div v-else class="pb-4 w-full flex justify-center mt-4">
            <Button class="w-full" :callback="handleValidation" :disabled="!userAnswer">Valider</Button>
          </div>
        </div>

        <div v-else class="text-center py-10">
          <h3 class="text-2xl font-bold text-primary mb-4">Session terminée !</h3>
          <p class="mb-6">Vous avez progressé sur {{ cards.length }} notions.</p>
          <Button :callback="reset">Recommencer</Button>
        </div>
      </div>

      <div v-if="!isFinished" class="border-t-2 border-primary mt-6 pt-4">
        <h4 class="text-primary text-lg font-semibold pb-2 italic">Dernières erreurs</h4>
        <div class="flex flex-col gap-2 max-h-32 overflow-y-auto">
          <div v-for="(err, idx) in errors" :key="idx" class="flex justify-between bg-white border border-red-200 rounded-lg px-3 py-2 text-sm">
            <span>{{ err.question }}</span>
            <XMarkIcon class="size-4 text-red-500" />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import Mindmap from '@/components/MindmapComponent.vue'
import Button from '@/components/ButtonComponent.vue'
import { XMarkIcon } from '@heroicons/vue/24/solid'
import { useRouter } from 'vue-router'

const router = useRouter()

const confirmExit = () => {
  const confirmed = window.confirm(
    "⚠️ Attention : la session en cours sera perdue. Voulez-vous vraiment quitter ?"
  )

  if (confirmed) {
    router.push('/flashcards') 
  }
}

// --- DATA & MOCK ---
const sessionName = ref("Physique Quantique")
const groupCounts = ref({
  G1: 5,
  G2: 8,
  G3: 15,
  G4: 3,
  G5: 12
})

const groupLabels = {
  G1: "Aujourd'hui",
  G2: "Demain",
  G3: "3 jours",
  G4: "1 semaine",
  G5: "1 mois"
}

const cards = ref([
  { 
    id: 1, 
    question: "Quelle est la loi de Bernoulli ?", 
    answer: "P + ρgh + ½ρv² = cst", 
    type: "text" },
  { 
    id: 2, 
    question: "L'entropie d'un système isolé...", 
    options: ["Diminue", "Reste constante ou augmente", "Est toujours nulle"], 
    answer: "Reste constante ou augmente", type: "choice" },
  { 
    id: 3, 
    question: "Quelle est l'unité de la force dans le Système International ?", 
    answer: "Newton", 
    type: "text" 
  },
  { 
    id: 4, 
    question: "Selon la loi d'Ohm, quelle est la relation entre U, R et I ?", 
    options: ["U = R / I", "U = R + I", "U = R * I"], 
    answer: "U = R * I", 
    type: "choice" 
  },
  { 
    id: 5, 
    question: "Quel principe stipule que rien ne se perd, rien ne se crée, tout se transforme ?", 
    answer: "Lavoisier", 
    type: "text" 
  }
])

// --- STATE ---
const currentIndex = ref(0)
const userAnswer = ref("")
const showFeedback = ref(false)
const isFinished = ref(false)
const errors = ref([])

// --- LOGIQUE ---
const currentCard = computed(() => cards.value[currentIndex.value])
const isCorrect = computed(() => {
  if (!userAnswer.value) return false
  return userAnswer.value.toLowerCase().trim() === currentCard.value.answer.toLowerCase().trim()
})

const handleValidation = () => {
  showFeedback.value = true
  if (!isCorrect.value) {
    errors.value.push(currentCard.value)
    cards.value.push(currentCard.value) // A refaire le jour meme
  } else {
    groupCounts.value.G2++     // Progression
    groupCounts.value.G1--
  }
}

const nextStep = () => {
  if (currentIndex.value < cards.value.length - 1) {
    currentIndex.value++
    userAnswer.value = ""
    showFeedback.value = false
  } else {
    isFinished.value = true
  }
}

const reset = () => {
  currentIndex.value = 0
  userAnswer.value = ""
  showFeedback.value = false
  isFinished.value = false
  errors.value = []
}
</script>
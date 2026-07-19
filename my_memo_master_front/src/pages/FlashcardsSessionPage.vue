<template>
  <div class="grid grid-cols-1 grid-rows-2 lg:grid-cols-2 lg:grid-rows-1 gap-1.5 bg-grey rounded-[2px] p-1.5">

    <section class="mx-16 col-span-1 lg:col-span-2 order-2 lg:order-1 p-5 bg-light rounded-[7px] flex flex-col h-full">
      <div class="w-full flex-grow">

        <div class="flex justify-between items-center pb-4">
          <button
            @click="confirmExit"
            class="text-primary font-semibold hover:underline"
          >
            ← Retour
          </button>
          <h4 class="text-primary text-2xl neue-haas-grotesk-r font-semibold">
            Session : {{ systemStore.system.name || '...' }}
          </h4>
          <span class="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
            {{ currentIndex + 1 }} / {{ cardStore.dueCards.length }}
          </span>
        </div>

        <div v-if="loading" class="text-center text-gray-light py-10">
          Chargement des cartes...
        </div>

        <div v-else-if="cardStore.dueCards.length === 0" class="text-center py-10">
          <h3 class="text-2xl font-bold text-primary mb-4">Aucune carte à réviser !</h3>
          <p class="mb-6 text-gray-light">Revenez plus tard, vos cartes ne sont pas encore dues.</p>
          <Button :callback="() => router.push('/flashcards')">Retour aux systèmes</Button>
        </div>

        <div v-else-if="!isFinished" class="space-y-4">
          <div class="w-full p-3 bg-white text-dark text-xl text-center font-semibold mt-1">
            <FormulaText :text="currentCard.question?.statement || ''" />
          </div>

          <!-- Réponse ouverte -->
          <div v-if="currentCard.question?.type !== 'mcq'" class="py-2">
            <span class="text-sm font-medium text-gray-light uppercase">Ta Réponse</span>
            <FormulaHelper v-model="userAnswer" :disabled="showFeedback || submitting">
              <textarea aria-label="Saisissez votre réponse"
                v-model="userAnswer"
                :disabled="showFeedback || submitting"
                placeholder="Saisissez votre réponse... (formules entre $…$)"
                class="w-full p-3 rounded-lg text-dark border-2 border-gray focus:border-primary outline-none transition mt-1"
                rows="3"
              />
            </FormulaHelper>
          </div>

          <!-- QCM -->
          <div v-else class="py-2 space-y-2">
            <span class="text-sm font-medium text-gray-light uppercase">Choisis la bonne réponse</span>
            <template v-if="currentCard.question.content?.options?.length">
              <label
                v-for="(opt, oi) in currentCard.question.content.options"
                :key="oi"
                class="flex items-center gap-3 p-3 border-2 rounded-lg transition"
                :class="[
                  showFeedback ? 'cursor-default' : 'cursor-pointer',
                  mcqOptClass(String(oi), opt),
                ]"
              >
                <input
                  type="radio"
                  :name="`session-mcq`"
                  :value="String(oi)"
                  v-model="userAnswer"
                  :disabled="showFeedback || submitting"
                  class="accent-primary shrink-0"
                />
                <span class="text-dark"><FormulaText :text="opt.text || ''" /></span>
              </label>
            </template>
            <p v-else class="text-sm text-red-400 italic py-2">
              Options manquantes.
            </p>
          </div>

          <!-- Zone aria-live toujours présente dans le DOM (sinon les lecteurs d'écran
               peuvent rater l'insertion) : le résultat de la correction est annoncé (RGAA 13.x) ;
               le texte ✅/❌ double l'information portée par la couleur (RGAA 3.x) -->
          <div aria-live="polite">
            <div v-if="showFeedback" class="p-4 rounded-lg transition-all" :class="cardStore.lastCorrection?.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
              <p class="font-bold mb-1">{{ cardStore.lastCorrection?.success ? '✅ Excellent !' : '❌ À revoir' }}</p>
              <!-- Score IA uniquement pour les questions ouvertes -->
              <p v-if="currentCard.question?.type !== 'mcq'" class="text-sm">
                Score : {{ Math.round((cardStore.lastCorrection?.score || 0) * 100) }}%
              </p>
              <p v-if="!cardStore.lastCorrection?.success" class="text-sm italic mt-1">
                Réponse attendue : <FormulaText :text="cardStore.lastCorrection?.correction || ''" />
              </p>
              <p v-if="cardStore.lastCorrection?.explanation" class="text-sm mt-1 opacity-80">
                {{ cardStore.lastCorrection?.explanation }}
              </p>
              <Button class="mt-4 w-full" :callback="nextStep">Continuer</Button>
            </div>
          </div>

          <div v-if="!showFeedback" class="pb-4 w-full flex justify-center mt-4">
            <Button
              class="w-full"
              :callback="handleValidation"
              :disabled="!userAnswer || submitting"
            >
              {{ submitting ? 'Correction en cours...' : 'Valider' }}
            </Button>
          </div>
        </div>

        <div v-else class="text-center py-10">
          <h3 class="text-2xl font-bold text-primary mb-4">Session terminée !</h3>
          <p class="mb-6">Vous avez révisé {{ cardStore.dueCards.length }} cartes.</p>
          <Button :callback="() => router.push('/flashcards')">Retour aux systèmes</Button>
        </div>

      </div>
    </section>

    <section class="mx-16 mt-16 col-span-1 lg:col-span-2 order-2 lg:order-1 p-5 bg-light rounded-[7px] flex flex-col h-full">
      <div v-if="!isFinished && errors.length > 0" class="mb-4">
        <h4 class="text-primary text-lg font-semibold pb-2">Dernières erreurs</h4>
        <div class="flex flex-col gap-2 max-h-32 overflow-y-auto">
          <div v-for="(err, idx) in errors" :key="idx" class="flex justify-between bg-primary/10 rounded-lg px-3 py-2 text-sm">
            <span><FormulaText :text="err.question?.statement || ''" /></span>
          </div>
        </div>
      </div>

      <h4 class="text-primary text-lg font-semibold pb-2">Répartition par boîte</h4>
      <div class="grid grid-cols-5 gap-2 mb-6 text-center">
        <div
          v-for="level in (boxStore.levelsForSystem(systemId).length ? boxStore.levelsForSystem(systemId) : [1, 2, 3, 4, 5])"
          :key="level"
          class="bg-white rounded border border-gray p-1"
        >
          <div class="text-[10px] uppercase text-gray-light font-bold">
            Boîte {{ level }}
          </div>
          <div class="text-sm font-semibold text-primary">
            {{ boxCounts[level] || 0 }}
          </div>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Button from '@/components/ButtonComponent.vue'
import FormulaText from '@/components/FormulaTextComponent.vue'
import FormulaHelper from '@/components/FormulaHelperComponent.vue'
import { normalizeFormulaSyntax } from '@/components/interpreter/interpreter.js'
import { useLeitnerCardStore } from '@/stores/leitnerCards'
import { useLeitnerSystemStore } from '@/stores/leitnerSystems'
import { useLeitnerBoxStore } from '@/stores/leitnerBoxes'

const router = useRouter()
const route = useRoute()
const cardStore = useLeitnerCardStore()
const systemStore = useLeitnerSystemStore()
const boxStore = useLeitnerBoxStore()

const systemId = Number(route.params.systemId)

const loading = ref(true)
const currentIndex = ref(0)
const userAnswer = ref('')
const showFeedback = ref(false)
const submitting = ref(false)
const isFinished = ref(false)
const errors = ref([])

onMounted(async () => {
  await Promise.all([
    cardStore.fetchDueCards(systemId),
    systemStore.fetchSystemById(systemId),
    boxStore.fetchBoxes(),
  ])
  loading.value = false
})

const currentCard = computed(() => cardStore.dueCards[currentIndex.value])

const boxCounts = computed(() => {
  const counts = {}
  cardStore.dueCards.forEach(card => {
    const level = card.leitnerBox?.level
    if (level) counts[level] = (counts[level] || 0) + 1
  })
  return counts
})

function mcqOptClass(oiStr, opt) {
  if (!showFeedback.value) {
    return userAnswer.value === oiStr ? 'border-primary bg-primary/10' : 'border-gray'
  }
  if (opt.correct) return 'border-green-500 bg-green-50'
  if (userAnswer.value === oiStr) return 'border-red-400 bg-red-50'
  return 'border-gray'
}

const handleValidation = async () => {
  submitting.value = true
  const ok = await cardStore.submitResponse(currentCard.value.idCard, normalizeFormulaSyntax(userAnswer.value))
  submitting.value = false

  if (!ok) return  // le store a déjà affiché le notif d'erreur

  if (!cardStore.lastCorrection?.success) {
    errors.value.push(currentCard.value)
  }
  showFeedback.value = true
}

const nextStep = () => {
  if (currentIndex.value < cardStore.dueCards.length - 1) {
    currentIndex.value++
    userAnswer.value = ''
    showFeedback.value = false
    submitting.value = false
  } else {
    isFinished.value = true
  }
}

const confirmExit = () => {
  const confirmed = window.confirm('⚠️ Attention : la session en cours sera perdue. Voulez-vous vraiment quitter ?')
  if (confirmed) router.push('/flashcards')
}
</script>

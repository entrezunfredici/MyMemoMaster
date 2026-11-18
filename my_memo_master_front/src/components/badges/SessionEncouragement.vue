<template>
  <!-- Zone aria-live toujours montée : le message est annoncé quand il apparaît (RGAA 13.x) -->
  <div aria-live="polite">
    <section
      v-if="text"
      class="bg-white border-2 border-primary/30 rounded-xl p-4 text-left space-y-1"
      data-testid="session-encouragement"
    >
      <p v-if="text.bonus" class="font-semibold text-primary" data-testid="first-of-day">
        <span aria-hidden="true">⭐</span> {{ text.bonus }}
      </p>
      <p class="text-dark" data-testid="encouragement-message">{{ text.message }}</p>
      <p v-if="text.streak" class="text-sm font-semibold text-primary" data-testid="encouragement-streak">
        <span aria-hidden="true">🔥</span> {{ text.streak }}
      </p>
      <p v-if="text.challenge" class="text-sm font-semibold text-primary" data-testid="encouragement-challenge">
        <span aria-hidden="true">🎯</span> {{ text.challenge }}
      </p>
      <p v-if="text.freeze" class="text-sm font-semibold text-primary" data-testid="encouragement-freeze">
        <span aria-hidden="true">❄️</span> {{ text.freeze }}
      </p>
      <p v-if="text.goal" class="text-sm font-semibold text-primary" data-testid="encouragement-goal">{{ text.goal }}</p>
    </section>
  </div>
</template>

<script setup>
// Message de fin de session (G2) et bonus de première session du jour (F4, un message, jamais de points).
// À monter dans l'écran de fin ; `ready` passe à true une fois la session ENREGISTRÉE (le bilan compte les
// pratiques du jour : le demander avant l'enregistrement donnerait un faux « première session »).
// Rien n'est affiché en mode zen ni si l'API échoue.
import { computed, ref, watch } from 'vue'
import { useBadgesStore } from '@/stores/badges'
import { sessionEncouragement } from '@/helpers/gamificationMessages'

const props = defineProps({
  ready: { type: Boolean, default: false },
  // Score de la session en % (0-100) ; null si la session n'a pas de score
  scorePercent: { type: Number, default: null },
})

const store = useBadgesStore()
const feedback = ref(null)
let requested = false

const text = computed(() => (store.zen ? null : sessionEncouragement(feedback.value, { scorePercent: props.scorePercent })))

async function load() {
  if (requested) return
  requested = true
  feedback.value = await store.fetchSessionFeedback()
}

// `ready` repasse à false quand l'utilisateur recommence : le bilan de la session suivante est redemandé.
watch(
  () => props.ready,
  (ready) => {
    if (ready) return load()
    requested = false
    feedback.value = null
  },
  { immediate: true },
)
</script>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGuidedTourStore } from '@/stores/guidedTour'

const route = useRoute()
const router = useRouter()
const tourStore = useGuidedTourStore()

const step = computed(() => tourStore.currentStep)
const stepNumber = computed(() => tourStore.stepIndex + 1)
const totalSteps = computed(() => tourStore.steps.length)

// L'utilisateur est-il sur la page de l'étape courante ?
const onStepPage = computed(
  () => route.name === step.value?.route || !!step.value?.extraRoutes?.includes(route.name)
)

// Récapitulatif de fin : une ligne par étape validée
const RECAP_ITEMS = [
  { key: 'mindMapId', label: 'Carte mentale' },
  { key: 'flashcardId', label: 'Système de Leitner avec sa première flashcard' },
  { key: 'testId', label: 'Série d’exercices' },
  { key: 'revisionSessionId', label: 'Séance de révision planifiée' }
]
const recapItems = computed(() =>
  RECAP_ITEMS.map((item) => ({ ...item, done: tourStore.links[item.key] !== null }))
)
const canLaunchSession = computed(() => tourStore.links.leitnerSystemId !== null)

const nextLabel = computed(() =>
  tourStore.isLastStep ? 'Terminer le parcours 🎉' : 'Étape suivante →'
)

const goToStepPage = () => {
  if (step.value) router.push({ name: step.value.route })
}

// Dernière étape : advance() renvoie null et le récapitulatif de fin s'affiche (pas de redirection)
const handleNext = () => {
  const nextRoute = tourStore.advance()
  if (nextRoute) router.push({ name: nextRoute })
}

const launchFirstSession = () => {
  const systemId = tourStore.links.leitnerSystemId
  tourStore.dismissCompletion()
  router.push({ name: 'flashcardssession', params: { systemId } })
}

const closeRecap = () => {
  tourStore.dismissCompletion()
  router.push({ name: 'home' })
}

const handleQuit = () => {
  if (!confirm('Quitter le parcours guidé ? Votre progression sera perdue.')) return
  tourStore.quit()
}
</script>

<template>
  <div
    v-if="tourStore.completed"
    class="tour-banner tour-banner--recap"
    role="region"
    aria-label="Parcours guidé terminé"
  >
    <div class="tour-banner__info">
      <p class="tour-banner__title">🎉 Bravo, parcours terminé !</p>
      <p class="tour-banner__label">Voici ce que vous avez créé :</p>
      <ul class="tour-banner__recap">
        <li v-for="item in recapItems" :key="item.key">
          <span aria-hidden="true">{{ item.done ? '✅' : '⬜' }}</span>
          {{ item.label }}
        </li>
      </ul>
    </div>
    <div class="tour-banner__actions">
      <button
        v-if="canLaunchSession"
        type="button"
        class="tour-banner__btn tour-banner__btn--primary"
        @click="launchFirstSession"
      >
        Lancer ma première session
      </button>
      <button type="button" class="tour-banner__btn tour-banner__btn--secondary" @click="closeRecap">
        Retour à l'accueil
      </button>
    </div>
  </div>

  <div
    v-else-if="tourStore.active && step"
    class="tour-banner"
    role="region"
    aria-label="Parcours guidé"
  >
    <div class="tour-banner__info">
      <div class="tour-banner__header">
        <span class="tour-banner__title">🧭 Parcours guidé</span>
        <span class="tour-banner__counter">Étape {{ stepNumber }}/{{ totalSteps }}</span>
        <div class="tour-banner__dots" aria-hidden="true">
          <span
            v-for="(s, i) in tourStore.steps"
            :key="s.key"
            class="tour-banner__dot"
            :class="{
              'tour-banner__dot--done': i < tourStore.stepIndex,
              'tour-banner__dot--current': i === tourStore.stepIndex
            }"
          />
        </div>
      </div>
      <p class="tour-banner__label">{{ step.label }}</p>
      <p class="tour-banner__hint">
        <template v-if="tourStore.currentStepDone">✅ C'est fait ! Vous pouvez passer à la suite.</template>
        <template v-else-if="step.hintAfterLink && tourStore.links[step.hintAfterLink.key] !== null">{{ step.hintAfterLink.text }}</template>
        <template v-else>{{ step.hint }}</template>
      </p>
    </div>

    <div class="tour-banner__actions">
      <button
        v-if="!onStepPage"
        type="button"
        class="tour-banner__btn tour-banner__btn--secondary"
        @click="goToStepPage"
      >
        Aller à la page de l'étape →
      </button>
      <button
        type="button"
        class="tour-banner__btn tour-banner__btn--primary"
        :disabled="!tourStore.currentStepDone"
        :title="tourStore.currentStepDone ? '' : 'Réalisez d\'abord l\'action de cette étape'"
        @click="handleNext"
      >
        {{ nextLabel }}
      </button>
      <button
        type="button"
        class="tour-banner__close"
        aria-label="Quitter le parcours guidé"
        title="Quitter le parcours guidé"
        @click="handleQuit"
      >
        &times;
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Fond blanc explicite — règle projet pour les panneaux superposés */
.tour-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  background: rgb(var(--white));
  border: 2px solid var(--indigo-500);
  border-radius: 12px;
  padding: 12px 16px;
  margin: 0 16px 16px 0;
  box-shadow: 0 4px 12px rgb(var(--indigo-500-rgb) / 0.15);
}

.tour-banner__info {
  min-width: 0;
  flex: 1;
}

.tour-banner__header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.tour-banner__title {
  font-weight: 700;
  color: var(--indigo-700);
  font-size: 14px;
}

.tour-banner__counter {
  font-size: 12px;
  font-weight: 600;
  color: var(--gray-600);
  background: var(--indigo-50);
  border-radius: 9999px;
  padding: 2px 8px;
}

.tour-banner__dots {
  display: flex;
  gap: 4px;
}

.tour-banner__dot {
  width: 8px;
  height: 8px;
  border-radius: 9999px;
  background: var(--gray-200);
}

.tour-banner__dot--done {
  background: var(--green-500);
}

.tour-banner__dot--current {
  background: var(--indigo-500);
}

.tour-banner__label {
  font-weight: 600;
  color: var(--gray-800);
  font-size: 15px;
  margin-top: 2px;
}

.tour-banner__hint {
  font-size: 13px;
  color: var(--gray-500);
  margin-top: 1px;
}

.tour-banner__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.tour-banner__btn {
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, opacity 0.15s;
  white-space: nowrap;
}

.tour-banner__btn--primary {
  background: var(--indigo-600);
  color: rgb(var(--white));
  border: 1px solid var(--indigo-700);
}

.tour-banner__btn--primary:hover:not(:disabled) {
  background: var(--indigo-700);
}

.tour-banner__btn--primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.tour-banner__btn--secondary {
  background: rgb(var(--white));
  color: var(--indigo-700);
  border: 1px solid var(--indigo-200);
}

.tour-banner__btn--secondary:hover {
  background: var(--indigo-50);
}

.tour-banner__recap {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
  font-size: 14px;
  color: var(--gray-800);
  display: grid;
  gap: 2px;
}

.tour-banner__close {
  background: none;
  border: none;
  color: var(--gray-500);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  padding: 2px 6px;
}

.tour-banner__close:hover {
  color: var(--gray-600);
}
</style>

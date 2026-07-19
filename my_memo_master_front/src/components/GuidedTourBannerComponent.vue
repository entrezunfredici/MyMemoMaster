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
const onStepPage = computed(() => route.name === step.value?.route)

const nextLabel = computed(() =>
  tourStore.isLastStep ? 'Terminer le parcours 🎉' : 'Étape suivante →'
)

const goToStepPage = () => {
  if (step.value) router.push({ name: step.value.route })
}

const handleNext = () => {
  const nextRoute = tourStore.advance()
  if (nextRoute) router.push({ name: nextRoute })
  else router.push({ name: 'home' })
}

const handleQuit = () => {
  if (!confirm('Quitter le parcours guidé ? Votre progression sera perdue.')) return
  tourStore.quit()
}
</script>

<template>
  <div
    v-if="tourStore.active && step"
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
        Reprendre l'étape →
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
  background: #ffffff;
  border: 2px solid #6366f1;
  border-radius: 12px;
  padding: 12px 16px;
  margin: 0 16px 16px 0;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
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
  color: #4338ca;
  font-size: 14px;
}

.tour-banner__counter {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  background: #eef2ff;
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
  background: #e5e7eb;
}

.tour-banner__dot--done {
  background: #22c55e;
}

.tour-banner__dot--current {
  background: #6366f1;
}

.tour-banner__label {
  font-weight: 600;
  color: #1f2937;
  font-size: 15px;
  margin-top: 2px;
}

.tour-banner__hint {
  font-size: 13px;
  color: #6b7280;
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
  background: #6366f1;
  color: #ffffff;
  border: 1px solid #4f46e5;
}

.tour-banner__btn--primary:hover:not(:disabled) {
  background: #4f46e5;
}

.tour-banner__btn--primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.tour-banner__btn--secondary {
  background: #ffffff;
  color: #4338ca;
  border: 1px solid #c7d2fe;
}

.tour-banner__btn--secondary:hover {
  background: #eef2ff;
}

.tour-banner__close {
  background: none;
  border: none;
  color: #9ca3af;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  padding: 2px 6px;
}

.tour-banner__close:hover {
  color: #4b5563;
}
</style>

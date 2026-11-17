<template>
  <section
    v-if="progress.active && !store.zen && !store.settingsPending"
    class="bg-white border-2 border-gray-100 rounded-xl p-4 flex items-center gap-4"
    aria-labelledby="daily-goal-title"
    data-testid="daily-goal"
  >
    <div
      class="relative shrink-0"
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="progress.percent"
      :aria-valuetext="`${progress.percent} % de l'objectif du jour`"
      aria-labelledby="daily-goal-title"
    >
      <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true" focusable="false">
        <circle cx="36" cy="36" :r="RADIUS" fill="none" stroke-width="8" class="daily-goal__track" />
        <circle
          class="daily-goal__arc"
          cx="36"
          cy="36"
          :r="RADIUS"
          fill="none"
          stroke-width="8"
          stroke-linecap="round"
          :stroke-dasharray="CIRCUMFERENCE"
          :stroke-dashoffset="CIRCUMFERENCE * (1 - progress.percent / 100)"
          transform="rotate(-90 36 36)"
        />
      </svg>
      <span class="absolute inset-0 flex items-center justify-center text-sm font-bold text-primary">
        {{ progress.percent }} %
      </span>
    </div>
    <div>
      <h2 id="daily-goal-title" class="text-xl font-bold text-primary">Objectif du jour</h2>
      <p class="text-dark">{{ progress.text }}</p>
      <p v-if="progress.achieved" class="text-sm font-semibold text-primary">Objectif atteint, bravo !</p>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useBadgesStore } from '@/stores/badges'
import { dailyGoalProgress } from '@/helpers/badges'

const RADIUS = 30
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const store = useBadgesStore()
const progress = computed(() => dailyGoalProgress(store.dailyGoal))

onMounted(() => {
  // Les réglages décident de l'affichage (zen, objectifs à 0) : ils sont chargés avant la progression.
  store.fetchSettings()
  store.fetchDailyGoal()
})
</script>

<style scoped>
/* CHOIX: couleurs en CSS plutôt qu'en attribut SVG : var() n'est pas garanti dans un attribut de présentation */
.daily-goal__track {
  stroke: rgb(var(--primary) / 0.15);
}

.daily-goal__arc {
  stroke: rgb(var(--primary));
  transition: stroke-dashoffset 0.6s ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .daily-goal__arc {
    transition: none;
  }
}
</style>

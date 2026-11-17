<template>
  <section class="bg-white border-2 border-gray-100 rounded-xl p-4" aria-labelledby="settings-title">
    <h2 id="settings-title" class="text-xl font-bold text-primary mb-3">Réglages de gamification</h2>

    <div class="space-y-4">
      <fieldset class="border-0 p-0 m-0">
        <legend class="font-semibold">Objectif quotidien</legend>
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1">
          <label class="flex items-center gap-2">
            Cartes
            <input
              type="number"
              min="0"
              max="500"
              class="w-20 border-2 border-gray-500 rounded px-2 py-1"
              :value="settings.dailyGoalCards"
              @change="setGoal('dailyGoalCards', $event, GOAL_MAX_CARDS)"
            />
          </label>
          <label class="flex items-center gap-2">
            Exercices
            <input
              type="number"
              min="0"
              max="50"
              class="w-20 border-2 border-gray-500 rounded px-2 py-1"
              :value="settings.dailyGoalExercises"
              @change="setGoal('dailyGoalExercises', $event, GOAL_MAX_EXERCISES)"
            />
          </label>
        </div>
        <p class="text-sm text-dark/70 mt-1">0 désactive l'objectif. La progression du jour s'affiche sur l'accueil.</p>
      </fieldset>

      <div v-for="row in TOGGLES" :key="row.key" class="flex items-start justify-between gap-4">
        <div>
          <p class="font-semibold">{{ row.label }}</p>
          <p class="text-sm text-dark/70">{{ row.help }}</p>
        </div>
        <ToggleButton :model-value="Boolean(settings[row.key])" :aria-label="row.label" @update:model-value="emit('change', { [row.key]: $event })" />
      </div>
    </div>
  </section>
</template>

<script setup>
import ToggleButton from '@/components/ToggleButton.vue'
import { clampGoal } from '@/helpers/badges'

const GOAL_MAX_CARDS = 500
const GOAL_MAX_EXERCISES = 50

// Les réglages sont enregistrés à l'action (pas de bouton global) : chaque changement émet un patch.
const TOGGLES = [
  {
    key: 'streakReminderEnabled',
    label: 'Rappel si ma série est menacée',
    help: "Désactivé par défaut. Tu reçois une notification en fin d'après-midi si tu as une série de 2 jours ou plus et que tu n'as pas encore pratiqué.",
  },
  {
    key: 'badgesVisibleToTeachers',
    label: 'Montrer mes badges à mes enseignants',
    help: "Un enseignant ne voit que les badges obtenus avec une matière dont tu as autorisé le partage.",
  },
  {
    key: 'animationsEnabled',
    label: "Animations d'obtention",
    help: "Aussi coupées si ton appareil demande de réduire les animations.",
  },
  {
    key: 'zenMode',
    label: 'Mode zen',
    help: "Masque badges, séries, objectifs et messages d'encouragement. Rien n'est perdu : tout reste compté.",
  },
]

const props = defineProps({
  settings: { type: Object, required: true },
})
const emit = defineEmits(['change'])

function setGoal(key, event, max) {
  const value = clampGoal(event.target.value, max)
  event.target.value = value
  // CHOIX: le parent confirme par un rappel ; en cas d'échec, le champ revient à la valeur enregistrée
  // RAISON: sans cela, la saisie refusée restait affichée comme si elle avait été prise en compte.
  const input = event.target
  const previous = props.settings[key]
  emit('change', { [key]: value }, (saved) => {
    if (saved === false) input.value = previous
  })
}
</script>

<template>
  <section
    v-if="text && !store.zen && !store.settingsPending"
    class="bg-white border-2 rounded-xl p-4"
    :class="challenge.done ? 'border-primary' : 'border-gray-100'"
    aria-labelledby="daily-challenge-title"
    data-testid="daily-challenge"
  >
    <h2 id="daily-challenge-title" class="text-xl font-bold text-primary">
      <span aria-hidden="true">🎯</span> Défi du jour
    </h2>
    <p class="text-dark mt-1" data-testid="daily-challenge-text">{{ text }}</p>
    <p v-if="challenge.done" class="sr-only">Défi relevé</p>
    <div v-else class="mt-3 flex flex-wrap gap-3">
      <RouterLink to="/flashcards" class="px-4 py-2 rounded bg-primary text-on-primary">Réviser mes cartes</RouterLink>
      <RouterLink to="/exercises" class="px-4 py-2 rounded border-2 border-primary text-primary">Faire un exercice</RouterLink>
    </div>
  </section>
</template>

<script setup>
// Défi du jour (A4) : réviser la matière la plus délaissée (aucune pratique depuis 7 jours). Affiché sur
// l'accueil tant qu'il existe un défi ; masqué en mode zen. Pas de pénalité : sans défi ou une fois relevé,
// rien de culpabilisant.
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useBadgesStore } from '@/stores/badges'
import { challengeText } from '@/helpers/gamificationMessages'

const store = useBadgesStore()
const challenge = computed(() => store.dailyChallenge)
const text = computed(() => challengeText(store.dailyChallenge))

onMounted(() => {
  // Les réglages décident de l'affichage (mode zen) : ils sont chargés en même temps que le défi
  store.fetchSettings()
  store.fetchDailyChallenge()
})
</script>

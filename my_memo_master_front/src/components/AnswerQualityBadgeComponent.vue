<template>
  <div v-if="level" class="inline-flex flex-col items-start gap-1">
    <span
      class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
      :class="levelClasses"
    >
      <span aria-hidden="true">{{ icon }}</span>
      {{ label }}
    </span>
    <ul v-if="warnings.length" class="text-xs text-gray-500 list-disc list-inside space-y-0.5">
      <li v-for="(w, i) in warnings" :key="i">{{ w }}</li>
    </ul>
  </div>
</template>

<script setup>
import { computed } from 'vue'

// Affichage synthétique (pastille + liste détaillée) du résultat de AnswerQuality.service.js
// (back), branché sur les réponses de référence générées par IA (AiValidationScreenComponent.vue)
// et saisies à la main (FlashcardsCardsPage.vue) — DECISIONS.md 2026-09-12. Jamais bloquant : un
// niveau "low" reste une simple alerte visuelle, pas une interdiction d'enregistrer.
//
// L'information n'est jamais portée par la seule couleur (RGAA 3.3 — la pastille garde toujours
// une icône ET un libellé texte, la liste détaillée est un texte brut lisible par tout lecteur
// d'écran indépendamment de la couleur de la pastille).

const props = defineProps({
  // 'high' | 'medium' | 'low' — null/absent si non applicable (ex. carte QCM, réponse non
  // "correction:true") : le composant ne rend alors rien.
  level: { type: String, default: null },
  warnings: { type: Array, default: () => [] },
})

const LEVELS = {
  high: { label: 'Bonne qualité', icon: '✅', classes: 'bg-green-100 text-green-800' },
  medium: { label: 'À vérifier', icon: '⚠️', classes: 'bg-yellow-100 text-yellow-800' },
  low: { label: 'À revoir', icon: '❌', classes: 'bg-red-100 text-red-800' },
}

const current = computed(() => LEVELS[props.level] ?? null)
const label = computed(() => current.value?.label ?? '')
const icon = computed(() => current.value?.icon ?? '')
const levelClasses = computed(() => current.value?.classes ?? '')
</script>

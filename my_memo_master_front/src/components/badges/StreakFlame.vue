<template>
  <RouterLink
    v-if="flame.visible && !store.zen && !store.settingsPending"
    :to="{ name: 'badges' }"
    class="streak-flame inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold bg-white border-2"
    :class="flame.done ? 'border-primary text-primary' : 'border-dashed border-gray-500 text-dark'"
    :aria-label="`${flame.label} ${flame.hint}`"
    :title="`${flame.label} ${flame.hint}`"
    data-testid="streak-flame"
  >
    <span class="streak-flame__icon" aria-hidden="true">🔥</span>
    <span aria-hidden="true">{{ flame.count }}</span>
    <span v-if="flame.freezes > 0" aria-hidden="true" data-testid="streak-freezes">❄️{{ flame.freezes }}</span>
  </RouterLink>
</template>

<script setup>
// Flamme de série (A2) dans l'en-tête : série en cours, trait plein une fois prolongée aujourd'hui, pointillé
// sinon. Masquée sans série, en mode zen et tant que les réglages ne sont pas connus (pas de clignotement).
// Aucun reproche : une série à 0 n'affiche rien.
import { computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useBadgesStore } from '@/stores/badges'
import { streakFlame } from '@/helpers/gamificationMessages'

const store = useBadgesStore()
const authStore = useAuthStore()
const flame = computed(() => streakFlame(store.streak))

function load() {
  if (!authStore.authenticated) return
  store.fetchSettings()
  store.fetchStreak()
}

onMounted(load)
watch(() => authStore.authenticated, load)
</script>

<style scoped>
.streak-flame__icon {
  display: inline-block;
}

.streak-flame:hover .streak-flame__icon {
  animation: streak-flame-flicker 0.6s ease-in-out;
}

@keyframes streak-flame-flicker {
  0%,
  100% {
    transform: scale(1) rotate(0);
  }
  50% {
    transform: scale(1.2) rotate(-6deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .streak-flame:hover .streak-flame__icon {
    animation: none;
  }
}
</style>

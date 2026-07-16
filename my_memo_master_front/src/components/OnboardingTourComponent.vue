<script setup>
import { onMounted, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useOnboardingStore } from '@/stores/onboarding'
import { useOnboardingTour } from '@/composables/useOnboardingTour'

const authStore = useAuthStore()
const onboardingStore = useOnboardingStore()
const { startTour } = useOnboardingTour()

// Lance automatiquement la visite de l'interface au premier login (tour_seen=false côté API).
// Le composant est monté par les layouts privés d'App.vue : il se (re)monte à chaque
// entrée dans l'application, mais l'API n'est interrogée qu'une fois l'utilisateur authentifié.
onMounted(async () => {
  if (!authStore.authenticated) return
  const loaded = await onboardingStore.fetchState()
  if (!loaded || onboardingStore.tourSeen !== false) return
  await nextTick()
  startTour()
})
</script>

<template>
  <!-- Composant sans rendu : pilote la visite guidée driver.js de l'interface -->
  <span hidden aria-hidden="true"></span>
</template>

<style>
/* Fond blanc explicite — règle projet pour les panneaux superposés */
.driver-popover.onboarding-popover {
  background: #ffffff;
  border-radius: 12px;
}

.onboarding-popover .driver-popover-title {
  color: #4338ca;
}

.onboarding-popover button.driver-popover-next-btn,
.onboarding-popover button.driver-popover-prev-btn {
  text-shadow: none;
  border-radius: 8px;
  padding: 6px 12px;
}

.onboarding-popover button.driver-popover-next-btn {
  background: #6366f1;
  color: #ffffff;
  border: 1px solid #4f46e5;
}

.onboarding-popover button.driver-popover-next-btn:hover,
.onboarding-popover button.driver-popover-next-btn:focus {
  background: #4f46e5;
  color: #ffffff;
}
</style>

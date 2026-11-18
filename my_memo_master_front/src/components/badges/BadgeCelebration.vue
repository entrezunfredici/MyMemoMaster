<template>
  <div
    v-if="current"
    v-dialog="close"
    role="dialog"
    aria-modal="true"
    aria-labelledby="celebration-title"
    class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
    data-testid="badge-celebration"
  >
    <div class="modal-panel celebration bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
      <p class="text-sm font-semibold uppercase tracking-wide text-primary">
        {{ total > 1 ? `Nouveau badge (${index + 1} / ${total})` : 'Nouveau badge' }}
      </p>
      <p class="celebration__icon text-6xl my-3" aria-hidden="true">{{ current.icon }}</p>
      <h2 id="celebration-title" class="text-2xl font-bold text-primary">{{ current.label }}</h2>
      <p class="text-sm text-dark/70 mt-1">
        <span aria-hidden="true">{{ rarity.shape }}</span> {{ rarity.label }}
      </p>
      <p class="mt-3 text-dark">{{ current.description }}</p>

      <div class="mt-5 flex flex-wrap justify-center gap-3">
        <!-- CHOIX: un seul bouton dont le libellé change, pas deux boutons en v-if / v-else -->
        <!-- RAISON: remplacer l'élément focalisé fait tomber le focus sur la page ; Échap n'écoute que dans la modale. -->
        <button type="button" class="px-4 py-2 rounded bg-primary text-on-primary" @click="advance">
          {{ hasNext ? 'Suivant' : 'Super !' }}
        </button>
        <RouterLink :to="{ name: 'badges' }" class="px-4 py-2 rounded border-2 border-primary text-primary" @click="close">
          Voir mes badges
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup>
// Modale d'obtention d'un badge, montée une fois dans App.vue. Elle ne s'ouvre que si l'utilisateur est
// connecté, que les animations sont activées et que le mode zen est coupé (voir `celebrationsAllowed`).
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { dialogDirective as vDialog } from '@/directives/dialog'
import { useAuthStore } from '@/stores/auth'
import { useBadgesStore } from '@/stores/badges'
import { rarityMeta } from '@/helpers/badges'
import { PRACTICE_EVENT } from '@/helpers/practiceEvents'

const store = useBadgesStore()
const authStore = useAuthStore()
const route = useRoute()
const index = ref(0)

const total = computed(() => store.celebrations.length)
const current = computed(() => store.celebrations[index.value] ?? null)
const hasNext = computed(() => index.value < total.value - 1)
const rarity = computed(() => rarityMeta(current.value?.rarity))

function check() {
  if (!authStore.authenticated) return
  store.fetchCelebrations()
  // Une fois par compte : le jour de la série, l'objectif quotidien et le rappel suivent le fuseau du navigateur
  store.syncTimezone()
}

// Pratique enregistrée (exercice corrigé, session Leitner, carte consultée) : l'API a déjà attribué les
// badges, on les cherche tout de suite au lieu d'attendre le prochain changement de page.
function onPractice() {
  if (authStore.authenticated) store.refreshAfterPractice()
}

function advance() {
  if (hasNext.value) index.value += 1
  else close()
}

function close() {
  index.value = 0
  store.dismissCelebrations()
}

onMounted(() => {
  check()
  window.addEventListener(PRACTICE_EVENT, onPractice)
})
onBeforeUnmount(() => window.removeEventListener(PRACTICE_EVENT, onPractice))
// Vérification à chaque changement de page : un badge gagné pendant une session s'affiche à la page suivante
watch(() => route.fullPath, check)
watch(() => authStore.authenticated, check)
</script>

<style scoped>
.celebration__icon {
  animation: celebration-pop 0.6s ease-out;
}

@keyframes celebration-pop {
  0% {
    transform: scale(0.4) rotate(-15deg);
    opacity: 0;
  }
  70% {
    transform: scale(1.2) rotate(6deg);
    opacity: 1;
  }
  100% {
    transform: scale(1) rotate(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .celebration__icon {
    animation: none;
  }
}
</style>

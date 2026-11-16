<template>
  <div class="space-y-6 pb-8">
    <div>
      <RouterLink :to="{ name: 'profile' }" class="text-sm underline text-primary">← Profil</RouterLink>
      <h1 class="text-2xl font-bold text-primary">Mes badges</h1>
    </div>

    <div v-if="store.loading && !store.summary" class="flex items-center justify-center py-20">
      <LoaderComponent />
    </div>

    <div v-else-if="store.error && !store.summary" role="alert" class="text-center py-12">
      <p class="text-dark">Impossible de charger tes badges.</p>
      <button type="button" class="mt-2 underline text-primary" @click="load(true)">Réessayer</button>
    </div>

    <template v-else-if="store.summary">
      <BadgeLevelHeader :summary="store.summary" />

      <section v-if="upcoming.length && store.summary.earnedCount === 0" aria-labelledby="next-badges-title">
        <h2 id="next-badges-title" class="text-xl font-bold text-primary mb-2">Prochains badges</h2>
        <ul class="flex flex-wrap gap-2 list-none p-0">
          <li v-for="badge in upcoming" :key="badge.code" class="px-3 py-1 rounded-full border-2 border-gray-500 bg-white text-sm">
            <span aria-hidden="true">{{ badge.icon }}</span> {{ badge.label }}
          </li>
        </ul>
      </section>

      <section aria-labelledby="all-badges-title">
        <h2 id="all-badges-title" class="text-xl font-bold text-primary mb-3">Tous les badges</h2>
        <BadgeGrid :badges="store.badges" :new-codes="newCodes" @select="open" />
      </section>
    </template>

    <BadgeDetailModal v-if="selected" :badge="selected" @close="close" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import LoaderComponent from '@/components/LoaderComponent.vue'
import BadgeLevelHeader from '@/components/badges/BadgeLevelHeader.vue'
import BadgeGrid from '@/components/badges/BadgeGrid.vue'
import BadgeDetailModal from '@/components/badges/BadgeDetailModal.vue'
import { useBadgesStore } from '@/stores/badges'
import { nextBadges } from '@/helpers/badges'

const store = useBadgesStore()
const selected = ref(null)
const newCodes = ref([])

const upcoming = computed(() => nextBadges(store.badges, 3))

async function load(force = false) {
  const ok = await store.fetchAll(force)
  if (!ok) return
  // CHOIX: instantané des badges non vus avant de les marquer, pour garder la pastille « Nouveau » visible pendant la visite
  // RAISON: le marquage a lieu à l'ouverture de la page (maquette §9.5), pas au survol
  newCodes.value = [...store.unseenCodes]
  await store.markAllSeen()
}

function open(badge) {
  selected.value = badge
}

function close() {
  selected.value = null
}

onMounted(() => load(true))
</script>

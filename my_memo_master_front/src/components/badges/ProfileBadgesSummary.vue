<template>
  <section v-if="!store.zen && !store.settingsPending" class="bg-white border-2 border-gray-100 rounded-xl p-4" aria-labelledby="badges-summary-title">
    <h2 id="badges-summary-title" class="text-xl font-bold text-primary mb-2">Mes succès</h2>

    <p v-if="store.loading && !store.summary" class="text-dark/70">Chargement…</p>

    <div v-else-if="store.error && !store.summary" role="alert" class="text-dark/70">
      <p>Impossible de charger tes badges.</p>
      <button type="button" class="underline text-primary" @click="store.fetchAll(true)">Réessayer</button>
    </div>

    <template v-else-if="store.summary">
      <p v-if="title" class="font-semibold text-primary" data-testid="badge-title">
        <span aria-hidden="true">{{ title.icon }}</span> {{ title.label }}
      </p>
      <p>
        <span aria-hidden="true">🎖</span> Niveau <strong>{{ level.name }}</strong>
        · {{ store.summary.earnedCount }} / {{ store.summary.totalCount }} badges
        · <span aria-hidden="true">🔥</span> Série : {{ store.summary.streakCurrent }} j
      </p>
      <p class="text-sm text-dark/70">{{ level.text }}</p>

      <ul v-if="shown.length" class="flex flex-wrap gap-2 list-none p-0 mt-3">
        <li
          v-for="badge in shown"
          :key="badge.code"
          class="px-3 py-1 rounded-full border-2 border-primary bg-primary text-on-primary text-sm"
          :title="badge.description"
        >
          <span aria-hidden="true">{{ badge.icon }}</span> {{ badge.label }}
        </li>
      </ul>
      <p v-else class="text-sm text-dark/70 mt-3">Obtiens ton premier badge : il apparaîtra ici.</p>

      <RouterLink :to="{ name: 'badges' }" class="inline-block mt-3 underline text-primary">Voir tous mes badges</RouterLink>
    </template>
  </section>
  <!-- Mode zen : le résumé est masqué, on propose de quitter le mode à la place -->
  <section v-else-if="store.zen" class="bg-white border-2 border-gray-100 rounded-xl p-4" aria-labelledby="zen-summary-title">
    <h2 id="zen-summary-title" class="text-xl font-bold text-primary mb-2">Mode zen activé</h2>
    <p class="text-sm text-dark/70">Badges, séries et objectifs sont masqués. Rien n'est perdu : tout reste compté.</p>
    <button
      type="button"
      class="mt-3 px-4 py-2 rounded-lg border-2 border-primary bg-primary text-on-primary font-semibold"
      data-testid="zen-disable"
      @click="store.updateSettings({ zenMode: false })"
    >
      Désactiver le mode zen
    </button>
  </section>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useBadgesStore } from '@/stores/badges'
import { latestEarned, levelProgress, showcaseBadges, titleBadge } from '@/helpers/badges'

const store = useBadgesStore()
const level = computed(() => levelProgress(store.summary))
const title = computed(() => titleBadge(store.badges, store.profile.titleCode))
// La vitrine choisie prime ; à défaut, les derniers badges obtenus
const shown = computed(() => {
  const showcase = showcaseBadges(store.badges, store.profile.showcaseCodes)
  return showcase.length ? showcase : latestEarned(store.badges, 3)
})

onMounted(() => {
  store.fetchAll()
  store.fetchSettings()
  store.fetchProfile()
})
</script>

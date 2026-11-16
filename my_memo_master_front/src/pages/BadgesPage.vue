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
      <section v-if="store.zen" class="bg-white border-2 border-gray-100 rounded-xl p-4" aria-labelledby="zen-title">
        <h2 id="zen-title" class="text-xl font-bold text-primary">Mode zen activé</h2>
        <p class="text-dark mt-1">Les badges, séries et objectifs sont masqués. Tu les retrouveras quand tu voudras.</p>
        <button type="button" class="mt-3 px-4 py-1 rounded bg-primary text-on-primary" @click="store.updateSettings({ zenMode: false })">
          Désactiver le mode zen
        </button>
      </section>

      <template v-else>
        <div v-if="!extrasOk" role="alert" class="text-dark/70">
          <p>Certains blocs (titre, vitrine, activité, réglages) n'ont pas pu être chargés.</p>
          <button type="button" class="underline text-primary" @click="loadExtras(true)">Réessayer</button>
        </div>

        <BadgeLevelHeader
          :summary="store.summary"
          :title-code="store.profile.titleCode"
          :earned-badges="earnedBadges"
          :profile-available="store.profileLoaded"
          @update:title="store.saveProfile({ titleCode: $event })"
        />

        <BadgeShowcase v-if="store.profileLoaded" :badges="store.badges" :codes="store.profile.showcaseCodes" @save="store.saveProfile({ showcaseCodes: $event })" />

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

        <ActivityCalendar v-if="store.activity" :activity="store.activity" />

        <GamificationSettings v-if="store.settings" :settings="store.settings" @change="(patch, done) => store.updateSettings(patch).then(done)" />
      </template>
    </template>

    <BadgeDetailModal
      v-if="selected && !store.zen"
      :badge="selected"
      :profile-available="store.profileLoaded"
      :is-title="store.profile.titleCode === selected.code"
      :in-showcase="store.profile.showcaseCodes.includes(selected.code)"
      :showcase-full="store.profile.showcaseCodes.length >= MAX_SHOWCASE"
      @close="close"
      @toggle-title="toggleTitle"
      @toggle-showcase="toggleShowcase"
    />

    <p class="sr-only" aria-live="polite" role="status">{{ announcement }}</p>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import LoaderComponent from '@/components/LoaderComponent.vue'
import BadgeLevelHeader from '@/components/badges/BadgeLevelHeader.vue'
import BadgeShowcase from '@/components/badges/BadgeShowcase.vue'
import BadgeGrid from '@/components/badges/BadgeGrid.vue'
import BadgeDetailModal from '@/components/badges/BadgeDetailModal.vue'
import ActivityCalendar from '@/components/badges/ActivityCalendar.vue'
import GamificationSettings from '@/components/badges/GamificationSettings.vue'
import { useBadgesStore } from '@/stores/badges'
import { MAX_SHOWCASE, nextBadges, toggleShowcaseCode } from '@/helpers/badges'

const store = useBadgesStore()
const selected = ref(null)
const newCodes = ref([])
const extrasOk = ref(true)
const announcement = ref('')

const upcoming = computed(() => nextBadges(store.badges, 3))
const earnedBadges = computed(() => store.badges.filter((badge) => badge.earned))

async function loadExtras(force = false) {
  extrasOk.value = await store.fetchExtras(force)
}

async function load(force = false) {
  const [ok] = await Promise.all([store.fetchAll(force), loadExtras(force)])
  if (!ok) return
  // CHOIX: en mode zen, les badges ne sont pas marqués comme vus
  // RAISON: l'utilisateur ne les a pas vus ; la pastille « Nouveau » doit l'attendre à la sortie du mode zen
  if (store.zen) return
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

function toggleTitle(badge) {
  store.saveProfile({ titleCode: store.profile.titleCode === badge.code ? null : badge.code })
}

function toggleShowcase(badge) {
  store.saveProfile({ showcaseCodes: toggleShowcaseCode(store.profile.showcaseCodes, badge.code) })
}

// Mode zen : annoncé aux lecteurs d'écran (RGAA), et la sortie du mode zen révèle les badges non vus
watch(
  () => store.zen,
  async (zen, wasZen) => {
    announcement.value = zen ? 'Mode zen activé' : 'Mode zen désactivé'
    if (wasZen && !zen) {
      newCodes.value = [...store.unseenCodes]
      await store.markAllSeen()
    }
  },
)

onMounted(() => load(true))
</script>

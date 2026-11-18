<template>
  <section v-if="!store.zen" class="bg-white border-2 border-gray-100 rounded-xl p-4" aria-labelledby="subject-levels-title" data-testid="subject-levels">
    <h2 id="subject-levels-title" class="text-xl font-bold text-primary">Mes matières</h2>
    <p class="text-sm text-dark/70 mt-1">
      Ton niveau dans chaque matière, selon les cartes maîtrisées (boîtes 4 et 5) et tes exercices personnels.
    </p>

    <div v-if="store.subjectLevelsError" role="alert" class="mt-3">
      <p class="text-dark">Impossible de charger tes niveaux par matière.</p>
      <button type="button" class="underline text-primary" @click="store.fetchSubjectLevels()">Réessayer</button>
    </div>

    <p v-else-if="store.subjectLevels === null" role="status" class="mt-3 text-dark/70">Chargement…</p>

    <p v-else-if="store.subjectLevels.length === 0" class="mt-3 text-dark" data-testid="subject-levels-empty">
      Pas encore de niveau : révise des cartes ou termine un exercice pour commencer.
    </p>

    <ul v-else class="mt-3 space-y-4 list-none p-0">
      <li v-for="row in rows" :key="row.subjectId" class="border-t-2 border-gray-100 pt-3 first:border-t-0 first:pt-0" :data-testid="`subject-level-${row.subjectId}`">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <h3 class="font-bold text-dark">{{ row.name || 'Matière sans nom' }}</h3>
          <p class="font-semibold text-primary"><span aria-hidden="true">{{ row.level.icon }}</span> {{ row.level.label }}</p>
        </div>
        <p class="text-sm text-dark/70">{{ row.summary }}</p>

        <div v-if="row.requirements" class="mt-2">
          <p class="text-sm text-dark">Prochain niveau : <strong>{{ row.next.label }}</strong></p>
          <p class="text-xs text-dark/70">{{ row.requirements.rule }}</p>
          <ul class="mt-1 space-y-1 list-none p-0">
            <li v-for="item in row.requirements.items" :key="item.key">
              <span class="text-xs text-dark/70">
                {{ item.label }}{{ item.met ? ' : atteint' : '' }}
              </span>
              <BadgeProgress
                :current="Math.min(item.current, item.target)"
                :target="item.target"
                :label="`${row.name} — ${item.label} pour ${row.next.label}`"
              />
            </li>
          </ul>
        </div>
        <p v-else class="mt-2 text-sm font-semibold text-primary">Niveau maximal atteint, bravo !</p>
      </li>
    </ul>
  </section>
</template>

<script setup>
// Niveau par matière (B1) : Novice → Expert, avec ce qu'il reste à faire pour le niveau suivant.
// Chargé à part : la page des badges reste utilisable si cet appel échoue. Masqué en mode zen.
import { computed, onMounted } from 'vue'
import BadgeProgress from '@/components/badges/BadgeProgress.vue'
import { useBadgesStore } from '@/stores/badges'
import { nextLevelRequirements, subjectStatsText } from '@/helpers/subjectLevels'

const store = useBadgesStore()

const rows = computed(() =>
  (store.subjectLevels ?? []).map((row) => ({
    ...row,
    summary: subjectStatsText(row.stats),
    requirements: nextLevelRequirements(row.next),
  })),
)

onMounted(() => {
  store.fetchSettings()
  store.fetchSubjectLevels()
})
</script>

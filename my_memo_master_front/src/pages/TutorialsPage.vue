<template>
  <div>
    <!-- ACTIONS -->
    <!-- CHOIX: filtre au-dessus de la case « Tips » sous sm (colonne), côte à côte au-delà -->
    <section class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <SubjectFilter />
      <div class="flex items-center gap-4 mx-0 sm:mx-4">
        <label for="tips" class="text-lg">Tips de révision</label>
        <input type="checkbox" id="tips" name="tips" :checked="tipsOnly" @click="toggleTips($event.target.checked)" />
      </div>
    </section>

    <!-- LIST -->
    <section class="mt-8" aria-live="polite">
      <p v-if="tutorialStore.loading" class="text-center text-gray-500 py-12">Chargement des tutoriels…</p>
      <Grid v-else :items="tutorials" empty-message="Aucun tutoriel ne correspond à ces critères.">
        <template #item="{ item }">
          <Tutorial :tutorial="item" />
        </template>
      </Grid>
    </section>
  </div>
</template>

<script setup>
// Page « Tutoriels » : liste publique, filtrable par sujet et par « tips de révision ». Les filtres vivent
// dans l'URL (?subject=…&tips=true) — le filtre de sujet (SubjectFilter) les y écrit — et la liste se
// recharge côté serveur à chaque changement.
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SubjectFilter from '@/components/SubjectFilterComponent.vue'
import Grid from '@/components/GridComponent.vue'
import Tutorial from '@/components/TutorialItem.vue'
import { useTutorialStore } from '@/stores/tutorials'
import { useSubjectStore } from '@/stores/subjects'

const route = useRoute()
const router = useRouter()
const tutorialStore = useTutorialStore()
const subjectStore = useSubjectStore()

const tipsOnly = computed(() => !!route.query.tips)

// L'API ne renvoie que `subjectId` : le nom du sujet vient de la liste des sujets déjà chargée par le filtre
const tutorials = computed(() =>
  tutorialStore.tutorials.map((t) => ({
    ...t,
    subject: subjectStore.subjects.find((s) => s.subjectId === t.subjectId) ?? null,
  })),
)

watch(
  // Clé texte (et non un tableau) : seule une vraie variation de sujet ou de tips recharge la liste
  () => `${route.query.subject ?? ''}|${route.query.tips ?? ''}`,
  () => {
    tutorialStore.fetchTutorials({
      subjectId: route.query.subject,
      // case décochée = tous les tutoriels (et non « ceux qui ne sont pas des tips »)
      revisionTips: route.query.tips ? true : undefined,
    })
  },
  { immediate: true },
)

function toggleTips(value) {
  const query = { ...route.query }
  if (value) {
    query.tips = true
  } else {
    delete query.tips
  }
  router.push({ path: route.path, query })
}
</script>

<template>
  <section class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-3">
    <h2 class="text-lg font-semibold text-dark">Rendus à remettre</h2>
    <div v-if="loading" class="text-sm text-dark/60">Chargement...</div>
    <div v-else-if="filteredRendus.length === 0" class="text-sm text-dark/60">
      {{ search ? 'Aucun rendu correspondant.' : 'Aucun rendu à remettre.' }}
    </div>
    <div v-else class="space-y-3">
      <StudentRenduCard
        v-for="r in filteredRendus"
        :key="r.id"
        v-model:pending-file="pendingFiles[r.id]"
        :rendu="r"
        :group-id="groupId"
      />
    </div>
  </section>
</template>

<script setup>
// Rendus à remettre (filtrés par la recherche), un StudentRenduCard par rendu. Extrait de pages/ClassroomEtudiantView.vue.
import { computed, reactive } from 'vue'
import { useClassGroupSectionStore } from '@/stores/classGroupSections'
import StudentRenduCard from '@/components/classroom/student/StudentRenduCard.vue'

const props = defineProps({
  groupId: { type: Number, required: true },
  loading: { type: Boolean, default: false },
  search: { type: String, default: '' },
})

const sectionStore = useClassGroupSectionStore()

// Fichiers choisis mais pas encore remis, par rendu : conservés ici (et non dans la carte) pour survivre à un
// filtrage par la recherche, qui démonte et remonte les cartes.
const pendingFiles = reactive({})

const filteredRendus = computed(() => {
  const q = props.search.toLowerCase()
  return sectionStore.sections
    .filter((s) => s.type === 'rendu')
    .filter((s) => !q || s.title.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q))
})
</script>

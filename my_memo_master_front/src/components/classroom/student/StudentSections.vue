<template>
  <section class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-3">
    <h2 class="text-lg font-semibold text-dark">Sections du cours</h2>
    <div v-if="loading" class="text-sm text-dark/60">Chargement...</div>
    <div v-else-if="filteredSections.length === 0" class="text-sm text-dark/60">
      {{ search ? 'Aucune section correspondante.' : 'Aucune section partagée.' }}
    </div>
    <div v-else class="space-y-2">
      <div v-for="s in filteredSections" :key="s.id"
        class="rounded-xl border border-gray px-4 py-3">
        <div class="flex items-center gap-2">
          <span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary uppercase">Section</span>
          <p class="text-sm font-semibold text-dark">{{ s.title }}</p>
        </div>
        <p v-if="s.description" class="mt-1 text-xs text-dark/60">{{ s.description }}</p>
        <p v-if="s.dueDate" class="text-xs text-dark/40 mt-0.5">Cible : {{ formatDate(s.dueDate) }}</p>
      </div>
    </div>
  </section>
</template>

<script setup>
// Sections du cours partagées avec le groupe (filtrées par la recherche). Extrait de pages/ClassroomEtudiantView.vue.
import { computed } from 'vue'
import { useClassGroupSectionStore } from '@/stores/classGroupSections'
import { formatDate } from '@/helpers/classroomFormat'

const props = defineProps({
  loading: { type: Boolean, default: false },
  search: { type: String, default: '' },
})

const sectionStore = useClassGroupSectionStore()

const filteredSections = computed(() => {
  const q = props.search.toLowerCase()
  return sectionStore.sections
    .filter((s) => s.type === 'section')
    .filter((s) => !q || s.title.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q))
})
</script>

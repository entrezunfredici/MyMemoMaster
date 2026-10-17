<template>
  <section class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-3">
    <h2 class="text-lg font-semibold text-dark">Documents partagés</h2>
    <div v-if="loading" class="text-sm text-dark/60">Chargement...</div>
    <div v-else-if="filteredResources.length === 0" class="text-sm text-dark/60">
      {{ search ? 'Aucune ressource correspondante.' : 'Aucun document partagé.' }}
    </div>
    <div v-else class="space-y-2">
      <div v-for="r in filteredResources" :key="r.id"
        class="rounded-xl border border-gray px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-xl">{{ fileIcon(r.mimeType) }}</span>
          <div>
            <p class="text-sm font-semibold text-dark">{{ r.title }}</p>
            <p class="text-xs text-dark/60">
              {{ resourceTypeLabel(r.type) }} · {{ r.creator?.name }}
              <span v-if="r.fileSize"> · {{ formatFileSize(r.fileSize) }}</span>
            </p>
          </div>
        </div>
        <button v-if="r.fileKey" @click="downloadFile(r.fileKey)"
          class="rounded-lg border border-primary px-3 py-1 text-xs text-primary hover:bg-primary hover:text-light transition">
          Télécharger
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
// Documents partagés avec le groupe (filtrés par la recherche). Extrait de pages/ClassroomEtudiantView.vue.
import { computed } from 'vue'
import { useClassGroupResourceStore } from '@/stores/classGroupResources'
import { useStoredFile } from '@/composables/useStoredFile'
import { fileIcon, formatFileSize, resourceTypeLabel } from '@/helpers/classroomFormat'

const props = defineProps({
  loading: { type: Boolean, default: false },
  search: { type: String, default: '' },
})

const resourceStore = useClassGroupResourceStore()
const { downloadFile } = useStoredFile()

const filteredResources = computed(() => {
  const q = props.search.toLowerCase()
  return resourceStore.resources.filter(
    (r) => !q || r.title.toLowerCase().includes(q) || r.type?.toLowerCase().includes(q)
  )
})
</script>

<template>
  <div class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-2">
    <h3 class="text-base font-semibold text-dark">Documents partagés</h3>
    <ResourceTypeFilter v-if="resourceStore.resources.length" v-model="typeFilter" :resources="resourceStore.resources" />
    <div v-if="resourceStore.resources.length === 0" class="text-sm text-dark/70">Aucun document.</div>
    <div v-else-if="filteredResources.length === 0" class="text-sm text-dark/70">Aucun document de ce type.</div>
    <div v-for="r in filteredResources" :key="r.id"
      class="flex items-center justify-between rounded-xl border border-gray px-3 py-2 text-sm">
      <div class="flex items-center gap-2">
        <span class="text-lg">{{ fileIcon(r.mimeType) }}</span>
        <div>
          <p class="font-semibold text-dark leading-tight">{{ r.title }}</p>
          <p class="text-xs text-dark/70">{{ resourceTypeLabel(r.type) }}{{ r.fileSize ? ' · ' + formatFileSize(r.fileSize) : '' }}</p>
        </div>
      </div>
      <div class="flex gap-2">
        <ReportContentButton content-type="resource" :content-id="r.id" :content-title="r.title" :author-id="r.createdBy" />
        <button v-if="r.fileKey" @click="openFile(r.fileKey)" class="text-xs text-primary underline">Ouvrir</button>
        <button aria-label="Supprimer la ressource" @click="confirmDeleteResource(r)" class="text-xs text-red-700 hover:underline">×</button>
      </div>
    </div>
  </div>
</template>

<script setup>
// Documents déjà partagés avec le groupe. Extrait de pages/ClassroomEnseignantView.vue.
import { computed, ref } from 'vue'
import { useClassGroupResourceStore } from '@/stores/classGroupResources'
import { useConfirmAction } from '@/composables/useConfirmAction'
import { useStoredFile } from '@/composables/useStoredFile'
import ResourceTypeFilter from '@/components/classroom/ResourceTypeFilter.vue'
import ReportContentButton from '@/components/classroom/ReportContentButton.vue'
import { fileIcon, filterResources, formatFileSize, resourceTypeLabel } from '@/helpers/classroomFormat'

const props = defineProps({ groupId: { type: Number, required: true } })

const resourceStore = useClassGroupResourceStore()
const typeFilter = ref('')
const filteredResources = computed(() => filterResources(resourceStore.resources, { type: typeFilter.value }))
const askConfirm = useConfirmAction()
const { openFile } = useStoredFile()

function confirmDeleteResource(r) {
  askConfirm(
    'Supprimer la ressource',
    `Supprimer « ${r.title} » ? Cette action est irréversible.`,
    () => resourceStore.delete(props.groupId, r.id),
  )
}
</script>

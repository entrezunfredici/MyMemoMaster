<template>
  <div class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-2">
    <h3 class="text-base font-semibold text-dark">Documents partagés</h3>
    <div v-if="resourceStore.resources.length === 0" class="text-sm text-dark/60">Aucun document.</div>
    <div v-for="r in resourceStore.resources" :key="r.id"
      class="flex items-center justify-between rounded-xl border border-gray px-3 py-2 text-sm">
      <div class="flex items-center gap-2">
        <span class="text-lg">{{ fileIcon(r.mimeType) }}</span>
        <div>
          <p class="font-semibold text-dark leading-tight">{{ r.title }}</p>
          <p class="text-xs text-dark/60">{{ resourceTypeLabel(r.type) }}{{ r.fileSize ? ' · ' + formatFileSize(r.fileSize) : '' }}</p>
        </div>
      </div>
      <div class="flex gap-2">
        <button v-if="r.fileKey" @click="openFile(r.fileKey)" class="text-xs text-primary underline">Ouvrir</button>
        <button aria-label="Supprimer la ressource" @click="confirmDeleteResource(r)" class="text-xs text-secondary hover:underline">×</button>
      </div>
    </div>
  </div>
</template>

<script setup>
// Documents déjà partagés avec le groupe. Extrait de pages/ClassroomEnseignantView.vue.
import { useClassGroupResourceStore } from '@/stores/classGroupResources'
import { useConfirmAction } from '@/composables/useConfirmAction'
import { useStoredFile } from '@/composables/useStoredFile'
import { fileIcon, formatFileSize, resourceTypeLabel } from '@/helpers/classroomFormat'

const props = defineProps({ groupId: { type: Number, required: true } })

const resourceStore = useClassGroupResourceStore()
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

<template>
  <section class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-3">
    <h2 class="text-lg font-semibold text-dark">Échéances des séances</h2>
    <div v-if="loading" class="text-sm text-dark/60">Chargement...</div>
    <div v-else-if="deadlineStore.groupDeadlines.length === 0" class="text-sm text-dark/60">Aucune échéance.</div>
    <div v-else class="space-y-2">
      <div v-for="dl in deadlineStore.groupDeadlines" :key="dl.id"
        class="rounded-xl border border-gray px-4 py-3 flex items-center justify-between">
        <div>
          <p class="text-sm font-semibold text-dark">{{ dl.name }}</p>
          <p class="text-xs text-dark/60">
            {{ deadlineTypeLabel(dl.type) }} · {{ formatDate(dl.dueDate) }}
            <span v-if="dl.test"> · <span class="text-primary">{{ dl.test.name }}</span></span>
          </p>
          <p class="text-xs text-dark/60">Séance : {{ dl.occurrence?.calendarEvent?.name }}</p>
        </div>
        <button @click="confirmDeleteDeadline(dl)" class="text-xs text-secondary hover:underline">Supprimer</button>
      </div>
    </div>
  </section>
</template>

<script setup>
// Liste des échéances posées sur les séances du groupe. Extrait de pages/ClassroomEnseignantView.vue.
import { useDeadlineStore } from '@/stores/deadlines'
import { useConfirmAction } from '@/composables/useConfirmAction'
import { deadlineTypeLabel, formatDate } from '@/helpers/classroomFormat'

const props = defineProps({
  groupId: { type: Number, required: true },
  loading: { type: Boolean, default: false },
})

const deadlineStore = useDeadlineStore()
const askConfirm = useConfirmAction()

function confirmDeleteDeadline(dl) {
  askConfirm(
    "Supprimer l'échéance",
    `Supprimer « ${dl.name} » ? Cette action est irréversible.`,
    () => deleteGroupDeadline(dl.id),
  )
}

async function deleteGroupDeadline(id) {
  const ok = await deadlineStore.deleteDeadline(id)
  if (ok) await deadlineStore.fetchByGroup(props.groupId)
}
</script>

<template>
  <div v-if="loading" class="text-sm text-dark/60">Chargement...</div>
  <div v-else-if="calendarStore.groupEvents.length === 0" class="text-sm text-dark/60">Aucun créneau planifié.</div>
  <div v-else class="space-y-2">
    <div v-for="ev in calendarStore.groupEvents" :key="ev.id"
      class="rounded-xl border border-gray px-4 py-3">
      <div class="flex items-center justify-between">
        <div>
          <div class="flex items-center gap-2">
            <span :class="ev.type === 'examen' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'"
              class="rounded-full px-2 py-0.5 text-xs font-semibold uppercase">
              {{ ev.type === 'examen' ? 'Examen' : ev.type === 'autre' ? 'Autre' : 'Cours' }}
            </span>
            <p class="text-sm font-semibold text-dark">{{ ev.name }}</p>
          </div>
          <p class="text-xs text-dark/60 mt-0.5">{{ ev.occurrences?.length ?? 0 }} séance(s)</p>
        </div>
        <button @click="confirmDeleteEvent(ev)" class="text-secondary text-xs hover:underline">Supprimer</button>
      </div>
      <div v-if="ev.occurrences?.length" class="mt-2 flex flex-wrap gap-1">
        <span v-for="occ in ev.occurrences.slice(0, 5)" :key="occ.id"
          class="rounded-full bg-gray px-2 py-0.5 text-xs text-dark/70">
          {{ formatDate(occ.date) }} {{ occ.startTime?.slice(0,5) }}
        </span>
        <span v-if="ev.occurrences.length > 5" class="text-xs text-dark/40">+{{ ev.occurrences.length - 5 }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
// Créneaux déjà planifiés pour le groupe (suppression incluse). Extrait de pages/ClassroomEtablissementView.vue.
import { useCalendarEventStore } from '@/stores/calendarEvents'
import { useConfirmAction } from '@/composables/useConfirmAction'
import { formatDate } from '@/helpers/classroomFormat'

const props = defineProps({
  groupId: { type: Number, required: true },
  loading: { type: Boolean, default: false },
})

const calendarStore = useCalendarEventStore()
const askConfirm = useConfirmAction()

// Une suppression de créneau partait SANS confirmation (retour de test fonctionnel) ; elle supprime aussi
// toutes ses séances.
function confirmDeleteEvent(ev) {
  askConfirm(
    'Supprimer le créneau',
    `Supprimer le créneau « ${ev.name} » et ses ${ev.occurrences?.length ?? 0} séance(s) ? Cette action est irréversible.`,
    async () => {
      await calendarStore.deleteEvent(ev.id)
      await calendarStore.fetchByGroup(props.groupId, true)
    },
  )
}
</script>

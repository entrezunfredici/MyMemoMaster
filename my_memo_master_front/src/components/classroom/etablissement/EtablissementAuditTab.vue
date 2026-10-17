<template>
  <div class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-3">
    <h2 class="text-lg font-semibold text-dark">Journal d'activité</h2>
    <div class="flex flex-wrap gap-2">
      <input aria-label="Action (ex: USER_INVITED)" v-model="auditFilters.action" type="text" placeholder="Action (ex: USER_INVITED)"
        class="rounded-lg border border-gray-500 px-3 py-1.5 text-sm" />
      <input aria-label="Limite (défaut 100)" v-model="auditFilters.limit" type="number" placeholder="Limite (défaut 100)"
        class="rounded-lg border border-gray-500 px-3 py-1.5 text-sm w-36" />
      <button @click="reloadAudit"
        class="rounded-lg bg-primary/10 px-3 py-1.5 text-sm text-primary hover:bg-primary/20 transition">
        Filtrer
      </button>
    </div>
    <div v-if="etabStore.audit.length === 0" class="text-sm text-dark/60">Aucune entrée.</div>
    <div v-else class="space-y-1 max-h-96 overflow-y-auto">
      <div v-for="log in etabStore.audit" :key="log.id"
        class="rounded-lg border border-gray/50 px-3 py-2 text-xs flex items-center justify-between gap-2">
        <span class="font-mono text-primary font-semibold truncate">{{ log.action }}</span>
        <span class="text-dark/70">{{ log.entityType }} #{{ log.entityId ?? '—' }}</span>
        <span class="text-dark/50">{{ log.actor?.name ?? '—' }}</span>
        <span class="text-dark/40 shrink-0">{{ formatDateTime(log.createdAt) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
// Onglet « Journal » de l'établissement : filtres et entrées d'audit. Extrait de pages/ClassroomEtablissementView.vue.
import { reactive } from 'vue'
import { useEtablissementStore } from '@/stores/etablissement'
import { formatDateTime } from '@/helpers/classroomFormat'

const props = defineProps({
  // Identifiant de l'établissement (null tant qu'il n'est pas résolu)
  etabId: { type: Number, default: null },
})

const etabStore = useEtablissementStore()
const auditFilters = reactive({ action: '', limit: '' })

async function reloadAudit() {
  if (!props.etabId) return
  await etabStore.fetchAudit(props.etabId, {
    action: auditFilters.action || undefined,
    limit: auditFilters.limit || undefined,
  })
}
</script>

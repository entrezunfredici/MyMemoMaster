<template>
  <section aria-labelledby="admin-audit-title" class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-4">
    <h2 id="admin-audit-title" class="text-lg font-semibold text-dark">Journal d’audit</h2>
    <p class="text-sm text-dark/70">
      Les 500 actions sensibles les plus récentes de toute la plateforme. Le type, l’identifiant d’entité et l’auteur
      filtrent le journal côté serveur ; l’action filtre les entrées affichées.
    </p>

    <form class="flex flex-wrap items-end gap-2" @submit.prevent="reload">
      <div class="flex flex-col gap-1">
        <label for="admin-audit-type" class="text-sm font-medium text-dark">Type d’entité</label>
        <select id="admin-audit-type" v-model="filters.entityType"
          class="rounded-lg border-2 border-gray-500 px-3 py-2 text-sm bg-white">
          <option value="">Tous</option>
          <option v-for="type in AUDIT_ENTITY_TYPES" :key="type.value" :value="type.value">{{ type.label }}</option>
        </select>
      </div>
      <div class="flex flex-col gap-1">
        <label for="admin-audit-entity" class="text-sm font-medium text-dark">Identifiant d’entité</label>
        <input id="admin-audit-entity" v-model="filters.entityId" type="number" min="1"
          class="rounded-lg border-2 border-gray-500 px-3 py-2 text-sm w-40" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="admin-audit-actor" class="text-sm font-medium text-dark">Identifiant de l’auteur</label>
        <input id="admin-audit-actor" v-model="filters.actorId" type="number" min="1"
          class="rounded-lg border-2 border-gray-500 px-3 py-2 text-sm w-40" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="admin-audit-action" class="text-sm font-medium text-dark">Action</label>
        <input id="admin-audit-action" v-model="actionFilter" type="text" placeholder="ex. ROLE"
          class="rounded-lg border-2 border-gray-500 px-3 py-2 text-sm" />
      </div>
      <button type="submit"
        class="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-light hover:bg-primary/90 transition">
        Filtrer
      </button>
    </form>

    <p v-if="auditStore.loading" class="text-sm text-dark/70" role="status">Chargement…</p>
    <p v-else-if="shownLogs.length === 0" class="text-sm text-dark/70" role="status">Aucune entrée.</p>
    <div v-else class="overflow-x-auto max-h-[32rem] overflow-y-auto">
      <table class="w-full text-sm">
        <caption class="sr-only">Journal d’audit de la plateforme</caption>
        <thead>
          <tr class="border-b border-gray text-left text-xs text-dark/70 uppercase tracking-wide">
            <th scope="col" class="pb-2 pr-4">Date</th>
            <th scope="col" class="pb-2 pr-4">Action</th>
            <th scope="col" class="pb-2 pr-4">Entité</th>
            <th scope="col" class="pb-2 pr-4">Auteur</th>
            <th scope="col" class="pb-2">Détails</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in shownLogs" :key="log.id" class="border-b border-gray/50 align-top">
            <td class="py-2 pr-4 text-dark/70 whitespace-nowrap">{{ formatDateTime(log.createdAt) }}</td>
            <td class="py-2 pr-4">
              <span class="font-medium text-dark">{{ auditActionLabel(log.action) }}</span>
              <span class="block font-mono text-xs text-dark/70">{{ log.action }}</span>
            </td>
            <td class="py-2 pr-4 text-dark/70">{{ auditEntityLabel(log.entityType) }} n° {{ log.entityId ?? '—' }}</td>
            <td class="py-2 pr-4 text-dark/70">{{ log.actor?.name ?? '—' }}</td>
            <td class="py-2 font-mono text-xs text-dark/70 break-all">{{ log.metadata ? JSON.stringify(log.metadata) : '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
// Journal d'audit global : filtres serveur (type, entité, auteur) et filtre d'action sur les entrées chargées.
import { computed, onMounted, reactive, ref } from 'vue'
import { useAuditLogStore } from '@/stores/auditLogs'
import { formatDateTime } from '@/helpers/classroomFormat'
import { AUDIT_ENTITY_TYPES, auditActionLabel, auditEntityLabel } from '@/helpers/adminLabels'

const auditStore = useAuditLogStore()

const filters = reactive({ entityType: '', entityId: '', actorId: '' })
const actionFilter = ref('')

const shownLogs = computed(() => {
  const term = actionFilter.value.trim().toLowerCase()
  if (!term) return auditStore.logs
  return auditStore.logs.filter((log) => log.action.toLowerCase().includes(term))
})

const reload = () => auditStore.fetchLogs({ ...filters })

onMounted(reload)
</script>

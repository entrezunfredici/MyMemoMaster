<template>
  <section aria-labelledby="admin-backups-title" class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 id="admin-backups-title" class="text-lg font-semibold text-dark">Sauvegardes de la base</h2>
        <p class="text-sm text-dark/70">
          Sauvegarde automatique chaque jour, à l’heure indiquée ci-dessous. Un email est envoyé aux administrateurs si elle échoue.
        </p>
      </div>
      <button type="button" :disabled="!canLaunch" @click="backupStore.launchBackup()"
        class="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-light hover:bg-primary/90 transition disabled:opacity-60 disabled:cursor-not-allowed">
        {{ isRunning ? 'Sauvegarde en cours…' : 'Lancer une sauvegarde maintenant' }}
      </button>
    </div>

    <p v-if="backupStore.loading && !status" class="text-sm text-dark/70" role="status">Chargement…</p>

    <template v-else-if="status">
      <p v-if="!status.supported" class="rounded-lg border-2 border-amber-600 bg-amber-50 p-3 text-sm text-dark" role="status">
        Les sauvegardes ne sont disponibles qu’avec la base PostgreSQL (environnement de production ou de pré-production).
      </p>

      <p v-if="failedSinceLastSuccess" class="rounded-lg border-2 border-red-600 bg-red-50 p-3 text-sm text-red-700" role="alert">
        <strong>La dernière sauvegarde a échoué</strong> le {{ formatDateTime(status.lastFailure.startedAt) }} :
        {{ status.lastFailure.errorMessage }}
      </p>

      <dl class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-lg border-2 border-gray p-3">
          <dt class="text-xs uppercase tracking-wide text-dark/70">Dernière sauvegarde réussie</dt>
          <dd class="mt-1 text-sm font-medium text-dark">{{ status.lastSuccess ? formatDateTime(status.lastSuccess.startedAt) : 'Aucune' }}</dd>
          <dd v-if="status.lastSuccess" class="text-xs text-dark/70">{{ formatFileSize(Number(status.lastSuccess.sizeBytes)) || '—' }}</dd>
        </div>
        <div class="rounded-lg border-2 border-gray p-3">
          <dt class="text-xs uppercase tracking-wide text-dark/70">Dernière sauvegarde automatique</dt>
          <dd class="mt-1 text-sm font-medium text-dark">{{ status.lastAuto ? formatDateTime(status.lastAuto.startedAt) : 'Aucune' }}</dd>
          <dd v-if="status.lastAuto" :class="['text-xs font-semibold', statusClass(status.lastAuto.status)]">{{ backupStatusLabel(status.lastAuto.status) }}</dd>
        </div>
        <div class="rounded-lg border-2 border-gray p-3">
          <dt class="text-xs uppercase tracking-wide text-dark/70">Prochaine sauvegarde</dt>
          <dd class="mt-1 text-sm font-medium text-dark">{{ status.nextRunAt ? formatDateTime(status.nextRunAt) : 'Planification désactivée' }}</dd>
          <dd v-if="status.nextRunAt" class="text-xs text-dark/70">Chaque jour à {{ status.scheduleHourUtc }} h (UTC)</dd>
        </div>
        <div class="rounded-lg border-2 border-gray p-3">
          <dt class="text-xs uppercase tracking-wide text-dark/70">Stockage</dt>
          <dd class="mt-1 text-sm font-medium text-dark">{{ status.destination === 's3' ? 'Stockage S3' : 'Dossier du serveur' }}</dd>
          <dd class="text-xs text-dark/70">{{ status.keep }} dernières sauvegardes conservées</dd>
        </div>
      </dl>

      <p v-if="backupStore.runs.length === 0" class="text-sm text-dark/70" role="status">Aucune sauvegarde enregistrée.</p>
      <div v-else class="overflow-x-auto max-h-[28rem] overflow-y-auto">
        <table class="w-full text-sm">
          <caption class="sr-only">Historique des sauvegardes</caption>
          <thead>
            <tr class="border-b border-gray text-left text-xs text-dark/70 uppercase tracking-wide">
              <th scope="col" class="pb-2 pr-4">Date</th>
              <th scope="col" class="pb-2 pr-4">Type</th>
              <th scope="col" class="pb-2 pr-4">Résultat</th>
              <th scope="col" class="pb-2 pr-4">Durée</th>
              <th scope="col" class="pb-2 pr-4">Taille</th>
              <th scope="col" class="pb-2">Détails</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="run in backupStore.runs" :key="run.id" class="border-b border-gray/50 align-top">
              <td class="py-2 pr-4 text-dark/70 whitespace-nowrap">{{ formatDateTime(run.startedAt) }}</td>
              <td class="py-2 pr-4 text-dark/70">
                {{ backupTriggerLabel(run.trigger) }}
                <span v-if="run.author?.name" class="block text-xs">par {{ run.author.name }}</span>
              </td>
              <td :class="['py-2 pr-4 font-semibold', statusClass(run.status)]">{{ backupStatusLabel(run.status) }}</td>
              <td class="py-2 pr-4 text-dark/70 whitespace-nowrap">{{ formatDuration(run.durationMs) }}</td>
              <td class="py-2 pr-4 text-dark/70 whitespace-nowrap">{{ formatFileSize(Number(run.sizeBytes)) || '—' }}</td>
              <td class="py-2 font-mono text-xs text-dark/70 break-all">{{ run.errorMessage || run.location || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>

<script setup>
// Sauvegardes de la base : état (dernier succès, dernière sauvegarde automatique, prochaine), lancement manuel
// et historique. Rafraîchit l'écran toutes les quelques secondes tant qu'une sauvegarde est en cours.
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useBackupStore } from '@/stores/backups'
import { formatDateTime, formatFileSize } from '@/helpers/classroomFormat'
import { backupStatusLabel, backupTriggerLabel, formatDuration } from '@/helpers/adminLabels'

const backupStore = useBackupStore()

const POLL_INTERVAL_MS = 4000
let pollTimer = null

const status = computed(() => backupStore.status)
const isRunning = computed(() => backupStore.launching || status.value?.running === true)
const canLaunch = computed(() => status.value?.supported === true && !isRunning.value)

// L'alerte n'est affichée que si l'échec est plus récent que le dernier succès : une sauvegarde réussie l'efface.
const failedSinceLastSuccess = computed(() => {
  const { lastFailure, lastSuccess } = status.value ?? {}
  if (!lastFailure) return false
  return !lastSuccess || new Date(lastFailure.startedAt) > new Date(lastSuccess.startedAt)
})

const statusClass = (value) => (value === 'failed' ? 'text-red-700' : value === 'success' ? 'text-green-700' : 'text-dark/70')

const stopPolling = () => {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = null
}

watch(() => status.value?.running === true, (running) => {
  stopPolling()
  if (running) pollTimer = setInterval(() => backupStore.fetchBackups({ silent: true }), POLL_INTERVAL_MS)
})

onMounted(() => backupStore.fetchBackups())
onBeforeUnmount(stopPolling)
</script>

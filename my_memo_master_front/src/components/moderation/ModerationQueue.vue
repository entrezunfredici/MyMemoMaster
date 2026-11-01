<template>
  <section aria-labelledby="moderation-queue-title" class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-4">
    <h2 id="moderation-queue-title" class="text-lg font-semibold text-dark">File de traitement</h2>
    <p class="text-sm text-dark/70">
      Une ligne par contenu signalé, les plus urgents d’abord : priorité haute (motif illégal ou au moins 3 signalants),
      puis les plus anciens.
    </p>

    <form class="flex flex-wrap items-end gap-2" @submit.prevent="applyFilters">
      <div class="flex flex-col gap-1">
        <label for="moderation-status" class="text-sm font-medium text-dark">Statut</label>
        <select id="moderation-status" v-model="filters.status"
          class="rounded-lg border-2 border-gray-500 px-3 py-2 text-sm bg-white">
          <option value="">À traiter (ouverts)</option>
          <option v-for="(s, key) in REPORT_STATUSES" :key="key" :value="key">{{ s.label }}</option>
        </select>
      </div>
      <div class="flex flex-col gap-1">
        <label for="moderation-reason" class="text-sm font-medium text-dark">Motif</label>
        <select id="moderation-reason" v-model="filters.reason"
          class="rounded-lg border-2 border-gray-500 px-3 py-2 text-sm bg-white">
          <option value="">Tous</option>
          <option v-for="r in REPORT_REASONS" :key="r.value" :value="r.value">{{ r.label }}</option>
        </select>
      </div>
      <div class="flex flex-col gap-1">
        <label for="moderation-type" class="text-sm font-medium text-dark">Type de contenu</label>
        <select id="moderation-type" v-model="filters.contentType"
          class="rounded-lg border-2 border-gray-500 px-3 py-2 text-sm bg-white">
          <option value="">Tous</option>
          <option v-for="(label, key) in CONTENT_TYPE_LABELS" :key="key" :value="key">{{ label }}</option>
        </select>
      </div>
      <button type="submit"
        class="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-light hover:bg-primary/90 transition">
        Filtrer
      </button>
    </form>

    <p v-if="store.loading" class="text-sm text-dark/70" role="status">Chargement…</p>
    <p v-else-if="store.items.length === 0" class="text-sm text-dark/70" role="status">Aucun signalement à afficher.</p>
    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <caption class="sr-only">Contenus signalés</caption>
        <thead>
          <tr class="border-b border-gray text-left text-xs text-dark/70 uppercase tracking-wide">
            <th scope="col" class="pb-2 pr-4">Contenu</th>
            <th scope="col" class="pb-2 pr-4">Auteur</th>
            <th scope="col" class="pb-2 pr-4">Motifs</th>
            <th scope="col" class="pb-2 pr-4">Signalements</th>
            <th scope="col" class="pb-2 pr-4">Priorité</th>
            <th scope="col" class="pb-2 pr-4">Statut</th>
            <th scope="col" class="pb-2"><span class="sr-only">Action</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in store.items" :key="`${item.contentType}-${item.contentId}`" class="border-b border-gray/50 align-top">
            <td class="py-2 pr-4">
              <span class="font-medium text-dark">{{ item.contentSnapshot?.title || 'Sans titre' }}</span>
              <span class="block text-xs text-dark/70">{{ CONTENT_TYPE_LABELS[item.contentType] ?? item.contentType }}</span>
            </td>
            <td class="py-2 pr-4 text-dark/70">{{ item.author?.name ?? '—' }}</td>
            <td class="py-2 pr-4 text-dark/70">{{ item.reasons.map(reasonLabel).join(', ') }}</td>
            <td class="py-2 pr-4 text-dark/70 whitespace-nowrap">
              {{ item.reportCount }}
              <span class="block text-xs">{{ plural(item.reporterCount, 'personne', 'personnes') }}</span>
            </td>
            <td class="py-2 pr-4 whitespace-nowrap">
              <span v-if="item.priority === 'high'" class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">Haute</span>
              <span v-else class="text-dark/70">Normale</span>
            </td>
            <td class="py-2 pr-4">
              <span :class="[REPORT_STATUSES[item.status]?.badge, 'rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap']">
                {{ statusLabel(item.status) }}
              </span>
              <span v-if="item.overdue" class="mt-1 block text-xs font-semibold text-red-700">En retard</span>
              <span v-if="item.purgeAt" :class="['mt-1 block text-xs', item.purgeImminent ? 'font-semibold text-red-700' : 'text-dark/70']">
                Suppression le {{ formatDate(item.purgeAt) }}
                <template v-if="item.purgeImminent"> (imminente)</template>
              </span>
            </td>
            <td class="py-2 text-right">
              <button type="button" :aria-label="`Examiner « ${item.contentSnapshot?.title || 'Sans titre'} »`"
                class="rounded-lg border border-primary px-3 py-1 text-xs text-primary hover:bg-primary hover:text-light transition"
                @click="emit('select', item.id)">
                Examiner
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <nav v-if="store.total > store.limit" class="flex items-center justify-between gap-2 text-sm" aria-label="Pagination de la file">
      <button type="button" :disabled="store.page <= 1 || store.loading"
        class="rounded-lg border-2 border-gray-500 px-3 py-1 text-dark disabled:opacity-50" @click="goTo(store.page - 1)">
        Précédent
      </button>
      <span class="text-dark/70" aria-live="polite">Page {{ store.page }} sur {{ store.pageCount }}</span>
      <button type="button" :disabled="store.page >= store.pageCount || store.loading"
        class="rounded-lg border-2 border-gray-500 px-3 py-1 text-dark disabled:opacity-50" @click="goTo(store.page + 1)">
        Suivant
      </button>
    </nav>
  </section>
</template>

<script setup>
// File de traitement des signalements : filtres (statut, motif, type), tableau regroupé par contenu, pagination.
// Émet `select` avec l'identifiant du dossier à examiner ; le chargement est piloté ici (`reload` exposé au parent).
import { onMounted, reactive } from 'vue'
import { useModerationStore } from '@/stores/moderation'
import { formatDate } from '@/helpers/classroomFormat'
import { plural } from '@/helpers/plural'
import {
  CONTENT_TYPE_LABELS, REPORT_REASONS, REPORT_STATUSES, reasonLabel, statusLabel,
} from '@/helpers/moderation'

const emit = defineEmits(['select'])

const store = useModerationStore()
const filters = reactive({ status: '', reason: '', contentType: '' })

const load = (page = 1) => store.fetchQueue({ ...filters, page })
const applyFilters = () => load(1)
const goTo = (page) => load(page)
// Recharge la page courante (après une action de modération : le dossier peut avoir changé de statut).
const reload = () => load(store.page)

onMounted(() => load(1))
defineExpose({ reload })
</script>

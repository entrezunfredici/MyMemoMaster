<template>
  <ModalComponent :visible="reportId !== null" title="Examiner le signalement" size="lg" @close="emit('close')">
    <p v-if="store.detailLoading || !detail" class="text-sm text-dark/70" role="status">Chargement…</p>

    <div v-else class="space-y-5">
      <!-- Contenu signalé -->
      <section aria-labelledby="mod-content-title" class="space-y-1">
        <h3 id="mod-content-title" class="text-base font-semibold text-dark">{{ snapshot.title || 'Sans titre' }}</h3>
        <p class="flex flex-wrap items-center gap-2 text-xs text-dark/70">
          <span>{{ CONTENT_TYPE_LABELS[report.contentType] ?? report.contentType }}</span>
          <span :class="[REPORT_STATUSES[status]?.badge, 'rounded-full px-2 py-0.5 font-semibold']">{{ statusLabel(status) }}</span>
          <span v-if="!detail.content" class="font-semibold text-red-700">Ce contenu n’existe plus</span>
        </p>
        <p v-if="snapshot.description" class="whitespace-pre-line text-sm text-dark/80">{{ snapshot.description }}</p>
        <p v-if="snapshot.originalName" class="text-xs text-dark/70">Fichier : {{ snapshot.originalName }}</p>
        <p v-if="snapshot.url" class="break-all text-xs text-dark/70">Lien : {{ snapshot.url }}</p>
        <p v-if="hiddenReport" class="text-sm text-amber-800">
          Masqué depuis le {{ formatDateTime(hiddenReport.hiddenAt) }} ; suppression définitive le
          <strong>{{ formatDate(hiddenReport.purgeAt) }}</strong> sans décision contraire.
        </p>
      </section>

      <!-- Auteur -->
      <section aria-labelledby="mod-author-title" class="space-y-1">
        <h3 id="mod-author-title" class="text-base font-semibold text-dark">Auteur</h3>
        <p class="text-sm text-dark/80">
          {{ detail.author?.name ?? 'Auteur inconnu (compte supprimé)' }}
          <span v-if="detail.author && detail.author.isActive === false" class="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
            Compte suspendu
          </span>
        </p>
      </section>

      <!-- Signalements -->
      <section aria-labelledby="mod-reports-title" class="space-y-2">
        <h3 id="mod-reports-title" class="text-base font-semibold text-dark">
          Signalements ({{ detail.reports.length }})
        </h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <caption class="sr-only">Signalements de ce contenu</caption>
            <thead>
              <tr class="border-b border-gray text-left text-xs text-dark/70 uppercase tracking-wide">
                <th scope="col" class="pb-2 pr-3">Date</th>
                <th scope="col" class="pb-2 pr-3">Signalant</th>
                <th scope="col" class="pb-2 pr-3">Motif</th>
                <th scope="col" class="pb-2 pr-3">Commentaire</th>
                <th scope="col" class="pb-2">Statut</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in detail.reports" :key="r.id" class="border-b border-gray/50 align-top">
                <td class="py-2 pr-3 whitespace-nowrap text-dark/70">{{ formatDateTime(r.createdAt) }}</td>
                <td class="py-2 pr-3 text-dark/70">{{ r.reporter?.name ?? '—' }}</td>
                <td class="py-2 pr-3 text-dark/70">{{ reasonLabel(r.reason) }}</td>
                <td class="py-2 pr-3 whitespace-pre-line text-dark/70">{{ r.comment || '—' }}</td>
                <td class="py-2">
                  <span :class="[REPORT_STATUSES[r.status]?.badge, 'rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap']">
                    {{ statusLabel(r.status) }}
                  </span>
                  <span v-if="r.decisionNote" class="mt-1 block text-xs text-dark/70">{{ r.decisionNote }}</span>
                  <span v-if="r.handler" class="block text-xs text-dark/70">par {{ r.handler.name }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Actions -->
      <section v-if="hasAnyAction" aria-labelledby="mod-actions-title" class="space-y-3 rounded-xl border-2 border-gray p-3">
        <h3 id="mod-actions-title" class="text-base font-semibold text-dark">Décision</h3>

        <div v-if="actions.claim && status === 'pending'">
          <button type="button" :disabled="store.acting"
            class="rounded-lg border-2 border-gray-500 px-3 py-2 text-sm font-medium text-dark disabled:opacity-50"
            @click="run('claim')">
            Prendre en charge
          </button>
        </div>

        <div v-if="needsNote" class="space-y-1">
          <label for="mod-note" class="text-sm font-medium text-dark">Motif de la décision (obligatoire)</label>
          <textarea id="mod-note" v-model="note" rows="3" :maxlength="DECISION_NOTE_MAX"
            class="w-full rounded-lg border-2 border-gray-500 px-3 py-2 text-sm bg-white"
            :aria-invalid="error ? 'true' : undefined" :aria-describedby="error ? 'mod-note-error' : undefined" />
          <p class="text-xs text-dark/70">{{ note.length }} / {{ DECISION_NOTE_MAX }}</p>
          <p v-if="error" id="mod-note-error" role="alert" class="text-sm text-red-700">{{ error }}</p>
        </div>

        <div class="flex flex-wrap gap-2">
          <button v-if="actions.dismiss" type="button" :disabled="store.acting"
            class="rounded-lg border-2 border-gray-500 px-3 py-2 text-sm font-medium text-dark disabled:opacity-50"
            @click="run('dismiss')">
            Rejeter le signalement
          </button>
          <button v-if="actions.hide" type="button" :disabled="store.acting"
            class="rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-800 disabled:opacity-50"
            @click="run('hide')">
            Masquer {{ HIDE_DAYS }} jours
          </button>
          <button v-if="actions.restore" type="button" :disabled="store.acting"
            class="rounded-lg bg-green-100 px-3 py-2 text-sm font-medium text-green-800 disabled:opacity-50"
            @click="run('restore')">
            Rétablir le contenu
          </button>
          <button v-if="actions.remove" type="button" :disabled="store.acting"
            class="rounded-lg bg-red-700 px-3 py-2 text-sm font-medium text-light disabled:opacity-50"
            @click="run('remove')">
            Supprimer définitivement
          </button>
          <button v-if="actions.suspend" type="button" :disabled="store.acting"
            class="rounded-lg border-2 border-red-700 px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-50"
            @click="run('suspend')">
            Suspendre le compte de l’auteur
          </button>
        </div>

        <!-- Confirmation en deux temps des actions difficiles à annuler -->
        <div v-if="pending" role="alert" class="space-y-2 rounded-lg bg-red-100 p-3 text-sm text-red-800">
          <p>{{ CONFIRMATIONS[pending] }}</p>
          <div class="flex gap-2">
            <button type="button" :disabled="store.acting"
              class="rounded-lg bg-red-700 px-3 py-2 text-sm font-medium text-light disabled:opacity-50"
              @click="run(pending, true)">
              Confirmer
            </button>
            <button type="button" class="rounded-lg border-2 border-gray-500 bg-white px-3 py-2 text-sm font-medium text-dark"
              @click="pending = null">
              Annuler
            </button>
          </div>
        </div>
      </section>
      <p v-else class="text-sm text-dark/70">Ce dossier est clos : aucune action n’est possible.</p>
    </div>
  </ModalComponent>
</template>

<script setup>
// Examen d'un contenu signalé : copie du contenu, auteur, signalements, puis actions de modération selon le statut
// et le rôle (règles de helpers/moderation.js#availableActions). Les actions difficiles à annuler (suppression,
// suspension du compte) demandent une confirmation. Émet `close`, et `changed` quand la file doit être rechargée.
import { computed, ref, watch } from 'vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { useAuthStore } from '@/stores/auth'
import { useModerationStore } from '@/stores/moderation'
import { formatDate, formatDateTime } from '@/helpers/classroomFormat'
import {
  CONTENT_TYPE_LABELS, DECISION_NOTE_MAX, HIDE_DAYS, REPORT_STATUSES,
  availableActions, reasonLabel, statusLabel, validateDecisionNote,
} from '@/helpers/moderation'

const props = defineProps({
  // Identifiant du dossier examiné ; null = fenêtre fermée.
  reportId: { type: Number, default: null },
})
const emit = defineEmits(['close', 'changed'])

const auth = useAuthStore()
const store = useModerationStore()

const note = ref('')
const error = ref('')
const pending = ref(null)

const CONFIRMATIONS = {
  remove: 'Le contenu et son fichier seront supprimés définitivement. Cette action est irréversible.',
  suspend: 'Le compte de l’auteur sera suspendu sur toute la plateforme (pas seulement dans ce groupe) et il sera déconnecté. Un administrateur pourra le réactiver.',
}
// Actions qui exigent un motif ; claim et restore n'en ont pas.
const NOTE_ACTIONS = ['dismiss', 'hide', 'remove', 'suspend']

const detail = computed(() => store.detail)
const report = computed(() => detail.value?.report)
const snapshot = computed(() => report.value?.contentSnapshot ?? {})

// Un contenu peut cumuler des signalements clos et ouverts : le statut d'ensemble est celui des signalements ouverts.
const openReport = computed(() => detail.value?.reports.find((r) => REPORT_STATUSES[r.status]?.open) ?? report.value)
const status = computed(() => {
  const list = detail.value?.reports ?? []
  for (const s of ['hidden', 'in_review', 'pending']) if (list.some((r) => r.status === s)) return s
  return report.value?.status
})
const hiddenReport = computed(() => detail.value?.reports.find((r) => r.status === 'hidden' && r.purgeAt))

const actions = computed(() => availableActions({
  status: status.value,
  contentExists: !!detail.value?.content,
  authorActive: detail.value?.author ? detail.value.author.isActive !== false : null,
  roleId: auth.user?.roleId,
}))
const hasAnyAction = computed(() => Object.values(actions.value).some(Boolean))
const needsNote = computed(() => NOTE_ACTIONS.some((a) => actions.value[a]))

watch(() => props.reportId, async (id) => {
  note.value = ''
  error.value = ''
  pending.value = null
  if (id !== null) await store.fetchDetail(id)
}, { immediate: true })

/**
 * Applique une action de modération, après validation du motif et confirmation éventuelle.
 *
 * @param {'claim'|'dismiss'|'hide'|'restore'|'remove'|'suspend'} action
 * @param {boolean} [confirmed] - true une fois la confirmation en deux temps validée
 */
async function run(action, confirmed = false) {
  if (NOTE_ACTIONS.includes(action)) {
    error.value = validateDecisionNote(note.value)
    if (error.value) {
      pending.value = null
      return
    }
  }
  if (CONFIRMATIONS[action] && !confirmed) {
    pending.value = action
    return
  }
  pending.value = null
  const ok = await store.act(openReport.value.id, action, note.value)
  if (!ok) return
  emit('changed')
  // claim et suspend laissent le dossier ouvert : on le recharge ; les autres le règlent, on referme.
  if (action === 'claim' || action === 'suspend') {
    note.value = ''
    await store.fetchDetail(props.reportId)
  } else {
    emit('close')
  }
}
</script>

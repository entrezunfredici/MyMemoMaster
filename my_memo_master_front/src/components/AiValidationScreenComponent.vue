<template>
  <div class="w-full max-w-4xl mx-auto p-6">
    <div class="flex items-center justify-between mb-4">
      <button @click="cancel" class="text-primary font-semibold hover:underline">
        ← Annuler la génération
      </button>
      <h2 class="text-2xl font-bold text-heading">Cartes proposées ({{ cards.length }})</h2>
      <button
        @click="acceptAll"
        class="bg-primary hover:bg-primary/90 text-white font-bold py-2 px-5 rounded-lg transition"
      >
        Tout accepter ({{ cards.length }})
      </button>
    </div>

    <p class="text-sm text-gray-500 mb-4">
      ✅ {{ counts.accepted }} acceptée{{ counts.accepted > 1 ? 's' : '' }} ·
      ✎ {{ counts.edited }} modifiée{{ counts.edited > 1 ? 's' : '' }} ·
      🗑 {{ counts.rejected }} rejetée{{ counts.rejected > 1 ? 's' : '' }}
    </p>

    <div class="flex flex-col gap-2 mb-4">
      <div
        v-for="card in cards"
        :key="card.id"
        class="bg-white border border-gray-200 rounded-lg p-4"
        :class="{ 'opacity-50': card.status === 'rejected' }"
      >
        <div class="flex items-start gap-3">
          <input
            :aria-label="`Inclure la carte « ${card.statement} »`"
            type="checkbox"
            class="accent-primary mt-1 shrink-0"
            :checked="isChecked(card)"
            @change="toggleCard(card)"
          />
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-heading">
              <FormulaText :text="card.statement" />
              <span v-if="card.status === 'edited'" class="ml-2 text-xs font-normal text-primary">✎ modifiée</span>
            </p>

            <template v-if="card.type === 'open'">
              <p class="text-sm text-gray-500 mt-1 italic">→ <FormulaText :text="card.answer || ''" /></p>
            </template>
            <template v-else>
              <p class="text-sm text-gray-500 mt-1">
                QCM · {{ (card.options || []).length }} options · bonne réponse :
                {{ (card.options || []).find(o => o.correct)?.text || '—' }}
              </p>
            </template>

            <button
              type="button"
              class="text-xs text-gray-400 hover:text-gray-600 mt-2"
              @click="card.sourceOpen = !card.sourceOpen"
            >
              {{ card.sourceOpen ? '▾' : '▸' }} Source
            </button>
            <p v-if="card.sourceOpen" class="text-xs text-gray-500 mt-1 italic border-l-2 border-gray-200 pl-2">
              « {{ card.sourceExcerpt || '—' }} »
            </p>

            <p v-if="card.promoteError" class="text-xs text-red-600 mt-2">⚠️ {{ card.promoteError }}</p>
          </div>
          <div class="flex gap-2 flex-shrink-0">
            <button
              @click="openEdit(card)"
              class="hover:bg-gray-100 text-gray-600 py-1 px-2 rounded border border-gray-300 transition"
              title="Modifier"
            >✎</button>
            <button
              @click="rejectCard(card)"
              class="hover:bg-red-50 text-gray-600 py-1 px-2 rounded border border-gray-300 transition"
              title="Rejeter"
            >🗑</button>
          </div>
        </div>
      </div>

      <p v-if="cards.length === 0" class="text-center text-gray-light py-10">
        Toutes les cartes ont été rejetées.
      </p>
    </div>

    <div v-if="warnings.length" class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm text-yellow-800">
      <p v-for="(w, i) in warnings" :key="i">⚠️ {{ w }}</p>
    </div>

    <div class="flex gap-4 justify-end">
      <button type="button" class="btn-modal-cancel" style="flex: initial; padding-left: 2rem; padding-right: 2rem" @click="cancel">
        Annuler
      </button>
      <button
        type="button"
        class="btn-modal-submit"
        style="flex: initial; padding-left: 2rem; padding-right: 2rem"
        :disabled="submitting || checkedCount === 0"
        @click="submit"
      >
        {{ submitting ? 'Ajout…' : `Ajouter les ${checkedCount} carte${checkedCount > 1 ? 's' : ''} ✓` }}
      </button>
    </div>

    <AiCardEditModal
      :visible="editingCard !== null"
      :card="editingCard"
      @close="editingCard = null"
      @save="saveEdit"
    />
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import FormulaText from '@/components/FormulaTextComponent.vue'
import AiCardEditModal from '@/components/AiCardEditModalComponent.vue'
import { useAiCardGenerationStore } from '@/stores/aiCardGeneration'
import { notif } from '@/helpers/notif'

// Vue 3 de diagrams/generation_ia_ui.md (§6) — écran de révision des cartes proposées par l'IA
// (C-01.09). Écran plein qui remplace temporairement le contenu de FlashcardsCardsPage.vue (v-if
// côté parent), pas une modal — conforme à la maquette. Le statut de chaque carte proposée
// (`AiGeneratedCard.status`) est la source de vérité de l'état "cochée" (pending/accepted/edited →
// cochée, rejected → décochée) et est écrit en base à chaque interaction, pas seulement en mémoire
// locale : le batch reste "pending" tant qu'il n'est pas validé/abandonné, donc une carte
// coché/décochée resurvit à un rechargement de page (cf. JSDoc de
// AiGenerationBatch.service.js#findPendingByUser, qui anticipe explicitement ce cas).

const props = defineProps({
  batch: { type: Object, required: true }, // { id, idSystem, warnings, cards: [...] }
})
const emit = defineEmits(['close', 'validated'])

const aiCardGenerationStore = useAiCardGenerationStore()

// Copie locale réactive des cartes du batch — chaque carte gagne `sourceOpen` (accordéon UI) et
// `promoteError` (état d'échec de promotion, §10 de la maquette : échec partiel toléré).
const cards = reactive(
  props.batch.cards.map(c => ({ ...c, sourceOpen: false, promoteError: null }))
)
const warnings = props.batch.warnings || []
const editingCard = ref(null)
const submitting = ref(false)

const isChecked = (card) => card.status !== 'rejected'
const checkedCount = computed(() => cards.filter(isChecked).length)
const counts = computed(() => ({
  accepted: cards.filter(c => c.status === 'accepted' || c.status === 'pending').length,
  edited: cards.filter(c => c.status === 'edited').length,
  rejected: cards.filter(c => c.status === 'rejected').length,
}))

async function toggleCard(card) {
  const nextStatus = isChecked(card) ? 'rejected' : 'accepted'
  const updated = await aiCardGenerationStore.updateCard(card.id, { status: nextStatus })
  if (updated) card.status = updated.status
}

function rejectCard(card) {
  if (isChecked(card)) toggleCard(card)
}

async function acceptAll() {
  for (const card of cards) {
    if (card.status === 'rejected') {
      const updated = await aiCardGenerationStore.updateCard(card.id, { status: 'accepted' })
      if (updated) card.status = updated.status
    }
  }
}

function openEdit(card) {
  editingCard.value = card
}

async function saveEdit(payload) {
  const card = editingCard.value
  const updated = await aiCardGenerationStore.updateCard(card.id, { ...payload, status: 'edited' })
  if (updated) {
    Object.assign(card, updated)
    card.promoteError = null
  } else {
    notif.notify('Erreur lors de la mise à jour de la carte.', 'error')
  }
  editingCard.value = null
}

// Referme l'écran en abandonnant explicitement le brouillon (statut "discarded" — bookkeeping
// seulement, aucune carte réelle n'a jamais été créée) : évite qu'un brouillon délibérément
// abandonné réapparaisse dans le bandeau "reprendre" de FlashcardsCardsPage.vue.
async function cancel() {
  await aiCardGenerationStore.markBatchStatus(props.batch.id, 'discarded')
  emit('close')
}

// Promeut séquentiellement chaque carte cochée vers la persistance réelle (§10 de la maquette).
// Échec partiel toléré : les cartes en échec restent affichées (badge d'erreur, toujours cochées,
// réessayables par un nouveau clic), les cartes réussies sont retirées de la liste. Le batch n'est
// marqué "validated" que lorsque plus aucune carte cochée n'est en échec.
async function submit() {
  submitting.value = true
  let addedCount = 0
  let failedCount = 0

  for (const card of [...cards]) {
    if (!isChecked(card)) continue

    const result = await aiCardGenerationStore.promoteCard({
      idSystem: props.batch.idSystem,
      statement: card.statement,
      type: card.type,
      answer: card.answer,
      acceptedAnswers: card.acceptedAnswers,
      options: card.options,
    })

    if (result.success) {
      addedCount++
      const idx = cards.indexOf(card)
      if (idx !== -1) cards.splice(idx, 1)
    } else {
      failedCount++
      card.promoteError = result.message
    }
  }

  submitting.value = false

  if (failedCount === 0) {
    await aiCardGenerationStore.markBatchStatus(props.batch.id, 'validated')
    notif.notify(`${addedCount} carte${addedCount > 1 ? 's' : ''} ajoutée${addedCount > 1 ? 's' : ''} au système.`, 'success')
    emit('validated', { addedCount })
  } else {
    notif.notify(
      `${addedCount} carte${addedCount > 1 ? 's' : ''} ajoutée${addedCount > 1 ? 's' : ''}, ${failedCount} en échec — réessayez.`,
      'error',
    )
  }
}
</script>

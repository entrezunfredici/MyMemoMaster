<template>
  <div class="w-full max-w-4xl mx-auto p-3 sm:p-6">

    <!-- Écran de révision des cartes générées (C-01.09, Vue 3 de la maquette) — remplace
         temporairement le contenu de la page, pas une modal, conforme à diagrams/generation_ia_ui.md
         §6. -->
    <AiValidationScreen
      v-if="aiValidationBatch"
      :batch="aiValidationBatch"
      :mind-map-json="mindMapJson"
      @close="handleValidationClose"
      @validated="handleValidated"
    />

    <template v-else>

    <!-- CHOIX: sous sm, « Retour » + titre sur la 1re ligne, les deux boutons d'action sur la 2e (pleine largeur)
         RAISON: quatre éléments sur une ligne écrasaient le titre sous les boutons (360-412 px) -->
    <div class="flex flex-wrap sm:flex-nowrap items-center justify-between gap-x-3 gap-y-3 mb-6">
      <button @click="router.push('/flashcards')" class="text-primary font-semibold hover:underline whitespace-nowrap shrink-0">
        ← Retour
      </button>
      <h2 class="flex-1 sm:flex-none min-w-0 break-words text-xl sm:text-2xl font-bold text-heading">{{ systemName }}</h2>
      <div class="flex gap-2 basis-full sm:basis-auto">
        <button
          @click="openAiFlow"
          class="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-on-primary font-bold py-2 px-3 sm:px-5 text-sm sm:text-base rounded-lg transition"
        >
          ✨ Générer par IA
        </button>
        <button
          @click="cardModal.openAdd()"
          class="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-on-primary font-bold py-2 px-3 sm:px-5 text-sm sm:text-base rounded-lg transition"
        >
          + Ajouter une carte
        </button>
      </div>
    </div>

    <!-- Reprise d'un brouillon IA en attente de validation (C-01.09) — un batch "pending" existant
         pour ce système, jamais fermé via l'écran de révision (ex. onglet fermé sans valider). -->
    <div
      v-if="pendingAiBatchForSystem"
      class="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 mb-6"
    >
      <p class="text-sm text-primary">
        ✨ Une génération par IA est en attente de validation ({{ pendingAiBatchForSystem.cards?.length ?? 0 }} cartes proposées)
      </p>
      <button @click="resumePendingBatch" class="text-sm font-semibold text-primary hover:underline">
        Reprendre
      </button>
    </div>

    <div v-if="loading" class="text-center text-gray-light py-10">Chargement des cartes...</div>

    <div v-else>
      <FlashcardsBoxesPanel
        :boxes="systemBoxes"
        @add="boxModal.openAdd()"
        @edit="boxModal.openEdit($event)"
        @delete="deleteBox"
      />
      <FlashcardsCardList
        :cards-by-level="cardsByLevel"
        :empty="allCards.length === 0"
        @edit="cardModal.openEdit($event)"
        @delete="deleteCard"
      />
    </div>

    </template>

    <ConfirmActionModal :modal="confirmModal" @cancel="closeConfirmModal" @confirm="runConfirmedAction" />

    <FlashcardCardModal ref="cardModal" :system-id="systemId" :mind-map-json="mindMapJson" :reload="reload" />
    <FlashcardBoxModal ref="boxModal" :system-id="systemId" :boxes="systemBoxes" :reload="reload" />

    <!-- Génération de cartes par IA (C-01.08) — Vue 1 (configuration) puis Vue 2 (attente/erreur).
         Montées via v-if pour toute la durée du flux : l'état saisi en Vue 1 survit à un aller-retour
         par [Réessayer] (voir AiGenerateCardsModalComponent.vue). -->
    <template v-if="showAiFlow">
      <AiGenerateCardsModal
        :visible="aiStep === 'config'"
        :id-system="systemId"
        :default-subject-context="systemSubjectName"
        @close="closeAiFlow"
        @submit="handleAiGenerate"
      />
      <AiGenerationProgressModal
        :visible="aiStep === 'progress'"
        :status="aiCardGenerationStore.status === 'error' ? 'error' : 'generating'"
        :error-message="aiCardGenerationStore.errorMessage"
        @cancel="closeAiFlow"
        @close="closeAiFlow"
        @retry="aiStep = 'config'"
      />
    </template>

  </div>
</template>

<script setup>
// Gestion des cartes d'un système de Leitner : cartes par boîte, boîtes, ajout / modification
// (fenêtres dédiées) et génération par IA. Les données et les formulaires vivent dans les
// composables useFlashcardsCards, useCardForm, useBoxForm et useAiCardFlow.
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import FlashcardsBoxesPanel from '@/components/flashcards/FlashcardsBoxesPanelComponent.vue'
import FlashcardsCardList from '@/components/flashcards/FlashcardsCardListComponent.vue'
import FlashcardCardModal from '@/components/flashcards/FlashcardCardModalComponent.vue'
import FlashcardBoxModal from '@/components/flashcards/FlashcardBoxModalComponent.vue'
import AiGenerateCardsModal from '@/components/AiGenerateCardsModalComponent.vue'
import AiGenerationProgressModal from '@/components/AiGenerationProgressModalComponent.vue'
import AiValidationScreen from '@/components/AiValidationScreenComponent.vue'
import ConfirmActionModal from '@/components/ConfirmActionModal.vue'
import { provideConfirmAction } from '@/composables/useConfirmAction'
import { useFlashcardsCards } from '@/composables/useFlashcardsCards'
import { useAiCardFlow } from '@/composables/useAiCardFlow'
import { useGuidedTourStore } from '@/stores/guidedTour'

const guidedTourStore = useGuidedTourStore()
const router = useRouter()
const route = useRoute()
const systemId = Number(route.params.systemId)
const { confirmModal, askConfirm, closeConfirmModal, runConfirmedAction } = provideConfirmAction()

const {
  loading,
  systemName,
  systemSubjectName,
  mindMapJson,
  systemBoxes,
  allCards,
  cardsByLevel,
  loadCards,
  reload,
  deleteCard,
  deleteBox,
} = useFlashcardsCards(systemId, askConfirm)

const {
  aiCardGenerationStore,
  showAiFlow,
  aiStep,
  aiValidationBatch,
  pendingAiBatchForSystem,
  openAiFlow,
  closeAiFlow,
  handleAiGenerate,
  resumePendingBatch,
  handleValidationClose,
} = useAiCardFlow(systemId)

// Références vers les fenêtres (ouverture depuis la page)
const cardModal = ref(null)
const boxModal = ref(null)

// Parcours guidé : l'étape « système de Leitner » attend une première carte. Seule la création manuelle
// (useCardForm) l'enregistrait : les cartes générées par IA, ou déjà présentes, laissaient « Étape
// suivante » grisé. On valide donc dès que le système du parcours contient au moins une carte.
const recordTourCards = () => {
  if (!guidedTourStore.active || guidedTourStore.links.leitnerSystemId !== systemId) return
  if (allCards.value.length) guidedTourStore.recordLinks({ flashcardId: allCards.value[0].idCard ?? -1 })
}

onMounted(async () => {
  await loadCards()
  recordTourCards()
  loading.value = false
  // Bandeau de reprise (C-01.09) — best-effort, ne bloque pas l'affichage de la page si ça échoue
  aiCardGenerationStore.fetchPendingBatches()
})

// Toutes les cartes cochées ont été promues avec succès (POST /questions → /responses →
// /leitnercards par carte) et le batch a été marqué « validated » par le composant — on recharge la
// liste des cartes du système pour voir apparaître les nouvelles, et le bandeau de reprise.
const handleValidated = async () => {
  aiValidationBatch.value = null
  loading.value = true
  await Promise.all([loadCards(), aiCardGenerationStore.fetchPendingBatches()])
  recordTourCards()
  loading.value = false
}
</script>

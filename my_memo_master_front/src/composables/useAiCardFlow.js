import { ref, computed } from 'vue'
import { useAiCardGenerationStore } from '@/stores/aiCardGeneration'

/**
 * Génération de cartes par IA (C-01.08 / C-01.09) : configuration (Vue 1), attente / erreur (Vue 2),
 * puis écran de révision du brouillon (Vue 3), et reprise d'un brouillon « pending » du système.
 *
 * @param {number} systemId
 */
export function useAiCardFlow(systemId) {
  const aiCardGenerationStore = useAiCardGenerationStore()
  const showAiFlow = ref(false)
  const aiStep = ref('config') // 'config' | 'progress'
  const aiValidationBatch = ref(null) // batch affiché à l'écran de révision (Vue 3), null si fermé

  // Le plus récent batch « pending » pour CE système (la liste du store couvre tous les systèmes de
  // l'utilisateur) — bandeau de reprise (C-01.09), masqué tant que l'écran de révision est ouvert.
  const pendingAiBatchForSystem = computed(() => {
    if (aiValidationBatch.value) return null
    return aiCardGenerationStore.pendingBatches.find((b) => b.idSystem === systemId) || null
  })

  const openAiFlow = () => {
    aiCardGenerationStore.reset()
    aiStep.value = 'config'
    showAiFlow.value = true
  }

  // Referme tout le flux IA (Vue 1/Vue 2) sans rien persister — aucune écriture n'a eu lieu ici, seul
  // POST /ai-generation-batches a été appelé (brouillon « pending », pas des cartes réelles).
  const closeAiFlow = () => {
    showAiFlow.value = false
    aiCardGenerationStore.reset()
  }

  // Lance la génération (Vue 1 → Vue 2). Une génération réussie enchaîne directement sur l'écran de
  // révision (Vue 3) — le brouillon « pending » renvoyé par le store lui est passé tel quel.
  const handleAiGenerate = async (config) => {
    aiStep.value = 'progress'
    const success = await aiCardGenerationStore.generate(config)
    if (success) {
      showAiFlow.value = false
      aiValidationBatch.value = aiCardGenerationStore.lastBatch
    }
    // Échec : le store passe à status 'error' et la fenêtre de progression affiche l'erreur
    // (message + [Réessayer]/[Fermer]) — rien de plus à faire ici.
  }

  // Reprend le batch « pending » affiché par le bandeau — même écran que juste après une génération.
  const resumePendingBatch = () => {
    if (pendingAiBatchForSystem.value) aiValidationBatch.value = pendingAiBatchForSystem.value
  }

  // Fermeture de l'écran de révision (Annuler, ou [X]) — le batch a été marqué « discarded » par le
  // composant lui-même avant d'émettre 'close' ; on rafraîchit le bandeau de reprise.
  const handleValidationClose = async () => {
    aiValidationBatch.value = null
    await aiCardGenerationStore.fetchPendingBatches()
  }

  return {
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
  }
}

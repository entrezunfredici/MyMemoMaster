<template>
  <ModalComponent :visible="visible" title="Génération en cours…" size="sm" @close="emit('cancel')">
    <div v-if="status === 'generating'" class="text-center py-4">
      <p class="text-2xl mb-4">⏳ Analyse de votre contenu...</p>
      <ul class="text-sm text-left text-gray-600 space-y-2 mb-6">
        <li>✓ Contenu reçu</li>
        <li>⏳ Génération des cartes...</li>
        <li>○ Préparation de la validation</li>
      </ul>
      <p class="text-xs text-gray-400 mb-4">Cela peut prendre jusqu'à une minute selon la taille du contenu.</p>
    </div>

    <div v-else class="text-center py-4">
      <p class="text-2xl mb-4">⚠️ La génération a échoué</p>
      <p class="text-sm text-gray-600 mb-4">{{ errorMessage }}</p>
    </div>

    <template #footer>
      <template v-if="status === 'generating'">
        <button type="button" class="btn-modal-cancel" @click="emit('cancel')">Annuler</button>
      </template>
      <template v-else>
        <button type="button" class="btn-modal-cancel" @click="emit('close')">Fermer</button>
        <button type="button" class="btn-modal-submit" @click="emit('retry')">Réessayer</button>
      </template>
    </template>
  </ModalComponent>
</template>

<script setup>
import ModalComponent from '@/components/ModalComponent.vue'

// Vue 2 de diagrams/generation_ia_ui.md (§5) — état d'attente pendant l'appel réseau (POST
// /ai-generation-batches) puis état d'erreur en cas d'échec. Les 3 étapes affichées pendant
// `status === 'generating'` sont illustratives (aucune progression réelle côté API — un appel LLM
// synchrone ne permet pas de suivi fin sans streaming/polling, explicitement hors périmètre de la
// maquette §11) : elles rassurent sur un appel potentiellement long, rien de plus.

defineProps({
  visible: { type: Boolean, required: true },
  status: { type: String, required: true }, // 'generating' | 'error'
  errorMessage: { type: String, default: '' },
})

// CHOIX: 'cancel' (ferme sans annuler l'appel réseau sous-jacent) distinct de 'close' (après un
// échec déjà terminé) — même nuance que documentée en §5 de la maquette : "n'implique pas
// nécessairement d'annuler l'appel réseau sous-jacent, détail d'implémentation hors périmètre".
// Le parent traite les deux de la même façon (referme tout le flux IA) mais les événements restent
// distincts pour rester fidèles à l'intention de chaque bouton.
const emit = defineEmits(['cancel', 'close', 'retry'])
</script>

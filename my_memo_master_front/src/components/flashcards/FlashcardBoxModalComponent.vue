<template>
  <!-- Modal boîte -->
  <div
    v-if="showModal"
    class="modal-overlay"
    @mousedown.self="close" v-dialog="close" role="dialog" aria-modal="true" aria-labelledby="flashcard-box-modal-title"
  >
    <div class="modal-panel modal-panel--sm">
      <button aria-label="Fermer" @click="close" class="modal-close">&times;</button>
      <h2 id="flashcard-box-modal-title" class="modal-title">
        {{ editingBox ? 'Modifier la boîte' : 'Nouvelle boîte' }}
      </h2>
      <form @submit.prevent="submit">
        <div class="form-group">
          <label class="form-label">Niveau</label>
          <input aria-label="Niveau de la boîte"
            v-model="boxForm.level"
            type="number"
            min="1"
            placeholder="Ex : 2"
            class="form-input"
            required
          />
        </div>
        <div class="form-group">
          <label class="form-label">Intervalle (secondes)</label>
          <input aria-label="Intervalle en secondes"
            v-model="boxForm.intervall"
            type="number"
            min="1"
            placeholder="Ex : 10"
            class="form-input"
            required
          />
          <p v-if="intervalPreview" class="text-xs text-gray-600 mt-1" aria-live="polite">Soit {{ intervalPreview }}</p>
        </div>
        <div class="form-group--lg">
          <label class="form-label">Couleur</label>
          <input aria-label="Couleur de la boîte"
            v-model="boxForm.color"
            type="color"
            class="h-10 w-16 cursor-pointer rounded border border-gray-500 bg-white p-1"
          />
        </div>
        <p v-if="formError" class="text-red-600 text-sm mb-4">{{ formError }}</p>
        <div class="btn-row">
          <button
            type="submit"
            :disabled="submitting"
            class="btn-modal-submit"
          >
            {{ submitting ? 'Enregistrement...' : editingBox ? 'Modifier' : 'Ajouter' }}
          </button>
          <button type="button" @click="close" class="btn-modal-cancel">
            Annuler
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { dialogDirective as vDialog } from '@/directives/dialog'
// Fenêtre d'ajout / modification d'une boîte de Leitner. Se pilote depuis la page avec
// `openAdd()` / `openEdit(box)` (via une référence de composant) ; la logique est dans useBoxForm.
import { computed } from 'vue'
import { useBoxForm } from '@/composables/useBoxForm'
import { formatDuration } from '@/helpers/functions'

const props = defineProps({
  systemId: { type: Number, required: true },
  // Boîtes actuelles du système (la couleur de la dernière est proposée à l'ajout)
  boxes: { type: Array, default: () => [] },
  // Recharge les cartes de la page après un enregistrement
  reload: { type: Function, required: true },
})

const { showModal, submitting, formError, editingBox, boxForm, openAdd, openEdit, close, submit } = useBoxForm({
  systemId: props.systemId,
  getBoxes: () => props.boxes,
  reload: () => props.reload(),
})

// Équivalent lisible de l'intervalle saisi en secondes (86400 -> « 1 j »), pour qu'on ne le confonde pas avec l'unité affichée dans la liste.
const intervalPreview = computed(() => formatDuration(boxForm.intervall))

defineExpose({ openAdd, openEdit })
</script>

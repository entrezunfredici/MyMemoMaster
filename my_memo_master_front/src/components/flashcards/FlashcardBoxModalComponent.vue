<template>
  <!-- Modal boîte -->
  <div
    v-if="showModal"
    class="modal-overlay"
    @mousedown.self="close"
  >
    <div class="modal-panel modal-panel--sm">
      <button aria-label="Fermer" @click="close" class="modal-close">&times;</button>
      <h2 class="modal-title">
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
// Fenêtre d'ajout / modification d'une boîte de Leitner. Se pilote depuis la page avec
// `openAdd()` / `openEdit(box)` (via une référence de composant) ; la logique est dans useBoxForm.
import { useBoxForm } from '@/composables/useBoxForm'

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

defineExpose({ openAdd, openEdit })
</script>

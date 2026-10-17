<template>
  <ModalComponent :visible="modal.visible" :title="modal.title" size="sm" @close="emit('cancel')">
    <p class="text-sm text-dark/70">{{ modal.message }}</p>
    <template #footer>
      <button class="btn-modal-cancel" @click="emit('cancel')">Annuler</button>
      <button class="btn-modal-danger" @click="emit('confirm')">Confirmer</button>
    </template>
  </ModalComponent>
</template>

<script setup>
// Modale de confirmation d'une action destructrice, rendue par la page qui a appelé provideConfirmAction()
// (composables/useConfirmAction.js) : `modal` est l'état renvoyé par ce composable. Remplace les `confirm()` du
// navigateur — une fenêtre native sort du design, ne se teste pas, n'est pas nommée et bloque la page.
import ModalComponent from '@/components/ModalComponent.vue'

defineProps({
  // { visible, title, message } — voir provideConfirmAction
  modal: { type: Object, required: true },
})
const emit = defineEmits(['cancel', 'confirm'])
</script>

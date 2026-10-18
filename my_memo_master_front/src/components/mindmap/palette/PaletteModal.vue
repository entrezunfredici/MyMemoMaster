<template>
  <teleport to="body">
    <div class="interp-modal" :role="titleId ? 'dialog' : undefined" :aria-modal="titleId ? 'true' : undefined" :aria-labelledby="titleId || undefined">
      <div class="interp-modal__backdrop" @click="emit('close')" />
      <div :class="['interp-modal__dialog', { 'interp-modal__dialog--narrow': narrow }]">
        <div class="interp-modal__header">
          <h3 :id="titleId || undefined">{{ title }}</h3>
          <button :aria-label="closeLabel" type="button" class="interp-modal__close" @click="emit('close')">&times;</button>
        </div>
        <slot />
      </div>
    </div>
  </teleport>
</template>

<script setup>
// Coquille des modales de la palette (voile, boîte, en-tête avec fermeture), téléportée dans <body>.
// Extraite de MindMapPalette.vue : sert à l'interpréteur de formules et à la proposition de grandeurs.
defineProps({
  title: { type: String, required: true },
  closeLabel: { type: String, required: true },
  // Quand il est fourni, la boîte est un dialogue nommé par son titre.
  titleId: { type: String, default: '' },
  narrow: { type: Boolean, default: false },
});
const emit = defineEmits(['close']);
</script>

<style scoped>
.interp-modal {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 60px 20px;
  z-index: 2000;
}

.interp-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgb(var(--slate-900-rgb) / 0.45);
  backdrop-filter: blur(2px);
}

.interp-modal__dialog {
  position: relative;
  width: min(960px, 100%);
  max-height: 80vh;
  overflow-y: auto;
  background: rgb(var(--white));
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 24px 60px rgb(var(--slate-900-rgb) / 0.35);
  z-index: 1;
}

.interp-modal__dialog--narrow { width: min(440px, 100%); }

.interp-modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  color: var(--slate-900);
}

.interp-modal__close {
  border: none;
  background: transparent;
  font-size: 24px;
  cursor: pointer;
  color: var(--slate-900);
  line-height: 1;
  transition: color 0.15s ease;
}

.interp-modal__close:hover { color: var(--blue-600); }
</style>

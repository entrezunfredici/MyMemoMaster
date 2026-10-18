<template>
  <PaletteModal title="Créer les grandeurs de la formule ?" title-id="variable-prompt-title" close-label="Ignorer" narrow @close="emit('dismiss')">
    <p class="palette__hint">Ces variables n'ont pas encore de grandeur reliée. Cochez celles à créer : chacune sera reliée à la formule par une branche « Calcul ».</p>
    <ul class="variable-prompt__list">
      <li v-for="item in items" :key="item.symbol">
        <label class="variable-prompt__item">
          <input type="checkbox" v-model="item.checked" :aria-label="'Créer la grandeur ' + item.symbol" />
          <span>{{ item.symbol }}</span>
        </label>
      </li>
    </ul>
    <div class="variable-prompt__actions">
      <button type="button" class="palette__btn" @click="confirm">Créer les grandeurs</button>
      <button type="button" class="palette__btn palette__btn--ghost" @click="emit('dismiss')">Ignorer</button>
    </div>
  </PaletteModal>
</template>

<script setup>
// Proposition, après saisie d'une formule, de créer les grandeurs de ses variables sans grandeur reliée.
// Extraite de MindMapPalette.vue.
import { ref } from 'vue';
import PaletteModal from './PaletteModal.vue';

const props = defineProps({
  symbols: { type: Array, required: true },
});
const emit = defineEmits(['confirm', 'dismiss']);

const items = ref(props.symbols.map((symbol) => ({ symbol, checked: true })));

const confirm = () => emit('confirm', items.value.filter((item) => item.checked).map((item) => item.symbol));
</script>

<style scoped>
.variable-prompt__list { list-style: none; margin: 12px 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
.variable-prompt__item {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 10px; border: 1px solid var(--slate-200); border-radius: 8px;
  background: var(--slate-50); color: var(--slate-900); font-weight: 600; cursor: pointer;
}
.variable-prompt__actions { display: flex; gap: 8px; }
</style>

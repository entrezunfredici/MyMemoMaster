<template>
  <div class="palette__field palette__field--row">
    <label class="palette__label">Couleur texte</label>
    <input aria-label="Couleur du texte" type="color" class="palette__color" :value="textColor" @input="updateTextColor($event.target.value)" />
  </div>
  <template v-if="withFont">
    <div class="palette__field palette__field--row">
      <label class="palette__label">Taille (px)</label>
      <input aria-label="Taille du texte en pixels"
        type="number"
        class="palette__number"
        min="10" max="48"
        :value="fontSize"
        @change="updateFontSize($event.target.value)"
      />
    </div>
    <div class="palette__toolbar">
      <button type="button" :class="['palette__toolbar-btn', { active: isBold }]" @click="toggleBold">
        <strong>G</strong>
      </button>
      <button type="button" :class="['palette__toolbar-btn', { active: isItalic }]" @click="toggleItalic">
        <em>I</em>
      </button>
      <button type="button" :class="['palette__toolbar-btn', { active: isUnderline }]" @click="toggleUnderline">
        <u>S</u>
      </button>
    </div>
  </template>
</template>

<script setup>
// Style du texte d'un nœud : couleur, et (nœuds texte) taille, gras, italique, souligné.
// Extrait de MindMapPalette.vue.
import { ref, watch } from 'vue';
import { mindmapColors } from '@/helpers/themeColors';
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder';

const props = defineProps({
  node: { type: Object, required: true },
  withFont: { type: Boolean, default: false },
});

const store = useMindMapBuilderStore();

const textColor = ref(mindmapColors.nodeText);
const fontSize = ref(13);
const isBold = ref(false);
const isItalic = ref(false);
const isUnderline = ref(false);

watch(
  () => props.node,
  (node) => {
    textColor.value = node?.style?.textColor || mindmapColors.nodeText;
    fontSize.value = Number.parseInt(node?.style?.fontSize, 10) || 13;
    isBold.value = (node?.style?.fontWeight || 'normal') !== 'normal';
    isItalic.value = (node?.style?.fontStyle || 'normal') !== 'normal';
    isUnderline.value = (node?.style?.textDecoration || 'none').includes('underline');
  },
  { immediate: true }
);

const updateTextColor = (value) => {
  textColor.value = value;
  store.updateNodeStyle(props.node.id, { textColor: value });
};

const updateFontSize = (value) => {
  const numeric = Number.parseInt(value, 10);
  const safeValue = Number.isFinite(numeric) ? Math.min(48, Math.max(10, numeric)) : 13;
  fontSize.value = safeValue;
  store.updateNodeStyle(props.node.id, { fontSize: safeValue });
};

const toggleBold = () => {
  isBold.value = !isBold.value;
  store.updateNodeStyle(props.node.id, { fontWeight: isBold.value ? 'bold' : 'normal' });
};

const toggleItalic = () => {
  isItalic.value = !isItalic.value;
  store.updateNodeStyle(props.node.id, { fontStyle: isItalic.value ? 'italic' : 'normal' });
};

const toggleUnderline = () => {
  isUnderline.value = !isUnderline.value;
  store.updateNodeStyle(props.node.id, { textDecoration: isUnderline.value ? 'underline' : 'none' });
};
</script>

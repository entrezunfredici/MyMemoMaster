<template>
  <input aria-label="Titre du nœud"
    v-if="editingField === 'label'"
    ref="labelInputRef"
    class="mindmap-node__inline-input mindmap-node__inline-input--title"
    v-model="localLabel"
    @blur="commitLabel"
    @keydown.enter.prevent="commitLabel"
    @keydown.escape.prevent="cancelEdit"
    @click.stop
    @pointerdown.stop
  />
  <div
    v-else
    class="mindmap-node__title"
    :style="titleStyle"
    @dblclick.stop="startEditLabel"
  >{{ node.label }}</div>
</template>

<script setup>
// Titre d'un item de carte, modifiable en place (double-clic). Extrait de MindMapNode.vue.
import { computed, ref, nextTick } from 'vue';
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder';
import { useNodeEditing } from '@/composables/useMindMapNodeEditing';

const props = defineProps({
  node: { type: Object, required: true },
});

const store = useMindMapBuilderStore();
const editingField = useNodeEditing();

// Le titre suit le style du nœud : couleur, italique, souligné, et taille du texte + 2 px (15 px pour 13 px).
// Il reste toujours en gras : c'est ce qui le distingue du corps (la bascule « G » ne concerne que le corps).
const titleStyle = computed(() => {
  const style = props.node.style || {};
  const size = Number.parseInt(style.fontSize, 10);
  return {
    ...(style.textColor ? { color: style.textColor } : {}),
    fontSize: `${(Number.isFinite(size) ? size : 13) + 2}px`,
    fontStyle: style.fontStyle || 'normal',
    textDecoration: style.textDecoration || 'none',
  };
});

const localLabel = ref('');
const labelInputRef = ref(null);

const startEditLabel = () => {
  localLabel.value = props.node.label;
  editingField.value = 'label';
  nextTick(() => {
    labelInputRef.value?.focus();
    labelInputRef.value?.select();
  });
};

const commitLabel = () => {
  if (editingField.value !== 'label') return;
  const trimmed = localLabel.value.trim();
  if (trimmed && trimmed !== props.node.label) {
    store.updateNode(props.node.id, { label: trimmed });
  }
  editingField.value = null;
};

const cancelEdit = () => {
  editingField.value = null;
};
</script>

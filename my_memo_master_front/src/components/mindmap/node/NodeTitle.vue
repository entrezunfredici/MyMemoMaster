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
    @dblclick.stop="startEditLabel"
  >{{ node.label }}</div>
</template>

<script setup>
// Titre d'un item de carte, modifiable en place (double-clic). Extrait de MindMapNode.vue.
import { ref, nextTick } from 'vue';
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder';
import { useNodeEditing } from '@/composables/useMindMapNodeEditing';

const props = defineProps({
  node: { type: Object, required: true },
});

const store = useMindMapBuilderStore();
const editingField = useNodeEditing();

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

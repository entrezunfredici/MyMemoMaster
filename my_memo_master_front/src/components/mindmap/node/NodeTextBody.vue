<template>
  <textarea aria-label="Contenu du nœud"
    v-if="editingField === 'content'"
    ref="contentInputRef"
    class="mindmap-node__inline-input mindmap-node__inline-input--content"
    v-model="localContent"
    @blur="commitContent"
    @keydown.ctrl.enter.prevent="commitContent"
    @keydown.meta.enter.prevent="commitContent"
    @keydown.escape.prevent="cancelEdit"
    @click.stop
    @pointerdown.stop
  />
  <div
    v-else
    class="mindmap-node__body"
    :style="bodyStyle"
    @dblclick.stop="startEditContent"
  >
    <!-- Texte de l'utilisateur : interpolation Vue (échappée), jamais du HTML -->
    <template v-if="displayContent">{{ displayContent }}</template>
    <span v-else class="mindmap-node__placeholder">Double-clic pour ajouter…</span>
  </div>
</template>

<script setup>
// Corps de texte d'un item de carte, modifiable en place (double-clic). Entrée ajoute une ligne (champ sur
// plusieurs lignes) ; Ctrl/Cmd + Entrée valide, comme un clic à côté. Extrait de MindMapNode.vue.
import { computed, ref, nextTick } from 'vue';
import { themeHex } from '@/helpers/themeColors';
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder';
import { useNodeEditing } from '@/composables/useMindMapNodeEditing';

// Couleur de corps de texte par défaut d'un item (lue dans base.css : --blue-100).
const BODY_TEXT = themeHex('--blue-100');

const props = defineProps({
  node: { type: Object, required: true },
});

const store = useMindMapBuilderStore();
const editingField = useNodeEditing();

const localContent = ref('');
const contentInputRef = ref(null);

const displayContent = computed(() => {
  if (!props.node.content) return '';
  // Cartes existantes : le nœud racine dupliquait son titre dans son contenu
  if (props.node.id === store.map.subjectNodeId && props.node.content === props.node.label) return '';
  return props.node.content;
});

const bodyStyle = computed(() => {
  const rawSize = Number.parseInt(props.node.style?.fontSize, 10);
  const fontSize = Number.isFinite(rawSize) ? rawSize : 13;
  return {
    color: props.node.style?.textColor || BODY_TEXT,
    fontSize: `${fontSize}px`,
    fontWeight: props.node.style?.fontWeight || 'normal',
    fontStyle: props.node.style?.fontStyle || 'normal',
    textDecoration: props.node.style?.textDecoration || 'none',
  };
});

const startEditContent = () => {
  localContent.value = props.node.content || '';
  editingField.value = 'content';
  nextTick(() => {
    contentInputRef.value?.focus();
    contentInputRef.value?.select();
  });
};

const commitContent = () => {
  if (editingField.value !== 'content') return;
  if (localContent.value !== props.node.content) {
    store.updateNode(props.node.id, { content: localContent.value });
  }
  editingField.value = null;
};

const cancelEdit = () => {
  editingField.value = null;
};
</script>

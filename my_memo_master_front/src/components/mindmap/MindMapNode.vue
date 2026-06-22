<template>
  <g
    class="mindmap-node"
    :class="{ 'mindmap-node--selected': selected }"
    :transform="`translate(${node.layout.x}, ${node.layout.y})`"
    @pointerdown="handlePointerDown"
  >
    <!-- Corps principal -->
    <rect
      :x="-width / 2"
      :y="-height / 2"
      :width="width"
      :height="height"
      :rx="borderRadius"
      :ry="borderRadius"
      :fill="primaryColor"
      :stroke="secondaryColor"
      :stroke-width="selected ? 4 : 3"
    />

    <!-- Contenu HTML -->
    <foreignObject :x="-width / 2 + 12" :y="-height / 2 + 10" :width="width - 24" :height="height - 20">
      <div class="mindmap-node__content">
        <!-- Titre -->
        <input
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

        <!-- Image -->
        <div
          v-if="isImageNode"
          class="mindmap-node__image"
          :class="{ 'mindmap-node__image--drag': isDragOver }"
          @dragover.prevent.stop="isDragOver = true"
          @dragleave.stop="isDragOver = false"
          @drop.prevent.stop="handleImageDrop"
        >
          <img v-if="imageSrc" :src="imageSrc" :alt="node.label" />
          <span v-else class="mindmap-node__image-placeholder">
            {{ isDragOver ? 'Déposer ici' : 'Glissez une image ici' }}
          </span>
        </div>
        <!-- Formule -->
        <div
          v-else-if="isFormulaNode"
          class="mindmap-node__formula"
          :style="{ color: node.style?.textColor || '#dbeafe' }"
          v-html="formulaHtml || '<span class=&quot;mindmap-node__placeholder&quot;>Double-clic pour saisir…</span>'"
          @dblclick.stop="store.openInterpreter()"
        />
        <!-- Texte inline -->
        <template v-else>
          <textarea
            v-if="editingField === 'content'"
            ref="contentInputRef"
            class="mindmap-node__inline-input mindmap-node__inline-input--content"
            v-model="localContent"
            @blur="commitContent"
            @keydown.escape.prevent="cancelEdit"
            @click.stop
            @pointerdown.stop
          />
          <div
            v-else
            class="mindmap-node__body"
            :style="bodyStyle"
            v-html="displayContent || '<span class=&quot;mindmap-node__placeholder&quot;>Double-clic pour ajouter…</span>'"
            @dblclick.stop="startEditContent"
          />
        </template>
      </div>
    </foreignObject>

    <!-- Bouton repliage -->
    <g
      v-if="hasChildren"
      class="mindmap-node__collapse"
      :transform="`translate(${width / 2 - 16}, ${-height / 2 + 16})`"
      @pointerdown.stop="toggleCollapse"
    >
      <circle r="10" :fill="secondaryColor" stroke="#0f172a" stroke-width="1" />
      <text
        text-anchor="middle"
        dominant-baseline="central"
        fill="#0f172a"
        font-size="14"
        font-weight="700"
      >{{ node.collapsed ? '+' : '−' }}</text>
    </g>

    <!-- Bouton ajout enfant -->
    <g
      class="mindmap-node__add"
      :class="{ 'mindmap-node__add--active': selected }"
      :transform="`translate(${width / 2 + 32}, 0)`"
      @pointerdown.stop.prevent="createChildNode"
    >
      <circle r="11" />
      <text
        text-anchor="middle"
        dominant-baseline="central"
        fill="#0f172a"
        font-size="15"
        font-weight="700"
      >+</text>
    </g>
  </g>
</template>

<script setup>
import { computed, ref, nextTick } from 'vue';
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder';
import { getNodeLabel } from '@/helpers/mindmapCreation';
import { renderMathMultiline } from '@/components/interpreter/interpreter.js';
import { api } from '@/helpers/api';
import { VITE_API_URL } from '@/config';
import { notif } from '@/helpers/notif';

const props = defineProps({
  node: { type: Object, required: true },
  selected: { type: Boolean, default: false },
  hasChildren: { type: Boolean, default: false },
});

const emit = defineEmits(['node-pointerdown', 'toggle-collapse']);
const store = useMindMapBuilderStore();

const width = computed(() => props.node.style?.width || 220);
const height = computed(() => props.node.style?.height || 120);
const primaryColor = computed(() => props.node.style?.primaryColor || '#1E3A8A');
const secondaryColor = computed(() => props.node.style?.secondaryColor || '#C0C5D2');
const shape = computed(() => props.node.style?.shape || 'bubble');
const borderRadius = computed(() => {
  if (shape.value === 'rect') return 12;
  if (shape.value === 'pill') return height.value / 2;
  return Math.min(width.value, height.value) / 4;
});

const isImageNode = computed(() => props.node.type === 'image');
const isFormulaNode = computed(() => props.node.type === 'formula');
const imageSrc = computed(() => (isImageNode.value ? props.node.content || '' : ''));
const formulaHtml = computed(() =>
  isFormulaNode.value && props.node.content ? renderMathMultiline(props.node.content) : ''
);
const displayContent = computed(() => {
  if (!props.node.content || isImageNode.value || isFormulaNode.value) return '';
  return props.node.content;
});
const bodyStyle = computed(() => {
  const rawSize = Number.parseInt(props.node.style?.fontSize, 10);
  const fontSize = Number.isFinite(rawSize) ? rawSize : 13;
  return {
    color: props.node.style?.textColor || '#dbeafe',
    fontSize: `${fontSize}px`,
    fontWeight: props.node.style?.fontWeight || 'normal',
    fontStyle: props.node.style?.fontStyle || 'normal',
    textDecoration: props.node.style?.textDecoration || 'none',
  };
});

// ── Édition inline ────────────────────────────────────────────────────────────
const editingField = ref(null);
const localLabel = ref('');
const localContent = ref('');
const labelInputRef = ref(null);
const contentInputRef = ref(null);

const startEditLabel = () => {
  localLabel.value = props.node.label;
  editingField.value = 'label';
  nextTick(() => {
    labelInputRef.value?.focus();
    labelInputRef.value?.select();
  });
};

const startEditContent = () => {
  if (isImageNode.value || isFormulaNode.value) return;
  localContent.value = props.node.content || '';
  editingField.value = 'content';
  nextTick(() => {
    contentInputRef.value?.focus();
    contentInputRef.value?.select();
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

// ── Drag & drop image ─────────────────────────────────────────────────────────
const isDragOver = ref(false);

const handleImageDrop = async (event) => {
  isDragOver.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (!file || !file.type.startsWith('image/')) return;
  if (file.size > 5 * 1024 * 1024) return;
  const formData = new FormData();
  formData.append('image', file);
  try {
    const response = await api.post('diagrammes/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (!response?.data) return;
    const payload = response.data;
    let imageUrl = '';
    if (payload.path) {
      try { imageUrl = new URL(payload.path, VITE_API_URL).toString(); }
      catch { imageUrl = payload.path; }
    }
    if (!imageUrl) imageUrl = payload.url || '';
    if (imageUrl) store.updateNode(props.node.id, { content: imageUrl });
  } catch {
    notif.notify("L'image n'a pas pu être téléchargée.", 'error');
  }
};

const handlePointerDown = (event) => {
  if (editingField.value) return;
  if (event.shiftKey) {
    const type = store.nodeType || 'text';
    store.addNode({
      label: getNodeLabel(type),
      type,
      parentId: props.node.id,
      content: type === 'text' ? undefined : '',
    });
    return;
  }
  emit('node-pointerdown', { event, node: props.node });
};

const toggleCollapse = () => {
  emit('toggle-collapse', props.node.id);
};

const createChildNode = () => {
  if (!props.node?.id) return;
  const type = store.nodeType || 'text';
  store.addNode({
    label: getNodeLabel(type),
    type,
    parentId: props.node.id,
    content: type === 'text' ? undefined : '',
  });
};
</script>

<style scoped>
.mindmap-node {
  cursor: pointer;
  filter: drop-shadow(0 3px 8px rgba(15, 23, 42, 0.28));
  transition: filter 0.2s ease;
}

.mindmap-node:hover {
  filter: drop-shadow(0 6px 18px rgba(15, 23, 42, 0.38));
}

.mindmap-node--selected {
  filter: drop-shadow(0 0 6px rgba(56, 189, 248, 1)) drop-shadow(0 0 20px rgba(56, 189, 248, 0.6));
}

.mindmap-node__content {
  font-family: 'Inter', sans-serif;
  display: flex;
  flex-direction: column;
  gap: 4px;
  height: 100%;
  overflow: hidden;
}

.mindmap-node__title {
  font-size: 15px;
  font-weight: 700;
  color: #f1f5f9;
  line-height: 1.25;
  word-break: break-word;
  cursor: text;
  letter-spacing: 0.01em;
}

.mindmap-node__body {
  font-size: 13px;
  line-height: 1.4;
  color: #dbeafe;
  word-break: break-word;
  white-space: pre-wrap;
  cursor: text;
  flex: 1;
}

.mindmap-node__placeholder {
  opacity: 0.4;
  font-style: italic;
  font-size: 11px;
}

.mindmap-node__formula {
  width: 100%;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.mindmap-node__formula :deep(.katex-display) { margin: 0; }
.mindmap-node__formula :deep(.katex) { font-size: 1rem; }

.mindmap-node__image {
  width: 100%;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
}

.mindmap-node__image--drag {
  border: 2px dashed #38bdf8;
  border-radius: 6px;
  background: rgba(56, 189, 248, 0.08);
}

.mindmap-node__image img {
  max-width: 100%;
  max-height: 100%;
  border-radius: 6px;
  object-fit: contain;
}

.mindmap-node__image-placeholder {
  font-size: 11px;
  color: #bfdbfe;
  text-align: center;
  opacity: 0.7;
}

.mindmap-node__collapse {
  cursor: pointer;
}

.mindmap-node__add {
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.mindmap-node:hover .mindmap-node__add,
.mindmap-node__add--active {
  opacity: 1;
}

.mindmap-node__add circle {
  fill: #38bdf8;
  stroke: #0f172a;
  stroke-width: 1;
}

.mindmap-node__add:hover circle {
  fill: #0ea5e9;
}

.mindmap-node__inline-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.12);
  border: 1.5px solid rgba(56, 189, 248, 0.7);
  border-radius: 6px;
  color: #f1f5f9;
  font-family: 'Inter', sans-serif;
  outline: none;
  resize: none;
  box-sizing: border-box;
  padding: 3px 6px;
}

.mindmap-node__inline-input:focus {
  background: rgba(255, 255, 255, 0.18);
  border-color: #38bdf8;
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.3);
}

.mindmap-node__inline-input--title {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.01em;
  min-height: 26px;
}

.mindmap-node__inline-input--content {
  font-size: 13px;
  line-height: 1.4;
  flex: 1;
  min-height: 36px;
}
</style>

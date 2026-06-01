<template>
  <g
    class="mindmap-node"
    :transform="`translate(${node.layout.x}, ${node.layout.y})`"
    @pointerdown="handlePointerDown"
  >
    <g class="mindmap-node__shape">
      <rect
        :x="-width / 2"
        :y="-height / 2"
        :width="width"
        :height="height"
        :rx="borderRadius"
        :ry="borderRadius"
        :fill="primaryColor"
        :stroke="selected ? '#0EA5E9' : primaryColor"
        :stroke-width="selected ? 4 : 2"
        opacity="0.92"
      />
      <rect
        :x="-width / 2"
        :y="height / 2 - 12"
        :width="width"
        height="12"
        :fill="secondaryColor"
        opacity="0.85"
      />
    </g>

    <foreignObject :x="-width / 2 + 8" :y="-height / 2 + 8" :width="width - 16" :height="height - 32">
      <div class="mindmap-node__content">
        <div class="mindmap-node__title">{{ node.label }}</div>
        <div v-if="isImageNode" class="mindmap-node__image">
          <img v-if="imageSrc" :src="imageSrc" :alt="node.label" />
          <span v-else class="mindmap-node__image-placeholder">Ajoutez une image depuis la palette</span>
        </div>
        <div v-else-if="isFormulaNode" class="mindmap-node__formula" v-html="formulaHtml"></div>
        <div v-else class="mindmap-node__body" :style="bodyStyle" v-html="displayContent"></div>
      </div>
    </foreignObject>

    <g
      v-if="hasChildren"
      class="mindmap-node__collapse"
      :transform="`translate(${width / 2 - 18}, ${-height / 2 + 18})`"
      @pointerdown.stop="toggleCollapse"
    >
      <circle r="12" :fill="secondaryColor" stroke="#111827" stroke-width="1" />
      <text
        text-anchor="middle"
        dominant-baseline="central"
        fill="#111827"
        font-size="16"
        font-weight="600"
      >
        {{ node.collapsed ? '+' : '-' }}
      </text>
    </g>

    <g
      class="mindmap-node__add"
      :class="{ 'mindmap-node__add--active': selected }"
      :transform="`translate(${width / 2 + 36}, 0)`"
      @pointerdown.stop.prevent="createChildNode"
    >
      <circle r="12" stroke="#111827" stroke-width="1" />
      <text
        text-anchor="middle"
        dominant-baseline="central"
        fill="#0f172a"
        font-size="16"
        font-weight="600"
      >
        +
      </text>
    </g>
  </g>
</template>

<script setup>
import { computed } from 'vue';
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder';
import { normalizeCreationType, getNodeLabel } from '@/helpers/mindmapCreation';
import { renderMathMultiline } from '@/components/interpreter/interpreter.js';

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
  selected: {
    type: Boolean,
    default: false,
  },
  hasChildren: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['node-pointerdown', 'toggle-collapse']);
const store = useMindMapBuilderStore();
const creationType = computed(() => normalizeCreationType(store.tool));

const width = computed(() => props.node.style?.width || 220);
const height = computed(() => props.node.style?.height || 120);
const primaryColor = computed(() => props.node.style?.primaryColor || '#1E3A8A');
const secondaryColor = computed(() => props.node.style?.secondaryColor || '#C0C5D2');
const shape = computed(() => props.node.style?.shape || 'bubble');
const borderRadius = computed(() => {
  if (shape.value === 'rect') return 12;
  if (shape.value === 'pill') return height.value / 2;
  return Math.min(width.value, height.value) / 2;
});

const isImageNode = computed(() => props.node.type === 'image');
const isFormulaNode = computed(() => props.node.type === 'formula');
const imageSrc = computed(() => {
  if (!isImageNode.value) return '';
  return props.node.content || '';
});
const formulaHtml = computed(() => {
  if (!isFormulaNode.value || !props.node.content) return '';
  return renderMathMultiline(props.node.content);
});
const displayContent = computed(() => {
  if (!props.node.content || isImageNode.value || isFormulaNode.value) return '';
  return props.node.content;
});
const bodyStyle = computed(() => {
  const rawSize = Number.parseInt(props.node.style?.fontSize, 10);
  const fontSize = Number.isFinite(rawSize) ? rawSize : 14;
  return {
    color: props.node.style?.textColor || '#eef2ff',
    fontSize: `${fontSize}px`,
    fontWeight: props.node.style?.fontWeight || 'normal',
    fontStyle: props.node.style?.fontStyle || 'normal',
    textDecoration: props.node.style?.textDecoration || 'none',
  };
});

const handlePointerDown = (event) => {
  emit('node-pointerdown', { event, node: props.node });
};

const toggleCollapse = () => {
  emit('toggle-collapse', props.node.id);
};

const createChildNode = () => {
  if (!props.node?.id) return;
  const type = creationType.value;
  const label = getNodeLabel(type);
  const payload = {
    label,
    type,
    parentId: props.node.id,
  };
  if (type !== 'text') {
    payload.content = '';
  }
  store.addNode(payload);
};
</script>

<style scoped>
.mindmap-node {
  cursor: pointer;
  transition: filter 0.2s ease;
}

.mindmap-node:hover {
  filter: drop-shadow(0 0 6px rgba(14, 165, 233, 0.35));
}

.mindmap-node__content {
  font-family: ''Inter'', sans-serif;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  color: #f9fafb;
}

.mindmap-node__title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 6px;
  word-break: break-word;
}

.mindmap-node__body {
  font-size: 14px;
  line-height: 1.35;
  color: #eef2ff;
  word-break: break-word;
  white-space: pre-wrap;
}

.mindmap-node__formula {
  width: 100%;
  height: calc(100% - 24px);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.mindmap-node__formula :deep(.katex-display) {
  margin: 0;
}

.mindmap-node__formula :deep(.katex) {
  font-size: 1.05rem;
}

.mindmap-node__image {
  width: 100%;
  height: calc(100% - 24px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
}

.mindmap-node__image img {
  max-width: 100%;
  max-height: 100%;
  border-radius: 8px;
  object-fit: contain;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.35);
}

.mindmap-node__image-placeholder {
  font-size: 12px;
  color: #dbeafe;
  text-align: center;
  padding: 0 8px;
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
}

.mindmap-node__add:hover circle {
  fill: #0ea5e9;
}
</style>


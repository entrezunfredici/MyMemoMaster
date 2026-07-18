<template>
  <div class="mindmap-node-picker">
    <p v-if="!nodes.length" class="text-sm text-gray-500 italic">
      La carte mentale liée ne contient aucun nœud.
    </p>
    <template v-else>
      <div class="mindmap-node-picker__board" role="group" aria-label="Nœuds de la carte mentale liée">
        <svg
          class="mindmap-node-picker__svg"
          :viewBox="viewBox"
          preserveAspectRatio="xMidYMid meet"
        >
          <line
            v-for="link in links"
            :key="link.id"
            :x1="map.nodes[link.from].layout.x"
            :y1="map.nodes[link.from].layout.y"
            :x2="map.nodes[link.to].layout.x"
            :y2="map.nodes[link.to].layout.y"
            stroke="#94a3b8"
            stroke-width="3"
          />
          <g
            v-for="node in nodes"
            :key="node.id"
            class="mindmap-node-picker__node"
            :transform="`translate(${node.layout.x}, ${node.layout.y})`"
            role="button"
            tabindex="0"
            :aria-label="`Lier la carte au nœud ${nodeText(node)}`"
            :aria-pressed="node.id === modelValue ? 'true' : 'false'"
            @click="toggleNode(node.id)"
            @keydown.enter.prevent="toggleNode(node.id)"
            @keydown.space.prevent="toggleNode(node.id)"
          >
            <rect
              :x="-nodeWidth(node) / 2"
              :y="-nodeHeight(node) / 2"
              :width="nodeWidth(node)"
              :height="nodeHeight(node)"
              :rx="nodeHeight(node) / 2"
              :fill="node.id === modelValue ? '#1E3A8A' : '#ffffff'"
              :stroke="node.id === modelValue ? '#1E3A8A' : node.style?.primaryColor || '#1E3A8A'"
              :stroke-width="node.id === modelValue ? 8 : 4"
            />
            <text
              text-anchor="middle"
              dominant-baseline="middle"
              :fill="node.id === modelValue ? '#ffffff' : '#1e293b'"
              font-size="28"
              font-weight="600"
            >{{ truncate(nodeText(node)) }}</text>
          </g>
        </svg>
      </div>
      <p class="text-xs mt-1" :class="modelValue ? 'text-primary font-semibold' : 'text-gray-500'" aria-live="polite">
        <template v-if="modelValue && selectedNode">
          Nœud lié : {{ nodeText(selectedNode) }}
          <button type="button" class="ml-2 text-gray-400 hover:text-red-500 underline font-normal" @click="$emit('update:modelValue', null)">
            Retirer
          </button>
        </template>
        <template v-else>Clique sur un nœud pour le lier à la carte (optionnel).</template>
      </p>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { normalizeMindMap, applyRadialLayout } from '@/helpers/mindmap'

const props = defineProps({
  mindMapJson: { type: [Object, String], required: true },
  modelValue: { type: String, default: null }
})

const emit = defineEmits(['update:modelValue', 'node-selected'])

// CHOIX: normalisation locale via les helpers plutôt que réutiliser MindMapBoard
// RAISON: MindMapBoard est couplé au store global de l'éditeur (mindmapBuilder) —
// le monter ici partagerait sélection/pan/zoom avec l'éditeur ouvert par ailleurs.
const map = computed(() => {
  const normalized = normalizeMindMap(props.mindMapJson)
  const nonSubjectNodes = Object.values(normalized.nodes).filter(
    (n) => n.id !== normalized.subjectNodeId
  )
  const hasLayout = nonSubjectNodes.some(
    (n) => Math.abs(n.layout?.x ?? 0) > 1 || Math.abs(n.layout?.y ?? 0) > 1
  )
  return hasLayout ? normalized : applyRadialLayout(normalized)
})

const nodes = computed(() => Object.values(map.value.nodes))

const links = computed(() =>
  (map.value.links || []).filter((l) => map.value.nodes[l.from] && map.value.nodes[l.to])
)

const selectedNode = computed(() => (props.modelValue ? map.value.nodes[props.modelValue] : null))

const nodeWidth = (node) => node.style?.width || 220
const nodeHeight = (node) => node.style?.height || 120

const nodeText = (node) => node.label || node.title || 'Nœud sans titre'

const truncate = (text) => (text.length > 18 ? `${text.slice(0, 17)}…` : text)

const viewBox = computed(() => {
  const list = nodes.value
  if (!list.length) return '0 0 100 100'
  const xs = list.flatMap((n) => [n.layout.x - nodeWidth(n) / 2, n.layout.x + nodeWidth(n) / 2])
  const ys = list.flatMap((n) => [n.layout.y - nodeHeight(n) / 2, n.layout.y + nodeHeight(n) / 2])
  const pad = 40
  const minX = Math.min(...xs) - pad
  const minY = Math.min(...ys) - pad
  const width = Math.max(...xs) - minX + pad
  const height = Math.max(...ys) - minY + pad
  return `${minX} ${minY} ${width} ${height}`
})

const toggleNode = (nodeId) => {
  const next = nodeId === props.modelValue ? null : nodeId
  emit('update:modelValue', next)
  emit('node-selected', next ? map.value.nodes[next] : null)
}
</script>

<style scoped>
.mindmap-node-picker__board {
  /* Fond opaque explicite — règle projet pour les panneaux flottants */
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  overflow: hidden;
}

.mindmap-node-picker__svg {
  display: block;
  width: 100%;
  height: 260px;
}

.mindmap-node-picker__node {
  cursor: pointer;
}

.mindmap-node-picker__node:focus {
  outline: none;
}

.mindmap-node-picker__node:focus rect {
  stroke: #f59e0b;
  stroke-width: 8;
}
</style>

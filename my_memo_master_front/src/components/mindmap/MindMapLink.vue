<template>
  <g class="mindmap-link" @pointerdown.stop="handlePointerDown">
    <path
      :d="pathD"
      :stroke="link.style?.primaryColor || '#1E3A8A'"
      :stroke-width="selected ? 4 : 2.5"
      fill="none"
      marker-end="url(#arrow-forward)"
      :marker-start="link.direction === 'bidirectional' ? 'url(#arrow-backward)' : null"
      class="mindmap-link__path"
    />
    <g v-if="linkLabel" :transform="labelTransform" class="mindmap-link__label">
      <rect
        x="-48"
        y="-12"
        width="96"
        height="24"
        rx="12"
        :fill="link.style?.secondaryColor || '#9CA3AF'"
        opacity="0.9"
      />
      <text text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="600" fill="#111827">
        {{ linkLabel }}
      </text>
    </g>
  </g>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  link: {
    type: Object,
    required: true,
  },
  source: {
    type: Object,
    required: true,
  },
  target: {
    type: Object,
    required: true,
  },
  selected: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['link-pointerdown']);

const controlOffset = computed(() => {
  const dx = props.target.layout.x - props.source.layout.x;
  const dy = props.target.layout.y - props.source.layout.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return Math.min(220, Math.max(120, distance * 0.4));
});

const pathD = computed(() => {
  const { source, target } = props;
  const dx = target.layout.x - source.layout.x;
  const dy = target.layout.y - source.layout.y;
  const angle = Math.atan2(dy, dx);
  const offset = controlOffset.value;
  const c1x = source.layout.x + Math.cos(angle) * offset;
  const c1y = source.layout.y + Math.sin(angle) * offset;
  const c2x = target.layout.x - Math.cos(angle) * offset;
  const c2y = target.layout.y - Math.sin(angle) * offset;
  return `M ${source.layout.x} ${source.layout.y} C ${c1x} ${c1y} ${c2x} ${c2y} ${target.layout.x} ${target.layout.y}`;
});

const linkLabel = computed(() => props.link.type || '');

// Distance entre le centre d'un nœud et le bord de son rectangle, dans la direction (ux, uy)
const distanceToEdge = (node, ux, uy) => {
  const halfW = (node.style?.width || 220) / 2;
  const halfH = (node.style?.height || 120) / 2;
  const tx = Math.abs(ux) > 1e-6 ? halfW / Math.abs(ux) : Infinity;
  const ty = Math.abs(uy) > 1e-6 ? halfH / Math.abs(uy) : Infinity;
  return Math.min(tx, ty);
};

// Étiquette au milieu du segment VISIBLE (entre les bords des deux nœuds) plutôt qu'entre leurs
// centres : elle ne passe plus sous le nœud ni sous le bouton « + » qui déborde à sa droite.
const labelTransform = computed(() => {
  const { source, target } = props;
  const dx = target.layout.x - source.layout.x;
  const dy = target.layout.y - source.layout.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-6) return `translate(${source.layout.x}, ${source.layout.y})`;
  const ux = dx / dist;
  const uy = dy / dist;
  const exit = distanceToEdge(source, ux, uy);
  const entry = dist - distanceToEdge(target, ux, uy);
  const mid = entry > exit ? (exit + entry) / 2 : dist / 2;
  return `translate(${source.layout.x + ux * mid}, ${source.layout.y + uy * mid})`;
});

const handlePointerDown = (event) => {
  emit('link-pointerdown', { event, link: props.link });
};
</script>

<style scoped>
.mindmap-link__path {
  cursor: pointer;
  transition: stroke-width 0.2s ease;
}

.mindmap-link__path:hover {
  stroke-width: 4px;
}

.mindmap-link__label {
  pointer-events: none;
}
</style>

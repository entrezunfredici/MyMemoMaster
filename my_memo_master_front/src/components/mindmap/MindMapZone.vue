<template>
  <g
    class="mindmap-zone"
    :transform="zoneTransform"
    @pointerdown.stop="handlePointerDown"
  >
    <rect
      :x="-width / 2"
      :y="-height / 2"
      :width="width"
      :height="height"
      :fill="fillColor"
      :stroke="borderColor"
      stroke-dasharray="12 8"
      stroke-width="2"
      opacity="0.25"
      rx="24"
      ry="24"
    />
    <text
      class="mindmap-zone__label"
      text-anchor="middle"
      dominant-baseline="hanging"
      :y="-height / 2 + 12"
      style="fill: var(--gray-800)"
      font-weight="600"
    >
      {{ zone.name }}
    </text>
    <!-- Poignée de redimensionnement (angle bas-droite). Au clavier : tailles saisies dans la palette (« Zones »). -->
    <rect
      class="mindmap-zone__handle"
      data-testid="zone-resize-handle"
      :x="width / 2 - 14"
      :y="height / 2 - 14"
      width="20"
      height="20"
      rx="5"
      :fill="borderColor"
      stroke="white"
      stroke-width="2"
      @pointerdown.stop="handleResizeDown"
    />
  </g>
</template>

<script setup>
import { mindmapColors } from '@/helpers/themeColors';
import { computed } from 'vue';

const props = defineProps({
  zone: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['zone-pointerdown', 'zone-resize-start']);

const layout = computed(() => props.zone.layout || { x: 0, y: 0, width: 320, height: 240 });
const width = computed(() => layout.value.width || 320);
const height = computed(() => layout.value.height || 240);
const zoneTransform = computed(() => `translate(${layout.value.x || 0}, ${layout.value.y || 0})`);

const fillColor = computed(() => props.zone.color || mindmapColors.zone);
const borderColor = computed(() => props.zone.color || mindmapColors.zoneBorder);

const handlePointerDown = (event) => {
  emit('zone-pointerdown', { event, zone: props.zone });
};

const handleResizeDown = (event) => {
  emit('zone-resize-start', { event, zone: props.zone });
};
</script>

<style scoped>
.mindmap-zone {
  cursor: move;
}

.mindmap-zone__label {
  font-size: 14px;
  pointer-events: none;
}

.mindmap-zone__handle {
  cursor: nwse-resize;
}
</style>

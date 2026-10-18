<template>
  <g class="mindmap-link" @pointerdown.stop="handlePointerDown">
    <defs>
      <marker
        :id="markerEndId"
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="8"
        markerHeight="8"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" :fill="primaryColor" />
      </marker>
    </defs>
    <!-- Zone de clic élargie -->
    <path :d="geometry.d" stroke="transparent" stroke-width="16" fill="none" class="mindmap-link__hit" />
    <path
      :d="geometry.d"
      :stroke="primaryColor"
      :stroke-width="selected ? 4 : 2.5"
      fill="none"
      :marker-end="`url(#${markerEndId})`"
      :marker-start="link.direction === 'bidirectional' ? `url(#${markerEndId})` : null"
      class="mindmap-link__path"
    />
    <!-- Couleur secondaire au milieu de la branche -->
    <circle
      :cx="geometry.mid.x"
      :cy="geometry.mid.y"
      r="6"
      :fill="secondaryColor"
      :stroke="primaryColor"
      stroke-width="1.5"
      class="mindmap-link__middle"
    />
    <!-- Type de la branche, au-dessus -->
    <g v-if="linkLabel" :transform="labelTransform" class="mindmap-link__label" data-testid="link-label">
      <rect
        :x="-labelWidth / 2"
        y="-12"
        :width="labelWidth"
        height="22"
        rx="11"
        style="fill: rgb(var(--white))"
        :stroke="primaryColor"
        stroke-width="1"
        opacity="0.95"
      />
      <text text-anchor="middle" dominant-baseline="middle" y="-1" font-size="12" font-weight="600" style="fill: var(--gray-900)">
        {{ linkLabel }}
      </text>
    </g>
  </g>
</template>

<script setup>
import { mindmapColors } from '@/helpers/themeColors';
import { computed } from 'vue';
import { computeLinkGeometry, linkLabelText, linkLabelWidth } from '@/helpers/mindmap/mindmapLinks';

const props = defineProps({
  link: { type: Object, required: true },
  source: { type: Object, required: true },
  target: { type: Object, required: true },
  selected: { type: Boolean, default: false },
  // Libellé du type (les types personnalisés ne sont connus que de la carte).
  typeLabel: { type: String, default: '' },
  // Rang de lecture (1, 2…) quand l'item source a plusieurs branches sortantes, sinon null.
  readingRank: { type: Number, default: null },
  // Décalage vertical de l'étiquette, calculé par le plateau pour éviter le chevauchement avec les voisines.
  labelOffset: { type: Number, default: 0 },
});

const emit = defineEmits(['link-pointerdown']);

const primaryColor = computed(() => props.link.style?.primaryColor || mindmapColors.nodeBg);
const secondaryColor = computed(() => props.link.style?.secondaryColor || mindmapColors.secondary);
const markerEndId = computed(() => `arrow-${props.link.id}`);
const geometry = computed(() =>
  computeLinkGeometry(props.link.style?.shape || 'curve', props.source, props.target)
);

const linkLabel = computed(() => linkLabelText(props.typeLabel, props.link.type, props.readingRank));
const labelWidth = computed(() => linkLabelWidth(linkLabel.value));
// Le type est affiché au-dessus du milieu de la branche, décalé si une autre étiquette occupe la place.
const labelTransform = computed(() => `translate(${geometry.value.mid.x}, ${geometry.value.mid.y - 20 + props.labelOffset})`);

const handlePointerDown = (event) => {
  emit('link-pointerdown', { event, link: props.link });
};
</script>

<style scoped>
.mindmap-link__path {
  cursor: pointer;
  transition: stroke-width 0.2s ease;
}

.mindmap-link__hit {
  cursor: pointer;
}

.mindmap-link__middle {
  pointer-events: none;
}

/* Cliquer sur l'étiquette sélectionne la branche, comme le trait (le pointerdown remonte au <g> de la branche). */
.mindmap-link__label {
  cursor: pointer;
}
</style>

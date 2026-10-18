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
        <NodeTitle :node="node" />

        <NodeImage v-if="isImageNode" :node="node" :width="width" :height="height" />
        <!-- Graphique : formule y = f(x) tracée dans un repère, convertible en formule -->
        <MindMapGraph
          v-else-if="isGraphNode"
          :node="node"
          :width="width - 24"
          :height="height - 20 - GRAPH_TITLE_HEIGHT"
        />
        <!-- Formule -->
        <div
          v-else-if="isFormulaNode"
          class="mindmap-node__formula"
          :style="{ color: node.style?.textColor || BODY_TEXT }"
          @dblclick.stop="store.openInterpreter()"
        >
          <!-- Rendu KaTeX (HTML produit par la bibliothèque) ; le texte d'invite est un vrai élément -->
          <span v-if="formulaHtml" v-html="formulaHtml" />
          <span v-else class="mindmap-node__placeholder">Double-clic pour saisir…</span>
        </div>
        <!-- Grandeur (rôle principal) : rendue par la ligne de grandeur ci-dessous -->
        <template v-else-if="isQuantityNode" />
        <NodeTextBody v-else :node="node" />

        <NodeQuantity :node="node" />
      </div>
    </foreignObject>

    <!-- Bouton repliage -->
    <g
      v-if="hasChildren"
      class="mindmap-node__collapse"
      :transform="`translate(${width / 2 - 16}, ${-height / 2 + 16})`"
      @pointerdown.stop="toggleCollapse"
    >
      <circle r="10" :fill="secondaryColor" style="stroke: var(--slate-900)" stroke-width="1" />
      <text
        text-anchor="middle"
        dominant-baseline="central"
        :style="{ fill: collapseSymbolColor }"
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
        style="fill: var(--slate-900)"
        font-size="15"
        font-weight="700"
      >+</text>
    </g>
  </g>
</template>

<script setup>
import './node/node.css';
import { mindmapColors, themeHex, readableTextColor } from '@/helpers/themeColors';
import { computed } from 'vue';
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder';
import { provideNodeEditing } from '@/composables/useMindMapNodeEditing';
import { getNodeLabel } from '@/helpers/mindmap/mindmapCreation';
import { hasFormulaContent, isGraphNode as isGraphItem } from '@/helpers/mindmap/mindmapItems';
import MindMapGraph from './MindMapGraph.vue';
import NodeTitle from './node/NodeTitle.vue';
import NodeImage from './node/NodeImage.vue';
import NodeTextBody from './node/NodeTextBody.vue';
import NodeQuantity from './node/NodeQuantity.vue';
import { renderMathMultiline } from '@/components/interpreter/interpreter.js';

// Couleur de corps de texte par défaut d'un item (lue dans base.css : --blue-100).
const BODY_TEXT = themeHex('--blue-100');

const props = defineProps({
  node: { type: Object, required: true },
  selected: { type: Boolean, default: false },
  hasChildren: { type: Boolean, default: false },
});

const emit = defineEmits(['node-pointerdown', 'toggle-collapse']);
const store = useMindMapBuilderStore();
// Champ en cours d'édition (titre, contenu ou grandeur), partagé avec les sous-composants.
const editingField = provideNodeEditing();

const width = computed(() => props.node.style?.width || 220);
const height = computed(() => props.node.style?.height || 120);
const primaryColor = computed(() => props.node.style?.primaryColor || mindmapColors.nodeBg);
const secondaryColor = computed(() => props.node.style?.secondaryColor || mindmapColors.secondary);
// Symbole +/− du bouton de repliage : lisible sur n'importe quelle couleur secondaire (couleur de la boîte
// Leitner de la carte liée, choisie librement par l'étudiant : du jaune au bleu foncé).
const collapseSymbolColor = computed(() => readableTextColor(secondaryColor.value));
const shape = computed(() => props.node.style?.shape || 'bubble');
const borderRadius = computed(() => {
  // Un graphique est un bloc rectangulaire : un grand arrondi rognerait le repère et les boutons.
  if (props.node.type === 'graph' && shape.value !== 'pill') return 16;
  if (shape.value === 'rect') return 12;
  if (shape.value === 'pill') return height.value / 2;
  return Math.min(width.value, height.value) / 4;
});

const isImageNode = computed(() => props.node.type === 'image');
const isFormulaNode = computed(() => hasFormulaContent(props.node));
const isGraphNode = computed(() => isGraphItem(props.node));
// Hauteur réservée au titre au-dessus du graphique (ligne + espacement).
const GRAPH_TITLE_HEIGHT = 28;
const isQuantityNode = computed(() => props.node.type === 'quantity');
const formulaHtml = computed(() =>
  isFormulaNode.value && props.node.content ? renderMathMultiline(props.node.content) : ''
);

const addChildNode = () => {
  const type = store.nodeType || 'text';
  store.addNode({
    label: getNodeLabel(type),
    type,
    parentId: props.node.id,
    content: type === 'text' ? undefined : '',
  });
};

const handlePointerDown = (event) => {
  if (editingField.value) return;
  if (event.shiftKey) {
    addChildNode();
    return;
  }
  emit('node-pointerdown', { event, node: props.node });
};

const toggleCollapse = () => {
  emit('toggle-collapse', props.node.id);
};

const createChildNode = () => {
  if (!props.node?.id) return;
  addChildNode();
};
</script>

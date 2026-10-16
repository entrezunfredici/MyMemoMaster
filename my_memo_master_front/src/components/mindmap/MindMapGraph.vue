<template>
  <div class="mmgraph" @pointerdown.stop @click.stop @dblclick.stop>
    <div class="mmgraph__toolbar">
      <div class="mmgraph__modes" role="group" aria-label="Affichage du nœud graphique">
        <button type="button" class="mmgraph__btn" :class="{ 'mmgraph__btn--on': mode === 'plot' }" :aria-pressed="mode === 'plot'" @click="setMode('plot')">Graphique</button>
        <button type="button" class="mmgraph__btn" :class="{ 'mmgraph__btn--on': mode === 'formula' }" :aria-pressed="mode === 'formula'" @click="setMode('formula')">Formule</button>
      </div>
      <div v-if="mode === 'plot' && parsed.ok" class="mmgraph__zoom">
        <button type="button" class="mmgraph__btn" aria-label="Zoom avant" @click="zoom(0.7)">+</button>
        <button type="button" class="mmgraph__btn" aria-label="Zoom arrière" @click="zoom(1 / 0.7)">−</button>
        <button type="button" class="mmgraph__btn" aria-label="Réinitialiser la vue" title="Réinitialiser la vue" @click="resetView">⟲</button>
      </div>
    </div>

    <div v-if="!parsed.ok" class="mmgraph__empty" @dblclick.stop="store.openInterpreter()">
      <span v-if="parsed.empty">Double-clic pour saisir y = f(x)…</span>
      <span v-else class="mmgraph__error" :title="parsed.error">⚠ {{ parsed.error }}</span>
    </div>

    <svg
      v-else-if="mode === 'plot'"
      ref="svgRef"
      class="mmgraph__plot"
      :viewBox="`0 0 ${plotWidth} ${plotHeight}`"
      :width="plotWidth"
      :height="plotHeight"
      role="img"
      :aria-label="`Graphique de ${formulaLabel}`"
      @pointerdown="startPan"
      @pointermove="movePan"
      @pointerup="endPan"
      @pointercancel="endPan"
      @wheel.prevent.stop="onWheel"
    >
      <rect :width="plotWidth" :height="plotHeight" class="mmgraph__bg" />
      <g class="mmgraph__grid">
        <line v-for="tick in xTicks" :key="'gx' + tick" :x1="toX(tick)" :x2="toX(tick)" y1="0" :y2="plotHeight" />
        <line v-for="tick in yTicks" :key="'gy' + tick" x1="0" :x2="plotWidth" :y1="toY(tick)" :y2="toY(tick)" />
      </g>
      <g class="mmgraph__axes">
        <line x1="0" :x2="plotWidth" :y1="axisY" :y2="axisY" />
        <line :x1="axisX" :x2="axisX" y1="0" :y2="plotHeight" />
      </g>
      <g class="mmgraph__labels">
        <text v-for="tick in xTicks" :key="'lx' + tick" :x="toX(tick)" :y="Math.min(plotHeight - 2, axisY + 10)" text-anchor="middle">{{ tick }}</text>
        <text v-for="tick in yTicks" :key="'ly' + tick" :x="Math.min(plotWidth - 14, axisX + 3)" :y="toY(tick) - 2">{{ tick }}</text>
      </g>
      <path :d="path" class="mmgraph__curve" />
    </svg>

    <div
      v-else
      class="mmgraph__formula"
      :style="{ color: node.style?.textColor || mindmapColors.nodeText }"
      v-html="formulaHtml"
    />

    <div v-if="parsed.ok && parsed.params.length" class="mmgraph__params">
      <label v-for="name in parsed.params" :key="name" class="mmgraph__param">
        <span class="mmgraph__param-name">{{ paramLabel(name) }}</span>
        <input
          type="range"
          :aria-label="`Valeur du paramètre ${paramLabel(name)}`"
          :min="range.min"
          :max="range.max"
          :step="range.step"
          :value="paramValue(name)"
          @input="onParamInput(name, $event.target.value)"
          @change="commitParams"
        />
        <span class="mmgraph__param-value">{{ paramValue(name) }}</span>
      </label>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder';
import { mindmapColors } from '@/helpers/themeColors';
import { renderMathMultiline } from '@/components/interpreter/interpreter.js';
import {
  parseGraphFormula,
  substituteParams,
  createGraph,
  zoomView,
  panView,
  niceTicks,
  buildPlotPath,
  paramRange,
  DEFAULT_VIEW,
} from '@/helpers/mindmap/mindmapGraph';

const props = defineProps({
  node: { type: Object, required: true },
  // Taille du bloc disponible pour le graphique (titre déduit), en pixels du repère.
  width: { type: Number, required: true },
  height: { type: Number, required: true },
});

const store = useMindMapBuilderStore();
const range = paramRange();

const TOOLBAR_HEIGHT = 26;
const PARAM_ROW_HEIGHT = 22;

const graph = computed(() => createGraph(props.node.graph));
const mode = computed(() => graph.value.mode);
const parsed = computed(() => parseGraphFormula(props.node.content));
const formulaLabel = computed(() => (parsed.value.ok ? parsed.value.body.trim() : 'la fonction'));

// Valeurs en cours de glissement (validées dans le nœud au relâchement du curseur).
const draftParams = ref(null);
const draftView = ref(null);
const params = computed(() => ({ ...graph.value.params, ...(draftParams.value || {}) }));
const view = computed(() => draftView.value || graph.value);

const paramValue = (name) => params.value[name] ?? 1;
const paramLabel = (name) => name;

const plotWidth = computed(() => Math.max(60, Math.round(props.width)));
const plotHeight = computed(() => {
  const paramRows = parsed.value.ok ? parsed.value.params.length : 0;
  return Math.max(60, Math.round(props.height - TOOLBAR_HEIGHT - paramRows * PARAM_ROW_HEIGHT - 6));
});

const toX = (x) => ((x - view.value.xMin) / (view.value.xMax - view.value.xMin)) * plotWidth.value;
const toY = (y) => plotHeight.value - ((y - view.value.yMin) / (view.value.yMax - view.value.yMin)) * plotHeight.value;
const axisX = computed(() => Math.min(plotWidth.value, Math.max(0, toX(0))));
const axisY = computed(() => Math.min(plotHeight.value, Math.max(0, toY(0))));
const xTicks = computed(() => niceTicks(view.value.xMin, view.value.xMax, Math.max(3, Math.floor(plotWidth.value / 60))).filter((t) => t !== 0));
const yTicks = computed(() => niceTicks(view.value.yMin, view.value.yMax, Math.max(3, Math.floor(plotHeight.value / 40))).filter((t) => t !== 0));
const path = computed(() =>
  parsed.value.ok ? buildPlotPath(parsed.value.fn, view.value, params.value, plotWidth.value, plotHeight.value) : ''
);

const formulaHtml = computed(() =>
  parsed.value.ok ? renderMathMultiline(substituteParams(parsed.value, params.value)) : ''
);

const setMode = (next) => store.updateNodeGraph(props.node.id, { mode: next });

const onParamInput = (name, value) => {
  draftParams.value = { ...(draftParams.value || {}), [name]: Number(value) };
};
const commitParams = () => {
  if (!draftParams.value) return;
  store.updateNodeGraph(props.node.id, { params: draftParams.value });
  draftParams.value = null;
};

const zoom = (factor) => {
  store.updateNodeGraph(props.node.id, zoomView(view.value, factor));
};
const resetView = () => {
  store.updateNodeGraph(props.node.id, { ...DEFAULT_VIEW });
};

const svgRef = ref(null);
const pointerPosition = (event) => {
  const rect = svgRef.value?.getBoundingClientRect();
  if (!rect || !rect.width || !rect.height) return { px: 0, py: 0 };
  return {
    px: ((event.clientX - rect.left) / rect.width) * plotWidth.value,
    py: ((event.clientY - rect.top) / rect.height) * plotHeight.value,
  };
};

// Zoom à la molette, centré sur le curseur.
const onWheel = (event) => {
  const { px, py } = pointerPosition(event);
  const cx = view.value.xMin + (px / plotWidth.value) * (view.value.xMax - view.value.xMin);
  const cy = view.value.yMax - (py / plotHeight.value) * (view.value.yMax - view.value.yMin);
  store.updateNodeGraph(props.node.id, zoomView(view.value, event.deltaY < 0 ? 0.85 : 1 / 0.85, cx, cy));
};

// Déplacement de la vue au glisser.
let panStart = null;
const startPan = (event) => {
  if (event.button !== undefined && event.button !== 0) return;
  panStart = { x: event.clientX, y: event.clientY, view: { ...view.value } };
  event.currentTarget.setPointerCapture?.(event.pointerId);
};
const movePan = (event) => {
  if (!panStart) return;
  const rect = svgRef.value?.getBoundingClientRect();
  if (!rect || !rect.width || !rect.height) return;
  const dx = -((event.clientX - panStart.x) / rect.width) * (panStart.view.xMax - panStart.view.xMin);
  const dy = ((event.clientY - panStart.y) / rect.height) * (panStart.view.yMax - panStart.view.yMin);
  draftView.value = panView(panStart.view, dx, dy);
};
const endPan = (event) => {
  if (!panStart) return;
  panStart = null;
  event.currentTarget.releasePointerCapture?.(event.pointerId);
  if (draftView.value) {
    store.updateNodeGraph(props.node.id, draftView.value);
    draftView.value = null;
  }
};
</script>

<style scoped>
.mmgraph {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-height: 0;
  color: var(--mindmap-node-text);
  cursor: default;
}
.mmgraph__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 22px;
  gap: 4px;
}
.mmgraph__modes,
.mmgraph__zoom {
  display: flex;
  gap: 2px;
}
.mmgraph__btn {
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  font-size: 11px;
  line-height: 1;
  color: var(--mindmap-graph-btn-text);
  background: var(--mindmap-graph-btn-bg);
  border: 1px solid var(--mindmap-graph-btn-border);
  border-radius: 5px;
  cursor: pointer;
}
.mmgraph__btn:hover {
  background: var(--mindmap-graph-btn-bg-hover);
}
.mmgraph__btn--on {
  background: var(--mindmap-graph-btn-active-bg);
  border-color: var(--mindmap-graph-btn-active-border);
  color: rgb(var(--white));
}
.mmgraph__plot {
  display: block;
  border-radius: 6px;
  touch-action: none;
  cursor: grab;
  user-select: none;
}
.mmgraph__plot:active {
  cursor: grabbing;
}
.mmgraph__bg {
  fill: var(--mindmap-graph-bg);
}
.mmgraph__grid line {
  stroke: var(--mindmap-graph-grid);
  stroke-width: 1;
}
.mmgraph__axes line {
  stroke: var(--mindmap-graph-axis);
  stroke-width: 1.2;
}
.mmgraph__labels text {
  font-size: 9px;
  fill: var(--mindmap-graph-label);
  pointer-events: none;
}
.mmgraph__curve {
  fill: none;
  stroke: var(--mindmap-graph-accent);
  stroke-width: 2;
  stroke-linejoin: round;
}
.mmgraph__formula {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.mmgraph__formula :deep(.katex-display) { margin: 0; }
.mmgraph__formula :deep(.katex) { font-size: 1rem; }
.mmgraph__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 11px;
  font-style: italic;
  opacity: 0.75;
  cursor: text;
}
.mmgraph__error {
  color: var(--mindmap-error-text);
  font-style: normal;
}
.mmgraph__params {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.mmgraph__param {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 22px;
  font-size: 11px;
}
.mmgraph__param input[type='range'] {
  flex: 1;
  min-width: 0;
  accent-color: var(--mindmap-graph-accent);
}
.mmgraph__param-name {
  width: 2.2em;
  font-style: italic;
  text-align: right;
}
.mmgraph__param-value {
  width: 3em;
  font-variant-numeric: tabular-nums;
}
</style>

<template>
  <div
    class="mindmap-board"
    ref="containerRef"
    @wheel.prevent="onWheel"
    @contextmenu.prevent
  >
    <svg
      ref="svgRef"
      class="mindmap-board__svg"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointerleave="onPointerUp"
      @pointerdown="onBackgroundPointerDown"
    >
      <defs>
        <marker
          id="arrow-forward"
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#1E3A8A" />
        </marker>
        <marker
          id="arrow-backward"
          viewBox="0 0 10 10"
          refX="0"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto"
        >
          <path d="M 10 0 L 0 5 L 10 10 z" fill="#1E3A8A" />
        </marker>
      </defs>

      <g :transform="`translate(${pan.x}, ${pan.y}) scale(${zoom})`">
        <MindMapZone
          v-for="zone in zones"
          :key="zone.id"
          :zone="zone"
          @zone-pointerdown="onZonePointerDown"
        />

        <MindMapLink
          v-for="link in visibleLinks"
          :key="link.id"
          :link="link"
          :source="store.map.nodes[link.from]"
          :target="store.map.nodes[link.to]"
          :selected="store.selectedLinkId === link.id"
          @link-pointerdown="onLinkPointerDown"
        />

        <MindMapNode
          v-for="node in visibleNodes"
          :key="node.id"
          :node="node"
          :selected="store.selectedNodeIds.includes(node.id) || store.pendingLinkSource === node.id"
          :has-children="childMap[node.id]?.length > 0"
          @node-pointerdown="onNodePointerDown"
          @toggle-collapse="store.toggleCollapse"
        />
      </g>
    </svg>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder';
import { creationTools, getNodeLabel, normalizeCreationType } from '@/helpers/mindmapCreation';
import MindMapNode from './MindMapNode.vue';
import MindMapLink from './MindMapLink.vue';
import MindMapZone from './MindMapZone.vue';

const store = useMindMapBuilderStore();

const containerRef = ref(null);
const svgRef = ref(null);
const pan = ref({ x: 0, y: 0 });
const zoom = ref(1);
const draggingNodeId = ref(null);
const draggingZoneId = ref(null);
const dragOffset = ref({ x: 0, y: 0 });
const zoneDragOffset = ref({ x: 0, y: 0 });
const isPanning = ref(false);
const panStart = ref({ x: 0, y: 0 });
const pointerStart = ref({ x: 0, y: 0 });

const zones = computed(() => store.map.zones || []);

const childMap = computed(() => {
  const map = {};
  store.map.links.forEach((link) => {
    if (!map[link.from]) map[link.from] = [];
    map[link.from].push(link.to);
  });
  return map;
});

const visibleNodeIds = computed(() => {
  const nodes = store.map.nodes;
  const hidden = new Set();
  const stack = [];
  Object.values(nodes).forEach((node) => {
    if (node.collapsed) {
      (childMap.value[node.id] || []).forEach((childId) => stack.push(childId));
    }
  });
  while (stack.length) {
    const id = stack.pop();
    if (hidden.has(id)) continue;
    hidden.add(id);
    (childMap.value[id] || []).forEach((childId) => stack.push(childId));
  }
  return Object.keys(nodes).filter((id) => !hidden.has(id));
});

const visibleNodes = computed(() => visibleNodeIds.value.map((id) => store.map.nodes[id]));

const visibleLinks = computed(() =>
  store.map.links.filter((link) =>
    visibleNodeIds.value.includes(link.from) && visibleNodeIds.value.includes(link.to)
  )
);

const centerOnSubject = () => {
  const node = store.map.nodes[store.map.subjectNodeId];
  if (!node || !containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  pan.value = {
    x: rect.width / 2 - node.layout.x * zoom.value,
    y: rect.height / 2 - node.layout.y * zoom.value,
  };
};

onMounted(() => {
  window.addEventListener('resize', centerOnSubject);
  centerOnSubject();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', centerOnSubject);
});

watch(
  () => store.map.subjectNodeId,
  () => {
    centerOnSubject();
  }
);

const toBoardCoords = (event) => {
  const rect = svgRef.value?.getBoundingClientRect();
  if (!rect) return { x: 0, y: 0 };
  const x = (event.clientX - rect.left - pan.value.x) / zoom.value;
  const y = (event.clientY - rect.top - pan.value.y) / zoom.value;
  return { x, y };
};

const onNodePointerDown = ({ event, node }) => {
  if (store.tool === 'link') {
    if (!store.pendingLinkSource) {
      store.setPendingLinkSource(node.id);
    } else {
      store.finalizePendingLink(node.id);
    }
    return;
  }

  const additive = event.shiftKey || event.ctrlKey || event.metaKey;
  store.selectNode(node.id, additive);
  draggingNodeId.value = node.id;
  const coords = toBoardCoords(event);
  dragOffset.value = {
    x: coords.x - node.layout.x,
    y: coords.y - node.layout.y,
  };
  svgRef.value?.setPointerCapture?.(event.pointerId);
};

const onZonePointerDown = ({ event, zone }) => {
  draggingZoneId.value = zone.id;
  const coords = toBoardCoords(event);
  zoneDragOffset.value = {
    x: coords.x - zone.layout.x,
    y: coords.y - zone.layout.y,
  };
  svgRef.value?.setPointerCapture?.(event.pointerId);
};

const onLinkPointerDown = ({ link }) => {
  store.selectLink(link.id);
};

const onBackgroundPointerDown = (event) => {
  const isCreationTool = creationTools.includes(store.tool);
  const isPrimaryButton = event.button === 0;
  const clickedSvgBackground = event.target === svgRef.value;

  if (isCreationTool && isPrimaryButton && clickedSvgBackground) {
    if (!store.map.subjectNodeId) return;
    const coords = toBoardCoords(event);
    const type = normalizeCreationType(store.tool);
    const label = getNodeLabel(type);
    store.addNode({
      label,
      type,
      parentId: store.map.subjectNodeId,
      content: type === 'text' ? undefined : '',
      position: coords,
    });
    return;
  }

  if (clickedSvgBackground && isPrimaryButton) {
    store.resetSelection();
  }

  if (event.button === 1 || event.button === 2 || event.altKey) {
    isPanning.value = true;
    pointerStart.value = { x: event.clientX, y: event.clientY };
    panStart.value = { ...pan.value };
  }
};

const onPointerMove = (event) => {
  if (draggingNodeId.value) {
    const coords = toBoardCoords(event);
    const x = coords.x - dragOffset.value.x;
    const y = coords.y - dragOffset.value.y;
    store.moveNode(draggingNodeId.value, x, y);
  } else if (draggingZoneId.value) {
    const coords = toBoardCoords(event);
    const x = coords.x - zoneDragOffset.value.x;
    const y = coords.y - zoneDragOffset.value.y;
    store.updateZone(draggingZoneId.value, { layout: { x, y } });
  } else if (isPanning.value) {
    const dx = event.clientX - pointerStart.value.x;
    const dy = event.clientY - pointerStart.value.y;
    pan.value = {
      x: panStart.value.x + dx,
      y: panStart.value.y + dy,
    };
  }
};

const onPointerUp = (event) => {
  if (draggingNodeId.value || draggingZoneId.value) {
    svgRef.value?.releasePointerCapture?.(event.pointerId);
  }
  draggingNodeId.value = null;
  draggingZoneId.value = null;
  isPanning.value = false;
};

const onWheel = (event) => {
  const rect = svgRef.value?.getBoundingClientRect();
  if (!rect) return;
  const wheelDelta = event.deltaY > 0 ? -0.1 : 0.1;
  const newZoom = Math.min(3, Math.max(0.4, zoom.value + wheelDelta));
  if (newZoom === zoom.value) return;

  const pointerX = event.clientX - rect.left;
  const pointerY = event.clientY - rect.top;
  const boardX = (pointerX - pan.value.x) / zoom.value;
  const boardY = (pointerY - pan.value.y) / zoom.value;

  zoom.value = newZoom;
  pan.value = {
    x: pointerX - boardX * newZoom,
    y: pointerY - boardY * newZoom,
  };
};
</script>

<style scoped>
.mindmap-board {
  width: 100%;
  height: 100%;
  background: #f1f5f9;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
}

.mindmap-board__svg {
  width: 100%;
  height: 100%;
  cursor: grab;
}

.mindmap-board__svg:active {
  cursor: grabbing;
}
</style>

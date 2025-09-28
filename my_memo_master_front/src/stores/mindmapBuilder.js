import { defineStore } from 'pinia';
import {
  createBlankMindMap,
  normalizeMindMap,
  applyRadialLayout,
  createId,
  serializeMindMap,
  ensureSecondaryColor,
} from '@/helpers/mindmap';

const defaultTool = 'select';

export const useMindMapBuilderStore = defineStore('mindmapBuilder', {
  state: () => ({
    map: createBlankMindMap(),
    tool: defaultTool,
    selectedNodeIds: [],
    selectedLinkId: null,
    pendingLinkSource: null,
    isDirty: false,
  }),
  getters: {
    nodesArray: (state) => Object.values(state.map.nodes),
    selectedNode(state) {
      if (state.selectedNodeIds.length === 1) {
        return state.map.nodes[state.selectedNodeIds[0]] || null;
      }
      return null;
    },
    selectedNodes(state) {
      return state.selectedNodeIds.map((id) => state.map.nodes[id]).filter(Boolean);
    },
  },
  actions: {
    load(raw) {
      const normalized = applyRadialLayout(normalizeMindMap(raw));
      this.map = normalized;
      this.resetSelection();
      this.isDirty = false;
    },
    new(title) {
      this.map = createBlankMindMap(title);
      this.resetSelection();
      this.isDirty = false;
    },
    exportPayload() {
      return serializeMindMap(this.map);
    },
    setTool(tool) {
      this.tool = tool;
      if (tool !== 'link') {
        this.pendingLinkSource = null;
      }
    },
    selectNode(id, additive = false) {
      if (!id) {
        this.resetSelection();
        return;
      }
      if (additive) {
        if (this.selectedNodeIds.includes(id)) {
          this.selectedNodeIds = this.selectedNodeIds.filter((nodeId) => nodeId !== id);
        } else {
          this.selectedNodeIds = [...this.selectedNodeIds, id];
        }
      } else {
        this.selectedNodeIds = [id];
      }
      this.selectedLinkId = null;
    },
    selectLink(id) {
      this.selectedLinkId = id;
      this.selectedNodeIds = [];
    },
    resetSelection() {
      this.selectedNodeIds = [];
      this.selectedLinkId = null;
      this.pendingLinkSource = null;
    },
    moveNode(id, x, y) {
      const node = this.map.nodes[id];
      if (!node) return;
      node.layout.x = x;
      node.layout.y = y;
      this.touch();
    },
    addNode({ label = 'Nouvel item', type = 'text', content = '', parentId = null }) {
      const id = createId();
      const parent = parentId ? this.map.nodes[parentId] : null;
      const angle = parent?.layout?.angle ?? 0;
      const radius = parent ? (parent.layout.radius || 180) + 160 : 260;
      const subject = this.map.nodes[this.map.subjectNodeId];
      const baseX = subject?.layout?.x ?? 0;
      const baseY = subject?.layout?.y ?? 0;
      const x = parent ? parent.layout.x + radius * Math.cos(angle || 0) : baseX + 240;
      const y = parent ? parent.layout.y + radius * Math.sin(angle || 0) : baseY;
      this.map.nodes[id] = ensureSecondaryColor({
        id,
        label,
        type,
        content: content || label,
        mastery: 'undefined',
        zoneId: null,
        style: {
          primaryColor: parent?.style?.primaryColor || '#1E3A8A',
          secondaryColor: undefined,
          shape: 'bubble',
          width: 220,
          height: 120,
        },
        layout: { x, y },
        collapsed: false,
        meta: {
          isSubject: false,
          parentId: parentId || this.map.subjectNodeId,
        },
      });
      if (parentId || this.map.subjectNodeId) {
        const from = parentId || this.map.subjectNodeId;
        this.addLink({ from, to: id, type: 'appartenance' });
      }
      this.selectNode(id);
      this.touch();
      return id;
    },
    addZone({ name = 'Zone', color = '#BFDBFE', x = 200, y = 200, width = 360, height = 240 }) {
      const id = createId();
      this.map.zones = Array.isArray(this.map.zones) ? this.map.zones : [];
      this.map.zones.push({
        id,
        name,
        color,
        layout: { x, y, width, height },
        collapsed: false,
      });
      this.touch();
      return id;
    },
    updateZone(id, payload = {}) {
      this.map.zones = Array.isArray(this.map.zones) ? this.map.zones : [];
      const zone = this.map.zones.find((item) => item.id === id);
      if (!zone) return;
      zone.name = payload.name ?? zone.name;
      zone.color = payload.color ?? zone.color;
      if (payload.collapsed !== undefined) {
        zone.collapsed = payload.collapsed;
      }
      if (payload.layout) {
        zone.layout = { ...zone.layout, ...payload.layout };
      }
      this.touch();
    },
    removeZone(id) {
      this.map.zones = (this.map.zones || []).filter((zone) => zone.id !== id);
      Object.values(this.map.nodes).forEach((node) => {
        if (node.zoneId === id) {
          node.zoneId = null;
        }
      });
      this.touch();
    },
    assignNodeToZone(nodeId, zoneId) {
      const node = this.map.nodes[nodeId];
      if (!node) return;
      node.zoneId = zoneId || null;
      this.touch();
    },
    addLink({ from, to, type = 'appartenance', direction = 'forward' }) {
      if (!from || !to || from === to) return null;
      const exists = this.map.links.find((link) => link.from === from && link.to === to);
      if (exists) return exists.id;
      const id = createId();
      this.map.links.push({
        id,
        from,
        to,
        type,
        direction,
        order: this.map.links.length,
        style: {
          primaryColor: this.map.nodes[from]?.style?.primaryColor || '#1E3A8A',
          secondaryColor: this.map.nodes[from]?.style?.secondaryColor || '#C0C5D2',
          bezier: true,
        },
        interactions: {
          transfersValue: false,
          togglesVisibility: false,
        },
      });
      this.touch();
      return id;
    },
    setTitle(title) {
      if (!title) return;
      this.map.title = title;
      const subjectId = this.map.subjectNodeId;
      if (subjectId && this.map.nodes[subjectId]) {
        const subject = this.map.nodes[subjectId];
        subject.label = title;
        if (!subject.content || subject.meta?.isSubject) {
          subject.content = title;
        }
      }
      this.touch();
    },
    updateNode(id, payload = {}) {
      const node = this.map.nodes[id];
      if (!node) return;
      Object.assign(node, payload);
      if (payload.mastery) {
        ensureSecondaryColor(node);
      }
      this.touch();
    },
    updateNodeStyle(id, style = {}) {
      const node = this.map.nodes[id];
      if (!node) return;
      node.style = { ...node.style, ...style };
      this.touch();
    },
    updateLink(id, payload = {}) {
      const link = this.map.links.find((item) => item.id === id);
      if (!link) return;
      Object.assign(link, payload);
      this.touch();
    },
    removeNode(id) {
      if (!this.map.nodes[id]) return;
      delete this.map.nodes[id];
      this.map.links = this.map.links.filter((link) => link.from !== id && link.to !== id);
      this.selectedNodeIds = this.selectedNodeIds.filter((nodeId) => nodeId !== id);
      if (this.map.subjectNodeId === id) {
        this.map.subjectNodeId = Object.keys(this.map.nodes)[0] || null;
      }
      this.touch();
    },
    removeLink(id) {
      this.map.links = this.map.links.filter((link) => link.id !== id);
      if (this.selectedLinkId === id) {
        this.selectedLinkId = null;
      }
      this.touch();
    },
    toggleCollapse(id) {
      const node = this.map.nodes[id];
      if (!node) return;
      node.collapsed = !node.collapsed;
      this.touch();
    },
    setPendingLinkSource(nodeId) {
      this.pendingLinkSource = nodeId;
    },
    finalizePendingLink(targetId, type = 'appartenance') {
      if (!this.pendingLinkSource || !targetId || this.pendingLinkSource === targetId) return;
      this.addLink({ from: this.pendingLinkSource, to: targetId, type });
      this.pendingLinkSource = null;
    },
    touch() {
      this.isDirty = true;
      this.map.updatedAt = new Date().toISOString();
    },
  },
});


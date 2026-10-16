import { defineStore } from 'pinia';
import {
  createBlankMindMap,
  normalizeMindMap,
  applyRadialLayout,
  createId,
  serializeMindMap,
  ensureSecondaryColor,
  boxColorToHex,
  boxLevelToMastery,
} from '@/helpers/mindmap/mindmap';
import { createBranchType, getOutgoingLinks, normalizeLink } from '@/helpers/mindmap/mindmapLinks';
import { createQuantity, normalizeNodeItem, sanitizeExtraKinds } from '@/helpers/mindmap/mindmapItems';
import { createGraph } from '@/helpers/mindmap/mindmapGraph';
import { computeAllFormulas, missingVariables } from '@/helpers/mindmap/mindmapCalc';
import { api } from '@/helpers/api';
import { mindmapColors } from '@/helpers/themeColors';

const defaultTool = 'select';

// Un nœud graphique a besoin de place pour le repère et les curseurs.
const GRAPH_NODE_SIZE = { width: 340, height: 300 };
const ensureGraphNodeSize = (node) => {
  node.style = {
    ...node.style,
    width: Math.max(node.style?.width || 0, GRAPH_NODE_SIZE.width),
    height: Math.max(node.style?.height || 0, GRAPH_NODE_SIZE.height),
  };
};

export const useMindMapBuilderStore = defineStore('mindmapBuilder', {
  state: () => ({
    map: createBlankMindMap(),
    tool: defaultTool,
    nodeType: 'text', // un des types de ITEM_KINDS (helpers/mindmapItems.js)
    selectedNodeIds: [],
    selectedLinkId: null,
    linkType: 'appartenance', // type appliqué aux nouvelles branches créées à la main
    pendingLinkSource: null,
    isDirty: false,
    interpreterOpen: false,
    // id (base) de la carte mentale éditée : sert à retrouver les cartes liées depuis le côté flashcard
    idMindMap: null,
  }),
  getters: {
    nodesArray: (state) => Object.values(state.map.nodes),
    selectedNode(state) {
      if (state.selectedNodeIds.length === 1) {
        return state.map.nodes[state.selectedNodeIds[0]] || null;
      }
      return null;
    },
    selectedLink: (state) => state.map.links.find((link) => link.id === state.selectedLinkId) || null,
    // Résultats des formules reliées à des grandeurs : { [nodeId]: { ok, symbol, value, unit } | { ok: false, error } }
    calculations: (state) => computeAllFormulas(state.map),
    selectedNodes(state) {
      return state.selectedNodeIds.map((id) => state.map.nodes[id]).filter(Boolean);
    },
  },
  actions: {
    load(raw, idMindMap = null) {
      this.idMindMap = idMindMap;
      const normalized = normalizeMindMap(raw);
      const nonSubjectNodes = Object.values(normalized.nodes).filter(
        (n) => n.id !== normalized.subjectNodeId
      );
      const hasLayout = nonSubjectNodes.some(
        (n) => Math.abs(n.layout?.x ?? 0) > 1 || Math.abs(n.layout?.y ?? 0) > 1
      );
      this.map = hasLayout ? normalized : applyRadialLayout(normalized);
      this.resetSelection();
      this.isDirty = false;
      this.syncCardMasteries();
    },
    new(title) {
      this.map = createBlankMindMap(title);
      this.idMindMap = null;
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
    setNodeType(type) {
      this.nodeType = type;
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
    addNode({
      label = 'Nouvel item',
      type = 'text',
      kinds = [],
      content = undefined,
      parentId = null,
      position = null,
      linkType = 'appartenance',
    }) {
      const id = createId();
      const subject = this.map.nodes[this.map.subjectNodeId];
      let resolvedParentId = parentId || this.map.subjectNodeId || null;
      let parent = resolvedParentId ? this.map.nodes[resolvedParentId] : null;
      if (resolvedParentId && !parent) {
        resolvedParentId = this.map.subjectNodeId || null;
        parent = resolvedParentId ? this.map.nodes[resolvedParentId] : null;
      }
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      const existingChildren = resolvedParentId
        ? this.map.links.filter((link) => link.from === resolvedParentId)
        : [];
      const childCount = existingChildren.length;
      const baseX = parent?.layout?.x ?? subject?.layout?.x ?? 0;
      const baseY = parent?.layout?.y ?? subject?.layout?.y ?? 0;
      const parentSize = Math.max(parent?.style?.width || 220, parent?.style?.height || 120);
      const radius = parent ? parentSize / 2 + 160 + childCount * 40 : 260 + childCount * 60;
      const angle = parent ? childCount * goldenAngle : childCount * goldenAngle;
      let x = baseX + radius * Math.cos(angle);
      let y = baseY + radius * Math.sin(angle);
      const nodeContent = content !== undefined ? content : label;
      const newNode = ensureSecondaryColor({
        id,
        label,
        type,
        kinds: sanitizeExtraKinds(type, kinds),
        content: nodeContent,
        mastery: 'undefined',
        idCard: null,
        idSystem: null,
        zoneId: null,
        style: {
          primaryColor: parent?.style?.primaryColor || mindmapColors.nodeBg,
          secondaryColor: undefined,
          shape: 'bubble',
          width: 220,
          height: 120,
          textColor: parent?.style?.textColor || mindmapColors.nodeText,
          fontSize: Number.parseInt(parent?.style?.fontSize, 10) || 14,
          fontWeight: parent?.style?.fontWeight || 'normal',
          fontStyle: parent?.style?.fontStyle || 'normal',
          textDecoration: parent?.style?.textDecoration || 'none',
        },
        layout: { x, y, radius, angle },
        collapsed: false,
        meta: {
          isSubject: false,
          parentId: resolvedParentId || null,
        },
      });
      if (type === 'quantity' || newNode.kinds.includes('quantity')) {
        newNode.quantity = createQuantity();
      }
      if (type === 'graph') {
        newNode.graph = createGraph();
        newNode.style.width = GRAPH_NODE_SIZE.width;
        newNode.style.height = GRAPH_NODE_SIZE.height;
      }
      if (position && typeof position.x === 'number' && typeof position.y === 'number') {
        newNode.layout.x = position.x;
        newNode.layout.y = position.y;
        if (parent) {
          const dx = position.x - baseX;
          const dy = position.y - baseY;
          newNode.layout.radius = Math.hypot(dx, dy);
          newNode.layout.angle = Math.atan2(dy, dx);
        }
      }
      if (parent?.collapsed) {
        parent.collapsed = false;
      }
      this.map.nodes[id] = newNode;
      if (resolvedParentId) {
        this.addLink({ from: resolvedParentId, to: id, type: linkType });
      } else if (this.map.subjectNodeId) {
        this.addLink({ from: this.map.subjectNodeId, to: id, type: linkType });
      }
      this.selectNode(id);
      this.touch();
      return id;
    },
    // Crée une grandeur (symbole prérempli) reliée par une branche « Calcul » à la formule, pour chaque
    // variable demandée qui n'a pas déjà de grandeur reliée. Ne supprime ni ne modifie rien d'existant.
    createQuantitiesForFormula(formulaId, symbols = []) {
      if (!this.map.nodes[formulaId]) return [];
      const missing = new Set(missingVariables(this.map, formulaId));
      const created = [];
      for (const symbol of symbols) {
        if (!missing.has(symbol)) continue;
        missing.delete(symbol);
        const id = this.addNode({
          label: symbol,
          type: 'quantity',
          content: '',
          parentId: formulaId,
          linkType: 'calcul',
        });
        this.map.nodes[id].quantity = createQuantity({ symbol });
        created.push(id);
      }
      this.selectNode(formulaId);
      this.touch();
      return created;
    },
    addZone({ name = 'Zone', color = mindmapColors.zone, x = 200, y = 200, width = 360, height = 240 }) {
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
      this.map.links.push(
        normalizeLink({
          id,
          from,
          to,
          type,
          direction,
          // Dernier rang de lecture parmi les branches sortantes de `from`.
          order: this.map.links.filter((link) => link.from === from).length,
          style: {
            primaryColor: this.map.nodes[from]?.style?.primaryColor || mindmapColors.nodeBg,
            secondaryColor: this.map.nodes[from]?.style?.secondaryColor || mindmapColors.secondary,
          },
        })
      );
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
      if (payload.type !== undefined || payload.kinds !== undefined) {
        // Garde les rôles supplémentaires cohérents avec le nouveau rôle principal.
        Object.assign(node, normalizeNodeItem(node));
      }
      if (payload.type === 'graph') ensureGraphNodeSize(node);
      if (payload.mastery) {
        ensureSecondaryColor(node);
      }
      this.touch();
    },
    // Ajoute ou retire un rôle supplémentaire (le rôle principal `type` reste inchangé).
    toggleNodeKind(id, kind) {
      const node = this.map.nodes[id];
      if (!node || kind === node.type) return;
      const current = sanitizeExtraKinds(node.type, node.kinds);
      const next = current.includes(kind) ? current.filter((k) => k !== kind) : [...current, kind];
      node.kinds = sanitizeExtraKinds(node.type, next);
      if (node.kinds.includes('quantity') && !node.quantity) {
        node.quantity = createQuantity();
      }
      this.touch();
    },
    updateNodeQuantity(id, payload = {}) {
      const node = this.map.nodes[id];
      if (!node) return;
      node.quantity = createQuantity({ ...node.quantity, ...payload });
      this.touch();
    },
    // Fenêtre de vue, valeurs des paramètres et mode d'affichage d'un nœud graphique.
    updateNodeGraph(id, payload = {}) {
      const node = this.map.nodes[id];
      if (!node || node.type !== 'graph') return;
      const current = createGraph(node.graph);
      node.graph = createGraph({
        ...current,
        ...payload,
        params: payload.params ? { ...current.params, ...payload.params } : current.params,
      });
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
      const { style, ...rest } = payload;
      Object.assign(link, rest);
      if (style) link.style = { ...link.style, ...style };
      Object.assign(link, normalizeLink(link));
      this.touch();
    },
    // Ajoute un type de branche personnalisé ; renvoie son id (ou null si vide / déjà existant).
    addBranchType(label) {
      const created = createBranchType(this.map.branchTypes, label);
      if (!created) return null;
      this.map.branchTypes = [...(this.map.branchTypes || []), created];
      this.touch();
      return created.id;
    },
    setLinkType(type) {
      this.linkType = type;
    },
    // Décale une branche dans l'ordre de lecture des branches sortantes de son item source.
    moveLink(id, delta) {
      const link = this.map.links.find((item) => item.id === id);
      if (!link) return;
      const siblings = getOutgoingLinks(this.map.links, link.from);
      const index = siblings.findIndex((item) => item.id === id);
      const target = index + delta;
      if (target < 0 || target >= siblings.length) return;
      siblings.splice(index, 1);
      siblings.splice(target, 0, link);
      siblings.forEach((item, rank) => {
        item.order = rank;
      });
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
    finalizePendingLink(targetId, type = this.linkType) {
      if (!this.pendingLinkSource || !targetId || this.pendingLinkSource === targetId) return;
      this.addLink({ from: this.pendingLinkSource, to: targetId, type });
      this.pendingLinkSource = null;
    },
    openInterpreter() {
      this.interpreterOpen = true;
    },
    closeInterpreter() {
      this.interpreterOpen = false;
    },
    linkCard(nodeId, idCard, idSystem) {
      const node = this.map.nodes[nodeId];
      if (!node) return;
      node.idCard = idCard;
      node.idSystem = idSystem;
      this.touch();
    },
    unlinkCard(nodeId) {
      const node = this.map.nodes[nodeId];
      if (!node) return;
      node.idCard = null;
      node.idSystem = null;
      node.mastery = 'undefined';
      ensureSecondaryColor(node);
      this.touch();
    },
    async syncCardMasteries() {
      const nodes = Object.values(this.map.nodes);
      const applyBox = (node, card) => {
        if (!card?.leitnerBox) return;
        node.mastery = boxLevelToMastery(card.leitnerBox.level);
        node.style.secondaryColor = boxColorToHex(card.leitnerBox.color);
      };
      const systemGroups = {};
      for (const node of nodes) {
        if (node.idCard && node.idSystem) {
          if (!systemGroups[node.idSystem]) systemGroups[node.idSystem] = [];
          systemGroups[node.idSystem].push(node);
        }
      }
      // Lien posé depuis la flashcard (LeitnerCard.mindMapNodeId) : le nœud ne porte pas d'idCard,
      // on retrouve les cartes via les systèmes rattachés à cette carte mentale.
      const mindMapSystemIds = [];
      if (this.idMindMap) {
        try {
          const sysRes = await api.get('leitnersystems/');
          for (const s of sysRes?.data || []) {
            if (Number(s.idMindMap) === Number(this.idMindMap)) mindMapSystemIds.push(String(s.idSystem));
          }
        } catch {
          // couleurs de boîte non essentielles : l'éditeur reste utilisable sans
        }
      }
      const systemIds = new Set([...Object.keys(systemGroups), ...mindMapSystemIds]);
      for (const systemId of systemIds) {
        const res = await api.get(`leitnercards/system/${systemId}`);
        if (!res?.data) continue;
        for (const node of systemGroups[systemId] || []) {
          applyBox(node, res.data.find((c) => c.idCard === node.idCard));
        }
        if (mindMapSystemIds.includes(systemId)) {
          for (const card of res.data) {
            const node = card.mindMapNodeId && this.map.nodes[card.mindMapNodeId];
            if (node && !node.idCard) applyBox(node, card);
          }
        }
      }
    },
    touch() {
      this.isDirty = true;
      this.map.updatedAt = new Date().toISOString();
    },
    markSaved() {
      this.isDirty = false;
    },
  },
});

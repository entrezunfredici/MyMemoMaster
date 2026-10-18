import { defineStore } from 'pinia';
import {
  createBlankMindMap,
  normalizeMindMap,
  applyRadialLayout,
  serializeMindMap,
} from '@/helpers/mindmap/mindmap';
import { createQuantity } from '@/helpers/mindmap/mindmapItems';
import { buildNewNode } from '@/helpers/mindmap/mindmapNodeFactory';
import { computeAllFormulas, missingVariables } from '@/helpers/mindmap/mindmapCalc';
import { zoneActions } from './mindmapBuilderActions/zoneActions';
import { linkActions } from './mindmapBuilderActions/linkActions';
import { nodeActions } from './mindmapBuilderActions/nodeActions';
import { cardActions } from './mindmapBuilderActions/cardActions';

const defaultTool = 'select';

// Les actions des zones, branches, modifications d'item et flashcards liées vivent dans
// stores/mindmapBuilderActions/ et sont étalées ci-dessous : le store garde une seule API publique.
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
    ...zoneActions,
    ...linkActions,
    ...nodeActions,
    ...cardActions,
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
      const { node, resolvedParentId, parent } = buildNewNode(this.map, { label, type, kinds, content, parentId, position });
      if (parent?.collapsed) {
        parent.collapsed = false;
      }
      this.map.nodes[node.id] = node;
      if (resolvedParentId) {
        this.addLink({ from: resolvedParentId, to: node.id, type: linkType });
      } else if (this.map.subjectNodeId) {
        this.addLink({ from: this.map.subjectNodeId, to: node.id, type: linkType });
      }
      this.selectNode(node.id);
      this.touch();
      return node.id;
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
    toggleCollapse(id) {
      const node = this.map.nodes[id];
      if (!node) return;
      node.collapsed = !node.collapsed;
      this.touch();
    },
    openInterpreter() {
      this.interpreterOpen = true;
    },
    closeInterpreter() {
      this.interpreterOpen = false;
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

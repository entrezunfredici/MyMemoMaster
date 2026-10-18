import { ensureSecondaryColor } from '@/helpers/mindmap/mindmap';
import { createQuantity, normalizeNodeItem, sanitizeExtraKinds } from '@/helpers/mindmap/mindmapItems';
import { createGraph } from '@/helpers/mindmap/mindmapGraph';
import { ensureGraphNodeSize } from '@/helpers/mindmap/mindmapNodeFactory';

// Actions de modification d'un item du store mindmapBuilder (étalées dans `actions`, donc `this` est le store).
// Extrait de stores/mindmapBuilder.js sans changement de comportement.
export const nodeActions = {
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
};

import { createId } from '@/helpers/mindmap/mindmap';
import { createBranchType, getOutgoingLinks, normalizeLink } from '@/helpers/mindmap/mindmapLinks';
import { mindmapColors } from '@/helpers/themeColors';

// Actions « branches » du store mindmapBuilder (étalées dans `actions`, donc `this` est le store).
// Extrait de stores/mindmapBuilder.js sans changement de comportement.
export const linkActions = {
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
  removeLink(id) {
    this.map.links = this.map.links.filter((link) => link.id !== id);
    if (this.selectedLinkId === id) {
      this.selectedLinkId = null;
    }
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
};

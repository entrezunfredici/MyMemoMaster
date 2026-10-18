import { ensureSecondaryColor, boxColorToHex, boxLevelToMastery } from '@/helpers/mindmap/mindmap';
import { api } from '@/helpers/api';

// Actions « flashcards liées » du store mindmapBuilder (étalées dans `actions`, donc `this` est le store).
// Extrait de stores/mindmapBuilder.js sans changement de comportement.
export const cardActions = {
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
};

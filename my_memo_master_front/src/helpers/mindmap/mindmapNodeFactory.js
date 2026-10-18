import { createId, ensureSecondaryColor } from './mindmap';
import { createQuantity, sanitizeExtraKinds } from './mindmapItems';
import { createGraph } from './mindmapGraph';
import { mindmapColors } from '@/helpers/themeColors';

// Un nœud graphique a besoin de place pour le repère et les curseurs.
const GRAPH_NODE_SIZE = { width: 340, height: 300 };

/**
 * Agrandit un nœud graphique à la taille minimale du repère (en place).
 *
 * @param {object} node - Nœud de la carte.
 */
const ensureGraphNodeSize = (node) => {
  node.style = {
    ...node.style,
    width: Math.max(node.style?.width || 0, GRAPH_NODE_SIZE.width),
    height: Math.max(node.style?.height || 0, GRAPH_NODE_SIZE.height),
  };
};

/**
 * Construit un nouvel item de carte : résout son parent (le sujet à défaut), le place autour de lui
 * (spirale d'or, ou à `position` quand elle est fournie) et lui donne le style de son parent.
 * Ne modifie pas la carte : l'appelant insère le nœud et le lien.
 *
 * @param {object} map - Carte courante (lecture seule).
 * @param {object} options - label, type, kinds, content, parentId, position.
 * @returns {{ node: object, resolvedParentId: (string|null), parent: (object|null) }} Nœud construit et parent résolu.
 */
const buildNewNode = (map, { label, type, kinds, content, parentId, position }) => {
  const id = createId();
  const subject = map.nodes[map.subjectNodeId];
  let resolvedParentId = parentId || map.subjectNodeId || null;
  let parent = resolvedParentId ? map.nodes[resolvedParentId] : null;
  if (resolvedParentId && !parent) {
    resolvedParentId = map.subjectNodeId || null;
    parent = resolvedParentId ? map.nodes[resolvedParentId] : null;
  }
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const existingChildren = resolvedParentId
    ? map.links.filter((link) => link.from === resolvedParentId)
    : [];
  const childCount = existingChildren.length;
  const baseX = parent?.layout?.x ?? subject?.layout?.x ?? 0;
  const baseY = parent?.layout?.y ?? subject?.layout?.y ?? 0;
  const parentSize = Math.max(parent?.style?.width || 220, parent?.style?.height || 120);
  const radius = parent ? parentSize / 2 + 160 + childCount * 40 : 260 + childCount * 60;
  const angle = childCount * goldenAngle;
  const x = baseX + radius * Math.cos(angle);
  const y = baseY + radius * Math.sin(angle);
  const nodeContent = content !== undefined ? content : label;
  const node = ensureSecondaryColor({
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
  if (type === 'quantity' || node.kinds.includes('quantity')) {
    node.quantity = createQuantity();
  }
  if (type === 'graph') {
    node.graph = createGraph();
    node.style.width = GRAPH_NODE_SIZE.width;
    node.style.height = GRAPH_NODE_SIZE.height;
  }
  if (position && typeof position.x === 'number' && typeof position.y === 'number') {
    node.layout.x = position.x;
    node.layout.y = position.y;
    if (parent) {
      const dx = position.x - baseX;
      const dy = position.y - baseY;
      node.layout.radius = Math.hypot(dx, dy);
      node.layout.angle = Math.atan2(dy, dx);
    }
  }
  return { node, resolvedParentId, parent };
};

export { GRAPH_NODE_SIZE, ensureGraphNodeSize, buildNewNode };

import { mindmapColors } from './themeColors';
// Branches de carte mentale : types (extensibles par l'étudiant), sens, forme,
// ordre de lecture et géométrie de tracé.

const DEFAULT_LINK_TYPE = 'appartenance';
const LINK_DIRECTIONS = [
  { id: 'forward', label: 'Un sens →' },
  { id: 'bidirectional', label: 'Deux sens ↔' },
];
const LINK_SHAPES = [
  { id: 'curve', label: 'Courbe' },
  { id: 'straight', label: 'Droite' },
  { id: 'elbow', label: 'Coudée' },
];
const LINK_SHAPE_IDS = LINK_SHAPES.map((shape) => shape.id);
const MAX_TYPE_LABEL = 30;

// Remet une branche (ancien ou nouveau format) dans un état cohérent.
// Anciennes cartes : `style.bezier === false` signifiait « droite ».
const normalizeLink = (link) => {
  const style = link.style || {};
  const shape = LINK_SHAPE_IDS.includes(style.shape)
    ? style.shape
    : style.bezier === false
      ? 'straight'
      : 'curve';
  return {
    ...link,
    type: link.type || DEFAULT_LINK_TYPE,
    direction: link.direction === 'bidirectional' ? 'bidirectional' : 'forward',
    order: Number.isFinite(Number(link.order)) ? Number(link.order) : 0,
    style: {
      ...style,
      primaryColor: style.primaryColor || mindmapColors.nodeBg,
      secondaryColor: style.secondaryColor || mindmapColors.secondary,
      shape,
      bezier: shape === 'curve',
    },
    interactions: {
      transfersValue: !!link.interactions?.transfersValue,
      togglesVisibility: !!link.interactions?.togglesVisibility,
    },
  };
};

const slugify = (label) =>
  String(label)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Crée un type de branche personnalisé ; renvoie null si le libellé est vide ou déjà pris.
const createBranchType = (branchTypes, label) => {
  const clean = String(label ?? '').trim().slice(0, MAX_TYPE_LABEL);
  const base = slugify(clean);
  if (!base) return null;
  const exists = (branchTypes || []).some(
    (type) => type.id === base || type.label.toLowerCase() === clean.toLowerCase()
  );
  if (exists) return null;
  return { id: base, label: clean, custom: true };
};

const getBranchTypeLabel = (branchTypes, id) =>
  (branchTypes || []).find((type) => type.id === id)?.label || id || '';

// Ordre de lecture : branches sortantes d'un item, triées par `order` (stable).
const getOutgoingLinks = (links, fromId) =>
  links
    .map((link, index) => ({ link, index }))
    .filter(({ link }) => link.from === fromId)
    .sort((a, b) => (a.link.order ?? 0) - (b.link.order ?? 0) || a.index - b.index)
    .map(({ link }) => link);

// Point où le segment centre → (dx, dy) sort du rectangle w × h centré en (0, 0).
const edgeOffset = (dx, dy, width, height) => {
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (absX === 0 && absY === 0) return { x: 0, y: 0 };
  const scale = Math.min(
    absX === 0 ? Infinity : width / 2 / absX,
    absY === 0 ? Infinity : height / 2 / absY
  );
  return { x: dx * scale, y: dy * scale };
};

const nodeSize = (node) => ({
  width: node.style?.width || 220,
  height: node.style?.height || 120,
});

// Tracé d'une branche entre deux items : chemin SVG et milieu (pour le type et la couleur secondaire).
// Les extrémités sont ramenées au bord des items pour que les flèches restent visibles.
const computeLinkGeometry = (shape, source, target) => {
  const sx = source.layout.x;
  const sy = source.layout.y;
  const tx = target.layout.x;
  const ty = target.layout.y;
  const dx = tx - sx;
  const dy = ty - sy;
  const s = nodeSize(source);
  const t = nodeSize(target);

  if (shape === 'elbow') {
    const horizontal = Math.abs(dx) * s.height >= Math.abs(dy) * s.width;
    if (horizontal) {
      const x0 = sx + Math.sign(dx || 1) * (s.width / 2);
      const x1 = tx - Math.sign(dx || 1) * (t.width / 2);
      const mx = (x0 + x1) / 2;
      return { d: `M ${x0} ${sy} H ${mx} V ${ty} H ${x1}`, mid: { x: mx, y: (sy + ty) / 2 } };
    }
    const y0 = sy + Math.sign(dy || 1) * (s.height / 2);
    const y1 = ty - Math.sign(dy || 1) * (t.height / 2);
    const my = (y0 + y1) / 2;
    return { d: `M ${sx} ${y0} V ${my} H ${tx} V ${y1}`, mid: { x: (sx + tx) / 2, y: my } };
  }

  const from = edgeOffset(dx, dy, s.width, s.height);
  const to = edgeOffset(-dx, -dy, t.width, t.height);
  const x0 = sx + from.x;
  const y0 = sy + from.y;
  const x1 = tx + to.x;
  const y1 = ty + to.y;

  if (shape === 'straight') {
    return { d: `M ${x0} ${y0} L ${x1} ${y1}`, mid: { x: (x0 + x1) / 2, y: (y0 + y1) / 2 } };
  }

  const distance = Math.hypot(x1 - x0, y1 - y0);
  const offset = Math.min(220, Math.max(60, distance * 0.4));
  const angle = Math.atan2(dy, dx);
  const c1x = x0 + Math.cos(angle) * offset;
  const c1y = y0 + Math.sin(angle) * offset;
  const c2x = x1 - Math.cos(angle) * offset;
  const c2y = y1 - Math.sin(angle) * offset;
  return {
    d: `M ${x0} ${y0} C ${c1x} ${c1y} ${c2x} ${c2y} ${x1} ${y1}`,
    // Point de la courbe de Bézier cubique à t = 0,5.
    mid: { x: (x0 + 3 * c1x + 3 * c2x + x1) / 8, y: (y0 + 3 * c1y + 3 * c2y + y1) / 8 },
  };
};

export {
  DEFAULT_LINK_TYPE,
  LINK_DIRECTIONS,
  LINK_SHAPES,
  normalizeLink,
  createBranchType,
  getBranchTypeLabel,
  getOutgoingLinks,
  computeLinkGeometry,
};

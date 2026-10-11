// Items de carte mentale : un item a un rôle principal (`type`, qui pilote le
// rendu et le contenu) et peut porter des rôles supplémentaires (`kinds`),
// par ex. une formule qui est aussi une grandeur physique.

const ITEM_KINDS = [
  { id: 'text', label: 'Texte', icon: 'T' },
  { id: 'formula', label: 'Formule', icon: 'Fx' },
  { id: 'function', label: 'Fonction', icon: 'f(x)' },
  { id: 'quantity', label: 'Grandeur', icon: 'Q' },
  { id: 'image', label: 'Image', icon: '🖼' },
];

const ITEM_KIND_IDS = ITEM_KINDS.map((kind) => kind.id);
const DEFAULT_KIND = 'text';

// Rôles dont le contenu est une expression rendue avec KaTeX.
const MATH_KINDS = ['formula', 'function'];

const createQuantity = (quantity = {}) => ({
  symbol: typeof quantity.symbol === 'string' ? quantity.symbol : '',
  value:
    quantity.value === '' || quantity.value === null || quantity.value === undefined
      ? null
      : Number.isFinite(Number(quantity.value))
        ? Number(quantity.value)
        : null,
  unit: typeof quantity.unit === 'string' ? quantity.unit : '',
});

// Tous les rôles d'un item, rôle principal en tête, sans doublon.
const getNodeKinds = (node) => {
  const primary = node?.type || DEFAULT_KIND;
  const extra = Array.isArray(node?.kinds) ? node.kinds : [];
  return [...new Set([primary, ...extra])].filter((kind) => typeof kind === 'string' && kind);
};

const hasKind = (node, kind) => getNodeKinds(node).includes(kind);

const isMathNode = (node) => MATH_KINDS.includes(node?.type);

// Rôles supplémentaires uniquement (sans le rôle principal), restreints aux rôles connus.
const sanitizeExtraKinds = (type, kinds) =>
  [...new Set(Array.isArray(kinds) ? kinds : [])].filter(
    (kind) => ITEM_KIND_IDS.includes(kind) && kind !== type
  );

// Remet un item (ancien ou nouveau format) dans un état cohérent.
const normalizeNodeItem = (node) => {
  const type = node.type || DEFAULT_KIND;
  const kinds = sanitizeExtraKinds(type, node.kinds);
  const next = { ...node, type, kinds };
  if (type === 'quantity' || kinds.includes('quantity') || node.quantity) {
    next.quantity = createQuantity(node.quantity);
  }
  return next;
};

// Libellé lisible d'une grandeur : « v = 12 m/s ».
const formatQuantity = (quantity) => {
  if (!quantity) return '';
  const { symbol, value, unit } = createQuantity(quantity);
  const amount = value === null ? '' : `${value}${unit ? ` ${unit}` : ''}`;
  if (symbol && amount) return `${symbol} = ${amount}`;
  return symbol || amount;
};

export {
  ITEM_KINDS,
  ITEM_KIND_IDS,
  DEFAULT_KIND,
  MATH_KINDS,
  createQuantity,
  getNodeKinds,
  hasKind,
  isMathNode,
  sanitizeExtraKinds,
  normalizeNodeItem,
  formatQuantity,
};

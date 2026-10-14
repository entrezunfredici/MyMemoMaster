import { normalizeNodeItem } from './mindmapItems';
import { normalizeLink } from './mindmapLinks';
import { mindmapColors } from './themeColors';

const defaultBranchTypes = [
  { id: 'appartenance', label: 'Appartenance' },
  { id: 'composition', label: 'Composition' },
  { id: 'definition', label: 'Définition' },
  { id: 'calcul', label: 'Calcul' },
  { id: 'causalite', label: 'Causalité' },
  { id: 'correlation', label: 'Corrélation' },
];

const defaultShapes = [
  { id: 'bubble', label: 'Bulle' },
  { id: 'rect', label: 'Rectangle' },
  { id: 'pill', label: 'Pilule' },
];

const masteryList = [
  { id: 'undefined', label: 'Non defini' },
  { id: 'low', label: 'Non maitrise' },
  { id: 'medium', label: 'Maitrise partielle' },
  { id: 'high', label: 'Bonne maitrise' },
];

// La couleur d'une boîte est réglable par système et stockée côté API en entier 0xRRGGBB
// (colonne BIGINT) ; sa palette par défaut est dans LeitnerSystem.service.js (DEFAULT_BOXES).
const boxColorToHex = (bigintColor) => {
  const n = Number(bigintColor);
  if (!Number.isFinite(n) || n < 0 || n > 0xffffff) return mindmapColors.secondary;
  return '#' + n.toString(16).padStart(6, '0');
};

const hexToBoxColor = (hex) => {
  const match = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  return match ? parseInt(match[1], 16) : null;
};

const boxLevelToMastery = (level) => {
  const n = Number(level);
  if (!n || n <= 0) return 'undefined';
  if (n === 1) return 'low';
  if (n <= 3) return 'medium';
  return 'high';
};

const createId = () => {
  if (typeof crypto === 'undefined') return `mm-${Date.now()}`;
  // randomUUID exige un contexte securise (HTTPS ou localhost) — d'ou le repli.
  if (crypto.randomUUID) return crypto.randomUUID();
  // getRandomValues, lui, est disponible meme hors contexte securise : le repli
  // reste cryptographique au lieu de retomber sur Math.random().
  // Signale par javascript:S2245.
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return 'mm-' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};

const createBlankMindMap = (title = 'Nouvelle carte mentale') => {
  const subjectId = createId();
  const mapId = createId();
  return {
    id: mapId,
    title,
    subjectNodeId: subjectId,
    disciplineIds: [],
    zones: [],
    branchTypes: defaultBranchTypes,
    nodes: {
      [subjectId]: {
        id: subjectId,
        label: title,
        type: 'text',
        // Vide : le titre est déjà affiché via `label` (sinon il apparaissait deux fois sur le nœud racine)
        content: '',
        mastery: 'undefined',
        zoneId: null,
        style: {
          primaryColor: mindmapColors.nodeBg,
          secondaryColor: mindmapColors.secondary,
          shape: 'bubble',
          width: 220,
          height: 120,
          textColor: mindmapColors.nodeText,
          fontSize: 14,
          fontWeight: 'normal',
          fontStyle: 'normal',
          textDecoration: 'none',
        },
        layout: {
          x: 400,
          y: 350,
        },
        collapsed: false,
        meta: {
          isSubject: true,
          order: 0,
        },
      },
    },
    links: [],
    history: {
      stack: [],
      index: -1,
    },
    updatedAt: new Date().toISOString(),
  };
};

const ensureSecondaryColor = (node) => {
  if (!node.style) node.style = {};
  // Item lié à une flashcard : la couleur secondaire est celle de sa boîte de Leitner
  // (posée par linkCard / syncCardMasteries), sinon couleur neutre (la maîtrise n'a pas de couleur propre).
  if (node.idCard && node.style.secondaryColor) return node;
  node.style.secondaryColor = mindmapColors.secondary;
  return node;
};

const normalizeMindMap = (raw) => {
  if (!raw) return createBlankMindMap();

  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch (error) {
      console.error('Unable to parse mind map', error);
      return createBlankMindMap();
    }
  }

  if (raw.nodes && raw.links) {
    const map = {
      id: raw.id || createId(),
      title: raw.title || 'Carte mentale',
      subjectNodeId: raw.subjectNodeId,
      disciplineIds: raw.disciplineIds || [],
      zones: Array.isArray(raw.zones) ? raw.zones : [],
      branchTypes: raw.branchTypes || defaultBranchTypes,
      nodes: {},
      links: Array.isArray(raw.links) ? raw.links.map(normalizeLink) : [],
      history: raw.history || { stack: [], index: -1 },
      updatedAt: raw.updatedAt || new Date().toISOString(),
    };

    Object.values(raw.nodes).forEach((node) => {
      const cloned = JSON.parse(JSON.stringify(node));
      map.nodes[cloned.id] = ensureSecondaryColor(normalizeNodeItem({
        ...cloned,
        style: {
          primaryColor: (cloned === null || cloned === void 0 ? void 0 : cloned.style)?.primaryColor || mindmapColors.nodeBg,
          secondaryColor: cloned?.style?.secondaryColor,
          shape: cloned?.style?.shape || 'bubble',
          width: cloned?.style?.width || 220,
          height: cloned?.style?.height || 120,
          textColor: cloned?.style?.textColor || mindmapColors.nodeText,
          fontSize: Number.parseInt(cloned?.style?.fontSize, 10) || 14,
          fontWeight: cloned?.style?.fontWeight || 'normal',
          fontStyle: cloned?.style?.fontStyle || 'normal',
          textDecoration: cloned?.style?.textDecoration || 'none',
        },
        layout: {
          x: cloned?.layout?.x ?? 0,
          y: cloned?.layout?.y ?? 0,
          radius: cloned?.layout?.radius,
          angle: cloned?.layout?.angle,
        },
        meta: cloned.meta || {},
      }));
    });

    if (!map.subjectNodeId) {
      const subject = Object.values(map.nodes).find((node) => node.meta?.isSubject);
      map.subjectNodeId = subject ? subject.id : Object.keys(map.nodes)[0];
    }

    if (!map.subjectNodeId) {
      return createBlankMindMap(raw.title);
    }

    return map;
  }

  if (raw.nodeDataArray && raw.linkDataArray) {
    const map = createBlankMindMap(raw.modelData?.title || 'Carte mentale');
    const nodeIdMap = {};

    raw.nodeDataArray.forEach((node, index) => {
      const id = createId();
      nodeIdMap[node.key] = id;
      const isSubject = index === 0 || node.category === 'Sujet';
      map.nodes[id] = ensureSecondaryColor({
        id,
        label: node.text || ('Item ' + (index + 1)),
        type: 'text',
        content: node.text || '',
        mastery: 'undefined',
        zoneId: null,
        style: {
          primaryColor: node.color || mindmapColors.nodeBg,
          secondaryColor: mindmapColors.secondary,
          shape: 'bubble',
          width: node.width || 220,
          height: node.height || 120,
          textColor: node.textColor || mindmapColors.nodeText,
          fontSize: Number.parseInt(node.fontSize, 10) || 14,
          fontWeight: node.fontWeight || 'normal',
          fontStyle: node.fontStyle || 'normal',
          textDecoration: node.textDecoration || 'none',
        },
        layout: {
          x: node.loc ? Number(node.loc.split(' ')[0]) : 400 + (index * 40),
          y: node.loc ? Number(node.loc.split(' ')[1]) : 350 + (index * 40),
        },
        collapsed: false,
        meta: {
          isSubject,
        },
      });
      if (isSubject) {
        map.subjectNodeId = id;
        map.nodes[id].meta.isSubject = true;
      }
    });

    map.links = raw.linkDataArray.map((link, index) => ({
      id: createId(),
      from: nodeIdMap[link.from],
      to: nodeIdMap[link.to],
      direction: link.category === 'bidirectional' ? 'bidirectional' : 'forward',
      type: link.type || 'appartenance',
      order: link.order ?? index,
      style: {
        primaryColor: link.color || mindmapColors.nodeBg,
        secondaryColor: link.secondaryColor || mindmapColors.secondary,
        bezier: !!link.curve,
      },
      interactions: {
        transfersValue: !!link.transfersValue,
        togglesVisibility: !!link.togglesVisibility,
      },
    }));

    return map;
  }

  return createBlankMindMap(raw.title);
};

const applyRadialLayout = (map, options = {}) => {
  const spacing = options.spacing ?? 180;
  const levelSpacing = options.levelSpacing ?? 220;
  const subject = map.nodes[map.subjectNodeId];
  if (!subject) return map;

  subject.layout.x = options.centerX ?? 600;
  subject.layout.y = options.centerY ?? 400;

  const adjacency = {};
  Object.values(map.nodes).forEach((node) => {
    adjacency[node.id] = [];
  });
  map.links.forEach((link) => {
    adjacency[link.from]?.push(link.to);
    if (link.direction === 'bidirectional') {
      adjacency[link.to]?.push(link.from);
    }
  });

  const visited = new Set([subject.id]);
  const queue = [{ id: subject.id, depth: 0 }];
  const levels = {};

  while (queue.length) {
    const current = queue.shift();
    const children = adjacency[current.id] || [];
    const depth = current.depth + 1;
    if (!levels[depth]) levels[depth] = [];
    children.forEach((childId) => {
      if (visited.has(childId)) return;
      visited.add(childId);
      levels[depth].push(childId);
      queue.push({ id: childId, depth, parent: current.id });
    });
  }

  const levelKeys = Object.keys(levels)
    .map(Number)
    .sort((a, b) => a - b);

  levelKeys.forEach((depth) => {
    const nodesAtDepth = levels[depth];
    const totalAngle = Math.min(Math.PI * 2, nodesAtDepth.length * 0.9);
    const angleStep = totalAngle / Math.max(nodesAtDepth.length, 1);
    const startAngle = (-totalAngle) / 2;

    nodesAtDepth.forEach((nodeId, index) => {
      const node = map.nodes[nodeId];
      const angle = startAngle + index * angleStep;
      const radius = depth * levelSpacing + spacing;
      node.layout.x = subject.layout.x + radius * Math.cos(angle);
      node.layout.y = subject.layout.y + radius * Math.sin(angle);
      node.layout.radius = radius;
      node.layout.angle = angle;
    });
  });

  return map;
};

const serializeMindMap = (map) => JSON.parse(JSON.stringify(map));

export {
  masteryList,
  defaultBranchTypes,
  defaultShapes,
  boxColorToHex,
  hexToBoxColor,
  boxLevelToMastery,
  createId,
  createBlankMindMap,
  normalizeMindMap,
  applyRadialLayout,
  serializeMindMap,
  ensureSecondaryColor,
};

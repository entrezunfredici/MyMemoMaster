const masteryColors = {
  undefined: '#C0C5D2',
  low: '#E74C3C',
  medium: '#F39C12',
  high: '#27AE60',
};

const defaultBranchTypes = [
  { id: 'appartenance', label: 'Appartenance' },
  { id: 'composition', label: 'Composition' },
  { id: 'definition', label: 'Definition' },
  { id: 'calcul', label: 'Calcul' },
  { id: 'causalite', label: 'Causalite' },
  { id: 'correlation', label: 'Correlation' },
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

const createId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'mm-' + Math.random().toString(36).slice(2, 10);
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
        content: title,
        mastery: 'undefined',
        zoneId: null,
        style: {
          primaryColor: '#1E3A8A',
          secondaryColor: masteryColors.undefined,
          shape: 'bubble',
          width: 220,
          height: 120,
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
  const target = masteryColors[node.mastery] || masteryColors.undefined;
  node.style.secondaryColor = target;
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
      links: Array.isArray(raw.links) ? raw.links : [],
      history: raw.history || { stack: [], index: -1 },
      updatedAt: raw.updatedAt || new Date().toISOString(),
    };

    Object.values(raw.nodes).forEach((node) => {
      const cloned = JSON.parse(JSON.stringify(node));
      map.nodes[cloned.id] = ensureSecondaryColor({
        ...cloned,
        style: {
          primaryColor: (cloned === null || cloned === void 0 ? void 0 : cloned.style)?.primaryColor || '#1E3A8A',
          secondaryColor: cloned?.style?.secondaryColor,
          shape: cloned?.style?.shape || 'bubble',
          width: cloned?.style?.width || 220,
          height: cloned?.style?.height || 120,
        },
        layout: {
          x: cloned?.layout?.x ?? 0,
          y: cloned?.layout?.y ?? 0,
          radius: cloned?.layout?.radius,
          angle: cloned?.layout?.angle,
        },
        meta: cloned.meta || {},
      });
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
          primaryColor: node.color || '#1E3A8A',
          secondaryColor: masteryColors.undefined,
          shape: 'bubble',
          width: node.width || 220,
          height: node.height || 120,
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
        primaryColor: link.color || '#1E3A8A',
        secondaryColor: link.secondaryColor || '#C0C5D2',
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
  masteryColors,
  masteryList,
  defaultBranchTypes,
  defaultShapes,
  createId,
  createBlankMindMap,
  normalizeMindMap,
  applyRadialLayout,
  serializeMindMap,
  ensureSecondaryColor,
};

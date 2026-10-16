// Carte mentale de test pour l'audit RGAA de l'éditeur : un item de chaque type (texte, formule,
// grandeur, graphique, image), deux branches et une zone. Données seules : aucune dépendance au
// code de l'application, pour que l'audit reste valable si l'implémentation change.

const node = (id, label, type, content, x, y, extra = {}) => ({
  id,
  label,
  type,
  kinds: [],
  content,
  mastery: 'undefined',
  idCard: null,
  idSystem: null,
  zoneId: null,
  style: {
    primaryColor: '#1E3A8A',
    secondaryColor: '#C0C5D2',
    shape: 'bubble',
    width: type === 'graph' ? 340 : 220,
    height: type === 'graph' ? 300 : 120,
    textColor: '#eef2ff',
    fontSize: 14,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
  },
  layout: { x, y },
  collapsed: false,
  meta: { isSubject: id === 'root', parentId: id === 'root' ? null : 'root' },
  ...extra,
})

export const MINDMAP = {
  id: 'a11y-map',
  title: 'Cinématique',
  subjectNodeId: 'root',
  disciplineIds: [],
  zones: [{ id: 'z1', name: 'Zone', color: '#BFDBFE', x: -700, y: -330, width: 300, height: 200 }],
  branchTypes: [],
  nodes: {
    root: node('root', 'Cinématique', 'text', '', 0, 0),
    g1: node('g1', 'Parabole', 'graph', 'y=ax^{2}+b', 420, 0, { graph: { params: { a: 1, b: -2 } } }),
    q1: node('q1', 'v', 'quantity', '', -300, 200, { quantity: { symbol: 'v', value: 10, unit: 'm/s' } }),
    f1: node('f1', 'Énergie', 'formula', 'E=mv^2', 0, 260),
    t1: node('t1', 'Définition', 'text', 'Le mouvement est relatif.', -300, -160),
    i1: node('i1', 'Schéma', 'image', '', 300, -200),
  },
  links: [
    { id: 'l1', from: 'root', to: 'g1', type: 'appartenance' },
    { id: 'l2', from: 'root', to: 'q1', type: 'calcul' },
    { id: 'l3', from: 'root', to: 'f1', type: 'calcul' },
    { id: 'l4', from: 'root', to: 't1', type: 'appartenance' },
    { id: 'l5', from: 'root', to: 'i1', type: 'appartenance' },
  ],
  history: { stack: [], index: -1 },
  updatedAt: '2026-01-01T00:00:00.000Z',
}

export const DIAGRAM = {
  idMindMap: 1,
  mmName: 'Cinématique',
  subjectId: 1,
  mindMapJson: JSON.stringify(MINDMAP),
}

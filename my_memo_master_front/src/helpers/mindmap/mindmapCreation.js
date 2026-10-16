import { ITEM_KIND_IDS } from './mindmapItems';

// Types d'items créables : une seule liste, celle de mindmapItems.js (ITEM_KINDS). Chaque type doit
// avoir ses libellés ci-dessous (test/helpers/mindmapCreation.test.js le vérifie).
const creationTools = ITEM_KIND_IDS;

const creationLabels = {
  text: {
    node: 'Nouvel item',
    subject: 'Ajouter un item lié au sujet',
    child: 'Ajouter un item enfant',
  },
  formula: {
    node: 'Nouvelle formule',
    subject: 'Ajouter une formule liée au sujet',
    child: 'Ajouter une formule enfant',
  },
  function: {
    node: 'Nouvelle fonction',
    subject: 'Ajouter une fonction liée au sujet',
    child: 'Ajouter une fonction enfant',
  },
  graph: {
    node: 'Nouveau graphique',
    subject: 'Ajouter un graphique lié au sujet',
    child: 'Ajouter un graphique enfant',
  },
  quantity: {
    node: 'Nouvelle grandeur',
    subject: 'Ajouter une grandeur liée au sujet',
    child: 'Ajouter une grandeur enfant',
  },
  image: {
    node: 'Nouvelle image',
    subject: 'Ajouter une image liée au sujet',
    child: 'Ajouter une image enfant',
  },
};

const defaultType = 'text';

const normalizeCreationType = (tool) => (creationTools.includes(tool) ? tool : defaultType);

const getNodeLabel = (type) => creationLabels[type]?.node || creationLabels[defaultType].node;
const getSubjectActionLabel = (type) =>
  creationLabels[type]?.subject || creationLabels[defaultType].subject;
const getChildActionLabel = (type) =>
  creationLabels[type]?.child || creationLabels[defaultType].child;

export {
  creationTools,
  creationLabels,
  normalizeCreationType,
  getNodeLabel,
  getSubjectActionLabel,
  getChildActionLabel,
};

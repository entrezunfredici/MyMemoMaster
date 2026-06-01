const creationTools = ['text', 'formula', 'image'];

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

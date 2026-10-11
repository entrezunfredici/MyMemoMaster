// Couleurs du thème définies dans src/assets/base.css (variables CSS), lues à l'exécution
// pour les valeurs qui doivent être des hex en JS (attributs SVG, <input type="color">,
// JSON des cartes mentales). Les valeurs de repli ne servent que hors navigateur
// (tests, rendu sans feuille de style) : elles doivent rester identiques à base.css.

const FALLBACKS = {
  '--mindmap-node-bg': '#1E3A8A',
  '--mindmap-node-text': '#eef2ff',
  '--mindmap-secondary': '#C0C5D2',
  '--mindmap-zone': '#BFDBFE',
  '--mindmap-zone-border': '#60A5FA',
};

const themeColor = (name) => {
  try {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (value) return value;
  } catch {
    // hors navigateur : repli ci-dessous
  }
  return FALLBACKS[name];
};

// Évalués à chaque lecture (getters) : base.css peut être chargée après l'import du module.
const mindmapColors = {
  get nodeBg() { return themeColor('--mindmap-node-bg'); },
  get nodeText() { return themeColor('--mindmap-node-text'); },
  get secondary() { return themeColor('--mindmap-secondary'); },
  get zone() { return themeColor('--mindmap-zone'); },
  get zoneBorder() { return themeColor('--mindmap-zone-border'); },
};


export { themeColor, mindmapColors };

// Couleurs du thème définies dans src/assets/base.css (variables CSS), lues à l'exécution
// pour les valeurs qui doivent être des hex en JS (attributs SVG, <input type="color">,
// canvas Chart.js, JSON des cartes mentales, couleurs de tags enregistrées en base).
// Les valeurs de repli ne servent que hors navigateur (tests, rendu sans feuille de
// style) : elles doivent rester identiques à base.css (test/helpers/themeColors.test.js
// le vérifie). En CSS, utiliser directement var(--…) : ce module ne sert qu'au JS.

const FALLBACKS = {
  // Cartes mentales
  '--mindmap-node-bg': '#1E3A8A',
  '--mindmap-node-text': '#eef2ff',
  '--mindmap-secondary': '#C0C5D2',
  '--mindmap-zone': '#BFDBFE',
  '--mindmap-zone-border': '#60A5FA',
  // Thème (triplets RGB dans base.css)
  '--white': '#ffffff',
  '--black': '#000000',
  '--primary': '#1e3ba1',
  // Palette
  '--slate-400': '#94a3b8',
  '--slate-500': '#64748b',
  '--slate-800': '#1e293b',
  '--slate-900': '#0f172a',
  '--gray-100': '#f3f4f6',
  '--gray-400': '#9ca3af',
  '--gray-800': '#1f2937',
  '--gray-900': '#111827',
  '--blue-100': '#dbeafe',
  '--red-500': '#ef4444',
  '--orange-500': '#f97316',
  '--amber-500': '#f59e0b',
  '--yellow-500': '#eab308',
  '--lime-500': '#84cc16',
  '--green-500': '#22c55e',
  '--emerald-500': '#10b981',
  '--teal-500': '#14b8a6',
  '--cyan-500': '#06b6d4',
  '--blue-500': '#3b82f6',
  '--indigo-500': '#6366f1',
  '--violet-500': '#8b5cf6',
  '--fuchsia-500': '#d946ef',
  '--pink-500': '#ec4899',
}

const themeColor = (name) => {
  try {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (value) return value;
  } catch {
    // hors navigateur : repli ci-dessous
  }
  return FALLBACKS[name];
};

// Valeur « r g b » (variables de thème), « #rgb » ou « #rrggbb » -> [r, g, b].
const parseColor = (value) => {
  const text = String(value ?? '').trim();
  if (text.startsWith('#')) {
    let hex = text.slice(1);
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    if (/^[0-9a-fA-F]{6}$/.test(hex)) return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  }
  const nums = text.match(/\d+(\.\d+)?/g);
  if (nums && nums.length >= 3) return nums.slice(0, 3).map(Number);
  return [0, 0, 0];
};

// « #rrggbb » en minuscules, quelle que soit la forme de la variable (hex ou triplet RGB).
const themeHex = (name) =>
  '#' + parseColor(themeColor(name)).map((v) => v.toString(16).padStart(2, '0')).join('');

// « rgba(r, g, b, a) » pour les canvas (Chart.js).
const themeRgba = (name, alpha = 1) => `rgba(${parseColor(themeColor(name)).join(', ')}, ${alpha})`;

// Luminance relative WCAG d'une couleur [r, g, b].
const luminance = ([r, g, b]) => {
  const c = [r, g, b].map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};

// Rapport de contraste WCAG entre deux couleurs « #rrggbb ».
const contrastRatio = (a, b) => {
  const [hi, lo] = [luminance(parseColor(a)), luminance(parseColor(b))].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// Texte lisible (blanc ou noir) sur un fond libre : celui des deux qui contraste le plus.
// Le meilleur des deux atteint toujours au moins 4,58:1, quel que soit le fond (RGAA 3.2) — à condition
// que le sombre soit du noir pur : un presque-noir laisse des tons moyens (indigo…) sous 4,5:1.
const readableTextColor = (background) => {
  const white = themeHex('--white');
  const dark = themeHex('--black');
  return contrastRatio(white, background) >= contrastRatio(dark, background) ? white : dark;
};

// Évalués à chaque lecture (getters) : base.css peut être chargée après l'import du module.
const mindmapColors = {
  get nodeBg() { return themeColor('--mindmap-node-bg'); },
  get nodeText() { return themeColor('--mindmap-node-text'); },
  get secondary() { return themeColor('--mindmap-secondary'); },
  get zone() { return themeColor('--mindmap-zone'); },
  get zoneBorder() { return themeColor('--mindmap-zone-border'); },
};

// Couleurs proposées pour les tags : enregistrées en base sous forme « #RRGGBB » en majuscules
// (valeur comparée telle quelle à celle des tags existants).
const TAG_PALETTE_TOKENS = [
  '--red-500', '--orange-500', '--amber-500', '--yellow-500', '--lime-500',
  '--green-500', '--emerald-500', '--teal-500', '--cyan-500', '--blue-500',
  '--indigo-500', '--violet-500', '--fuchsia-500', '--pink-500', '--slate-500',
];
const tagColors = {
  get palette() { return TAG_PALETTE_TOKENS.map((token) => themeHex(token).toUpperCase()); },
  get default() { return themeHex('--indigo-500').toUpperCase(); },
};

export { FALLBACKS, themeColor, themeHex, themeRgba, contrastRatio, readableTextColor, mindmapColors, tagColors };

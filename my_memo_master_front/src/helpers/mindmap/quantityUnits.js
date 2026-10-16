// Algèbre d'unités pour les grandeurs des cartes mentales : une unité (« m/s », « kg·m2.s-2 »)
// est convertie en dimension SI (exposants de m, kg, s, A, K, mol, cd) + facteur vers le SI,
// ce qui permet de calculer une formule et d'en déduire l'unité du résultat.

const BASE_UNITS = ['m', 'kg', 's', 'A', 'K', 'mol', 'cd'];
// Ordre d'affichage d'une unité composée (kg·m²/s², comme dans les manuels).
const DISPLAY_ORDER = [1, 0, 2, 3, 4, 5, 6];
const ZERO = [0, 0, 0, 0, 0, 0, 0];

const dim = (m = 0, kg = 0, s = 0, A = 0, K = 0, mol = 0, cd = 0) => [m, kg, s, A, K, mol, cd];

// Unités reconnues (sans préfixe) : dimension + facteur vers le SI. `g` vaut 1e-3 kg : le préfixe
// k donne donc bien le kilogramme.
const UNITS = {
  m: { dim: dim(1), factor: 1 },
  g: { dim: dim(0, 1), factor: 1e-3 },
  s: { dim: dim(0, 0, 1), factor: 1 },
  A: { dim: dim(0, 0, 0, 1), factor: 1 },
  K: { dim: dim(0, 0, 0, 0, 1), factor: 1 },
  mol: { dim: dim(0, 0, 0, 0, 0, 1), factor: 1 },
  cd: { dim: dim(0, 0, 0, 0, 0, 0, 1), factor: 1 },
  min: { dim: dim(0, 0, 1), factor: 60 },
  h: { dim: dim(0, 0, 1), factor: 3600 },
  day: { dim: dim(0, 0, 1), factor: 86400 },
  t: { dim: dim(0, 1), factor: 1000 },
  L: { dim: dim(3), factor: 1e-3 },
  Hz: { dim: dim(0, 0, -1), factor: 1 },
  N: { dim: dim(1, 1, -2), factor: 1 },
  Pa: { dim: dim(-1, 1, -2), factor: 1 },
  bar: { dim: dim(-1, 1, -2), factor: 1e5 },
  J: { dim: dim(2, 1, -2), factor: 1 },
  W: { dim: dim(2, 1, -3), factor: 1 },
  C: { dim: dim(0, 0, 1, 1), factor: 1 },
  V: { dim: dim(2, 1, -3, -1), factor: 1 },
  'Ω': { dim: dim(2, 1, -3, -2), factor: 1 },
};

const ALIASES = { ohm: 'Ω', hr: 'h', jour: 'day', l: 'L' };

const PREFIXES = {
  G: 1e9, M: 1e6, k: 1e3, d: 1e-1, c: 1e-2, m: 1e-3, 'µ': 1e-6, u: 1e-6, n: 1e-9, p: 1e-12,
};

// Unités ayant un nom propre, par ordre de préférence (J avant N·m, Hz avant 1/s…).
const NAMED = ['J', 'N', 'W', 'Pa', 'V', 'C', 'Ω', 'Hz'];

const SUPERSCRIPTS = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
const SUPER_TO_DIGIT = Object.fromEntries(Object.entries(SUPERSCRIPTS).map(([d, s]) => [s, d]));

const sameDim = (a, b) => a.length === b.length && a.every((value, i) => value === b[i]);
const addDim = (a, b) => a.map((value, i) => value + b[i]);
const scaleDim = (a, factor) => a.map((value) => value * factor);
const isDimensionless = (a) => sameDim(a, ZERO);

// « Kg » saisi avec une majuscule, « Ohm »… : on tolère les erreurs de casse courantes.
const lookupAtom = (token) => {
  const direct = ALIASES[token] || token;
  if (UNITS[direct]) return { ...UNITS[direct] };
  for (const [prefix, scale] of Object.entries(PREFIXES)) {
    if (token.startsWith(prefix) && token.length > prefix.length) {
      const rest = ALIASES[token.slice(prefix.length)] || token.slice(prefix.length);
      if (UNITS[rest]) return { dim: UNITS[rest].dim, factor: UNITS[rest].factor * scale };
    }
  }
  return null;
};

const resolveAtom = (token) => {
  const found = lookupAtom(token);
  if (found) return found;
  // Casse : « Kg » → « kg », « KG », « M/S »… (préfixe k en majuscule, unité en minuscule)
  if (/^K[a-z]+$/.test(token)) return lookupAtom('k' + token.slice(1));
  const lower = token.toLowerCase();
  return lower !== token ? lookupAtom(lower) : null;
};

// Découpe un facteur « m2 », « s-2 », « s^-2 », « m² », « kg ».
const parseFactor = (raw) => {
  const text = raw.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, (run) => '^' + run.split('').map((ch) => SUPER_TO_DIGIT[ch]).join(''));
  const match = /^([A-Za-zµΩ]+?)(?:\^?\{?(-?\d+)\}?)?$/.exec(text);
  if (!match) return null;
  const atom = resolveAtom(match[1]);
  if (!atom) return null;
  const exponent = match[2] === undefined ? 1 : Number(match[2]);
  return { dim: scaleDim(atom.dim, exponent), factor: atom.factor ** exponent };
};

// Chaîne d'unités → { dim, factor }, ou null si une unité est inconnue. Vide → sans dimension.
const parseUnit = (text) => {
  const clean = String(text ?? '').trim();
  if (!clean) return { dim: [...ZERO], factor: 1 };
  const slash = clean.indexOf('/');
  const numerator = slash === -1 ? clean : clean.slice(0, slash);
  const denominator = slash === -1 ? '' : clean.slice(slash + 1);

  const read = (part) => {
    let acc = { dim: [...ZERO], factor: 1 };
    const factors = part.split(/[·.*\s]+/).filter(Boolean);
    for (const raw of factors) {
      const parsed = parseFactor(raw.replace(/[()]/g, ''));
      if (!parsed) return null;
      acc = { dim: addDim(acc.dim, parsed.dim), factor: acc.factor * parsed.factor };
    }
    return acc;
  };

  const top = read(numerator);
  const bottom = denominator ? read(denominator) : { dim: [...ZERO], factor: 1 };
  if (!top || !bottom) return null;
  return { dim: addDim(top.dim, scaleDim(bottom.dim, -1)), factor: top.factor / bottom.factor };
};

const superscript = (n) => String(n).split('').map((c) => SUPERSCRIPTS[c] ?? c).join('');
const withExponent = (name, n) => (n === 1 ? name : name + superscript(n));

// Dimension SI → écriture lisible : nom propre si possible (J, N, W…), sinon « kg·m²/s² ».
const formatDim = (d) => {
  if (isDimensionless(d)) return '';
  const named = NAMED.find((name) => sameDim(UNITS[name].dim, d));
  if (named) return named;
  const top = [];
  const bottom = [];
  DISPLAY_ORDER.forEach((i) => {
    const exp = d[i];
    if (exp > 0) top.push(withExponent(BASE_UNITS[i], exp));
    else if (exp < 0) bottom.push(withExponent(BASE_UNITS[i], -exp));
  });
  const numerator = top.length ? top.join('·') : '1';
  return bottom.length ? `${numerator}/${bottom.join('·')}` : numerator;
};

export { BASE_UNITS, ZERO, parseUnit, formatDim, sameDim, addDim, scaleDim, isDimensionless };

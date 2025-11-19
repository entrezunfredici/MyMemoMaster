// src/components/units.js
// Vérifie l'homogénéité dimensionnelle d'une expression texte.
// Retourne null si OK, sinon un message d'erreur lisible.

const SUPER = { '⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁻':'-' }
const unsup = s => s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/g, ch => SUPER[ch] ?? ch)

const BASE = ['L','M','T','I','Θ','N','J'] // Length, Mass, Time, Current, Temp, Amount, Luminous

// Carte des unités -> signature dimensionnelle (exposants par base)
const U = {
  // SI de base
  m:  { L: 1 },
  s:  { T: 1 },
  kg: { M: 1 },
  A:  { I: 1 },
  K:  { Θ: 1 },
  mol:{ N: 1 },
  cd: { J: 1 },

  // temps usuels
  min:{ T: 1 },
  h:  { T: 1 }, hr:{ T:1 }, day:{ T:1 },

  // dérivées usuelles
  Hz: { T:-1 },
  N:  { M:1, L:1, T:-2 },
  Pa: { M:1, L:-1, T:-2 },
  J:  { M:1, L:2, T:-2 },
  W:  { M:1, L:2, T:-3 },
  C:  { I:1, T:1 },
  V:  { M:1, L:2, T:-3, I:-1 },
  Ω:  { M:1, L:2, T:-3, I:-2 }, ohm:{ M:1, L:2, T:-3, I:-2 },

  // pression alternatives
  bar:{ M:1, L:-1, T:-2 },
  atm:{ M:1, L:-1, T:-2 },
  mmHg:{ M:1, L:-1, T:-2 },

  // énergie "horaire" (dimension = énergie)
  Wh: { M:1, L:2, T:-2 }, kWh:{ M:1, L:2, T:-2 },

  // électricité divers
  Hzs:{ T:0 }, // no-op helper si quelqu'un écrit bizarrement, ignoré

  // volume (L = m^3 en dimension)
  L:  { L:3 }, dL:{ L:3 }, cL:{ L:3 }, mL:{ L:3 },
};

// unités alias -> canons
const ALIAS = {
  tonne: 'kg', t: 'kg',
  ohm: 'Ω',
  hr: 'h',
  '°C': 'K', '°F': 'K',
};

// préfixes métriques tolérés (dimension inchangée)
const PREFIXES = ['da','Y','Z','E','P','T','G','M','k','h','d','c','m','µ','u','n','p','f','a','z','y'];

function canonUnit(raw) {
  // Supprime préfixe métrique SI si la racine est reconnue
  let u = raw;
  if (ALIAS[u]) u = ALIAS[u];

  // Liter (L) déjà traité, sinon essaie préfixes (da = 2 lettres)
  if (!U[u]) {
    const tryStrip = (p) => u.startsWith(p) && U[u.slice(p.length)];
    const match = PREFIXES.find(tryStrip);
    if (match) u = u.slice(match.length);
  }
  return U[u] ? u : raw; // si inconnu: on renvoie tel quel (sera traité comme "dimension inconnue")
}

function addSig(a, b, k=1) {
  const out = { ...a };
  for (const [dim, exp] of Object.entries(b)) {
    const v = (out[dim] || 0) + k*exp;
    if (v) out[dim] = v; else delete out[dim];
  }
  return out;
}

function powSig(sig, n) {
  const out = {};
  for (const [dim, exp] of Object.entries(sig)) out[dim] = exp * n;
  return out;
}

function sigOfUnitToken(token) {
  // token peut être "km^2", "m2", "mm³", "N", "m*s", "m/s", etc -> on gère au niveau supérieur
  // Ici: on reçoit une "unité simple" SANS * ni / ni parenthèses
  // Extraire éventuel ^exposant (acceptons ^-?\d+ ou superscripts)
  let base = token;
  let power = 1;

  // Unicode super → ^n
  base = unsup(base);

  const m = base.match(/^(.*?)(?:\^(-?\d+))?$/);
  if (m) { base = m[1]; if (m[2]) power = parseInt(m[2], 10); }

  const unit = canonUnit(base);
  // Dimension inconnue -> on encode comme {UNK:1} pour détecter incompatibilités
  const sig = U[unit] ? U[unit] : { UNK: 1 }; 
  return powSig(sig, power);
}

function sigOfUnitProduct(str) {
  // str ex: "km^2*s/m^3"
  // Remplace séparateurs équivalents
  let s = str.replace(/·|×/g, '*');

  // split par / en cascade : a/b/c = a * b^-1 * c^-1
  const parts = s.split('/').map(p => p.trim()).filter(Boolean);
  let sig = {};
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const factors = part.split('*').map(f => f.trim()).filter(Boolean);
    let local = {};
    for (const f of factors) {
      if (!f) continue;
      local = addSig(local, sigOfUnitToken(f));
    }
    sig = i === 0 ? addSig(sig, local, +1) : addSig(sig, local, -1);
  }
  return sig;
}

// --------- PARSEUR D’EXPRESSION (nombres + unités) ---------
// Grammar (simplifiée) :
// Expr := Term (('+'|'-') Term)*
// Term := Factor (('*'|'·'|'/') Factor)*
// Factor := '(' Expr ')' | Number UnitProduct? | UnitProduct
// Number := \d+(\.\d+)?
// UnitProduct := suite de lettres/symboles pour unités éventuellement combinées par * / et puissances

function prelex(source) {
    return String(source ?? '').replace(/\s+/g, '').replace(/(\d(?:\.\d+)?)(?=(?:[a-zA-ZµΩ°]))/g, '$1*');
}

function tokenizer(source) {
    const s = prelex(source);
    const tokens = [];
    let i = 0;
    const push = (type, value=null) => tokens.push({type, value});

    while (i < s.length) {
        const ch = s[i];

        if ('+-*/()=·×'.includes(ch)) { push(ch); i++; continue; }

        // nombre
        const mNum = s.slice(i).match(/^\d+(?:\.\d+)?/);
        if (mNum) { push('NUMBER', mNum[0]); i += mNum[0].length; continue; }

        // unité/composite (lettres + symboles ^ µ Ω ° etc.)
        const mUnit = s.slice(i).match(/^[a-zA-ZµΩ°][a-zA-Z0-9µΩ°^⁰¹²³⁴⁵⁶⁷⁸⁹-]*/);
        if (mUnit) { push('UNIT', mUnit[0]); i += mUnit[0].length; continue; }

        // séparateur de ligne
        if (ch === '\n') { push('NL'); i++; continue; }

        // caractère inconnu -> on l'ignore
        i++;
    }
    return tokens;
}

function parseUnitProductFromTokens(tokens, idx) {
  // Consomme UNIT (('*'|'/') UNIT )*
  let i = idx;
  if (i >= tokens.length || tokens[i].type !== 'UNIT') return [null, idx];
  let buf = tokens[i].value; i++;

  while (i < tokens.length && (tokens[i].type === '*' || tokens[i].type === '·' || tokens[i].type === '/' || tokens[i].type === 'UNIT')) {
    if (tokens[i].type === 'UNIT') { buf += '*' + tokens[i].value; i++; continue; }
    buf += tokens[i].type; i++;
    if (i < tokens.length && tokens[i].type === 'UNIT') { buf += tokens[i].value; i++; }
  }
  return [sigOfUnitProduct(buf), i];
}

function parseFactor(tokens, idx) {
  let i = idx;
  if (tokens[i]?.type === '(') {
    let res = parseExpr(tokens, i+1);
    i = res.i;
    if (tokens[i]?.type === ')') i++;
    return { sig: res.sig, i };
  }

  // nombre [+ unité optionnelle]
  if (tokens[i]?.type === 'NUMBER') {
    i++;
    const [sig, j] = parseUnitProductFromTokens(tokens, i);
    return { sig: sig || {}, i: sig ? j : i };
  }

  // produit d’unités sans nombre explicite (ex: m/s)
  const [sig, j] = parseUnitProductFromTokens(tokens, i);
  if (sig) return { sig, i: j };

  // rien reconnu -> signature vide
  return { sig: {}, i };
}

function parseTerm(tokens, idx) {
  let { sig, i } = parseFactor(tokens, idx);
  while (i < tokens.length && (tokens[i].type === '*' || tokens[i].type === '·' || tokens[i].type === '/')) {
    const op = tokens[i].type; i++;
    const right = parseFactor(tokens, i); i = right.i;
    sig = addSig(sig, right.sig, op === '/' ? -1 : +1);
  }
  return { sig, i };
}

function parseExpr(tokens, idx) {
  let { sig, i } = parseTerm(tokens, idx);
  while (i < tokens.length && (tokens[i].type === '+' || tokens[i].type === '-')) {
    // const op = tokens[i].type; i++;
    const right = parseTerm(tokens, i); i = right.i;

    // Addition/soustraction uniquement si signatures identiques
    if (!equalSig(sig, right.sig)) {
      throw { type: 'addition', left: sig, right: right.sig };
    }
  }
  return { sig, i };
}

function equalSig(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) if ((a[k]||0) !== (b[k]||0)) return false;
  return true;
}

function sigToStr(sig) {
  const order = [...BASE, 'UNK'];
  const parts = [];
  for (const k of order) {
    const e = sig[k];
    if (!e) continue;
    parts.push(e === 1 ? k : `${k}^${e}`);
  }
  return parts.length ? parts.join('·') : '—'; // — = sans unité
}

// Transforme les formes fonctionnelles en infix pour l'analyse d'unités
function normalizeFunctionalForms(txt) {
    return String(txt ?? '').replace(/\b(?:frac|over)\(\s*([^,()]+?)\s*,\s*([^()]+?)\s*\)/gi, '($1)/($2)');
}

// Supprime tout ce qui n’est pas utile aux unités (fonctions, <text>, etc.)
export function sanitizeForUnits(text) {
    const t = normalizeFunctionalForms(text);
    return String(t ?? '')
        .replace(/<text[^>]*>[\s\S]*?<\/text>/gi, ' ')
        .replace(/\b(?:sqrt|nsqrt|ln|vec|widevec|matrix|mattrix|hat|overline)\s*\((?:[^()]|\([^()]*\))*\)/gi, ' ')
        .replace(/[{}]/g, ' ')
        .replace(/\\[a-zA-Z]+/g, ' ');  // éventuelles commandes latex accidentelles
}

export function checkUnitHomogeneity(expression) {
  const src = sanitizeForUnits(expression).replace(/\r/g, '');
  const lines = src.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    // Plusieurs segments séparés par '=' doivent avoir même signature
    const segments = line.split('=').map(s => s.trim()).filter(Boolean);
    let ref = null;

    try {
      for (const seg of segments) {
        const toks = tokenizer(seg);
        const { sig } = parseExpr(toks, 0);
        ref = ref || sig;
        if (!equalSig(ref, sig)) {
          return `Erreur d’homogénéité : "${line}"  (${sigToStr(ref)} ≠ ${sigToStr(sig)})`;
        }
      }
    } catch (e) {
      if (e?.type === 'addition') {
        return `Addition non homogène dans "${line}"  (${sigToStr(e.left)} ≠ ${sigToStr(e.right)})`;
      }
      return `Expression invalide pour le contrôle d’unités : "${line}".`;
    }
  }

  return null; // OK
}

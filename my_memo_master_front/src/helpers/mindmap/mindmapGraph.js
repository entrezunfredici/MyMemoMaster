// Nœud « graphique » de carte mentale : une formule y = f(x) (LaTeX, comme les autres formules)
// tracée dans un repère. Les lettres autres que x (et e, π) sont des paramètres réglables par
// curseur. Aucune dépendance : analyse et tracé sont faits ici, le graphique est recalculé à
// l'affichage (seuls la formule, la fenêtre de vue et les valeurs des paramètres sont stockés).

import { toLatex } from '@/components/interpreter/interpreter.js';
import { normalizeLatexShorthand } from './latexShorthand';

class GraphError extends Error {}

const DEFAULT_VIEW = { xMin: -10, xMax: 10, yMin: -6, yMax: 6 };
const MIN_SPAN = 1e-6;
const MAX_SPAN = 1e6;
const PARAM_MIN = -10;
const PARAM_MAX = 10;
const MAX_PARAMS = 6;

const GREEK_NAMES = ['alpha', 'beta', 'gamma', 'delta', 'lambda', 'mu', 'omega', 'phi', 'rho', 'sigma', 'tau', 'theta'];
const GREEK = { α: 'alpha', β: 'beta', γ: 'gamma', δ: 'delta', λ: 'lambda', μ: 'mu', ω: 'omega', φ: 'phi', ρ: 'rho', σ: 'sigma', τ: 'tau', θ: 'theta' };

const FUNCTIONS = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  arcsin: Math.asin, arccos: Math.acos, arctan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  ln: Math.log, log: Math.log10, lg: Math.log10, exp: Math.exp, abs: Math.abs,
};
// Les noms les plus longs d'abord : « arcsin » avant « sin ».
const FUNCTION_NAMES = Object.keys(FUNCTIONS).sort((a, b) => b.length - a.length);

const finiteOr = (value, fallback) => (Number.isFinite(Number(value)) && value !== null && value !== '' ? Number(value) : fallback);

// ── Lexer ─────────────────────────────────────────────────────────────────────

const tokenize = (source) => {
  const tokens = [];
  let i = 0;
  const readSubscript = () => {
    // indice : {…} ou un seul caractère
    if (source[i] !== '_') return '';
    i++;
    if (source[i] === '{') {
      const end = source.indexOf('}', i);
      const text = source.slice(i + 1, end === -1 ? source.length : end);
      i = end === -1 ? source.length : end + 1;
      return text.replace(/[\\\s]/g, '');
    }
    return source[i++] ?? '';
  };

  while (i < source.length) {
    const ch = source[i];
    if (/\s/.test(ch)) { i++; continue; }
    const start = i;
    if (/\d|\./.test(ch)) {
      const m = /^\d*\.?\d+|^\d+\.?/.exec(source.slice(i));
      if (!m) throw new GraphError(`Nombre invalide près de « ${ch} »`);
      tokens.push({ t: 'num', v: Number(m[0]), start, end: i + m[0].length });
      i += m[0].length;
      continue;
    }
    if (ch === '\\') {
      const m = /^\\([A-Za-z]+|.)/.exec(source.slice(i));
      const cmd = m[1];
      i += m[0].length;
      if (cmd === 'left' || cmd === 'right' || /^[,;: !]$/.test(cmd)) continue;
      if (cmd === 'cdot' || cmd === 'times') { tokens.push({ t: 'op', v: '*', start, end: i }); continue; }
      if (cmd === 'div') { tokens.push({ t: 'op', v: '/', start, end: i }); continue; }
      if (cmd === 'frac' || cmd === 'sqrt') { tokens.push({ t: 'special', v: cmd, start, end: i }); continue; }
      if (cmd === 'pi') { tokens.push({ t: 'num', v: Math.PI, start, end: i }); continue; }
      if (cmd === 'lvert' || cmd === 'rvert' || cmd === '|') { tokens.push({ t: 'op', v: '|', start, end: i }); continue; }
      if (FUNCTIONS[cmd]) { tokens.push({ t: 'fn', v: cmd, start, end: i }); continue; }
      if (GREEK_NAMES.includes(cmd)) {
        tokens.push({ t: 'id', v: cmd + readSubscript(), start, end: i });
        continue;
      }
      throw new GraphError(`Commande non prise en charge : « \\${cmd} »`);
    }
    if (/[A-Za-z]/.test(ch) || GREEK[ch]) {
      if (GREEK[ch]) {
        i++;
        tokens.push({ t: 'id', v: GREEK[ch] + readSubscript(), start, end: i });
        continue;
      }
      const run = /^[A-Za-z]+/.exec(source.slice(i))[0];
      let pos = 0;
      while (pos < run.length) {
        const fn = FUNCTION_NAMES.find((name) => run.startsWith(name, pos));
        if (fn) {
          tokens.push({ t: 'fn', v: fn, start: start + pos, end: start + pos + fn.length });
          pos += fn.length;
          continue;
        }
        const isLast = pos === run.length - 1;
        i = start + pos + 1;
        const sub = isLast ? readSubscript() : '';
        tokens.push({ t: 'id', v: run[pos] + sub, start: start + pos, end: i });
        pos++;
      }
      i = Math.max(i, start + run.length);
      continue;
    }
    if (ch === '×' || ch === '·') { tokens.push({ t: 'op', v: '*', start, end: ++i }); continue; }
    if (ch === '÷') { tokens.push({ t: 'op', v: '/', start, end: ++i }); continue; }
    if (ch === '−') { tokens.push({ t: 'op', v: '-', start, end: ++i }); continue; }
    if ('+-*/^()={}[]|'.includes(ch)) { tokens.push({ t: 'op', v: ch, start, end: ++i }); continue; }
    throw new GraphError(`Caractère non pris en charge : « ${ch} »`);
  }
  return tokens;
};

// ── Analyse (descente récursive) : produit une fonction ({ x, p }) => nombre ───────────────

const compile = (tokens) => {
  let pos = 0;
  let absDepth = 0;
  const peek = () => tokens[pos];
  const isOp = (v) => tokens[pos]?.t === 'op' && tokens[pos].v === v;
  const expectOp = (v) => {
    if (!isOp(v)) throw new GraphError('Formule incomplète ou parenthèses non fermées');
    pos++;
  };
  const startsFactor = (tok) =>
    !!tok &&
    (tok.t === 'num' || tok.t === 'id' || tok.t === 'fn' || tok.t === 'special' ||
      (tok.t === 'op' && (tok.v === '(' || tok.v === '{' || (tok.v === '|' && absDepth === 0))));

  const group = () => {
    const open = tokens[pos].v;
    pos++;
    const inner = expression();
    expectOp(open === '{' ? '}' : ')');
    return inner;
  };

  const atom = () => {
    const tok = peek();
    if (!tok) throw new GraphError('Formule incomplète');
    if (tok.t === 'num') { pos++; const v = tok.v; return () => v; }
    if (tok.t === 'id') {
      pos++;
      const name = tok.v;
      if (name === 'x') return (ctx) => ctx.x;
      if (name === 'e') return () => Math.E;
      return (ctx) => ctx.p[name] ?? 1;
    }
    if (tok.t === 'fn') {
      pos++;
      const f = FUNCTIONS[tok.v];
      // \sin^2 x : exposant placé entre la fonction et son argument
      let exponent = null;
      if (isOp('^')) {
        pos++;
        exponent = isOp('{') || isOp('(') ? group() : atom();
      }
      const arg = isOp('(') || isOp('{') ? group() : power();
      return exponent ? (ctx) => f(arg(ctx)) ** exponent(ctx) : (ctx) => f(arg(ctx));
    }
    if (tok.t === 'special') {
      pos++;
      if (tok.v === 'frac') {
        if (!isOp('{')) throw new GraphError('\\frac attend deux groupes {…}{…}');
        const num = group();
        if (!isOp('{')) throw new GraphError('\\frac attend deux groupes {…}{…}');
        const den = group();
        return (ctx) => num(ctx) / den(ctx);
      }
      let root = () => 2;
      if (isOp('[')) {
        pos++;
        root = expression();
        expectOp(']');
      }
      if (!isOp('{')) throw new GraphError('\\sqrt attend un groupe {…}');
      const inner = group();
      return (ctx) => {
        const n = root(ctx);
        const v = inner(ctx);
        if (v < 0) return n % 2 === 1 ? -((-v) ** (1 / n)) : NaN;
        return v ** (1 / n);
      };
    }
    if (isOp('|')) {
      pos++;
      absDepth++;
      const inner = expression();
      absDepth--;
      expectOp('|');
      return (ctx) => Math.abs(inner(ctx));
    }
    if (isOp('(') || isOp('{')) return group();
    throw new GraphError(`Symbole inattendu : « ${tok.v} »`);
  };

  const power = () => {
    const base = atom();
    if (!isOp('^')) return base;
    pos++;
    const sign = isOp('-') ? (pos++, -1) : 1;
    const exponent = isOp('{') || isOp('(') ? group() : atom();
    return (ctx) => base(ctx) ** (sign * exponent(ctx));
  };

  const unary = () => {
    if (isOp('-')) { pos++; const f = unary(); return (ctx) => -f(ctx); }
    if (isOp('+')) { pos++; return unary(); }
    return power();
  };

  const term = () => {
    let left = unary();
    for (;;) {
      if (isOp('*')) { pos++; const l = left; const r = unary(); left = (ctx) => l(ctx) * r(ctx); }
      else if (isOp('/')) { pos++; const l = left; const r = unary(); left = (ctx) => l(ctx) / r(ctx); }
      else if (startsFactor(peek())) { const l = left; const r = unary(); left = (ctx) => l(ctx) * r(ctx); }
      else return left;
    }
  };

  function expression() {
    let left = term();
    while (isOp('+') || isOp('-')) {
      const sign = tokens[pos++].v === '+' ? 1 : -1;
      const l = left;
      const r = term();
      left = (ctx) => l(ctx) + sign * r(ctx);
    }
    return left;
  }

  const fn = expression();
  if (pos < tokens.length) throw new GraphError(`Symbole inattendu : « ${tokens[pos].v} »`);
  return fn;
};

// ── Formule d'un nœud graphique ─────────────────────────────────────────────────────

const stripDecorations = (text) => text.replace(/\\(left|right)/g, '').replace(/\s+/g, '');

// Sépare « y = … » / « f(x) = … » du corps. Sans « = », toute la formule est le corps.
const splitEquation = (latex) => {
  let depth = 0;
  for (let i = 0; i < latex.length; i++) {
    const ch = latex[i];
    if (ch === '{' || ch === '(') depth++;
    else if (ch === '}' || ch === ')') depth--;
    else if (ch === '=' && depth === 0) return { lhs: latex.slice(0, i), body: latex.slice(i + 1), bodyOffset: i + 1 };
  }
  return { lhs: '', body: latex, bodyOffset: 0 };
};

// Analyse une formule. Résultat : { ok, fn(x, params), params: [noms], lhs, body, tokens, error }.
const parseGraphFormula = (content) => {
  const source = String(content ?? '').trim();
  if (!source) return { ok: false, empty: true, params: [], error: 'Aucune formule' };
  try {
    const latex = normalizeLatexShorthand(toLatex(source));
    const { lhs, body, bodyOffset } = splitEquation(latex);
    const lhsClean = stripDecorations(lhs);
    if (lhsClean && !/^(y|[A-Za-z]\(x\))$/.test(lhsClean)) {
      throw new GraphError('Seule la forme y = f(x) peut être tracée');
    }
    const tokens = tokenize(body);
    if (!tokens.length) throw new GraphError('Formule vide après « = »');
    const evaluate = compile(tokens);
    const params = [];
    tokens.forEach((tok) => {
      if (tok.t === 'id' && tok.v !== 'x' && tok.v !== 'e' && !params.includes(tok.v)) params.push(tok.v);
    });
    if (params.length > MAX_PARAMS) throw new GraphError(`Trop de paramètres (${MAX_PARAMS} au maximum)`);
    return {
      ok: true,
      params,
      lhs: lhs.trim(),
      body,
      bodyOffset,
      tokens,
      fn: (x, p = {}) => evaluate({ x, p }),
    };
  } catch (error) {
    if (error instanceof GraphError) return { ok: false, params: [], error: error.message };
    throw error;
  }
};

// Formule avec les valeurs des paramètres : « y = a x² + b » avec a = 2, b = −1 → « y = 2 x² + (−1) ».
const substituteParams = (parsed, values = {}) => {
  if (!parsed?.ok) return '';
  let out = '';
  let cursor = 0;
  parsed.tokens.forEach((tok) => {
    if (tok.t !== 'id' || !parsed.params.includes(tok.v)) return;
    const value = finiteOr(values[tok.v], 1);
    out += parsed.body.slice(cursor, tok.start);
    out += value < 0 ? `\\left(${value}\\right)` : String(value);
    cursor = tok.end;
  });
  out += parsed.body.slice(cursor);
  const prefix = parsed.lhs ? `${parsed.lhs}=` : 'y=';
  return `${prefix}${out.trim()}`;
};

// ── État du graphique (stocké dans node.graph) ────────────────────────────────────────

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeView = (view = {}) => {
  let xMin = finiteOr(view.xMin, DEFAULT_VIEW.xMin);
  let xMax = finiteOr(view.xMax, DEFAULT_VIEW.xMax);
  let yMin = finiteOr(view.yMin, DEFAULT_VIEW.yMin);
  let yMax = finiteOr(view.yMax, DEFAULT_VIEW.yMax);
  if (xMax - xMin < MIN_SPAN || xMax - xMin > MAX_SPAN) { xMin = DEFAULT_VIEW.xMin; xMax = DEFAULT_VIEW.xMax; }
  if (yMax - yMin < MIN_SPAN || yMax - yMin > MAX_SPAN) { yMin = DEFAULT_VIEW.yMin; yMax = DEFAULT_VIEW.yMax; }
  return { xMin, xMax, yMin, yMax };
};

const createGraph = (graph = {}) => {
  const params = {};
  Object.entries(graph?.params && typeof graph.params === 'object' ? graph.params : {}).forEach(([name, value]) => {
    params[name] = finiteOr(value, 1);
  });
  return {
    ...normalizeView(graph || {}),
    params,
    // Vue affichée dans le nœud : le tracé ou la formule (avec les valeurs des paramètres).
    mode: graph?.mode === 'formula' ? 'formula' : 'plot',
  };
};

// Zoom centré sur (cx, cy) : factor < 1 rapproche, > 1 éloigne.
const zoomView = (view, factor, cx = (view.xMin + view.xMax) / 2, cy = (view.yMin + view.yMax) / 2) =>
  normalizeView({
    xMin: cx + (view.xMin - cx) * factor,
    xMax: cx + (view.xMax - cx) * factor,
    yMin: cy + (view.yMin - cy) * factor,
    yMax: cy + (view.yMax - cy) * factor,
  });

// Déplacement de la vue (en unités du repère).
const panView = (view, dx, dy) =>
  normalizeView({ xMin: view.xMin + dx, xMax: view.xMax + dx, yMin: view.yMin + dy, yMax: view.yMax + dy });

// Graduations « rondes » (1, 2, 5 × 10ⁿ) entre min et max.
const niceTicks = (min, max, target = 6) => {
  const span = max - min;
  if (!(span > 0)) return [];
  const rough = span / target;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? magnitude * 10;
  const ticks = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) {
    ticks.push(Number(v.toPrecision(12)));
  }
  return ticks;
};

// Tracé en coordonnées écran (0..width, 0..height). Le chemin est interrompu aux valeurs non
// définies et aux asymptotes (saut vertical supérieur à deux fois la hauteur de la fenêtre).
const buildPlotPath = (fn, view, params, width, height) => {
  if (typeof fn !== 'function' || !(width > 0) || !(height > 0)) return '';
  const { xMin, xMax, yMin, yMax } = view;
  const ySpan = yMax - yMin;
  const sx = width / (xMax - xMin);
  const sy = height / ySpan;
  const samples = Math.max(2, Math.ceil(width * 1.5));
  let d = '';
  let previous = null; // ordonnée précédente dans le repère, null si le tracé est interrompu
  for (let i = 0; i <= samples; i++) {
    const x = xMin + ((xMax - xMin) * i) / samples;
    let y;
    try { y = fn(x, params); } catch { y = NaN; }
    if (!Number.isFinite(y) || Math.abs(y - (yMin + yMax) / 2) > ySpan * 50) { previous = null; continue; }
    const px = ((x - xMin) * sx).toFixed(2);
    const py = (height - (y - yMin) * sy).toFixed(2);
    const jump = previous !== null && Math.abs(y - previous) > ySpan * 2;
    d += previous === null || jump ? `M${px} ${py}` : `L${px} ${py}`;
    previous = y;
  }
  return d;
};

const paramRange = () => ({ min: PARAM_MIN, max: PARAM_MAX, step: 0.1 });

export {
  GraphError,
  DEFAULT_VIEW,
  parseGraphFormula,
  substituteParams,
  createGraph,
  normalizeView,
  zoomView,
  panView,
  niceTicks,
  buildPlotPath,
  paramRange,
  clamp,
};

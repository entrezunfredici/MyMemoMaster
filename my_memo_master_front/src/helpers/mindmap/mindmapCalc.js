// Calcul des formules de carte mentale : une formule reliée (par une branche, dans un sens ou
// dans l'autre) à des grandeurs est évaluée avec leurs valeurs ; le résultat porte l'unité
// déduite de la formule (ex. kg × (m/s)² → J). Le résultat est calculé à la volée, jamais stocké.

import { toLatex } from '@/components/interpreter/interpreter.js';
import { normalizeLatexShorthand } from './latexShorthand';
import { createQuantity, getNodeKinds, hasKind } from './mindmapItems';
import { parseUnit, formatDim, addDim, scaleDim, sameDim, isDimensionless, ZERO } from './quantityUnits';

class CalcError extends Error {}

const GREEK = {
  α: 'alpha', β: 'beta', γ: 'gamma', δ: 'delta', ε: 'epsilon', θ: 'theta', λ: 'lambda',
  μ: 'mu', ρ: 'rho', σ: 'sigma', τ: 'tau', φ: 'phi', ω: 'omega', Δ: 'Delta', Ω: 'Omega',
};

// Décorations d'un symbole : \vec{v}, \overrightarrow{OP}, \hat{u}… désignent la même grandeur que « v », « OP », « u ».
const DECORATIONS = ['vec', 'overrightarrow', 'widevec', 'hat', 'bar', 'overline', 'mathbf', 'boldsymbol', 'mathrm', 'dot', 'ddot', 'tilde'];
const DECORATION_RE = new RegExp(`\\\\(?:${DECORATIONS.join('|')})(?![A-Za-z])`, 'g');

// Forme comparable d'un symbole : « E_{c} », « E_c » et « Ec » sont identiques, « ρ » = « \rho », « \vec{v} » = « v ».
const normalizeSymbol = (symbol) =>
  String(symbol ?? '')
    .replace(DECORATION_RE, '')
    .replace(/[αβγδελμρστφωΔΩ]/g, (ch) => GREEK[ch])
    .replace(/[\\_{}\s]/g, '');

// Un titre qui ressemble à un symbole (« m », « v_0 », « \rho ») sert de symbole à une grandeur qui n'en a pas.
const SYMBOL_LIKE = /^\\?[A-Za-zΑ-Ωα-ω]{1,6}(_\{?[A-Za-z0-9]{1,4}\}?)?$/;

const isFormulaNode = (node) => getNodeKinds(node).some((kind) => kind === 'formula' || kind === 'function');

// ── Lexer ───────────────────────────────────────────────────────────────────────

const tokenize = (source, knownSymbols) => {
  const tokens = [];
  let i = 0;
  const readGroup = () => {
    // lit un indice : {…} ou un seul caractère alphanumérique
    if (source[i] === '{') {
      const end = source.indexOf('}', i);
      const text = source.slice(i + 1, end === -1 ? source.length : end);
      i = end === -1 ? source.length : end + 1;
      return text;
    }
    return source[i++] ?? '';
  };

  while (i < source.length) {
    const ch = source[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/\d|\./.test(ch)) {
      const m = /^\d*\.?\d+|^\d+\.?/.exec(source.slice(i));
      tokens.push({ t: 'num', v: Number(m[0]) });
      i += m[0].length;
      continue;
    }
    if (ch === '\\') {
      const m = /^\\([A-Za-z]+|.)/.exec(source.slice(i));
      const cmd = m[1];
      i += m[0].length;
      if (cmd === 'left' || cmd === 'right' || /^[,;: !]$/.test(cmd)) continue;
      if (cmd === 'cdot' || cmd === 'times') { tokens.push({ t: 'op', v: '*' }); continue; }
      if (cmd === 'div') { tokens.push({ t: 'op', v: '/' }); continue; }
      if (cmd === 'frac' || cmd === 'sqrt') { tokens.push({ t: 'fn', v: cmd }); continue; }
      if (cmd === 'pi') { tokens.push({ t: 'num', v: Math.PI }); continue; }
      // Annotation de texte (« \text{ en N} ») : ignorée avec son groupe, ce ne sont pas des variables.
      if (cmd === 'text') {
        if (source[i] === '{') readGroup();
        continue;
      }
      // Décoration (\vec{v}, \overrightarrow{OP}) : le groupe entier est UN symbole, pas une suite de lettres.
      if (DECORATIONS.includes(cmd)) {
        if (source[i] === '{') {
          let name = readGroup();
          if (source[i] === '_') { i++; name += '_' + readGroup(); }
          tokens.push({ t: 'id', v: normalizeSymbol(name) });
        }
        continue;
      }
      let name = cmd;
      if (source[i] === '_') { i++; name += '_' + readGroup(); }
      tokens.push({ t: 'id', v: normalizeSymbol(name) });
      continue;
    }
    if (/[A-Za-zαβγδελμρστφωΔΩ]/.test(ch)) {
      const m = /^[A-Za-zαβγδελμρστφωΔΩ]+/.exec(source.slice(i));
      const run = m[0];
      i += run.length;
      let sub = '';
      if (source[i] === '_') { i++; sub = '_' + readGroup(); }
      let pos = 0;
      while (pos < run.length) {
        let matched = null;
        for (let len = run.length - pos; len >= 1; len--) {
          const piece = run.slice(pos, pos + len);
          const name = pos + len === run.length ? piece + sub : piece;
          if (knownSymbols.has(normalizeSymbol(name))) { matched = { name, len }; break; }
        }
        if (!matched) {
          const piece = run[pos];
          matched = { name: pos + 1 === run.length ? piece + sub : piece, len: 1 };
        }
        tokens.push({ t: 'id', v: normalizeSymbol(matched.name) });
        pos += matched.len;
      }
      continue;
    }
    // Unité entre crochets (« m [kg] ») : annotation ignorée. Un crochet qui ne contient pas une unité
    // (« [a+b] ») reste un regroupement.
    if (ch === '[') {
      const end = source.indexOf(']', i);
      const inner = end === -1 ? '' : source.slice(i + 1, end).trim();
      if (inner && parseUnit(inner)) { i = end + 1; continue; }
    }
    if ('+-*/^()={}[]'.includes(ch)) { tokens.push({ t: 'op', v: ch }); i++; continue; }
    if (ch === '×' || ch === '·') { tokens.push({ t: 'op', v: '*' }); i++; continue; }
    if (ch === '÷') { tokens.push({ t: 'op', v: '/' }); i++; continue; }
    throw new CalcError(`Caractère non pris en charge : « ${ch} »`);
  }
  return tokens;
};

// ── Évaluation (descente récursive, valeur + dimension calculées d'un seul passage) ──────────

const evaluate = (tokens, resolve) => {
  let pos = 0;
  const peek = () => tokens[pos];
  const isOp = (v) => tokens[pos]?.t === 'op' && tokens[pos].v === v;
  const expectOp = (v) => {
    if (!isOp(v)) throw new CalcError('Formule incomplète ou parenthèses non fermées');
    pos++;
  };

  const startsFactor = (tok) =>
    tok && (tok.t === 'num' || tok.t === 'id' || tok.t === 'fn' || (tok.t === 'op' && (tok.v === '(' || tok.v === '{')));

  const group = () => {
    // { expr } ou ( expr )
    const open = tokens[pos].v;
    pos++;
    const inner = expression();
    expectOp(open === '{' ? '}' : ')');
    return inner;
  };

  const atom = () => {
    const tok = peek();
    if (!tok) throw new CalcError('Formule incomplète');
    if (tok.t === 'num') { pos++; return { v: tok.v, d: [...ZERO] }; }
    if (tok.t === 'id') { pos++; return resolve(tok.v); }
    if (tok.t === 'fn') {
      pos++;
      if (tok.v === 'frac') {
        if (!isOp('{')) throw new CalcError('\\frac attend deux groupes {…}{…}');
        const num = group();
        if (!isOp('{')) throw new CalcError('\\frac attend deux groupes {…}{…}');
        const den = group();
        if (den.v === 0) throw new CalcError('Division par zéro');
        return { v: num.v / den.v, d: addDim(num.d, scaleDim(den.d, -1)) };
      }
      // sqrt, avec racine optionnelle [n]
      let root = 2;
      if (isOp('[')) {
        pos++;
        const n = expression();
        expectOp(']');
        root = n.v;
      }
      if (!isOp('{')) throw new CalcError('\\sqrt attend un groupe {…}');
      const inner = group();
      if (inner.v < 0 && root % 2 === 0) throw new CalcError('Racine d’un nombre négatif');
      return { v: inner.v < 0 ? -((-inner.v) ** (1 / root)) : inner.v ** (1 / root), d: scaleDim(inner.d, 1 / root) };
    }
    if (isOp('(') || isOp('{')) return group();
    throw new CalcError(`Symbole inattendu : « ${tok.v} »`);
  };

  const power = () => {
    const base = atom();
    if (!isOp('^')) return base;
    pos++;
    const sign = isOp('-') ? (pos++, -1) : 1;
    const exponent = isOp('{') || isOp('(') ? group() : atom();
    if (!isDimensionless(exponent.d)) throw new CalcError('Un exposant ne peut pas avoir d’unité');
    const n = sign * exponent.v;
    return { v: base.v ** n, d: scaleDim(base.d, n) };
  };

  const unary = () => {
    if (isOp('-')) { pos++; const x = unary(); return { v: -x.v, d: x.d }; }
    if (isOp('+')) { pos++; return unary(); }
    return power();
  };

  const term = () => {
    let left = unary();
    for (;;) {
      if (isOp('*')) { pos++; const r = unary(); left = { v: left.v * r.v, d: addDim(left.d, r.d) }; }
      else if (isOp('/')) {
        pos++;
        const r = unary();
        if (r.v === 0) throw new CalcError('Division par zéro');
        left = { v: left.v / r.v, d: addDim(left.d, scaleDim(r.d, -1)) };
      } else if (startsFactor(peek())) {
        const r = unary(); // multiplication implicite : MV² = M × V²
        left = { v: left.v * r.v, d: addDim(left.d, r.d) };
      } else return left;
    }
  };

  function expression() {
    let left = term();
    while (isOp('+') || isOp('-')) {
      const sign = tokens[pos++].v === '+' ? 1 : -1;
      const r = term();
      if (!sameDim(left.d, r.d)) throw new CalcError('Addition de grandeurs d’unités différentes');
      left = { v: left.v + sign * r.v, d: left.d };
    }
    return left;
  }

  const result = expression();
  if (pos < tokens.length) throw new CalcError(`Symbole inattendu : « ${tokens[pos].v} »`);
  return result;
};

// ── Formule d'un item ──────────────────────────────────────────────────────────────

// Sépare « E = ½ M V² » en { symbol: 'E', body: '½ M V²' } au premier « = » hors groupe.
const splitEquation = (latex) => {
  let depth = 0;
  for (let i = 0; i < latex.length; i++) {
    const ch = latex[i];
    if (ch === '{' || ch === '(') depth++;
    else if (ch === '}' || ch === ')') depth--;
    else if (ch === '=' && depth === 0) {
      return {
        symbol: latex.slice(0, i).replace(/\\(left|right)/g, '').replace(/[{}\\]/g, '').trim(),
        body: latex.slice(i + 1),
      };
    }
  }
  return { symbol: '', body: latex };
};

const round = (value) => (Number.isFinite(value) ? Number(value.toPrecision(6)) : value);

// Items reliés (par une branche, quel que soit le sens) à `id`.
const neighborIds = (map, id) => {
  const ids = new Set();
  for (const link of map.links || []) {
    if (link.from === id && link.to !== id) ids.add(link.to);
    else if (link.to === id && link.from !== id) ids.add(link.from);
  }
  return [...ids].filter((nid) => map.nodes[nid]);
};

const isQuantitySource = (node) => hasKind(node, 'quantity') || isFormulaNode(node);

// Symboles accessibles à une formule : ceux des grandeurs (et formules) qui lui sont reliées.
const collectSources = (map, id) => {
  const sources = new Map();
  for (const nid of neighborIds(map, id)) {
    const neighbor = map.nodes[nid];
    if (!isQuantitySource(neighbor)) continue;
    let key = normalizeSymbol(neighbor.quantity?.symbol);
    if (!key && !isFormulaNode(neighbor) && SYMBOL_LIKE.test(String(neighbor.label ?? '').trim())) key = normalizeSymbol(neighbor.label);
    if (!key && isFormulaNode(neighbor)) key = normalizeSymbol(splitEquation(toLatex(neighbor.content || '')).symbol);
    if (key && !sources.has(key)) sources.set(key, neighbor);
  }
  return sources;
};

// Symbole du résultat d'une formule (« V » dans « V = D / T »), insensible à la casse : sert à relier
// une formule à la grandeur qui reçoit son résultat (« v »).
const resultKey = (formulaNode) => {
  try {
    return normalizeSymbol(splitEquation(normalizeLatexShorthand(toLatex(formulaNode.content || ''))).symbol).toLowerCase();
  } catch {
    return '';
  }
};

// Formule reliée à la grandeur `quantityNode` dont le symbole de résultat est celui de la grandeur
// (à la casse près) : la grandeur prend alors la valeur calculée. Une grandeur qui porte elle-même
// une formule calcule sa propre valeur et n'a pas de producteur.
const findProducer = (map, quantityNode, excludeId = null) => {
  if (!hasKind(quantityNode, 'quantity') || isFormulaNode(quantityNode)) return null;
  const key = normalizeSymbol(quantityNode.quantity?.symbol).toLowerCase();
  if (!key) return null;
  return (
    neighborIds(map, quantityNode.id)
      .map((nid) => map.nodes[nid])
      .find((node) => node.id !== excludeId && isFormulaNode(node) && node.content && resultKey(node) === key) || null
  );
};

// Calcule la formule `id`. Retourne { ok, symbol, value, unit } ou { ok: false, error }.
const computeFormula = (map, id, visiting = new Set(), cache = new Map()) => {
  if (cache.has(id)) return cache.get(id);
  const node = map.nodes[id];
  if (!node || !isFormulaNode(node)) return { ok: false, error: 'Pas une formule' };
  if (visiting.has(id)) return { ok: false, error: 'Formules qui se référencent en boucle' };
  visiting.add(id);

  let result;
  try {
    const latex = normalizeLatexShorthand(toLatex(node.content || ''));
    if (!latex) throw new CalcError('Formule vide');
    const { symbol, body } = splitEquation(latex);

    const sources = collectSources(map, id);

    const resolve = (name) => {
      const source = sources.get(name);
      if (!source) throw new CalcError(`Variable « ${name} » non reliée à une grandeur`);
      if (isFormulaNode(source)) {
        const inner = computeFormula(map, source.id, visiting, cache);
        if (inner.ok) return { v: inner.si, d: inner.dim };
        if (!hasKind(source, 'quantity')) throw new CalcError(`« ${name} » : ${inner.error}`);
      }
      // Grandeur alimentée par une autre formule : on utilise le résultat calculé (valeur saisie en repli).
      const producer = isFormulaNode(source) ? null : findProducer(map, source, id);
      if (producer) {
        const inner = computeFormula(map, producer.id, visiting, cache);
        if (inner.ok) return { v: inner.si, d: inner.dim };
      }
      const quantity = createQuantity(source.quantity);
      if (quantity.value === null) throw new CalcError(`Valeur de « ${name} » à renseigner`);
      const unit = parseUnit(quantity.unit);
      if (!unit) throw new CalcError(`Unité inconnue pour « ${name} » : ${quantity.unit}`);
      return { v: quantity.value * unit.factor, d: unit.dim };
    };

    const value = evaluate(tokenize(body, new Set(sources.keys())), resolve);
    if (!Number.isFinite(value.v)) throw new CalcError('Résultat non fini');
    result = { ok: true, symbol, value: round(value.v), si: value.v, dim: value.d, unit: formatDim(value.d) };
  } catch (error) {
    if (!(error instanceof CalcError)) throw error;
    result = { ok: false, error: error.message };
  }

  visiting.delete(id);
  cache.set(id, result);
  return result;
};

// Résultats de toutes les formules reliées à au moins une grandeur : { [nodeId]: résultat }.
const computeAllFormulas = (map) => {
  const cache = new Map();
  const out = {};
  for (const node of Object.values(map?.nodes || {})) {
    if (!isFormulaNode(node) || !node.content) continue;
    const linked = neighborIds(map, node.id).some((nid) => isQuantitySource(map.nodes[nid]));
    if (!linked) continue;
    out[node.id] = computeFormula(map, node.id, new Set(), cache);
  }
  // Grandeurs qui reçoivent le résultat d'une formule reliée (même symbole, casse ignorée).
  for (const node of Object.values(map?.nodes || {})) {
    const producer = findProducer(map, node);
    const result = producer && out[producer.id];
    if (result?.ok) out[node.id] = result;
  }
  return out;
};

// Variables de la formule `id` qui ne correspondent encore à aucune grandeur reliée
// (symboles sous leur forme normalisée : « E_c » → « Ec »). Sert à proposer leur création.
const missingVariables = (map, id) => {
  const node = map?.nodes?.[id];
  if (!node || !isFormulaNode(node) || !node.content) return [];
  try {
    const { body } = splitEquation(normalizeLatexShorthand(toLatex(node.content)));
    const known = collectSources(map, id);
    const names = tokenize(body, new Set(known.keys())).filter((token) => token.t === 'id').map((token) => token.v);
    return [...new Set(names)].filter((name) => !known.has(name));
  } catch (error) {
    if (error instanceof CalcError) return [];
    throw error;
  }
};

const formatCalculation = (result) => {
  if (!result?.ok) return '';
  const amount = `${result.value}${result.unit ? ` ${result.unit}` : ''}`;
  return result.symbol ? `${result.symbol} = ${amount}` : amount;
};

export { CalcError, normalizeSymbol, tokenize, evaluate, computeFormula, computeAllFormulas, missingVariables, formatCalculation };

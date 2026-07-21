const { unifyFormulaNotation } = require('./formulaNotation')

// Équivalence algébrique de deux formules : va au-delà de la comparaison
// textuelle de normalizeSymbolic pour reconnaître des écritures différentes
// d'une même expression — commutativité (a+b ≡ b+a), division comme puissance
// inverse (a/b ≡ a*b^-1), combinaison de termes/facteurs semblables (x+x ≡ 2x),
// racine comme exposant (sqrt(x) ≡ x^(1/2)), équations symétriques (U=RI ≡ RI=U).
//
// CHOIX DE PÉRIMÈTRE : ceci est une comparaison par forme canonique, pas un CAS
// (Système de Calcul Formel — explicitement hors périmètre du projet, cf. tâche
// S-06). Elle ne résout pas d'équation, ne simplifie pas et n'EXPAND pas les
// produits (2*(a+b) n'est PAS reconnu égal à 2a+2b — pas de distributivité).
// Elle vérifie seulement si deux expressions DÉJÀ écrites sont structurellement
// la même chose une fois réordonnées/réduites. Voir DECISIONS.md 2026-07-19.
//
// Convention de variable : chaque lettre latine est une variable À UN SEUL
// CARACTÈRE (m, v, F, S…) avec multiplication implicite par juxtaposition
// (« mv » ≡ « m*v »), comme en physique. Un mot de 4 lettres ou plus qui n'est
// pas un nom de fonction reconnu fait échouer le parsing (probablement de la
// prose) — échec silencieux, la comparaison retombe sur les autres stratégies.

const FUNCTIONS = ['nsqrt', 'sqrt', 'log', 'exp', 'sin', 'cos', 'tan', 'ln']
const MAX_LEN = 300

// ---------- Tokenizer ----------

function tokenize(src) {
  const tokens = []
  let i = 0
  while (i < src.length) {
    const ch = src[i]
    if (ch === ' ' || ch === '\t') { i++; continue }
    if ('+-*/^(),|='.includes(ch)) { tokens.push({ t: ch }); i++; continue }
    if (/[0-9]/.test(ch)) {
      const m = src.slice(i).match(/^\d+(?:\.\d+)?/)
      tokens.push({ t: 'NUM', v: parseFloat(m[0]) })
      i += m[0].length
      continue
    }
    if (/[a-zA-Z]/.test(ch)) {
      const run = src.slice(i).match(/^[a-zA-Z]+/)[0]
      const lower = run.toLowerCase()
      const func = FUNCTIONS.find((f) => lower.startsWith(f) && src[i + f.length] === '(')
      if (func) {
        tokens.push({ t: 'FUNC', v: func })
        i += func.length
        continue
      }
      if (run.length > 3) throw new Error('identifiant non reconnu (probablement du texte) : ' + run)
      // Convention physique : une lettre = une variable, juxtaposition = produit
      tokens.push({ t: 'VAR', v: run[0] })
      i += 1
      continue
    }
    // Symboles unicode opaques traités comme variable/constante (∞, π, ∂, ∅, grec)
    if (/[∞π∂∅αβγδεζηθικλµνξρστυφχψωΓΔΘΛΞΠΣΥΦΨΩ]/u.test(ch)) {
      tokens.push({ t: 'VAR', v: ch })
      i++
      continue
    }
    throw new Error('caractère inattendu : ' + ch)
  }
  return tokens
}

// ---------- Parser (récursif descendant) ----------
// Grammaire : Eq := Expr ('=' Expr)*
//             Expr := Term (('+'|'-') Term)*
//             Term := Signed (('*'|'/') Signed | Signed)*   (dernier cas = mult. implicite)
//             Signed := '-'? Power | '+'? Power
//             Power := Primary ('^' Signed)?
//             Primary := NUM | VAR | '(' Expr ')' | '|' Expr '|' | FUNC '(' Expr (',' Expr)* ')'

function mkAdd(a, b) { return { t: 'add', terms: [a, b] } }
function mkMul(a, b) { return { t: 'mul', factors: [a, b] } }
function mkPow(base, exp) { return { t: 'pow', base, exp } }
function negate(node) { return mkMul({ t: 'num', v: -1 }, node) }

function startsFactor(tok) {
  return !!tok && (tok.t === 'NUM' || tok.t === 'VAR' || tok.t === 'FUNC' || tok.t === '(' || tok.t === '|')
}

function parseExprTokens(tokens, i) {
  let r = parseTerm(tokens, i)
  let node = r.node
  let j = r.i
  while (tokens[j] && (tokens[j].t === '+' || tokens[j].t === '-')) {
    const op = tokens[j].t
    j++
    const rhs = parseTerm(tokens, j)
    j = rhs.i
    node = mkAdd(node, op === '-' ? negate(rhs.node) : rhs.node)
  }
  return { node, i: j }
}

function parseTerm(tokens, i) {
  let r = parseSigned(tokens, i)
  let node = r.node
  let j = r.i
  while (tokens[j]) {
    if (tokens[j].t === '*' || tokens[j].t === '/') {
      const op = tokens[j].t
      j++
      const rhs = parseSigned(tokens, j)
      j = rhs.i
      node = mkMul(node, op === '/' ? mkPow(rhs.node, { t: 'num', v: -1 }) : rhs.node)
    } else if (startsFactor(tokens[j])) {
      // Multiplication implicite : "2x", ")(", "mv"
      const rhs = parseSigned(tokens, j)
      j = rhs.i
      node = mkMul(node, rhs.node)
    } else break
  }
  return { node, i: j }
}

function parseSigned(tokens, i) {
  if (tokens[i]?.t === '-') {
    const r = parsePower(tokens, i + 1)
    return { node: negate(r.node), i: r.i }
  }
  if (tokens[i]?.t === '+') return parsePower(tokens, i + 1)
  return parsePower(tokens, i)
}

function parsePower(tokens, i) {
  const r = parsePrimary(tokens, i)
  if (tokens[r.i]?.t === '^') {
    const rhs = parseSigned(tokens, r.i + 1)
    return { node: mkPow(r.node, rhs.node), i: rhs.i }
  }
  return r
}

function buildFuncNode(name, args) {
  if (name === 'sqrt' && args.length === 1) return mkPow(args[0], { t: 'num', v: 0.5 })
  if (name === 'nsqrt' && args.length === 2) {
    const [n, x] = args
    if (n.t === 'num' && n.v !== 0) return mkPow(x, { t: 'num', v: 1 / n.v })
    return mkPow(x, mkPow(n, { t: 'num', v: -1 }))
  }
  return { t: 'func', name, args }
}

function parsePrimary(tokens, i) {
  const tok = tokens[i]
  if (!tok) throw new Error('fin de formule inattendue')
  if (tok.t === 'NUM') return { node: { t: 'num', v: tok.v }, i: i + 1 }
  if (tok.t === 'VAR') return { node: { t: 'var', n: tok.v }, i: i + 1 }
  if (tok.t === '(') {
    const inner = parseExprTokens(tokens, i + 1)
    if (tokens[inner.i]?.t !== ')') throw new Error('parenthèse fermante manquante')
    return { node: inner.node, i: inner.i + 1 }
  }
  if (tok.t === '|') {
    const inner = parseExprTokens(tokens, i + 1)
    if (tokens[inner.i]?.t !== '|') throw new Error('barre de valeur absolue manquante')
    return { node: { t: 'func', name: 'abs', args: [inner.node] }, i: inner.i + 1 }
  }
  if (tok.t === 'FUNC') {
    if (tokens[i + 1]?.t !== '(') throw new Error('parenthèse attendue après la fonction')
    const args = []
    let j = i + 2
    if (tokens[j] && tokens[j].t !== ')') {
      for (;;) {
        const arg = parseExprTokens(tokens, j)
        args.push(arg.node)
        j = arg.i
        if (tokens[j]?.t === ',') { j++; continue }
        break
      }
    }
    if (tokens[j]?.t !== ')') throw new Error('parenthèse fermante manquante (fonction)')
    return { node: buildFuncNode(tok.v, args), i: j + 1 }
  }
  throw new Error('jeton inattendu : ' + tok.t)
}

function parseEquation(tokens) {
  const segments = [[]]
  for (const tok of tokens) {
    if (tok.t === '=') segments.push([])
    else segments[segments.length - 1].push(tok)
  }
  const sides = segments.map((seg) => {
    const r = parseExprTokens(seg, 0)
    if (r.i !== seg.length) throw new Error('jetons excédentaires')
    return r.node
  })
  return sides.length === 1 ? sides[0] : { t: 'eq', sides }
}

// ---------- Canonicalisation ----------

function roundNum(v) {
  return Number.isFinite(v) ? Math.round(v * 1e9) / 1e9 : v
}

function key(node) { return JSON.stringify(node) }
function cmpKey(a, b) { const ka = key(a); const kb = key(b); return ka < kb ? -1 : ka > kb ? 1 : 0 }

function flattenMul(node, out) {
  for (const f of node.factors) {
    const c = canon(f)
    if (c.t === 'mul') flattenMul(c, out)
    else out.push(c)
  }
}

function canonMul(node) {
  const flat = []
  flattenMul(node, flat)

  let constant = 1
  const baseMap = new Map()
  for (const f of flat) {
    if (f.t === 'num') { constant *= f.v; continue }
    const base = f.t === 'pow' ? f.base : f
    const exp = f.t === 'pow' ? f.exp : { t: 'num', v: 1 }
    const k = key(base)
    if (baseMap.has(k)) {
      const entry = baseMap.get(k)
      entry.exp = { t: 'add', terms: [entry.exp, exp] }
    } else {
      baseMap.set(k, { base, exp })
    }
  }
  constant = roundNum(constant)
  if (constant === 0) return { t: 'num', v: 0 }

  const factors = []
  for (const { base, exp } of baseMap.values()) {
    const e = canon(exp)
    if (e.t === 'num' && e.v === 0) continue // x^0 = 1, retiré du produit
    factors.push(e.t === 'num' && e.v === 1 ? base : { t: 'pow', base, exp: e })
  }
  factors.sort(cmpKey)

  const finalFactors = []
  if (constant !== 1 || factors.length === 0) finalFactors.push({ t: 'num', v: constant })
  finalFactors.push(...factors)

  return finalFactors.length === 1 ? finalFactors[0] : { t: 'mul', factors: finalFactors }
}

function splitCoefficient(node) {
  if (node.t === 'num') return { coef: node.v, rest: null }
  if (node.t === 'mul' && node.factors[0]?.t === 'num') {
    const restFactors = node.factors.slice(1)
    const rest = restFactors.length === 1 ? restFactors[0] : { t: 'mul', factors: restFactors }
    return { coef: node.factors[0].v, rest }
  }
  return { coef: 1, rest: node }
}

function flattenAdd(node, out) {
  for (const t of node.terms) {
    const c = canon(t)
    if (c.t === 'add') flattenAdd(c, out)
    else out.push(c)
  }
}

function canonAdd(node) {
  const flat = []
  flattenAdd(node, flat)

  let constant = 0
  const termMap = new Map()
  for (const t of flat) {
    const { coef, rest } = splitCoefficient(t)
    if (rest === null) { constant += coef; continue }
    const k = key(rest)
    if (termMap.has(k)) termMap.get(k).coef += coef
    else termMap.set(k, { rest, coef })
  }
  constant = roundNum(constant)

  const terms = []
  for (const { rest, coef } of termMap.values()) {
    const c = roundNum(coef)
    if (c === 0) continue
    terms.push(c === 1 ? rest : canon({ t: 'mul', factors: [{ t: 'num', v: c }, rest] }))
  }
  terms.sort(cmpKey)

  const finalTerms = []
  if (constant !== 0 || terms.length === 0) finalTerms.push({ t: 'num', v: constant })
  finalTerms.push(...terms)

  return finalTerms.length === 1 ? finalTerms[0] : { t: 'add', terms: finalTerms }
}

function canon(node) {
  switch (node.t) {
    case 'num':
      return { t: 'num', v: roundNum(node.v) }
    case 'var':
      return node
    case 'pow': {
      const base = canon(node.base)
      const exp = canon(node.exp)
      if (base.t === 'num' && exp.t === 'num') {
        const v = Math.pow(base.v, exp.v)
        if (Number.isFinite(v)) return { t: 'num', v: roundNum(v) }
      }
      if (exp.t === 'num' && exp.v === 1) return base
      if (exp.t === 'num' && exp.v === 0) return { t: 'num', v: 1 }
      return { t: 'pow', base, exp }
    }
    case 'func':
      return { t: 'func', name: node.name, args: node.args.map(canon) }
    case 'mul':
      return canonMul(node)
    case 'add':
      return canonAdd(node)
    case 'eq': {
      const sides = node.sides.map(canon).sort(cmpKey)
      return { t: 'eq', sides }
    }
    default:
      throw new Error('type de nœud inconnu : ' + node.t)
  }
}

// ---------- API publique ----------

/**
 * Équivalence algébrique de deux formules (au-delà de la comparaison textuelle) :
 * commutativité, a/b ≡ a·b⁻¹, combinaison de termes/facteurs, racines en
 * exposant, équations symétriques. Échec de parsing (prose, matrices, syntaxe
 * non couverte) -> false, silencieusement : la comparaison retombe sur les
 * autres stratégies (normalizeSymbolic, embeddings).
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function algebraicallyEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  if (/[<>]/.test(a) || /[<>]/.test(b)) return false // inéquations : hors périmètre
  try {
    const ua = unifyFormulaNotation(a)
    const ub = unifyFormulaNotation(b)
    if (!ua || !ub || ua.length > MAX_LEN || ub.length > MAX_LEN) return false
    const astA = canon(parseEquation(tokenize(ua)))
    const astB = canon(parseEquation(tokenize(ub)))
    return JSON.stringify(astA) === JSON.stringify(astB)
  } catch {
    return false
  }
}

module.exports = { algebraicallyEqual }

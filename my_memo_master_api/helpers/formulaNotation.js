// Unifie les trois écritures de formule coexistant en base — raccourcis V1
// (« over(1, 2) », « x² »), LaTeX de l'éditeur V2 (« \frac{1}{2} », « v^{2} »)
// et texte libre (« U = R × I ») — vers une même syntaxe infixe explicite
// (opérateurs +, -, *, /, ^ conservés).
//
// Partagée par deux consommateurs :
// - Semantic.service.normalizeSymbolic : comparaison textuelle stricte, qui
//   retire ensuite la multiplication (« ri » ≡ « r*i », l'opérateur ne compte pas)
// - helpers/algebraicEquivalence : a besoin des opérateurs conservés pour
//   construire un arbre et vérifier des équivalences (commutativité, a/b ≡ a·b⁻¹…)
function unifyFormulaNotation(text) {
  if (!text || typeof text !== 'string') return ''
  let s = text
  let prev

  // Raccourcis V1 -> forme commune
  s = s
    .replace(/\b(?:over|frac)\(\s*([^,()]+?)\s*,\s*([^()]+?)\s*\)/gi, '($1)/($2)')
    .replace(/\babs\(([^()]*)\)/gi, '|$1|')

  // LaTeX structurel (éditeur V2) -> forme commune
  s = s
    .replace(/\\placeholder\{([^{}]*)\}/g, '$1')
    .replace(/\\left|\\right/g, '')
    .replace(/\\lbrack/g, '[')
    .replace(/\\rbrack/g, ']')
    .replace(/\\[lr]vert/g, '|')
    .replace(/\\[lr]Vert/g, '‖')
    .replace(/\\[,;!:]/g, '')
    .replace(/\\[dt]frac/g, '\\frac')
    .replace(/\\sqrt\[([^\]]*)\]\{([^{}]*)\}/g, 'nsqrt($1,$2)')
  // Fractions et racines : itératif pour les imbrications
  do {
    prev = s
    s = s
      .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)')
      .replace(/\\sqrt\{([^{}]*)\}/g, 'sqrt($1)')
      .replace(/\\(ln|log|exp|cos|sin|tan|vec|overrightarrow|overline|tilde|hat|dot|ddot|text|mathrm)\{([^{}]*)\}/g, '$1($2)')
  } while (s !== prev)
  s = s.replace(/\\(ln|log|exp|cos|sin|tan)\b/g, '$1')

  // Matrices : \begin{pmatrix}a & b \\ c\end{pmatrix} -> pmatrix(a,b;c) —
  // les délimiteurs restent distincts (déterminant vmatrix ≠ matrice pmatrix)
  if (/\\begin\{/.test(s)) {
    s = s
      .replace(/\\begin\{([a-z]*matrix|cases)\}/g, '$1(')
      .replace(/\\end\{(?:[a-z]*matrix|cases)\}/g, ')')
      .replace(/\\\\/g, ';')
      .replace(/&/g, ',')
  }

  // Ensembles, constantes, relations : Unicode et LaTeX vers un même jeton
  s = s
    .replace(/\\mathbb\{([a-zA-Z])\}/g, '$1')
    .replace(/[ℕℤℚℝℂ𝕂]/gu, (c) => ({ 'ℕ': 'N', 'ℤ': 'Z', 'ℚ': 'Q', 'ℝ': 'R', 'ℂ': 'C', '𝕂': 'K' }[c]))
    .replace(/\\infty\b/g, '∞')
    .replace(/\\pm\b/g, '±')
    .replace(/\\div\b/g, '÷')
    .replace(/\\(?:le|leq)\b/g, '<=')
    .replace(/\\(?:ge|geq)\b/g, '>=')
    .replace(/\\(?:ne|neq)\b/g, '≠')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/\\(?:to|rightarrow)\b/g, '->')
    .replace(/→/g, '->')

  // Grec LaTeX -> Unicode (les deux écritures coexistent : palette V1 vs V2)
  const GREEK = {
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε',
    zeta: 'ζ', eta: 'η', theta: 'θ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'µ',
    nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ',
    phi: 'φ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
    Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π',
    Sigma: 'Σ', Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
  }
  s = s.replace(/\\([a-zA-Z]+)\b/g, (m, name) => GREEK[name] ?? m)

  // Exposants/indices : accolades -> parenthèses ; superscripts Unicode -> ^(n)
  const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' }
  s = s
    .replace(/([\^_])\{([^{}]*)\}/g, '$1($2)')
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, (run) => '^(' + run.split('').map((c) => SUP[c] ?? c).join('') + ')')

  // Parenthèses redondantes autour d'un jeton simple : (2) -> 2, ^(2) -> ^2 —
  // (?<![a-zA-Z]) exclut les parenthèses d'un appel de fonction (sqrt(x), ln(2)…),
  // qui seraient sinon avalées elles aussi (sqrt(x) -> sqrtx, syntaxe cassée)
  do {
    prev = s
    s = s.replace(/(?<![a-zA-Z])\(([a-zA-Z0-9.∞±]+)\)/g, '$1')
  } while (s !== prev)

  // Multiplication : toutes les écritures convergent vers '*', conservé ici
  // (Semantic.service.normalizeSymbolic le retire ensuite pour la comparaison
  // textuelle ; algebraicEquivalence en a besoin pour construire l'arbre)
  return s
    .toLowerCase()
    .replace(/\\cdot|\\times/g, '*')
    .replace(/[×⋅·]/g, '*')
    .replace(/÷/g, '/')
    .replace(/[$\s]/g, '')
}

module.exports = { unifyFormulaNotation }

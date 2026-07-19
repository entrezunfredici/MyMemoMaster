// src/components/interpreter/interpreter.js
import katex from 'katex'
import 'katex/dist/katex.min.css'

// Exposants Unicode -> chiffres (x2 -> x^{2}, s-1 -> s^{-1}, en exposant)
const SUPERSCRIPTS = {
  '\u2070': '0', '\u00B9': '1', '\u00B2': '2', '\u00B3': '3', '\u2074': '4',
  '\u2075': '5', '\u2076': '6', '\u2077': '7', '\u2078': '8', '\u2079': '9',
  '\u207B': '-'
}

// Convertit tes raccourcis en LaTeX.
// Idempotent sur du LaTeX : les lookbehind (?<!\\) empêchent de re-transformer
// les commandes LaTeX (\ln(, \infty…) — depuis l'éditeur V2 (MathLive), la zone
// brute et le contenu stocké peuvent contenir du LaTeX qui repasse par ici.
export function toLatex(src) {
  let s = String(src ?? '').trim()

  // Normalisations rapides
  s = s
    // Suites d'exposants Unicode -> ^{...} accole (x2, s-1, m3 en exposant)
    .replace(/[\u00B2\u00B3\u2070\u00B9\u2074-\u2079\u207B]+/g, (run) =>
      '^{' + run.split('').map((c) => SUPERSCRIPTS[c] ?? c).join('') + '}'
    )
    // Accolades obligatoires : sans elles LaTeX ne met en exposant que le premier
    // caractere (s^-2 affichait le 2 en taille normale, x^10 le 0)
    .replace(/\^\(([^()]+)\)/g, '^{$1}')      // x^(n+1) -> x^{n+1}
    .replace(/\^(-?\d+(?:\.\d+)?)/g, '^{$1}') // s^-2, x^10, y^1.5
    .replace(/->/g, '\\to ')
    .replace(/>=/g, '\\ge ')
    .replace(/<=/g, '\\le ')
    .replace(/∞/g, '\\infty')
    .replace(/(?<!\\)\b(infty)\b/gi, '\\infty')

  // abs(x) -> |x|
  s = s.replace(/(?<!\\)\babs\(([^()]*)\)/g, '\\left|$1\\right|')

  // vec(A) / widevec(A)
  s = s
    .replace(/(?<!\\)\bvec\(([^()]*)\)/g, '\\vec{$1}')
    .replace(/(?<!\\)\bwidevec\(([^()]*)\)/g, '\\overrightarrow{$1}')

  // sqrt(x) + nsqrt(n,x)
  s = s
    .replace(/(?<!\\)\bsqrt\(([^()]*)\)/g, '\\sqrt{$1}')
    .replace(/(?<!\\)\bnsqrt\(([^,]+),\s*([^()]+)\)/g, '\\sqrt[$1]{$2}')

  // over — syntaxe canonique de la fraction ; frac reste interprété pour le
  // contenu historique mais n'est plus proposé ni accepté à la saisie
  // (normalizeFormulaSyntax le réécrit en over)
  s = s
    .replace(/(?<!\\)\bfrac\(([^,]+),\s*([^()]+)\)/g, '\\frac{$1}{$2}')
    .replace(/(?<!\\)\bover\(([^,]+),\s*([^()]+)\)/g, '\\frac{$1}{$2}')

  // ln(x)
  s = s.replace(/(?<!\\)\bln\(([^()]*)\)/g, '\\ln\\left($1\\right)')

  // overline/hat
  s = s
    .replace(/(?<!\\)\boverline\(([^()]*)\)/g, '\\overline{$1}')
    .replace(/(?<!\\)\bhat\(([^()]*)\)/g, '\\hat{$1}')

  // matrix(1,2;3,4) -> bmatrix
  s = s.replace(/(?<!\\)\bmat(?:rix)?\(([^()]*)\)/g, (_, inside) => {
    const rows = inside
      .split(';')
      .map(r => r.split(',').map(e => e.trim()).join(' & '))
      .join(' \\\\ ')
    return `\\begin{bmatrix}${rows}\\end{bmatrix}`
  })

  // mattrix([1,2],[3,4]) -> bmatrix
  s = s.replace(/\bmattrix\(\s*([\s\S]*?)\s*\)/g, (_, inside) => {
    const rowMatches = inside.match(/\[([^\]]*)\]/g) || []
    const rows = rowMatches
      .map(r => r.slice(1, -1).split(',').map(e => e.trim()).join(' & '))
      .join(' \\\\ ')
    return `\\begin{bmatrix}${rows}\\end{bmatrix}`
  })

  // <text bold italic color:red>hello</text> -> (simple) \text{hello} + styles de base
  s = s.replace(/<text([^>]*)>([\s\S]*?)<\/text>/gi, (_, attrs, content) => {
    const isBold = /\bbold\b/i.test(attrs)
    const isItalic = /\bitalic\b/i.test(attrs)
    const color = (attrs.match(/color\s*:\s*([a-zA-Z]+)/i) || [])[1]
    let inner = `\\text{${content.replace(/[{}]/g, '')}}`
    if (isItalic) inner = `\\mathit{${inner}}`
    if (isBold) inner = `\\mathbf{${inner}}`
    if (color) inner = `\\color{${color}}{${inner}}`
    return inner
  })

  // Ensembles ℕ ℤ ℚ ℝ ℂ → \mathbb{N} ...
  s = s
    .replace(/ℕ/g, '\\mathbb{N}')
    .replace(/ℤ/g, '\\mathbb{Z}')
    .replace(/ℚ/g, '\\mathbb{Q}')
    .replace(/ℝ/g, '\\mathbb{R}')
    .replace(/ℂ/g, '\\mathbb{C}')

  return s
}

// Rend en HTML KaTeX (mode bloc par défaut)
// output explicite : le MathML parallèle est requis pour les lecteurs d'écran (RGAA),
// il ne doit pas dépendre du défaut de KaTeX.
export function renderMath(input, { displayMode = true } = {}) {
  // \placeholder{} est une commande MathLive (trous de l'éditeur V2), inconnue de
  // KaTeX : un trou rempli rend son contenu, un trou vide rend un carré
  const latex = toLatex(input).replace(/\\placeholder\{([^{}]*)\}/g, (_, content) => content || '\\square')
  return katex.renderToString(latex, { throwOnError: false, displayMode, output: 'htmlAndMathml' })
}

// Entrée multi-lignes -> plusieurs blocs KaTeX empilés
export function renderMathMultiline(input) {
  const lines = String(input ?? '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)

  return lines.map(l => renderMath(l, { displayMode: true })).join('')
}

// Échappe le HTML des segments de texte brut (le résultat est injecté en v-html)
export function escapeHtml(input) {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// true si le texte contient au moins une formule délimitée $…$
export function hasFormula(input) {
  return /\$[^$]+\$/.test(String(input ?? ''))
}

// Réécrit les alias de syntaxe vers la forme canonique unique (frac -> over),
// pour qu'une même formule n'ait qu'une seule écriture stockée : la correction
// des réponses compare des chaînes, deux écritures d'une même fraction seraient
// sinon jugées différentes. Appliqué à l'insertion (FormulaHelper) et avant
// tout envoi de question/réponse à l'API.
export function normalizeFormulaSyntax(input) {
  return String(input ?? '').replace(/\bfrac\(/g, 'over(')
}

// Texte mixte -> HTML : les segments entre $…$ sont rendus en KaTeX inline,
// le reste est échappé tel quel. Un '$' non apparié reste littéral.
// Utilisé pour les énoncés/réponses des flashcards Leitner et des exercices.
export function renderInlineMath(input) {
  const src = String(input ?? '')
  if (!src.includes('$')) return escapeHtml(src)

  // Les index impairs du split correspondent aux groupes capturés (formules)
  return src
    .split(/\$([^$]+)\$/g)
    .map((segment, i) =>
      i % 2 === 1 ? renderMath(segment, { displayMode: false }) : escapeHtml(segment)
    )
    .join('')
}

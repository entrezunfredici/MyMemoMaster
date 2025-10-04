// src/components/interpreter.js
import katex from 'katex'
import 'katex/dist/katex.min.css'

// Convertit tes raccourcis en LaTeX
export function toLatex(src) {
  let s = String(src ?? '').trim()

  // Normalisations rapides
  s = s
    .replace(/\u00B2/g, '^2')     // x² -> x^2
    .replace(/\u00B3/g, '^3')     // x³ -> x^3
    .replace(/->/g, '\\to ')
    .replace(/>=/g, '\\ge ')
    .replace(/<=/g, '\\le ')
    .replace(/∞/g, '\\infty')
    .replace(/\b(infty)\b/gi, '\\infty')

  // abs(x) -> |x|
  s = s.replace(/\babs\(([^()]*)\)/g, '\\left|$1\\right|')

  // vec(A) / widevec(A)
  s = s
    .replace(/\bvec\(([^()]*)\)/g, '\\vec{$1}')
    .replace(/\bwidevec\(([^()]*)\)/g, '\\overrightarrow{$1}')

  // sqrt(x) + nsqrt(n,x)
  s = s
    .replace(/\bsqrt\(([^()]*)\)/g, '\\sqrt{$1}')
    .replace(/\bnsqrt\(([^,]+),\s*([^()]+)\)/g, '\\sqrt[$1]{$2}')

  // frac/over
  s = s
    .replace(/\bfrac\(([^,]+),\s*([^()]+)\)/g, '\\frac{$1}{$2}')
    .replace(/\bover\(([^,]+),\s*([^()]+)\)/g, '\\frac{$1}{$2}')

  // ln(x)
  s = s.replace(/\bln\(([^()]*)\)/g, '\\ln\\left($1\\right)')

  // overline/hat
  s = s
    .replace(/\boverline\(([^()]*)\)/g, '\\overline{$1}')
    .replace(/\bhat\(([^()]*)\)/g, '\\hat{$1}')

  // matrix(1,2;3,4) -> bmatrix
  s = s.replace(/\bmat(?:rix)?\(([^()]*)\)/g, (_, inside) => {
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
export function renderMath(input, { displayMode = true } = {}) {
  const latex = toLatex(input)
  return katex.renderToString(latex, { throwOnError: false, displayMode })
}

// Entrée multi-lignes -> plusieurs blocs KaTeX empilés
export function renderMathMultiline(input) {
  const lines = String(input ?? '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)

  return lines.map(l => renderMath(l, { displayMode: true })).join('')
}

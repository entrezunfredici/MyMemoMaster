// Palette à sections de l'interpréteur V2.
// Source de vérité : diagrams/interpreteur_palette_v2.md (§4) — planches utilisateur
// du 2026-07-19 + operateurs.md. Chaque bouton insère du LaTeX dans le <math-field>
// (les \placeholder{} se parcourent au Tab) ; `aria` est obligatoire : un lecteur
// d'écran ne peut rien annoncer d'un glyphe seul.
// Les boutons de commande (matrices +C/+L) portent `command` au lieu de `latex`.

const sym = (label, latex, aria) => ({ label, latex, aria })

const GREEK_LOWER = [
  ['α', '\\alpha', 'alpha'], ['β', '\\beta', 'bêta'], ['γ', '\\gamma', 'gamma'],
  ['δ', '\\delta', 'delta'], ['ε', '\\epsilon', 'epsilon'], ['ζ', '\\zeta', 'zêta'],
  ['η', '\\eta', 'êta'], ['θ', '\\theta', 'thêta'], ['ι', '\\iota', 'iota'],
  ['κ', '\\kappa', 'kappa'], ['λ', '\\lambda', 'lambda'], ['μ', '\\mu', 'mu'],
  ['ν', '\\nu', 'nu'], ['ξ', '\\xi', 'xi'], ['ο', 'o', 'omicron'],
  ['π', '\\pi', 'pi'], ['ρ', '\\rho', 'rhô'], ['σ', '\\sigma', 'sigma'],
  ['τ', '\\tau', 'tau'], ['υ', '\\upsilon', 'upsilon'], ['φ', '\\varphi', 'phi'],
  ['χ', '\\chi', 'chi'], ['ψ', '\\psi', 'psi'], ['ω', '\\omega', 'oméga'],
].map(([l, x, a]) => sym(l, x, a))

// Formes identiques au latin -> lettre latine (Α = A) ; formes propres -> commande LaTeX
const GREEK_UPPER = [
  ['Α', 'A', 'alpha majuscule'], ['Β', 'B', 'bêta majuscule'], ['Γ', '\\Gamma', 'gamma majuscule'],
  ['Δ', '\\Delta', 'delta majuscule'], ['Ε', 'E', 'epsilon majuscule'], ['Ζ', 'Z', 'zêta majuscule'],
  ['Η', 'H', 'êta majuscule'], ['Θ', '\\Theta', 'thêta majuscule'], ['Ι', 'I', 'iota majuscule'],
  ['Κ', 'K', 'kappa majuscule'], ['Λ', '\\Lambda', 'lambda majuscule'], ['Μ', 'M', 'mu majuscule'],
  ['Ν', 'N', 'nu majuscule'], ['Ξ', '\\Xi', 'xi majuscule'], ['Ο', 'O', 'omicron majuscule'],
  ['Π', '\\Pi', 'pi majuscule'], ['Ρ', 'P', 'rhô majuscule'], ['Σ', '\\Sigma', 'sigma majuscule'],
  ['Τ', 'T', 'tau majuscule'], ['Υ', '\\Upsilon', 'upsilon majuscule'], ['Φ', '\\Phi', 'phi majuscule'],
  ['Χ', 'X', 'chi majuscule'], ['Ψ', '\\Psi', 'psi majuscule'], ['Ω', '\\Omega', 'oméga majuscule'],
].map(([l, x, a]) => sym(l, x, a))

const DIGITS_SETS = [
  ...'0123456789'.split('').map(d => sym(d, d, ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'][Number(d)])),
  sym('∂', '\\partial', 'd rond (dérivée partielle)'),
  sym(',', ',', 'virgule'),
  sym('∅', '\\varnothing', 'ensemble vide'),
  sym('ℕ', '\\mathbb{N}', 'ensemble des entiers naturels'),
  sym('ℤ', '\\mathbb{Z}', 'ensemble des entiers relatifs'),
  sym('ℚ', '\\mathbb{Q}', 'ensemble des rationnels'),
  sym('ℝ', '\\mathbb{R}', 'ensemble des réels'),
  sym('ℂ', '\\mathbb{C}', 'ensemble des complexes'),
  sym('𝕂', '\\mathbb{K}', 'corps K'),
  sym('∞', '\\infty', 'infini'),
]

const PH = '\\placeholder{}'

const STRUCTURES = [
  sym('ẋ', `\\dot{${PH}}`, 'dérivée temporelle (point)'),
  sym('ẍ', `\\ddot{${PH}}`, 'dérivée seconde (deux points)'),
  sym('x̅', `\\overline{${PH}}`, 'barre (moyenne, conjugué)'),
  sym('x⃗', `\\vec{${PH}}`, 'vecteur'),
  sym('x̃', `\\tilde{${PH}}`, 'tilde'),
  sym('xʸ', `${PH}^{${PH}}`, 'exposant'),
  sym('xᵧ', `${PH}_{${PH}}`, 'indice'),
  sym('xᵧʸ', `${PH}_{${PH}}^{${PH}}`, 'indice et exposant'),
  sym('a/b', `\\frac{${PH}}{${PH}}`, 'fraction'),
  sym('√', `\\sqrt{${PH}}`, 'racine carrée'),
  sym('ⁿ√', `\\sqrt[${PH}]{${PH}}`, 'racine n-ième'),
  sym('⌊x⌋', `\\lfloor ${PH} \\rfloor`, 'partie entière'),
  sym('ln', `\\ln(${PH})`, 'logarithme népérien'),
  sym('cos', `\\cos(${PH})`, 'cosinus'),
  sym('sin', `\\sin(${PH})`, 'sinus'),
  sym('tan', `\\tan(${PH})`, 'tangente'),
  sym('( )', `\\left(${PH}\\right)`, 'parenthèses ajustables'),
  sym('[ ]', `\\left[${PH}\\right]`, 'crochets'),
  sym('|x|', `\\left|${PH}\\right|`, 'valeur absolue'),
  sym('‖x‖', `\\left\\lVert ${PH} \\right\\rVert`, 'norme'),
  sym('{ }', `\\left\\{${PH}\\right\\}`, 'accolades'),
]

const INTEGRALS = [
  sym('∫', `\\int ${PH} \\, \\mathrm{d}${PH}`, 'intégrale indéfinie'),
  sym('∫ₐᵇ', `\\int_{${PH}}^{${PH}} ${PH} \\, \\mathrm{d}${PH}`, 'intégrale définie (bornes)'),
  sym('∬', `\\iint_{${PH}} ${PH} \\, \\mathrm{d}${PH}`, 'intégrale double'),
  sym('∭', `\\iiint_{${PH}} ${PH} \\, \\mathrm{d}${PH}`, 'intégrale triple'),
  sym('∮', `\\oint_{${PH}} ${PH} \\, \\mathrm{d}${PH}`, 'intégrale curviligne (contour fermé)'),
  sym('∯', `\\oiint_{${PH}} ${PH} \\, \\mathrm{d}${PH}`, 'intégrale de surface fermée'),
]

const RELATIONS = [
  sym('=', '=', 'égal'), sym('≠', '\\ne', 'différent'),
  sym('≃', '\\simeq', 'isomorphe (environ égal)'), sym('≈', '\\approx', 'approximativement égal'),
  sym('≤', '\\le', 'inférieur ou égal'), sym('≥', '\\ge', 'supérieur ou égal'),
  sym('⟺', '\\iff', 'équivalence (si et seulement si)'), sym('⇒', '\\implies', 'implication'),
]

const OPERATIONS = [
  sym('⊕', '\\oplus', 'somme directe'), sym('⊛', '\\circledast', 'convolution'),
  sym('+', '+', 'plus'), sym('−', '-', 'moins'), sym('±', '\\pm', 'plus ou moins'),
  sym('/', '/', 'divisé'), sym('⋅', '\\cdot', 'multiplié (point)'), sym('∘', '\\circ', 'composition'),
]

const LOGIC = [
  sym('∀', '\\forall', 'pour tout'), sym('∃', '\\exists', 'il existe'),
  sym('∄', '\\nexists', 'il n’existe pas'), sym('∋', '\\ni', 'contient l’élément'),
  sym('∈', '\\in', 'appartient à'), sym('∉', '\\notin', 'n’appartient pas à'),
  sym('∧', '\\land', 'et logique'), sym('⋀', '\\bigwedge', 'et logique n-aire'),
  sym('∨', '\\lor', 'ou logique'), sym('⋁', '\\bigvee', 'ou logique n-aire'),
]

const SETS_OPS = [
  sym('∪', '\\cup', 'union'), sym('∩', '\\cap', 'intersection'),
  sym('⊂', '\\subset', 'inclus dans'), sym('⊃', '\\supset', 'contient'),
  sym('∝', '\\propto', 'proportionnel à'),
  sym('⋋', '\\leftthreetimes', 'produit semi-direct gauche'),
  sym('⋌', '\\rightthreetimes', 'produit semi-direct droit'),
]

const GEOMETRY = [
  sym('∠', '\\angle', 'angle'), sym('∡', '\\measuredangle', 'angle mesuré'),
  sym('⊥', '\\perp', 'perpendiculaire'),
]

const ARROWS = [
  sym('←', '\\leftarrow', 'flèche gauche'), sym('→', '\\rightarrow', 'flèche droite'),
  sym('⟼', '\\longmapsto', 'a pour image'), sym('↑', '\\uparrow', 'flèche haut'),
  sym('↓', '\\downarrow', 'flèche bas'), sym('↔', '\\leftrightarrow', 'flèche bidirectionnelle'),
  sym('↗', '\\nearrow', 'flèche diagonale montante'), sym('↖', '\\nwarrow', 'flèche diagonale montante gauche'),
  sym('↘', '\\searrow', 'flèche diagonale descendante'), sym('↙', '\\swarrow', 'flèche diagonale descendante gauche'),
]

// Lettres fraktur (\mathfrak{}) — section ajoutée « au cas où » (idéaux,
// algèbres de Lie…) suite à la clarification du glyphe 𝔇 de la planche
// formules (2026-07-19). Glyphes Unicode réels (bloc Mathematical Alphanumeric
// Symbols) générés par point de code plutôt que transcrits à la main — 5
// majuscules (C, H, I, R, Z) ont une exception historique vers un ancien bloc
// Unicode ; vérifié par script avant intégration (26 glyphes uniques par casse).
const FRAKTUR_LEGACY_UPPER = { C: 0x212D, H: 0x210C, I: 0x2111, R: 0x211C, Z: 0x2128 }
const FRAKTUR_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l) => {
  const glyph = String.fromCodePoint(FRAKTUR_LEGACY_UPPER[l] ?? 0x1D504 + (l.charCodeAt(0) - 65))
  return sym(glyph, `\\mathfrak{${l}}`, `${l} fraktur majuscule`)
})
const FRAKTUR_LOWER = 'abcdefghijklmnopqrstuvwxyz'.split('').map((l) => {
  const glyph = String.fromCodePoint(0x1D51E + (l.charCodeAt(0) - 97))
  return sym(glyph, `\\mathfrak{${l}}`, `${l} fraktur minuscule`)
})

const matrixEnv = (env, rows, cols) => {
  const row = Array(cols).fill(PH).join(' & ')
  const body = Array(rows).fill(row).join(' \\\\ ')
  return `\\begin{${env}} ${body} \\end{${env}}`
}

const MATRICES = [
  sym('(▢)', matrixEnv('pmatrix', 1, 1), 'matrice parenthésée (départ 1×1)'),
  sym('(▦)', matrixEnv('pmatrix', 3, 3), 'matrice parenthésée 3×3'),
  sym('|▦|', matrixEnv('vmatrix', 3, 3), 'déterminant'),
  sym('[▦]', matrixEnv('bmatrix', 3, 3), 'matrice entre crochets'),
  sym('{▢', `\\begin{cases} ${PH} \\\\ ${PH} \\end{cases}`, 'système (disjonction de cas)'),
  sym('▦', matrixEnv('matrix', 3, 3), 'tableau sans délimiteur'),
]

// Commandes de matrice : n'agissent QUE si la formule entière est une matrice
// reconnue (voir addMatrixColumn/addMatrixRow dans Interpreter.vue). Implémentées
// en manipulation de chaîne LaTeX, pas via l'API de commande MathLive — celle-ci
// s'est révélée peu fiable hors du cas « matrice fraîchement insérée » (elle peut
// envelopper tout le champ dans un \begin{split} parasite, y compris avec une
// matrice seule si le curseur n'est pas resté dans une cellule) : voir DECISIONS.md
// 2026-07-19 (« Interpréteur V2 — commandes de matrice »).
const MATRIX_COMMANDS = [1, 2, 3].flatMap((n) => ([
  { label: `+${n}C`, command: 'addColumnAfter', repeat: n, aria: `ajouter ${n} colonne${n > 1 ? 's' : ''} à la matrice` },
  { label: `+${n}L`, command: 'addRowAfter', repeat: n, aria: `ajouter ${n} ligne${n > 1 ? 's' : ''} à la matrice` },
]))

export const PALETTE_TABS = [
  {
    key: 'carac',
    label: 'Caractères',
    groups: [
      { name: 'Grec minuscules', items: GREEK_LOWER },
      { name: 'Grec majuscules', items: GREEK_UPPER },
      { name: 'Chiffres & ensembles', items: DIGITS_SETS },
      { name: 'Lettres fraktur', items: [...FRAKTUR_UPPER, ...FRAKTUR_LOWER] },
    ],
  },
  {
    key: 'form',
    label: 'Formules',
    groups: [
      { name: 'Structures', items: STRUCTURES },
      { name: 'Intégrales', items: INTEGRALS },
    ],
  },
  {
    key: 'operateurs',
    label: 'Opérateurs',
    groups: [
      { name: 'Relations', items: RELATIONS },
      { name: 'Opérations', items: OPERATIONS },
      { name: 'Logique', items: LOGIC },
      { name: 'Ensembles', items: SETS_OPS },
      { name: 'Géométrie', items: GEOMETRY },
      { name: 'Flèches', items: ARROWS },
    ],
  },
  {
    key: 'mat',
    label: 'Matrices',
    groups: [
      { name: 'Insérer', items: MATRICES },
      { name: 'Modifier (la formule doit être uniquement une matrice)', items: MATRIX_COMMANDS },
    ],
  },
]

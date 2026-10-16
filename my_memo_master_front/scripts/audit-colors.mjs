#!/usr/bin/env node
/* eslint-env node */
/**
 * Contrôle de la convention « toutes les couleurs vivent dans src/assets/base.css ».
 *
 * Échoue (code 1) si :
 *   1. un littéral de couleur (#rgb, #rrggbb, rgb(), rgba(), hsl()) apparaît dans src/
 *      en dehors de base.css et de helpers/themeColors.js (valeurs de repli) ;
 *   2. une variable var(--nom) / themeHex('--nom') / themeRgba('--nom') est utilisée
 *      sans être définie dans base.css (faute de frappe = propriété ignorée en silence,
 *      donc couleur perdue : risque de contraste RGAA).
 *
 * Pourquoi : un contraste RGAA ne se vérifie et ne se corrige qu'à un endroit si les
 * couleurs n'y sont pas dispersées (campagne du 2026-10-16 : 534 littéraux migrés).
 *
 * Usage :
 *   node scripts/audit-colors.mjs           → rapport lisible, code 1 s'il y a un écart
 *   node scripts/audit-colors.mjs --json    → rapport JSON
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const SRC = join(ROOT, 'src')
const JSON_MODE = process.argv.includes('--json')

const ALLOWED = ['assets/base.css', 'helpers/themeColors.js']
const COLOR_RE = /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3,4}\b|\b(?:rgba?|hsla?)\(\s*\d[^)]*\)/g

const files = []
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full)
    else if (/\.(vue|js|css)$/.test(entry)) files.push(full)
  }
}
walk(SRC)

const rel = (f) => relative(SRC, f).replace(/\\/g, '/')
const lineOf = (text, index) => text.slice(0, index).split('\n').length

const base = readFileSync(join(SRC, 'assets/base.css'), 'utf8')
const defined = new Set([...base.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]))

const literals = []
const undefinedVars = []
for (const file of files) {
  const name = rel(file)
  if (ALLOWED.includes(name)) continue
  const text = readFileSync(file, 'utf8')
  for (const m of text.matchAll(COLOR_RE)) {
    // &#8592; (entité HTML), ancre d'URL ou identifiant SVG (url(#id)) : pas une couleur
    if (text[m.index - 1] === '&' || text.slice(Math.max(0, m.index - 5), m.index).includes('url(')) continue
    literals.push(`${name}:${lineOf(text, m.index)} — ${m[0]}`)
  }
  const refs = [
    ...text.matchAll(/var\((--[a-z0-9-]+)[,)]/g),
    ...text.matchAll(/theme(?:Hex|Rgba|Color)\('(--[a-z0-9-]+)'/g),
  ]
  for (const m of refs) {
    if (!defined.has(m[1])) undefinedVars.push(`${name}:${lineOf(text, m.index)} — ${m[1]}`)
  }
}

const total = literals.length + undefinedVars.length

if (JSON_MODE) {
  console.log(JSON.stringify({ date: new Date().toISOString(), files: files.length, total, literals, undefinedVars }, null, 2))
} else {
  console.log(`Audit des couleurs — ${files.length} fichiers analysés (src/)\n`)
  console.log(`Couleurs en dur hors base.css / themeColors.js : ${literals.length}`)
  for (const l of literals) console.log(`   - ${l}`)
  console.log(`\nVariables utilisées mais non définies dans base.css : ${undefinedVars.length}`)
  for (const l of undefinedVars) console.log(`   - ${l}`)
  console.log(`\nTotal écarts : ${total}`)
  if (total) console.log('→ Déclarer la couleur dans src/assets/base.css et utiliser var(--nom) (en JS : themeColors.js).')
}

process.exit(total ? 1 : 0)

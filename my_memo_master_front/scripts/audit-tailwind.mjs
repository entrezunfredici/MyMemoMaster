#!/usr/bin/env node
/* eslint-env node */
/**
 * Contrôle des classes Tailwind de couleur : une classe `bg-gray-100`, `text-red-600`, `border-blue-500`…
 * dont la teinte n'existe pas dans le thème est SILENCIEUSEMENT ignorée (aucun style généré, aucune erreur).
 * C'est ce qui avait laissé ~455 classes sans effet (voir DECISIONS 2026-10-16) : `theme.colors` remplace
 * toute la palette de Tailwind, seules les teintes déclarées dans tailwind.config.js existent.
 *
 * Échoue (code 1) si un composant utilise une classe `<propriété>-<famille>-<teinte>` ou
 * `<propriété>-(white|black)` qui ne correspond à aucune couleur du thème.
 *
 * Usage :
 *   node scripts/audit-tailwind.mjs         → rapport lisible, code 1 s'il y a un écart
 *   node scripts/audit-tailwind.mjs --json  → rapport JSON
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const SRC = join(ROOT, 'src')
const JSON_MODE = process.argv.includes('--json')

const { default: config } = await import(pathToFileURL(join(ROOT, 'tailwind.config.js')).href)
const colors = config.theme.colors

// Familles de la palette de Tailwind : une classe numérotée de l'une d'elles doit exister dans le thème.
const FAMILIES = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'
const PROPS = 'text|bg|border-[trblxy]|border|ring-offset|ring|from|to|via|divide|placeholder|accent|fill|stroke|shadow|outline|decoration|caret'
const NUMBERED = new RegExp('(?<![\\w-])(?:[a-z0-9-]+:)*(?:' + PROPS + ')-(' + FAMILIES + ')-(\\d{2,3})(?:/\\d+)?(?![\\w-])', 'g')
const SPECIAL = new RegExp('(?<![\\w-])(?:[a-z0-9-]+:)*(?:' + PROPS + ')-(white|black|transparent|current)(?:/\\d+)?(?![\\w-])', 'g')

const files = []
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full)
    else if (/\.(vue|js)$/.test(entry)) files.push(full)
  }
}
walk(SRC)

const lineOf = (text, index) => text.slice(0, index).split('\n').length
const findings = []
for (const file of files) {
  const text = readFileSync(file, 'utf8')
  const name = relative(SRC, file).replace(/\\/g, '/')
  for (const m of text.matchAll(NUMBERED)) {
    const family = m[1]
    const shade = m[2]
    const scale = colors[family]
    if (!scale || typeof scale !== 'object' || scale[shade] === undefined) {
      findings.push(`${name}:${lineOf(text, m.index)} — ${m[0]} (teinte absente du thème)`)
    }
  }
  for (const m of text.matchAll(SPECIAL)) {
    if (colors[m[1]] === undefined) findings.push(`${name}:${lineOf(text, m.index)} — ${m[0]} (couleur absente du thème)`)
  }
}

if (JSON_MODE) {
  console.log(JSON.stringify({ date: new Date().toISOString(), files: files.length, total: findings.length, findings }, null, 2))
} else {
  console.log(`Audit des classes Tailwind de couleur — ${files.length} fichiers analysés (src/)\n`)
  console.log(`Classes sans effet (absentes du thème) : ${findings.length}`)
  for (const f of findings) console.log(`   - ${f}`)
  if (findings.length) console.log('\n→ Déclarer la teinte dans tailwind.config.js (et sa variable dans src/assets/base.css), ou utiliser une teinte existante.')
}

process.exit(findings.length ? 1 : 0)

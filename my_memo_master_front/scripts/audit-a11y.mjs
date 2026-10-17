#!/usr/bin/env node
/* eslint-env node */
/**
 * Audit statique d'accessibilité RGAA — MyMemoMaster front.
 *
 * Analyse les templates des composants .vue et relève :
 *   [11.1] champs de formulaire (input/select/textarea) sans nom accessible
 *          (ni label for/id, ni label enveloppant, ni aria-label(ledby), ni title)
 *   [1.1]  images sans attribut alt
 *   [7.1]  div/span cliquables sans équivalent clavier (role/tabindex/keydown)
 *   [11.9] boutons dont le contenu est un symbole seul (×, …) sans aria-label
 *   [8.3]  langue déclarée dans index.html
 *   [13.x] zones aria-live présentes (information)
 *
 * Usage :
 *   node scripts/audit-a11y.mjs            → rapport lisible
 *   node scripts/audit-a11y.mjs --json     → rapport JSON (CI / documentation)
 *   node scripts/audit-a11y.mjs --strict   → code de sortie 1 s'il reste une non-conformité (CI)
 *
 * Limites (audit heuristique, complémentaire d'axe-core en tests) :
 *   - les composants label custom et les associations dynamiques (:for/:id liés)
 *     ne sont pas résolus ; vérifier manuellement les faux positifs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const SRC = join(ROOT, 'src')
const JSON_MODE = process.argv.includes('--json')
const STRICT = process.argv.includes('--strict')

const vueFiles = []
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full)
    else if (entry.endsWith('.vue')) vueFiles.push(full)
  }
}
walk(SRC)

const findings = { 'RGAA 11.1 — champ sans nom accessible': [], 'RGAA 1.1 — image sans alt': [], 'RGAA 7.1 — clic sans équivalent clavier': [], 'RGAA 11.9 — bouton symbole sans nom accessible': [], 'RGAA 7.1 — fenêtre modale sans comportement de dialogue': [], 'RGAA 7.1 — icône cliquable (aria-hidden, inactivable au clavier)': [] }
const info = {}

const lineOf = (content, index) => content.slice(0, index).split('\n').length

/** Extrait les balises ouvrantes `<tag ...>` avec leur position. */
const findTags = (template, tag) => {
  // `=>` (fonction fléchée dans un attribut, ex. v-dialog="() => { … }") ne termine pas la balise
  const re = new RegExp(`<${tag}(\\s(?:=>|[^>])*)?>`, 'gis')
  const out = []
  let m
  while ((m = re.exec(template)) !== null) out.push({ attrs: m[1] || '', index: m.index, raw: m[0] })
  return out
}

const hasAttr = (attrs, ...names) =>
  names.some((n) => new RegExp(`(^|\\s)(:|v-bind:)?${n}\\s*=`, 'i').test(attrs))

/** true si la position est à l'intérieur d'un élément <label> … </label>. */
const insideLabel = (template, index) => {
  const before = template.slice(0, index)
  const opens = (before.match(/<label(\s|>)/gi) || []).length
  const closes = (before.match(/<\/label>/gi) || []).length
  return opens > closes
}

for (const file of vueFiles) {
  const content = readFileSync(file, 'utf8')
  const rel = relative(ROOT, file).replace(/\\/g, '/')
  const tplStart = content.indexOf('<template>')
  const tplEnd = content.lastIndexOf('</template>')
  if (tplStart === -1 || tplEnd === -1) continue
  const template = content.slice(tplStart, tplEnd)

  // Associations label for="x" ↔ id="x" déclarées dans le même fichier
  const forIds = new Set([...template.matchAll(/\bfor="([^"]+)"/g)].map((m) => m[1]))

  // [11.1] champs sans nom accessible
  for (const tag of ['input', 'select', 'textarea']) {
    for (const t of findTags(template, tag)) {
      if (/type="(hidden|submit|button)"/i.test(t.attrs)) continue
      const id = (t.attrs.match(/\bid="([^"]+)"/) || [])[1]
      const named =
        hasAttr(t.attrs, 'aria-label', 'aria-labelledby', 'title') ||
        (id && forIds.has(id)) ||
        insideLabel(template, t.index)
      if (!named) {
        findings['RGAA 11.1 — champ sans nom accessible'].push(
          `${rel}:${lineOf(content, tplStart + t.index)} — <${tag}${t.attrs.trimEnd().slice(0, 60)}…>`
        )
      }
    }
  }

  // [1.1] images sans alt
  for (const t of findTags(template, 'img')) {
    if (!hasAttr(t.attrs, 'alt')) {
      findings['RGAA 1.1 — image sans alt'].push(`${rel}:${lineOf(content, tplStart + t.index)}`)
    }
  }

  // [7.1] div/span cliquables sans équivalent clavier
  for (const tag of ['div', 'span', 'li', 'tr', 'td', 'p', 'svg', 'section', 'article']) {
    for (const t of findTags(template, tag)) {
      if (!/@click(\.[a-z]+)*="/i.test(t.attrs)) continue
      // @click.stop nu (non-action), @click.self (fermeture d'overlay au clic hors
      // panneau — action accessible par ailleurs via bouton/Échap) et wrapper
      // cursor-text (clic = focus d'un input interne, lui-même focusable) : motifs admis
      const isOverlayPattern =
        /@click\.(stop|self)(\.[a-z]+)*="/i.test(t.attrs) ||
        /class="[^"]*(overlay|backdrop|cursor-text)[^"]*"/i.test(t.attrs)
      const keyboardable =
        hasAttr(t.attrs, 'role') && hasAttr(t.attrs, 'tabindex') && /@keydown/i.test(t.attrs)
      if (!isOverlayPattern && !keyboardable) {
        findings['RGAA 7.1 — clic sans équivalent clavier'].push(
          `${rel}:${lineOf(content, tplStart + t.index)} — <${tag}${t.attrs.trimEnd().slice(0, 60)}…>`
        )
      }
    }
  }


  // [7.1] fenêtres modales : role="dialog" + aria-modal + nom + gestion du focus.
  // Une modale reconnue à sa classe (`modal-overlay`) ou à son recouvrement plein écran (`fixed inset-0`).
  // La gestion du focus (piège de Tab, Échap, restitution) vient de la directive v-dialog ; ModalComponent
  // (référence) l'implémente lui-même et se reconnaît à son @keydown.tab.
  for (const t of findTags(template, 'div')) {
    if (!/class="[^"]*(modal-overlay|fixed inset-0)[^"]*"/i.test(t.attrs)) continue
    const isDialog = /role="(alert)?dialog"/i.test(t.attrs) && hasAttr(t.attrs, 'aria-modal')
    const named = hasAttr(t.attrs, 'aria-label', 'aria-labelledby')
    const focusManaged = /v-dialog/.test(t.attrs) || /@keydown\.tab/.test(template)
    if (!isDialog || !named || !focusManaged) {
      findings['RGAA 7.1 — fenêtre modale sans comportement de dialogue'].push(
        `${rel}:${lineOf(content, tplStart + t.index)} — ${[!isDialog && 'role="dialog" aria-modal', !named && 'nom', !focusManaged && 'v-dialog'].filter(Boolean).join(' + ')} manquant`
      )
    }
  }

  // [7.1] icônes Heroicons cliquables : le composant les rend aria-hidden et perd role/aria-label/tabindex,
  // l'action doit être portée par un vrai <button> (voir CreateTestPage.vue).
  for (const t of findTags(template, '[A-Z][A-Za-z0-9]*Icon')) {
    if (/@click/i.test(t.attrs)) {
      findings['RGAA 7.1 — icône cliquable (aria-hidden, inactivable au clavier)'].push(
        `${rel}:${lineOf(content, tplStart + t.index)} — ${t.raw.slice(0, 70)}…`
      )
    }
  }

  // [11.9] boutons dont le contenu visible est un symbole seul
  const btnRe = /<button([^>]*)>\s*(&times;|×|✕|✖|❯|❮|→|←|\+|-|…)\s*<\/button>/gi
  let bm
  while ((bm = btnRe.exec(template)) !== null) {
    if (!hasAttr(bm[1], 'aria-label', 'title')) {
      findings['RGAA 11.9 — bouton symbole sans nom accessible'].push(
        `${rel}:${lineOf(content, tplStart + bm.index)} — <button>${bm[2]}</button>`
      )
    }
  }
}

// [8.3] langue de la page + [13.x] zones aria-live
const indexHtml = readFileSync(join(ROOT, 'index.html'), 'utf8')
info['RGAA 8.3 — <html lang>'] = (indexHtml.match(/<html[^>]*lang="([^"]+)"/) || [])[1] || 'ABSENT'
info['RGAA 13.x — zones aria-live dans src/'] = vueFiles.filter((f) =>
  readFileSync(f, 'utf8').includes('aria-live')
).length

const totalIssues = Object.values(findings).reduce((n, list) => n + list.length, 0)

if (JSON_MODE) {
  console.log(JSON.stringify({ date: new Date().toISOString(), files: vueFiles.length, totalIssues, info, findings }, null, 2))
} else {
  console.log(`Audit accessibilité RGAA — ${vueFiles.length} fichiers .vue analysés\n`)
  for (const [rule, list] of Object.entries(findings)) {
    console.log(`${rule} : ${list.length}`)
    for (const item of list) console.log(`   - ${item}`)
    console.log('')
  }
  for (const [k, v] of Object.entries(info)) console.log(`${k} : ${v}`)
  console.log(`\nTotal non-conformités détectées : ${totalIssues}`)
}

process.exit(STRICT && totalIssues > 0 ? 1 : 0)

#!/usr/bin/env node
/* eslint-env node */
/**
 * Génère les visuels de l'application Android à partir du logo vectoriel :
 *   - icônes de lanceur (carrée, ronde, couche « foreground » de l'icône adaptative) pour chaque densité
 *   - écrans de démarrage (splash) aux dimensions déjà présentes dans android/app/src/main/res/drawable*
 *   - couleur de fond de l'icône adaptative (values/ic_launcher_background.xml)
 *   - visuels pour la fiche Google Play dans docs/mobile/store/ (icône 512×512, graphique 1024×500)
 *
 * Rendu par le Chromium de Playwright (déjà une devDependency, aucun paquet ajouté).
 * Usage : npm run android:assets    (idempotent : régénère tout à partir de public/logo/*.svg)
 */
import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const RES = join(ROOT, 'android/app/src/main/res')
const STORE_DIR = join(ROOT, '../docs/mobile/store')
const BRAND = '#1E3BA1' // couleur primaire du logo / du thème (--primary: 30 59 161)

// CHOIX: logo blanc sur fond bleu de marque (le logo d'origine est bleu : illisible sur fond bleu)
const whiteLogo = (file) =>
  readFileSync(join(ROOT, 'public/logo', file), 'utf-8').replaceAll(BRAND, '#FFFFFF')
const MARK = whiteLogo('logo-mini.svg') // 87 × 41 : le monogramme seul
const FULL = whiteLogo('logo-full.svg') // 100 × 100 : monogramme + nom

/** Page HTML : un cadre w×h, fond et rayon donnés, un logo centré de largeur `logoW` px. */
const frame = ({ w, h, bg = 'transparent', radius = '0', svg, logoW }) => `
  <style>
    html, body { margin: 0; background: transparent; }
    .f { width: ${w}px; height: ${h}px; background: ${bg}; border-radius: ${radius};
         display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .f svg { width: ${logoW}px; height: auto; display: block; }
  </style>
  <div class="f">${svg}</div>`

async function shot(page, { w, h, ...rest }) {
  await page.setViewportSize({ width: w, height: h })
  await page.setContent(frame({ w, h, ...rest }))
  return page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } })
}

const write = (file, buffer) => {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, buffer)
  console.log('  écrit', file.replace(join(ROOT, '..') + '\\', '').replace(join(ROOT, '..') + '/', ''))
}

const pngSize = (file) => {
  const b = readFileSync(file)
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }
}

const browser = await chromium.launch()
const page = await browser.newPage()

// 1. Icônes de lanceur (px) et couche foreground de l'icône adaptative (108 dp) par densité
const DENSITIES = { mdpi: [48, 108], hdpi: [72, 162], xhdpi: [96, 216], xxhdpi: [144, 324], xxxhdpi: [192, 432] }
console.log('Icônes de lanceur')
for (const [density, [icon, fg]] of Object.entries(DENSITIES)) {
  const dir = join(RES, `mipmap-${density}`)
  write(join(dir, 'ic_launcher.png'), await shot(page, { w: icon, h: icon, bg: BRAND, radius: '18%', svg: MARK, logoW: icon * 0.58 }))
  write(join(dir, 'ic_launcher_round.png'), await shot(page, { w: icon, h: icon, bg: BRAND, radius: '50%', svg: MARK, logoW: icon * 0.5 }))
  // Zone de sécurité de l'icône adaptative : cercle central de 66 % → logo à 48 % de la largeur
  write(join(dir, 'ic_launcher_foreground.png'), await shot(page, { w: fg, h: fg, svg: MARK, logoW: fg * 0.48 }))
}
writeFileSync(
  join(RES, 'values/ic_launcher_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BRAND}</color>\n</resources>\n`,
)
console.log('  écrit values/ic_launcher_background.xml')

// 2. Écrans de démarrage : on conserve les dimensions des fichiers existants
console.log('Écrans de démarrage')
for (const dirName of readdirSync(RES).filter((d) => d.startsWith('drawable'))) {
  const file = join(RES, dirName, 'splash.png')
  if (!existsSync(file)) continue
  const { w, h } = pngSize(file)
  write(file, await shot(page, { w, h, bg: BRAND, svg: MARK, logoW: Math.min(w, h) * 0.4 }))
}

// 3. Fiche Google Play
console.log('Visuels Google Play')
write(join(STORE_DIR, 'icone-play-512.png'), await shot(page, { w: 512, h: 512, bg: BRAND, svg: MARK, logoW: 300 }))
write(join(STORE_DIR, 'graphique-fonctionnalite-1024x500.png'), await shot(page, { w: 1024, h: 500, bg: BRAND, svg: FULL, logoW: 330 }))

await browser.close()
console.log('Terminé.')

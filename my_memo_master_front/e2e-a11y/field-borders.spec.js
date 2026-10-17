/**
 * Bordures et focus des champs, vérifiés sur les STYLES CALCULÉS par un vrai moteur de rendu.
 *
 * Régression visée (retour de test fonctionnel du 2026-10-17) : la règle globale
 * `input[type="text"], textarea { border: 2px solid var(--gray) }` était INVALIDE (`--gray` est un triplet de
 * canaux RGB « 213 218 237 », pas une couleur) : les champs texte n'avaient AUCUNE bordure (0px), et la règle
 * l'emportait en spécificité sur les classes utilitaires. La règle de focus (`var(--primary)`, même défaut)
 * retirait l'outline sans le remplacer : le focus devenait invisible. Ni jsdom ni l'audit statique ne
 * calculent les styles — seul un navigateur peut le voir.
 */
import { test, expect } from '@playwright/test'

// Champs injectés dans une page publique (aucune dépendance à un formulaire existant)
async function injectFields(page) {
  await page.goto('/credits')
  await page.evaluate(() => {
    const host = document.createElement('div')
    host.id = 'probe'
    host.style.cssText = 'background:#fff;padding:16px'
    host.innerHTML = `
      <input id="plain" type="text" aria-label="champ simple">
      <textarea id="plain-area" aria-label="zone simple"></textarea>
      <input id="utility" type="text" aria-label="champ avec classes" class="border border-gray-500">
      <input id="box" type="checkbox" aria-label="case">`
    document.body.appendChild(host)
  })
}

const style = (page, selector, prop) => page.locator(selector).evaluate((el, p) => getComputedStyle(el)[p], prop)

// Rapport de contraste WCAG entre deux couleurs « rgb(r, g, b) »
const luminance = ([r, g, b]) => {
  const c = [r, g, b].map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const parse = (rgb) => rgb.match(/\d+/g).slice(0, 3).map(Number)
const ratio = (a, b) => {
  const [hi, lo] = [luminance(parse(a)), luminance(parse(b))].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

test.describe('bordures par défaut des champs texte', () => {
  test('un champ texte sans classe a une bordure de 2px (et non 0px)', async ({ page }) => {
    await injectFields(page)
    expect(await style(page, '#plain', 'borderTopWidth')).toBe('2px')
    expect(await style(page, '#plain', 'borderTopStyle')).toBe('solid')
    expect(await style(page, '#plain-area', 'borderTopWidth')).toBe('2px')
  })

  test('cette bordure atteint 3:1 sur fond blanc (RGAA 3.2 — limite d’un champ)', async ({ page }) => {
    await injectFields(page)
    const color = await style(page, '#plain', 'borderTopColor')
    expect(color).toBe('rgb(107, 114, 128)')
    expect(ratio(color, 'rgb(255, 255, 255)')).toBeGreaterThanOrEqual(3)
  })

  test('les classes utilitaires restent prioritaires (la règle globale n’écrase plus rien)', async ({ page }) => {
    await injectFields(page)
    expect(await style(page, '#utility', 'borderTopWidth')).toBe('1px')
    expect(await style(page, '#utility', 'borderTopColor')).toBe('rgb(107, 114, 128)')
  })
})

test.describe('focus visible des champs texte (RGAA 10.7)', () => {
  test('au focus : contour plein de 2px et bordure de la couleur principale', async ({ page }) => {
    await injectFields(page)
    await page.locator('#plain').focus()
    expect(await style(page, '#plain', 'outlineStyle')).toBe('solid')
    expect(await style(page, '#plain', 'outlineWidth')).toBe('2px')
    expect(await style(page, '#plain', 'outlineColor')).toBe('rgb(30, 59, 161)')
    expect(await style(page, '#plain', 'borderTopColor')).toBe('rgb(30, 59, 161)')
  })

  test('le contour de focus atteint 3:1 sur fond blanc', async ({ page }) => {
    await injectFields(page)
    await page.locator('#plain-area').focus()
    expect(ratio(await style(page, '#plain-area', 'outlineColor'), 'rgb(255, 255, 255)')).toBeGreaterThanOrEqual(3)
  })

  test('sans focus : pas de contour résiduel', async ({ page }) => {
    await injectFields(page)
    expect(['none', '0px']).toContain(await style(page, '#plain', 'outlineStyle') === 'none' ? 'none' : await style(page, '#plain', 'outlineWidth'))
  })
})

test('les cases à cocher prennent la couleur principale (accent-color valide)', async ({ page }) => {
  await injectFields(page)
  expect(await style(page, '#box', 'accentColor')).toBe('rgb(30, 59, 161)')
})

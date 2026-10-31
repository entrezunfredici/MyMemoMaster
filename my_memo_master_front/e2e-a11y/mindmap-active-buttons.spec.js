/**
 * Boutons actifs de la palette (mode Zone, forme, rôle « Aussi ») : sous le curseur, ils doivent rester
 * lisibles. Régression : la règle `:hover` (spécificité 0,3,0) l'emportait sur l'état actif (0,2,0), et le
 * bouton qu'on venait de cliquer devenait blanc sur fond clair. L'API est simulée (fixtures/mindmap.js).
 */
import { test, expect } from '@playwright/test'
import { DIAGRAM } from './fixtures/mindmap.js'

const SESSION = { token: 'a11y-audit', refreshToken: 'a11y-audit', authenticated: true, user: { userId: 1, id: 1, roleId: 1, firstName: 'Audit', lastName: 'RGAA', email: 'audit@example.test' } }

test.skip(!!process.env.A11Y_BASE_URL, 'API simulée : audit réservé à la version buildée locale')

const channels = (css) => css.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number)
const luminance = (css) => {
  const [r, g, b] = channels(css).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05) }

test('palette - un bouton actif reste lisible sous le curseur', async ({ page, baseURL }) => {
  await page.addInitScript((session) => localStorage.setItem('auth', JSON.stringify(session)), SESSION)
  const origin = new URL(baseURL).origin
  await page.route((url) => url.origin !== origin && url.protocol.startsWith('http'), (route) => {
    const { pathname } = new URL(route.request().url())
    let body = []
    if (/\/users\/1$/.test(pathname)) body = { userId: 1, id: 1, roleId: 1, firstName: 'Audit', lastName: 'RGAA', email: 'audit@example.test' }
    else if (/onboardingState/.test(pathname)) body = { tour_seen: true, checklist: {} }
    else if (/\/diagrammes\/?$/.test(pathname) && route.request().method() === 'GET') body = [DIAGRAM]
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  })
  await page.goto('/mindmaps')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: "Ouvrir l'éditeur" }).first().click()
  await page.waitForSelector('.mindmap-node')
  await page.waitForTimeout(500)
  // sélectionne le premier item qui ouvre la section « Options » de la palette
  const nodes = page.locator('.mindmap-node')
  for (let i = 0; i < await nodes.count(); i++) {
    await nodes.nth(i).locator('rect').first().click({ force: true, position: { x: 6, y: 6 } })
    await page.waitForTimeout(250)
    if (await page.locator('.palette__section--selected').count()) break
  }
  await expect(page.locator('.palette__section--selected')).toBeVisible()

  const zoneMode = page.locator('.palette__mode-btn', { hasText: 'Zone' })
  const activeShape = page.locator('.palette__shape-btn--active').first()
  const activeKinds = page.locator('.palette__kind-btn')

  await zoneMode.click() // le curseur reste dessus : c'est le cas qui échouait
  await expect(zoneMode).toHaveClass(/palette__mode-btn--active/)
  const targets = [zoneMode, activeShape]
  await activeKinds.first().click()
  targets.push(page.locator('.palette__kind-btn--active').first())

  for (const target of targets) {
    await target.hover()
    const { bg, color } = await target.evaluate((el) => { const s = getComputedStyle(el); return { bg: s.backgroundColor, color: s.color } })
    expect(ratio(bg, color), `${await target.textContent()} : fond ${bg}, texte ${color}`).toBeGreaterThanOrEqual(4.5)
  }
})

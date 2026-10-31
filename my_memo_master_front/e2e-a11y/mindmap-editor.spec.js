/**
 * Audit RGAA de l'éditeur de carte mentale (page la plus riche en SVG et en couleurs
 * personnalisables : nœuds, branches, zones, palette d'options, nœud « Graphique »).
 *
 * Deux contrôles par état de l'écran (liste, éditeur, puis chaque type d'item sélectionné) :
 *   1. axe-core WCAG 2.1 A/AA : aucune violation ;
 *   2. mesure directe du contraste des textes (helpers/contrast.js) — axe répond « à vérifier »
 *      pour les textes posés dans les <foreignObject> sur une forme SVG.
 *
 * L'API est simulée (aucun backend) : la carte vient de fixtures/mindmap.js.
 */
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { DIAGRAM } from './fixtures/mindmap.js'
import { measureContrast } from './helpers/contrast.js'

const SESSION = {
  token: 'a11y-audit',
  refreshToken: 'a11y-audit',
  authenticated: true,
  user: { userId: 1, id: 1, roleId: 1, firstName: 'Audit', lastName: 'RGAA', email: 'audit@example.test' },
}

test.skip(!!process.env.A11Y_BASE_URL, 'API simulée : audit réservé à la version buildée locale')

test('éditeur de carte mentale - WCAG 2.1 A/AA et contraste des textes - tous les états', async ({ page, baseURL }) => {
  await page.addInitScript((session) => localStorage.setItem('auth', JSON.stringify(session)), SESSION)
  const origin = new URL(baseURL).origin
  await page.route(
    (url) => url.origin !== origin && url.protocol.startsWith('http'),
    (route) => {
      const { pathname } = new URL(route.request().url())
      let body = []
      // visite guidée déjà vue : son overlay bloquerait les clics (elle est auditée par pages.spec.js)
      if (/\/users\/1$/.test(pathname)) body = { userId: 1, id: 1, roleId: 1, firstName: 'Audit', lastName: 'RGAA', email: 'audit@example.test' }
      else if (/onboardingState/.test(pathname)) body = { tour_seen: true, checklist: {} }
      else if (/\/diagrammes\/?$/.test(pathname) && route.request().method() === 'GET') body = [DIAGRAM]
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    }
  )

  const problems = []
  const audit = async (state) => {
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    for (const v of results.violations) {
      problems.push(`[${state}] axe ${v.id} (${v.impact}) : ${v.nodes.map((n) => n.target.join(' ')).slice(0, 4).join(' | ')}`)
    }
    if (await page.locator('.mindmap-builder').count()) {
      for (const line of await page.evaluate(measureContrast, '.mindmap-builder')) {
        problems.push(`[${state}] contraste ${line}`)
      }
    }
  }

  await page.goto('/mindmaps')
  await page.waitForLoadState('networkidle')
  await audit('liste des cartes')

  await page.getByRole('button', { name: "Ouvrir l'éditeur" }).first().click()
  await page.waitForSelector('.mindmap-node')
  await page.waitForTimeout(600)
  await audit('éditeur')

  const nodes = page.locator('.mindmap-node')
  const count = await nodes.count()
  expect(count).toBeGreaterThanOrEqual(6)
  for (let i = 0; i < count; i++) {
    const title = (await nodes.nth(i).locator('.mindmap-node__title').first().textContent().catch(() => '')) || `n°${i}`
    await nodes.nth(i).locator('rect').first().click({ force: true, position: { x: 6, y: 6 } })
    await page.waitForTimeout(200)
    await audit(`item « ${title.trim()} » sélectionné`)
  }

  expect(problems).toEqual([])
})

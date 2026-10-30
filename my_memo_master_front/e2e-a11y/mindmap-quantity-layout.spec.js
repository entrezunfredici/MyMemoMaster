/**
 * Mise en page d'une grandeur dans un item de carte (régression : le champ de valeur prenait toute la largeur
 * et repoussait l'unité hors du nœud, la règle `.mindmap-node__inline-input { width: 100% }` l'emportant).
 * Utilise la grandeur « v = 10 m/s » de fixtures/mindmap.js ; l'API est simulée.
 */
import { test, expect } from '@playwright/test'
import { DIAGRAM } from './fixtures/mindmap.js'

const SESSION = { token: 'a', refreshToken: 'a', authenticated: true, user: { userId: 1, id: 1, roleId: 1, firstName: 'A', lastName: 'B', email: 'a@x.test' } }

test('grandeur - le champ de valeur garde sa largeur et l’unité reste dans le nœud', async ({ page, baseURL }) => {
  await page.addInitScript((s) => localStorage.setItem('auth', JSON.stringify(s)), SESSION)
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
  const m = await page.evaluate(() => {
    const row = [...document.querySelectorAll('.mindmap-node__quantity')].find((r) => r.querySelector('input'))
    const content = row.closest('.mindmap-node__content').getBoundingClientRect()
    const input = row.querySelector('input').getBoundingClientRect()
    const labels = [...row.querySelectorAll('.mindmap-node__quantity-label')].map((e) => e.getBoundingClientRect())
    return { content: { l: content.left, r: content.right }, input: input.width, labels: labels.map((l) => ({ l: l.left, r: l.right })), text: row.textContent }
  })
  expect(m.input).toBeLessThan(110)
  for (const l of m.labels) expect(l.r).toBeLessThanOrEqual(m.content.r + 1)
})

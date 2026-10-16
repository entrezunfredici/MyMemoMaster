/**
 * Audit RGAA d'un site DÉPLOYÉ (pages publiques, vraie API) — toutes règles WCAG 2.1 A/AA
 * d'axe-core. Ne tourne que si A11Y_BASE_URL est défini (workflow a11y-live.yml) : en CI
 * « classique », les pages sont auditées sur la version buildée par pages.spec.js.
 *
 * Complète la CI : un déploiement ou une donnée réelle peut introduire une violation que les
 * jeux simulés ne montrent pas (contenu dynamique, configuration serveur, en-têtes…).
 */
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.skip(!process.env.A11Y_BASE_URL, 'A11Y_BASE_URL non défini : audit du site déployé désactivé')

const PUBLIC_PAGES = ['/', '/auth', '/forgot-password', '/tutorials', '/credits']

for (const path of PUBLIC_PAGES) {
  test(`site déployé ${path} - WCAG 2.1 A/AA - aucune violation`, async ({ page }) => {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    const toast = page.locator('.Vue-Toastification__toast')
    if (await toast.count()) await toast.first().waitFor({ state: 'detached', timeout: 8000 }).catch(() => {})
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    expect(results.violations.map((v) => `${v.id} (${v.impact}) : ${v.nodes.map((n) => n.target.join(' ')).slice(0, 4).join(' | ')}`)).toEqual([])
  })
}

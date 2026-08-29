/**
 * Audit de contraste RGAA (critère 3.2) sur les pages réellement rendues par
 * un navigateur — l'angle mort documenté dans docs/AUDIT_RGAA.md §5 et
 * docs/COMPTE_RENDU_METRIQUES.md §7.2 : jsdom ne calcule pas les styles, donc
 * la règle `color-contrast` d'axe-core est désactivée dans test/a11y/axe.test.js
 * et ne peut être vérifiée que par un vrai moteur de rendu (Chromium ici).
 *
 * Périmètre : pages publiques (`meta.private: false` dans router/routes.js)
 * qui ne font aucun appel API au montage — le serveur de preview n'a pas
 * d'API derrière lui. Sont donc exclues : /register (appel API dans
 * `beforeEnter`), /verify-email (appel API dans `onMounted`), et toute page
 * `private: true` (redirigerait vers /auth faute de session).
 *
 * Seule la règle color-contrast est activée : les autres (noms accessibles,
 * clavier, landmarks…) sont déjà couvertes par audit-a11y.mjs et axe.test.js.
 */
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const PUBLIC_PAGES = [
  { path: '/', label: 'Accueil' },
  { path: '/auth', label: 'Connexion' },
  { path: '/forgot-password', label: 'Mot de passe oublié' },
  { path: '/reset-password', label: 'Réinitialiser le mot de passe' },
  { path: '/tutorials', label: 'Tutoriels' },
  { path: '/credits', label: 'Crédits' },
  { path: '/error-server', label: 'Erreur serveur' },
  { path: '/route-inexistante', label: '404 (catch-all)' },
]

for (const { path, label } of PUBLIC_PAGES) {
  test(`${label} (${path}) - contraste - aucune violation color-contrast`, async ({ page }) => {
    await page.goto(path)
    const results = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze()

    const summary = results.violations.map(
      (v) => `${v.id} (${v.impact}) : ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`
    )
    expect(summary).toEqual([])
  })
}

/**
 * Audit de contraste RGAA (critère 3.2) sur les pages réellement rendues par
 * un navigateur — l'angle mort documenté dans docs/AUDIT_RGAA.md §5 et
 * docs/COMPTE_RENDU_METRIQUES.md §7.2 : jsdom ne calcule pas les styles, donc
 * la règle `color-contrast` d'axe-core est désactivée dans test/a11y/axe.test.js
 * et ne peut être vérifiée que par un vrai moteur de rendu (Chromium ici).
 *
 * Périmètre : pages publiques (`meta.private: false` dans router/routes.js).
 * Sont exclues : /register (appel API dans `beforeEnter`), /verify-email
 * (appel API dans `onMounted`), et toute page `private: true` (redirigerait
 * vers /auth faute de session).
 *
 * ATTENTION : « la page n'appelle pas l'API » ne se lit pas sur la page seule.
 * /tutorials n'appelle rien lui-même (ses données sont codées en dur) mais
 * monte SubjectFilterComponent, qui fait `subjectStore.fetchSubjects()` dans
 * son `onMounted`. Le critère porte sur l'ARBRE DE COMPOSANTS, pas sur le
 * fichier de la page. D'où l'attente de disparition des toasts ci-dessous.
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

    // Le serveur de preview n'a pas d'API : les composants qui appellent
    // l'API au montage font apparaitre un toast d'erreur. Il se ferme seul
    // au bout de 4 s (notif.js), mais tant qu'il est a l'ecran axe le scanne
    // — et pendant son animation d'apparition le contraste effectif du texte
    // descend sous le seuil. C'est ce qui rendait ce test non deterministe :
    // vert en local (8 workers, scan avant le toast), rouge sur le runner
    // (2 workers, scan pendant). On attend donc qu'il ait disparu.
    const toast = page.locator('.Vue-Toastification__toast')
    if (await toast.count()) {
      await toast.first().waitFor({ state: 'detached', timeout: 8000 })
    }

    const results = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze()

    const summary = results.violations.map(
      (v) => `${v.id} (${v.impact}) : ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`
    )
    expect(summary).toEqual([])
  })
}

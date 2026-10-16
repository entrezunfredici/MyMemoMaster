/**
 * Audit RGAA navigateur sur TOUTES les pages (publiques et privées), toutes règles
 * WCAG 2.1 A/AA d'axe-core confondues (contraste inclus) — extension de
 * contrast.spec.js qui, lui, ne couvrait que les pages publiques sans appel API
 * (limite documentée dans docs/AUDIT_RGAA.md §5).
 *
 * Comment les pages privées sont atteintes sans backend :
 *   - une session est injectée dans localStorage (store persistant `auth`) ;
 *   - toute requête qui ne vise pas le serveur de preview (donc l'API) reçoit `[]`.
 * Les pages s'affichent alors dans leur état « vide » : cet audit contrôle la
 * structure, les noms accessibles et les couleurs du gabarit — pas les états remplis
 * (modales, listes avec données), couverts par axe.test.js (jsdom) et la revue manuelle.
 *
 * Un écart connu et justifié se déclare dans KNOWN_VIOLATIONS (règle + route + raison) :
 * il ne bloque pas la CI, mais toute NOUVELLE violation la bloque.
 */
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const PAGES = [
  { path: '/', label: 'Accueil' },
  { path: '/auth', label: 'Connexion' },
  { path: '/forgot-password', label: 'Mot de passe oublié' },
  { path: '/reset-password', label: 'Réinitialiser le mot de passe' },
  { path: '/verify-email', label: 'Vérification e-mail' },
  { path: '/registration-full', label: 'Inscriptions closes' },
  { path: '/tutorials', label: 'Tutoriels' },
  { path: '/credits', label: 'Crédits' },
  { path: '/error-server', label: 'Erreur serveur' },
  { path: '/route-inexistante', label: '404' },
  { path: '/onboarding', label: 'Parcours guidé' },
  { path: '/exercises', label: 'Exercices' },
  { path: '/exercises/1', label: 'Détail exercice' },
  { path: '/create-test', label: 'Créer un test' },
  { path: '/flashcards', label: 'Flashcards' },
  { path: '/flashcards/1/cards', label: 'Cartes d’un système' },
  { path: '/flashcardssession/1', label: 'Session de révision' },
  { path: '/mindmaps', label: 'Cartes mentales' },
  { path: '/calendar', label: 'Calendrier' },
  { path: '/todo', label: 'À faire' },
  { path: '/profile', label: 'Profil' },
  { path: '/settings', label: 'Réglages' },
  { path: '/classroom', label: 'Classe' },
  { path: '/kpi', label: 'Indicateurs' },
  { path: '/subjects', label: 'Contenus par sujet' },
  { path: '/account', label: 'Compte' },
]

test.skip(!!process.env.A11Y_BASE_URL, 'API simulée : audit réservé à la version buildée locale')

// { rule, path, reason } — écarts connus, justifiés, à résorber. Vide = aucun.
const KNOWN_VIOLATIONS = []

const SESSION = {
  token: 'a11y-audit',
  refreshToken: 'a11y-audit',
  authenticated: true,
  user: { id: 1, roleId: 1, firstName: 'Audit', lastName: 'RGAA', email: 'audit@example.test' },
}

for (const { path, label } of PAGES) {
  test(`${label} (${path}) - WCAG 2.1 A/AA - aucune nouvelle violation`, async ({ page, baseURL }) => {
    await page.addInitScript((session) => {
      localStorage.setItem('auth', JSON.stringify(session))
    }, SESSION)
    const origin = new URL(baseURL).origin
    await page.route(
      (url) => url.origin !== origin && url.protocol.startsWith('http'),
      (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    )

    await page.goto(path)
    // Laisse les appels (simulés) se terminer et les toasts d'erreur disparaître : tant qu'un
    // toast s'anime, le contraste effectif de son texte est transitoire (voir contrast.spec.js).
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(600)
    const toast = page.locator('.Vue-Toastification__toast')
    if (await toast.count()) {
      await toast.first().waitFor({ state: 'detached', timeout: 8000 }).catch(() => {})
    }

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    const unexpected = results.violations
      .filter((v) => !KNOWN_VIOLATIONS.some((k) => k.rule === v.id && k.path === path))
      .map((v) => `${v.id} (${v.impact}) : ${v.nodes.map((n) => n.target.join(' ')).slice(0, 6).join(' | ')}${v.nodes.length > 6 ? ` … +${v.nodes.length - 6}` : ''}`)

    expect(unexpected).toEqual([])
  })
}

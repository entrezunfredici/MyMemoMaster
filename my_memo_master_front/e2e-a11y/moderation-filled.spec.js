/**
 * Audit RGAA navigateur de l'interface modérateur à l'état REMPLI : file de traitement avec des dossiers de
 * chaque statut, puis fenêtre d'examen ouverte (signalements, actions, confirmation en deux temps).
 * pages.spec.js n'audite que la page vide ; les badges de statut et les textes de la file n'y sont pas rendus.
 *
 * API simulée : session injectée dans localStorage, visite guidée marquée vue, endpoints de modération simulés.
 * Toutes les règles WCAG 2.1 A/AA d'axe-core sont contrôlées, contraste inclus.
 */
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.skip(!!process.env.A11Y_BASE_URL, 'API simulée : audit réservé à la version buildée locale')

const ITEMS = [
  { id: 5, reportIds: [5, 6, 7], contentType: 'resource', contentId: 4, classGroupId: 1, author: { userId: 13, name: 'Prof Martin' }, status: 'pending', priority: 'high', reportCount: 3, reporterCount: 3, reasons: ['harassment', 'spam'], contentSnapshot: { title: 'Cours litigieux' }, oldestAt: '2026-10-20T10:00:00Z', overdue: true, purgeAt: null, purgeImminent: false },
  { id: 8, reportIds: [8], contentType: 'section', contentId: 9, classGroupId: 1, author: { userId: 14, name: 'Prof Durand' }, status: 'in_review', priority: 'normal', reportCount: 1, reporterCount: 1, reasons: ['copyright'], contentSnapshot: { title: 'Chapitre copié' }, oldestAt: '2026-10-25T10:00:00Z', overdue: false, purgeAt: null, purgeImminent: false },
  { id: 9, reportIds: [9], contentType: 'resource', contentId: 10, classGroupId: 1, author: null, status: 'hidden', priority: 'normal', reportCount: 1, reporterCount: 1, reasons: ['illegal'], contentSnapshot: { title: 'Document masqué' }, oldestAt: '2026-10-10T10:00:00Z', overdue: false, purgeAt: '2026-11-20T10:00:00Z', purgeImminent: true },
]
const REPORT = {
  id: 5, contentType: 'resource', contentId: 4, reason: 'harassment', comment: 'Propos déplacés', status: 'pending',
  createdAt: '2026-10-20T10:00:00Z', reporter: { userId: 21, name: 'Élève Dupont' },
  contentSnapshot: { title: 'Cours litigieux', description: 'Texte du cours', originalName: 'cours.pdf' },
}
const DETAIL = {
  report: REPORT,
  reports: [
    REPORT,
    { ...REPORT, id: 6, reason: 'spam', comment: '', status: 'dismissed', decisionNote: 'Déjà traité', handler: { name: 'Modérateur' }, reporter: { userId: 22, name: 'Élève Martin' } },
  ],
  content: { id: 4 },
  author: { userId: 13, name: 'Prof Martin', isActive: true },
}

const session = (roleId) => ({
  token: 'a11y-audit', refreshToken: 'a11y-audit', authenticated: true,
  user: { userId: 50, id: 50, roleId, firstName: 'Audit', lastName: 'RGAA', email: 'audit@example.test' },
})

async function open(page, baseURL, roleId) {
  const origin = new URL(baseURL).origin
  await page.addInitScript((s) => localStorage.setItem('auth', JSON.stringify(s)), session(roleId))
  await page.route((url) => url.origin !== origin && url.protocol.startsWith('http'), (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^.*\/api\/v1\//, '')
    const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    if (path === 'users/50') return json(session(roleId).user)
    if (path.startsWith('onboardingState')) return json({ tour_seen: true })
    if (path === 'content-reports') return json({ data: { items: ITEMS, total: ITEMS.length, page: 1, limit: 20 } })
    if (path === 'content-reports/5') return json({ data: DETAIL })
    return json({ data: [] })
  })
  await page.goto('/moderation')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(600)
  const toast = page.locator('.Vue-Toastification__toast')
  if (await toast.count()) await toast.first().waitFor({ state: 'detached', timeout: 8000 }).catch(() => {})
}

const audit = async (page, scope) => {
  const builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
  if (scope) builder.include(scope)
  const results = await builder.analyze()
  return results.violations.map((v) =>
    `${v.id} (${v.impact}) : ${v.nodes.map((n) => {
      const d = n.any?.[0]?.data
      return `${n.target.join(' ')}${d?.contrastRatio ? ` [${d.contrastRatio}:1 ${d.fgColor} sur ${d.bgColor}]` : ''}`
    }).join(' | ')}`
  )
}

for (const [label, roleId] of [['modérateur (5)', 5], ['admin plateforme (1)', 1]]) {
  test(`Modération, ${label}, file remplie - WCAG 2.1 A/AA - aucune violation`, async ({ page, baseURL }) => {
    await open(page, baseURL, roleId)
    await expect(page.getByRole('row')).toHaveCount(ITEMS.length + 1)
    expect(await audit(page)).toEqual([])
  })

  test(`Modération, ${label}, dossier ouvert avec confirmation - WCAG 2.1 A/AA - aucune violation`, async ({ page, baseURL }) => {
    await open(page, baseURL, roleId)
    await page.getByRole('button', { name: 'Examiner « Cours litigieux »' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Décision' })).toBeVisible()
    // Le bouton de suspension n'existe que pour les rôles 1 et 4
    await expect(dialog.getByRole('button', { name: 'Suspendre le compte de l’auteur' })).toHaveCount(roleId === 1 ? 1 : 0)

    await dialog.getByRole('button', { name: 'Rejeter le signalement' }).click()
    await expect(dialog.getByRole('alert')).toHaveText('Le motif de la décision est requis.')
    await dialog.getByLabel(/Motif de la décision/).fill('Contenu supprimé car illégal')
    await dialog.getByRole('button', { name: 'Supprimer définitivement' }).click()
    await expect(dialog.getByRole('alert')).toContainText('irréversible')

    expect(await audit(page, '[role="dialog"]')).toEqual([])
  })
}

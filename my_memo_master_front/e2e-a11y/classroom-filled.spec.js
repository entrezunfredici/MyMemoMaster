/**
 * Audit RGAA navigateur des pages de classe à l'état REMPLI (vues étudiant et enseignant, avec ressources,
 * sections et rendus). pages.spec.js n'audite que l'état vide (API simulée sans donnée) : les listes de
 * contenus, donc le bouton « Signaler » et les textes secondaires qu'elles affichent, n'y sont jamais rendus.
 *
 * L'API est simulée : une session est injectée dans localStorage, la visite guidée est marquée vue
 * (sinon son overlay recouvre la page) et les endpoints de groupe renvoient quelques contenus.
 * Toutes les règles WCAG 2.1 A/AA d'axe-core sont contrôlées, contraste inclus. Les vues d'administration
 * (Plateforme, Établissement) sont auditées avec un établissement, ses statistiques et son contenu.
 */
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.skip(!!process.env.A11Y_BASE_URL, 'API simulée : audit réservé à la version buildée locale')

const TEACHER_ID = 10
const STUDENT_ID = 21

const GROUP = {
  id: 1, name: 'Maths', code: 'M1', level: 'Prépa',
  members: [
    { userId: TEACHER_ID, role: 'teacher', user: { userId: TEACHER_ID, name: 'Prof Martin', email: 'prof@example.test' } },
    { userId: STUDENT_ID, role: 'student', user: { userId: STUDENT_ID, name: 'Élève Dupont', email: 'eleve@example.test' } },
  ],
}
const RESOURCES = [
  { id: 1, title: 'Cours Analyse', type: 'cours', createdBy: TEACHER_ID, fileKey: 'k', mimeType: 'application/pdf', fileSize: 2048, creator: { name: 'Prof Martin' } },
  { id: 2, title: 'Sujet de TD', type: 'sujet', createdBy: 11, creator: { name: 'Autre enseignant' } },
]
const SECTIONS = [
  { id: 31, title: 'Chapitre 1', type: 'section', createdBy: TEACHER_ID, description: 'Introduction au cours', dueDate: '2026-12-15' },
  { id: 32, title: 'DM 1', type: 'rendu', createdBy: TEACHER_ID, description: 'Devoir maison', dueDate: '2026-12-01' },
]

function sessionFor(userId, roleId) {
  return {
    token: 'a11y-audit', refreshToken: 'a11y-audit', authenticated: true,
    user: { userId, id: userId, roleId, firstName: 'Audit', lastName: 'RGAA', email: 'audit@example.test' },
  }
}

const ETAB = { id: 1, name: 'Lycée Victor Hugo', code: 'LVH', adminId: 30, admin: { userId: 30, name: 'Gérant Test', email: 'gerant@example.test' } }
const INVITATIONS = [
  { id: 1, role: 'student', classGroupId: 1, classGroup: { name: 'Maths' }, invitedBy: { name: 'Prof Martin' } },
]

async function audit(page, baseURL, session, afterLoad) {
  const origin = new URL(baseURL).origin
  await page.addInitScript((s) => localStorage.setItem('auth', JSON.stringify(s)), session)
  await page.route((url) => url.origin !== origin && url.protocol.startsWith('http'), (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^.*\/api\/v1\//, '')
    const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    if (path === `users/${session.user.userId}`) return json(session.user)
    if (path.startsWith('onboardingState')) return json({ tour_seen: true })
    if (path === 'invitations/mine') return json({ data: INVITATIONS })
    if (path === 'etablissements') return json({ data: [ETAB] })
    if (path === 'etablissements/mine' || path === 'etablissements/1') return json({ data: ETAB })
    if (path === 'etablissements/1/stats') return json({ data: { groupCount: 1, memberCount: 2, teacherCount: 1, studentCount: 1, pendingInvitations: 3 } })
    if (path === 'etablissements/1/content') return json({ data: { resources: RESOURCES.map((r) => ({ ...r, creator: { name: 'Prof Martin', email: 'prof@example.test' }, classGroup: { id: 1, name: 'Maths' } })), sections: SECTIONS.map((x) => ({ ...x, creator: { name: 'Prof Martin', email: 'prof@example.test' }, classGroup: { id: 1, name: 'Maths' } })) } })
    if (path === 'class-groups') return json({ data: [GROUP] })
    if (path.endsWith('/resources')) return json({ data: RESOURCES })
    if (path.endsWith('/sections')) return json({ data: SECTIONS })
    return json({ data: [] })
  })

  await page.goto('/classroom')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(600)
  const toast = page.locator('.Vue-Toastification__toast')
  if (await toast.count()) await toast.first().waitFor({ state: 'detached', timeout: 8000 }).catch(() => {})

  if (afterLoad) await afterLoad()
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  return results.violations.map((v) =>
    `${v.id} (${v.impact}) : ${v.nodes.map((n) => {
      const d = n.any?.[0]?.data
      return `${n.target.join(' ')}${d?.contrastRatio ? ` [${d.contrastRatio}:1 ${d.fgColor} sur ${d.bgColor}]` : ''}`
    }).join(' | ')}`
  )
}

test('Classe, vue étudiant, état rempli - WCAG 2.1 A/AA - aucune violation', async ({ page, baseURL }) => {
  const violations = await audit(page, baseURL, sessionFor(STUDENT_ID, 2))
  await expect(page.getByRole('button', { name: /^Signaler «/ }).first()).toBeVisible()
  expect(violations).toEqual([])
})

test('Classe, vue enseignant, état rempli - WCAG 2.1 A/AA - aucune violation', async ({ page, baseURL }) => {
  const violations = await audit(page, baseURL, sessionFor(TEACHER_ID, 3))
  await expect(page.getByText('Documents partagés').first()).toBeVisible()
  expect(violations).toEqual([])
})

for (const view of ['Plateforme', 'Établissement']) {
  test(`Classe, vue ${view} (admin plateforme), état rempli - WCAG 2.1 A/AA - aucune violation`, async ({ page, baseURL }) => {
    const violations = await audit(page, baseURL, sessionFor(1, 1), async () => {
      await page.getByRole('button', { name: view, exact: true }).click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(400)
    })
    expect(violations).toEqual([])
  })
}

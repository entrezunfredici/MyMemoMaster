/**
 * Audit RGAA du calendrier AVEC DONNÉES (pages.spec.js ne voit que sa version vide) : le mois avec
 * des événements (pastilles, « +N autres »), le panneau d'un jour, la fiche d'un événement, la
 * fenêtre de création de séance, la vue année, l'onglet To-do et l'agenda rempli.
 *
 * API simulée : aucune dépendance à un backend. Dates calculées sur le mois courant pour que les
 * événements soient toujours visibles à l'ouverture.
 */
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.skip(!!process.env.A11Y_BASE_URL, 'API simulée : audit réservé à la version buildée locale')

const SESSION = {
  token: 'a11y-audit',
  refreshToken: 'a11y-audit',
  authenticated: true,
  user: { userId: 1, id: 1, roleId: 1, firstName: 'Audit', lastName: 'RGAA', email: 'audit@example.test' },
}

const now = new Date()
const day = (d) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

const API = {
  'users/1': { userId: 1, id: 1, roleId: 1, firstName: 'Audit', lastName: 'RGAA', email: 'audit@example.test' },
  'calendar-events': { data: [{ id: 1, name: 'Cours de maths', occurrences: [{ date: day(9) }] }] },
  deadlines: { data: [{ id: 2, name: 'Devoir de physique', dueDate: day(9), dueTime: '18:30:00' }] },
  'revision-sessions': {
    data: [
      { id: 3, name: 'Révision chimie', date: day(9), startTime: '09:00:00', endTime: '10:30:00', leitnerSystem: { idSystem: 7, name: 'Chimie' } },
      { id: 4, name: 'Révision libre', date: day(20) },
    ],
  },
  'planning/priorities': {
    data: {
      overdue: [{ id: 'o1', type: 'deadline', name: 'Rendu en retard', daysOverdue: 2 }],
      today: [{ id: 't1', type: 'revision_session', name: 'Séance du jour', startTime: '14:00:00' }],
      upcoming: [{ id: 'u1', type: 'deadline', name: 'Prochain rendu', daysUntil: 3 }],
    },
  },
  leitnersystems: [{ idSystem: 7, name: 'Chimie' }],
  onboardingState: { tour_seen: true, checklist: {} },
}

test('calendrier avec données - WCAG 2.1 A/AA - tous les états', async ({ page, baseURL }) => {
  await page.addInitScript((session) => localStorage.setItem('auth', JSON.stringify(session)), SESSION)
  const origin = new URL(baseURL).origin
  await page.route(
    (url) => url.origin !== origin && url.protocol.startsWith('http'),
    (route) => {
      const { pathname } = new URL(route.request().url())
      const key = Object.keys(API).find((k) => pathname.includes('/' + k))
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(key ? API[key] : []) })
    }
  )

  const problems = []
  const audit = async (state) => {
    // les fenêtres et le bouton actif ont une transition de 150 ms : axe mesurerait un état intermédiaire
    await page.waitForTimeout(400)
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    for (const v of results.violations) {
      problems.push(`[${state}] ${v.id} (${v.impact}) : ${v.nodes.map((n) => n.target.join(' ') + ' → ' + (n.any[0]?.message || '').slice(0, 130)).slice(0, 4).join(' | ')}`)
    }
  }

  await page.goto('/calendar')
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('.month-day-cell')
  await page.waitForTimeout(500)

  // Les données simulées sont bien affichées (sinon l'audit ne prouverait rien)
  await expect(page.locator('.event-pill').first()).toBeVisible()
  await expect(page.locator('.more-badge').first()).toBeVisible()
  await audit('mois avec événements')

  await page.getByRole('button', { name: /^9 .*3 événements$/ }).click()
  await expect(page.locator('.detail-panel.open')).toBeVisible()
  await audit('panneau du jour ouvert')

  await page.locator('.ev-card').nth(2).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await audit('fiche d’une séance de révision')
  await page.getByRole('dialog').getByRole('button', { name: 'Fermer' }).click()

  await page.locator('.detail-add').click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await audit('création d’une séance')
  await page.getByRole('button', { name: 'Annuler' }).click()

  await page.getByRole('button', { name: 'To-do' }).click()
  await audit('onglet To-do')
  await page.getByRole('button', { name: 'Agenda' }).click()

  await page.getByRole('button', { name: 'Année' }).click()
  await expect(page.locator('.month-block').first()).toBeVisible()
  await audit('vue année')

  expect(problems).toEqual([])
})

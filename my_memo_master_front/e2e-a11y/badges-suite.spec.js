/**
 * Audit RGAA navigateur des ajouts de la suite gamification : anneau de l'objectif du jour (accueil),
 * modale d'obtention d'un badge, ligne « Obtenu avec » du détail, puis la page « Mes badges » et l'accueil
 * sur un téléphone (Pixel 5, interface mobile). L'audit mobile vérifie aussi l'absence de défilement
 * horizontal de la page (WCAG 1.4.10, reflow à 320-400 px).
 *
 * L'API est simulée (comme badges-filled.spec.js) ; toutes les règles WCAG 2.1 A/AA d'axe-core sont
 * contrôlées, contraste inclus.
 */
import { test, expect, devices } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.skip(!!process.env.A11Y_BASE_URL, 'API simulée : audit réservé à la version buildée locale')

const USER_ID = 21

const badge = (code, category, rarity, icon, label, description, earned, current, target, earnedSubjects = []) => ({
  code, category, rarity, icon, label, description, scopable: true, linkedSubjectIds: [], earnedSubjectIds: earnedSubjects.map((s) => s.subjectId), earnedSubjects,
  earned, earnedAt: earned ? '2026-10-12T10:00:00Z' : null, seenAt: earned ? '2026-10-13T10:00:00Z' : null,
  progress: { current, target },
})
const BADGES = [
  badge('tenTests', 'exercises', 'rare', '📚', '10 exercices', "Compléter 10 séries d'exercices", true, 10, 10, [
    { subjectId: 1, name: 'Mathématiques' },
    { subjectId: 2, name: 'Physique' },
  ]),
  badge('streak30', 'regularity', 'rare', '🏆', '30 jours de suite', 'Pratiquer 30 jours consécutifs', false, 12, 30),
]
const SUMMARY = { level: { name: 'Débutant', next: { name: 'Apprenti', min: 5 } }, earnedCount: 1, totalCount: 14, streakCurrent: 12, streakBest: 21 }
const SETTINGS = { dailyGoalCards: 10, dailyGoalExercises: 2, streakReminderEnabled: true, badgesVisibleToTeachers: false, animationsEnabled: true, zenMode: false }
const DAILY_GOAL = { date: '2026-11-16', cards: { goal: 10, done: 4 }, exercises: { goal: 2, done: 1 }, achieved: false }
const RECENT = [
  { code: 'streak7', label: '7 jours de suite', icon: '🔥', rarity: 'common', description: 'Pratiquer 7 jours consécutifs' },
  { code: 'perfectScore', label: 'Score parfait', icon: '⭐', rarity: 'epic', description: 'Obtenir 100 % sur une série' },
]

const day = (offset) => {
  const d = new Date()
  d.setDate(d.getDate() - offset)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const activity = () => {
  const offset = (new Date().getDay() + 6) % 7 + 11 * 7
  const active = [0, 1, 2, 3, 5, 6, 8, 9, 12, 13, 20, 21, 22, 40, 41, 60].map(day)
  return { from: day(offset), to: day(0), today: day(0), weeks: 12, activeDates: active.filter((d) => d >= day(offset)), activeDaysLast30: 12, streakCurrent: 12, streakBest: 21 }
}

async function open(page, baseURL, path, { recent = [] } = {}) {
  const origin = new URL(baseURL).origin
  const user = { userId: USER_ID, id: USER_ID, roleId: 2, firstName: 'Audit', lastName: 'RGAA', email: 'audit@example.test' }
  const session = { token: 'a11y-audit', refreshToken: 'a11y-audit', authenticated: true, user }
  await page.addInitScript((value) => localStorage.setItem('auth', JSON.stringify(value)), session)
  await page.route((url) => url.origin !== origin && url.protocol.startsWith('http'), (route) => {
    const apiPath = new URL(route.request().url()).pathname.replace(/^.*\/api\/v1\//, '')
    const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    if (apiPath === `users/${USER_ID}`) return json(user)
    if (apiPath.startsWith('onboardingState')) return json({ tour_seen: true })
    if (apiPath === 'badges') return json(BADGES)
    if (apiPath === 'badges/me/summary') return json(SUMMARY)
    if (apiPath === 'badges/me/seen') return json({ message: 'ok', updated: 2 })
    if (apiPath === 'badges/me/recent') return json(recent)
    if (apiPath === 'badges/me/daily-goal') return json(DAILY_GOAL)
    if (apiPath === 'badges/me/profile') return json({ titleCode: null, showcaseCodes: [] })
    if (apiPath === 'badges/me/activity') return json(activity())
    if (apiPath === 'badges/me/settings') return json(SETTINGS)
    return json({ data: [] })
  })
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
  const toast = page.locator('.Vue-Toastification__toast')
  if (await toast.count()) await toast.first().waitFor({ state: 'detached', timeout: 8000 }).catch(() => {})
}

async function audit(page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  return results.violations.map((v) =>
    `${v.id} (${v.impact}) : ${v.nodes.map((n) => {
      const d = n.any?.[0]?.data
      return `${n.target.join(' ')}${d?.contrastRatio ? ` [${d.contrastRatio}:1 ${d.fgColor} sur ${d.bgColor}]` : ''}`
    }).join(' | ')}`
  )
}

const hasHorizontalScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)

test.describe('ordinateur', () => {
  test('Accueil, anneau de l\'objectif du jour - WCAG 2.1 A/AA - aucune violation', async ({ page, baseURL }) => {
    await open(page, baseURL, '/')
    const bar = page.getByRole('progressbar', { name: 'Objectif du jour' })
    await expect(bar).toBeVisible()
    await expect(bar).toHaveAttribute('aria-valuenow', '42')
    await expect(page.getByText('4 / 10 cartes · 1 / 2 exercices')).toBeVisible()
    expect(await audit(page)).toEqual([])
  })

  test('Accueil, modale d\'obtention d\'un badge - WCAG 2.1 A/AA - aucune violation, Échap la ferme', async ({ page, baseURL }) => {
    await open(page, baseURL, '/', { recent: RECENT })
    const dialog = page.getByRole('dialog', { name: '7 jours de suite' })
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('Nouveau badge (1 / 2)')
    expect(await audit(page)).toEqual([])

    await dialog.getByRole('button', { name: 'Suivant' }).click()
    await expect(page.getByRole('dialog', { name: 'Score parfait' })).toBeVisible()
    expect(await audit(page)).toEqual([])

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('Mes badges, détail d\'un badge - « Obtenu avec » liste les matières - aucune violation', async ({ page, baseURL }) => {
    await open(page, baseURL, '/profile/badges')
    await page.getByRole('button', { name: /^10 exercices, rare/ }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Mathématiques, Physique')).toBeVisible()
    expect(await audit(page)).toEqual([])
  })
})

test.describe('téléphone (Pixel 5)', () => {
  // CHOIX: seules les caractéristiques d'écran et le user-agent (qui déclenche la disposition mobile de l'application)
  // RAISON: `defaultBrowserType` du profil d'appareil est refusé par Playwright dans un groupe de tests.
  const { userAgent, viewport, deviceScaleFactor, isMobile, hasTouch } = devices['Pixel 5']
  test.use({ userAgent, viewport, deviceScaleFactor, isMobile, hasTouch })

  test('Accueil mobile avec anneau - WCAG 2.1 A/AA - aucune violation, pas de défilement horizontal', async ({ page, baseURL }) => {
    await open(page, baseURL, '/')
    await expect(page.getByRole('progressbar', { name: 'Objectif du jour' })).toBeVisible()
    expect(await hasHorizontalScroll(page)).toBe(false)
    expect(await audit(page)).toEqual([])
  })

  test('Modale d\'obtention sur téléphone - tient dans l\'écran - aucune violation', async ({ page, baseURL }) => {
    await open(page, baseURL, '/', { recent: RECENT })
    const dialog = page.getByRole('dialog', { name: '7 jours de suite' })
    await expect(dialog).toBeVisible()
    const box = await dialog.locator('.modal-panel').boundingBox()
    const viewport = page.viewportSize()
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
    expect(await audit(page)).toEqual([])
  })

  test('Mes badges mobile, état rempli - WCAG 2.1 A/AA - aucune violation, pas de défilement horizontal', async ({ page, baseURL }) => {
    await open(page, baseURL, '/profile/badges')
    await expect(page.getByRole('heading', { name: 'Mon activité' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Réglages de gamification' })).toBeVisible()
    expect(await hasHorizontalScroll(page)).toBe(false)
    expect(await audit(page)).toEqual([])
  })

  test('Mes badges mobile, détail d\'un badge - aucune violation', async ({ page, baseURL }) => {
    await open(page, baseURL, '/profile/badges')
    await page.getByRole('button', { name: /^10 exercices, rare/ }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Mathématiques, Physique')).toBeVisible()
    expect(await audit(page)).toEqual([])
  })
})

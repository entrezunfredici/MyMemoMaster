/**
 * Audit RGAA navigateur de la gamification « du quotidien » : flamme de série dans l'en-tête (ordinateur et
 * téléphone, séries prolongée / à prolonger, absente en mode zen) et panneau d'administration des liens
 * badge ↔ matières.
 *
 * L'API est simulée (comme badges-suite.spec.js) ; toutes les règles WCAG 2.1 A/AA d'axe-core sont
 * contrôlées, contraste inclus. Le message de fin de session n'est pas audité ici : il demande un parcours
 * complet (cartes dues ou exercice corrigé) ; il est couvert par axe-core en jsdom (test/components/GamificationDaily.test.js).
 */
import { test, expect, devices } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.skip(!!process.env.A11Y_BASE_URL, 'API simulée : audit réservé à la version buildée locale')

const USER_ID = 22

const BADGES = [
  { code: 'subjectExplorer', category: 'exploration', rarity: 'rare', icon: '🧭', label: 'Explorateur', description: 'Pratiquer plusieurs matières', scopable: true, linkedSubjectIds: [1], earnedSubjectIds: [], earnedSubjects: [], earned: false, earnedAt: null, seenAt: null, progress: { current: 1, target: 3 } },
  { code: 'tenTests', category: 'exercises', rarity: 'common', icon: '📚', label: '10 exercices', description: "Compléter 10 séries d'exercices", scopable: true, linkedSubjectIds: [], earnedSubjectIds: [], earnedSubjects: [], earned: false, earnedAt: null, seenAt: null, progress: { current: 2, target: 10 } },
  { code: 'streak30', category: 'regularity', rarity: 'rare', icon: '🏆', label: '30 jours de suite', description: 'Pratiquer 30 jours consécutifs', scopable: false, linkedSubjectIds: [], earnedSubjectIds: [], earnedSubjects: [], earned: false, earnedAt: null, seenAt: null, progress: { current: 12, target: 30 } },
]
const SUBJECTS = [{ subjectId: 1, name: 'Mathématiques' }, { subjectId: 2, name: 'Physique' }, { subjectId: 3, name: 'Histoire' }]
const SETTINGS = { dailyGoalCards: 0, dailyGoalExercises: 0, streakReminderEnabled: false, badgesVisibleToTeachers: false, animationsEnabled: true, zenMode: false, timezone: 'Europe/Paris' }

async function open(page, baseURL, path, { roleId = 2, summary = {}, settings = {} } = {}) {
  const origin = new URL(baseURL).origin
  const user = { userId: USER_ID, id: USER_ID, roleId, firstName: 'Audit', lastName: 'RGAA', email: 'audit@example.test' }
  const session = { token: 'a11y-audit', refreshToken: 'a11y-audit', authenticated: true, user }
  await page.addInitScript((value) => localStorage.setItem('auth', JSON.stringify(value)), session)
  await page.route((url) => url.origin !== origin && url.protocol.startsWith('http'), (route) => {
    const apiPath = new URL(route.request().url()).pathname.replace(/^.*\/api\/v1\//, '')
    const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    if (apiPath === `users/${USER_ID}`) return json(user)
    if (apiPath.startsWith('onboardingState')) return json({ tour_seen: true })
    if (apiPath === 'badges') return json(BADGES)
    if (apiPath === 'badges/me/summary') {
      return json({ level: { name: 'Débutant', next: null }, earnedCount: 1, totalCount: 14, streakCurrent: 12, streakBest: 21, practicedToday: true, freezes: { available: 1, max: 2, progress: 6, every: 14 }, ...summary })
    }
    if (apiPath === 'badges/me/recent') return json([])
    if (apiPath === 'badges/me/settings') return json({ ...SETTINGS, ...settings })
    if (apiPath === 'subjects') return json(SUBJECTS)
    if (apiPath === 'roles') return json([{ roleId: 1, name: 'Administrateur' }])
    return json({ data: [] })
  })
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
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
  test('En-tête, flamme de série prolongée - nommée, WCAG 2.1 A/AA - aucune violation', async ({ page, baseURL }) => {
    await open(page, baseURL, '/')
    const flame = page.getByTestId('streak-flame')
    await expect(flame).toBeVisible()
    await expect(flame).toHaveAttribute('aria-label', /Série de 12 jours, déjà prolongée aujourd'hui/)
    // Gel de série (A3) : affiché et annoncé
    await expect(page.getByTestId('streak-freezes')).toContainText('1')
    await expect(flame).toHaveAttribute('aria-label', /1 gel de série en réserve/)
    expect(await audit(page)).toEqual([])
  })

  test('En-tête, flamme de série à prolonger (pointillé) - libellé explicite - aucune violation', async ({ page, baseURL }) => {
    await open(page, baseURL, '/', { summary: { practicedToday: false } })
    const flame = page.getByTestId('streak-flame')
    await expect(flame).toHaveAttribute('aria-label', /la prolonge/)
    await expect(flame).toHaveClass(/border-dashed/)
    expect(await audit(page)).toEqual([])
  })

  test('En-tête, mode zen - aucune flamme', async ({ page, baseURL }) => {
    await open(page, baseURL, '/', { settings: { zenMode: true } })
    await expect(page.getByTestId('streak-flame')).toHaveCount(0)
  })

  test('En-tête, série nulle - aucune flamme (pas de « 0 jour »)', async ({ page, baseURL }) => {
    await open(page, baseURL, '/', { summary: { streakCurrent: 0, practicedToday: false } })
    await expect(page.getByTestId('streak-flame')).toHaveCount(0)
  })

  test('Administration, onglet Badges - liens badge ↔ matières - WCAG 2.1 A/AA - aucune violation', async ({ page, baseURL }) => {
    await open(page, baseURL, '/admin', { roleId: 1 })
    await page.getByRole('button', { name: 'Badges', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Badges et matières' })).toBeVisible()
    // Seuls les badges restreignables sont listés
    await expect(page.getByRole('group', { name: /Explorateur/ })).toBeVisible()
    await expect(page.getByText('30 jours de suite')).toHaveCount(0)
    await expect(page.getByRole('checkbox', { name: 'Mathématiques' }).first()).toBeChecked()
    expect(await audit(page)).toEqual([])
  })
})

test.describe('téléphone (Pixel 5)', () => {
  const { userAgent, viewport, deviceScaleFactor, isMobile, hasTouch } = devices['Pixel 5']
  test.use({ userAgent, viewport, deviceScaleFactor, isMobile, hasTouch })

  test('En-tête mobile, flamme et cloche - WCAG 2.1 A/AA - aucune violation, pas de défilement horizontal', async ({ page, baseURL }) => {
    await open(page, baseURL, '/')
    await expect(page.getByTestId('streak-flame')).toBeVisible()
    expect(await hasHorizontalScroll(page)).toBe(false)
    expect(await audit(page)).toEqual([])
  })

  test('Administration mobile, onglet Badges - aucune violation, pas de défilement horizontal', async ({ page, baseURL }) => {
    await open(page, baseURL, '/admin', { roleId: 1 })
    await page.getByRole('button', { name: 'Badges', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Badges et matières' })).toBeVisible()
    expect(await hasHorizontalScroll(page)).toBe(false)
    expect(await audit(page)).toEqual([])
  })
})

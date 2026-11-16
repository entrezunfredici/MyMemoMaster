/**
 * Audit RGAA navigateur de la page « Mes badges » (/profile/badges) à l'état REMPLI : badges obtenus,
 * en cours et nouveaux, titre, vitrine, calendrier d'activité et réglages, puis vitrine en modification,
 * détail d'un badge et mode zen. pages.spec.js n'audite que l'état vide : les listes, le calendrier et le
 * contraste des textes secondaires n'y sont jamais rendus.
 *
 * L'API est simulée : une session est injectée dans localStorage, la visite guidée est marquée vue
 * et les endpoints de badges renvoient des données. Toutes les règles WCAG 2.1 A/AA d'axe-core sont
 * contrôlées, contraste inclus.
 */
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.skip(!!process.env.A11Y_BASE_URL, 'API simulée : audit réservé à la version buildée locale')

const USER_ID = 21

const badge = (code, category, rarity, icon, label, description, earned, current, target) => ({
  code, category, rarity, icon, label, description, scopable: false, linkedSubjectIds: [], earnedSubjectIds: [],
  earned, earnedAt: earned ? '2026-10-12T10:00:00Z' : null, seenAt: earned && code !== 'perfectScore' ? '2026-10-13T10:00:00Z' : null,
  progress: { current, target },
})
const BADGES = [
  badge('streak7', 'regularity', 'common', '🔥', '7 jours de suite', 'Pratiquer 7 jours consécutifs', true, 7, 7),
  badge('streak30', 'regularity', 'rare', '🏆', '30 jours de suite', 'Pratiquer 30 jours consécutifs', false, 12, 30),
  badge('perfectScore', 'exercises', 'epic', '⭐', 'Score parfait', 'Obtenir 100 % sur une série', true, 1, 1),
  badge('tenTests', 'exercises', 'rare', '📚', '10 exercices', "Compléter 10 séries d'exercices", false, 4, 10),
  badge('leitnerMastery', 'memorization', 'common', '🧠', 'Maîtrise Leitner', 'Maîtriser la moitié de tes cartes', false, 3, 20),
]
const SUMMARY = { level: { name: 'Débutant', next: { name: 'Apprenti', min: 5 } }, earnedCount: 2, totalCount: 14, streakCurrent: 12, streakBest: 21 }
const SETTINGS = { dailyGoalCards: 10, dailyGoalExercises: 0, streakReminderEnabled: false, badgesVisibleToTeachers: false, animationsEnabled: true, zenMode: false }

const day = (offset) => {
  const d = new Date()
  d.setDate(d.getDate() - offset)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
// 12 semaines, lundi → dimanche, jusqu'à aujourd'hui
const activity = () => {
  const today = new Date()
  const offset = (today.getDay() + 6) % 7 + 11 * 7
  const active = [0, 1, 2, 3, 5, 6, 8, 9, 12, 13, 20, 21, 22, 40, 41, 60].map(day)
  return { from: day(offset), to: day(0), today: day(0), weeks: 12, activeDates: active.filter((d) => d >= day(offset)), activeDaysLast30: 12, streakCurrent: 12, streakBest: 21 }
}

function session() {
  return {
    token: 'a11y-audit', refreshToken: 'a11y-audit', authenticated: true,
    user: { userId: USER_ID, id: USER_ID, roleId: 2, firstName: 'Audit', lastName: 'RGAA', email: 'audit@example.test' },
  }
}

async function open(page, baseURL, { zen = false } = {}) {
  const origin = new URL(baseURL).origin
  const s = session()
  await page.addInitScript((value) => localStorage.setItem('auth', JSON.stringify(value)), s)
  await page.route((url) => url.origin !== origin && url.protocol.startsWith('http'), (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^.*\/api\/v1\//, '')
    const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    if (path === `users/${USER_ID}`) return json(s.user)
    if (path.startsWith('onboardingState')) return json({ tour_seen: true })
    if (path === 'badges') return json(BADGES)
    if (path === 'badges/me/summary') return json(SUMMARY)
    if (path === 'badges/me/seen') return json({ message: 'ok', updated: 1 })
    if (path === 'badges/me/profile') return json({ titleCode: 'streak7', showcaseCodes: ['streak7', 'perfectScore'] })
    if (path === 'badges/me/activity') return json(activity())
    if (path === 'badges/me/settings') return json({ ...SETTINGS, zenMode: zen })
    return json({ data: [] })
  })
  await page.goto('/profile/badges')
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

test('Mes badges, état rempli - WCAG 2.1 A/AA - aucune violation', async ({ page, baseURL }) => {
  await open(page, baseURL)
  await expect(page.getByRole('heading', { name: 'Ma vitrine' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Mon activité' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Réglages de gamification' })).toBeVisible()
  expect(await audit(page)).toEqual([])
})

test('Mes badges, interrupteur activé - fond coloré visible (pas transparent)', async ({ page, baseURL }) => {
  await open(page, baseURL)
  // « Animations d'obtention » est activé dans les réglages simulés : sans fond, curseur blanc sur blanc
  const background = await page
    .locator('label.switch:has(input[aria-label="Animations d\'obtention"]) .slider')
    .evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(background).not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/)
  expect(background).toBe('rgb(30, 59, 161)')
})

test('Mes badges, vitrine en modification - WCAG 2.1 A/AA - aucune violation', async ({ page, baseURL }) => {
  await open(page, baseURL)
  await page.getByRole('button', { name: 'Modifier' }).click()
  await expect(page.getByRole('button', { name: 'Enregistrer' })).toBeVisible()
  expect(await audit(page)).toEqual([])
})

test('Mes badges, détail d\'un badge obtenu - WCAG 2.1 A/AA - aucune violation', async ({ page, baseURL }) => {
  await open(page, baseURL)
  await page.getByRole('button', { name: /^7 jours de suite, commun/ }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Choisir comme titre' }).or(page.getByRole('button', { name: 'Retirer le titre' }))).toBeVisible()
  expect(await audit(page)).toEqual([])
})

test('Mes badges, mode zen - WCAG 2.1 A/AA - aucune violation', async ({ page, baseURL }) => {
  await open(page, baseURL, { zen: true })
  await expect(page.getByRole('heading', { name: 'Mode zen activé' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tous les badges' })).toHaveCount(0)
  expect(await audit(page)).toEqual([])
})

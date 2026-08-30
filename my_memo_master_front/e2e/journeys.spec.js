/**
 * Parcours E2E authentifiés — QA.03 (étudiant) et QA.05 (enseignant).
 *
 * Ce que ces tests prouvent réellement :
 *   - l'authentification aboutit et établit une session utilisable ;
 *   - les routes `private: true` deviennent accessibles avec cette session,
 *     alors qu'elles renvoient vers /auth sans elle ;
 *   - l'application distingue effectivement les rôles : la même URL
 *     (/classroom) rend deux vues différentes selon le rôle du compte.
 *
 * Ce qu'ils NE prouvent pas : la justesse fonctionnelle de chaque écran. Ce
 * sont des parcours de bout en bout, pas des tests de comportement métier —
 * ceux-ci sont couverts par les 1 554 tests API et 689 tests front.
 *
 * Prérequis : stack docker-compose lancée avec SEED_E2E_USERS=true.
 * Voir playwright.e2e.config.js.
 */
import { test, expect } from '@playwright/test'

const STUDENT = {
  email: process.env.E2E_STUDENT_EMAIL || 'e2e-student@mymemomaster.local',
  password: process.env.E2E_STUDENT_PASSWORD || 'E2eStudent1234!',
}

const TEACHER = {
  email: process.env.E2E_TEACHER_EMAIL || 'e2e-teacher@mymemomaster.local',
  password: process.env.E2E_TEACHER_PASSWORD || 'E2eTeacher1234!',
}

/** Connexion par le formulaire réel, pas par injection de jeton. */
async function login(page, { email, password }) {
  await page.goto('/auth')
  await page.locator('#login-email').fill(email)
  await page.locator('#login-password').fill(password)
  await page.getByRole('button', { name: 'Valider' }).click()

  // La connexion redirige vers '/' (authStore.login(..., '/')). Attendre la
  // redirection plutôt qu'un délai fixe : c'est elle qui atteste que la
  // session est établie.
  await expect(page).toHaveURL(/\/$/, { timeout: 15000 })
}

test.describe('QA.03 — parcours étudiant', () => {
  test('se connecte et atteint les écrans privés', async ({ page }) => {
    await login(page, STUDENT)

    // Les routes private:true ne doivent plus renvoyer vers /auth.
    for (const path of ['/flashcards', '/subjects', '/calendar']) {
      await page.goto(path)
      await expect(page).toHaveURL(new RegExp(`${path}$`))
      expect(page.url()).not.toContain('/auth')
    }
  })

  test('voit la vue ÉTUDIANT de l espace classe', async ({ page }) => {
    await login(page, STUDENT)
    await page.goto('/classroom')

    // ClassroomPage choisit sa vue selon le rôle (defaultView()).
    // Un compte roleId 2 doit obtenir ClassroomEtudiantView.
    await expect(
      page.getByRole('heading', { name: 'Rendus à remettre' })
    ).toBeVisible({ timeout: 15000 })

    // Et surtout PAS la vue enseignant : c'est cette assertion négative qui
    // fait la différence entre « la page s'affiche » et « le rôle est respecté ».
    await expect(
      page.getByRole('heading', { name: 'Analyse pédagogique' })
    ).toHaveCount(0)
  })
})

test.describe('QA.05 — parcours enseignant', () => {
  test('se connecte et voit la vue ENSEIGNANT de l espace classe', async ({ page }) => {
    await login(page, TEACHER)
    await page.goto('/classroom')

    // Compte roleId 3 -> isEnseignant -> ClassroomEnseignantView.
    await expect(
      page.getByRole('heading', { name: 'Analyse pédagogique' })
    ).toBeVisible({ timeout: 15000 })

    await expect(
      page.getByRole('heading', { name: 'Rendus à remettre' })
    ).toHaveCount(0)
  })

  test('atteint le tableau de progression', async ({ page }) => {
    await login(page, TEACHER)
    await page.goto('/kpi')
    await expect(page).toHaveURL(/\/kpi$/)
    expect(page.url()).not.toContain('/auth')
  })
})

test.describe('Contrôle négatif — sans session', () => {
  test('une route privée renvoie vers /auth', async ({ page }) => {
    // Sans ce test, rien ne prouve que les assertions ci-dessus doivent quoi
    // que ce soit à l'authentification : une route ouverte les satisferait
    // tout autant.
    await page.goto('/flashcards')
    await expect(page).toHaveURL(/\/auth/, { timeout: 15000 })
  })
})

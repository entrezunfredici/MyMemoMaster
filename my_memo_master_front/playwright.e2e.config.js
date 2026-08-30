// Parcours E2E authentifiés — QA.03 (étudiant) et QA.05 (enseignant).
//
// Config SÉPARÉE de playwright.config.js, qui sert l'audit de contraste RGAA.
// Les deux n'ont ni la même cible ni les mêmes prérequis :
//
//   playwright.config.js       -> `vite preview` sur dist/, AUCUNE API
//   playwright.e2e.config.js   -> la stack docker-compose complète
//
// Les mélanger obligerait chaque test à composer avec l'absence d'API, ce qui
// est justement ce qui rendait l'audit de contraste non déterministe.
//
// PRÉREQUIS — la stack doit tourner AVANT (pas de webServer ici, on ne veut
// pas que Playwright pilote docker-compose) :
//
//   SEED_E2E_USERS=true RATE_LIMIT_DISABLED=true \
//     docker compose --profile dev up -d --build
//
// Les comptes viennent du seeder 20260829000001-seed-e2e-users.js.
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // Monte le groupe classe et ses membres via l'API avant les parcours :
  // sans groupe, /classroom affiche « Aucun groupe. » pour tous les roles et
  // les vues etudiant/enseignant deviennent indiscernables.
  globalSetup: './e2e/global-setup.js',
  // Séquentiel : les deux parcours partagent la même base et les mêmes
  // comptes. Les paralléliser rendrait les échecs difficiles à imputer.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    // Traefik sert le front sur :80 et route /api vers l'API (docker-compose).
    baseURL: process.env.E2E_BASE_URL || 'http://localhost',
    // Traces conservées au premier échec : sans elles, diagnostiquer un
    // parcours rouge en CI revient à relancer à l'aveugle.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})

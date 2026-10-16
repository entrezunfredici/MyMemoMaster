/* eslint-disable no-undef */
// Audit navigateur RGAA — complète scripts/audit-a11y.mjs (statique) et
// test/a11y/axe.test.js (runtime jsdom, composants isolés). jsdom ne calcule
// pas les styles : la règle color-contrast d'axe-core y est désactivée
// (voir test/a11y/axe.test.js). Playwright fournit le vrai moteur de rendu
// (Chromium) nécessaire pour la mesurer, sur les pages complètes.
//
// Limité aux pages publiques (meta.private: false dans router/routes.js) qui
// ne font aucun appel API au montage : le serveur de preview n'a pas d'API
// derrière lui. Voir e2e-a11y/contrast.spec.js pour la liste et pourquoi.
import { defineConfig, devices } from '@playwright/test'

// A11Y_BASE_URL : audit d'un site DÉJÀ DÉPLOYÉ (workflow a11y-live.yml) — pas de serveur de preview
// local, et seuls les parcours sans API simulée tournent (e2e-a11y/contrast.spec.js, live-public.spec.js).
const LIVE_URL = process.env.A11Y_BASE_URL

export default defineConfig({
  testDir: './e2e-a11y',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: LIVE_URL || 'http://127.0.0.1:4173',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: LIVE_URL ? undefined : {
    // `dist/` doit déjà exister (`npm run build`) — c'est le cas en CI où ce
    // job suit le build ; en local, lancer `npm run build` avant ce script.
    // --host 127.0.0.1 explicite : `vite preview` sans --host ne bind qu'en
    // IPv6 (::1) sous Windows, et 127.0.0.1 (IPv4) reste alors inatteignable.
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
})

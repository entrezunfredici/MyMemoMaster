import { defineConfig, configDefaults } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // <math-field> est le web component MathLive, pas un composant Vue
          isCustomElement: (tag) => tag === 'math-field',
        },
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    // e2e-a11y/ : specs Playwright (audit de contraste navigateur), pas des
    // tests vitest — même pattern *.spec.js, mais un tout autre test runner.
    exclude: [...configDefaults.exclude, 'e2e-a11y/**'],
    // Couverture consommee par SonarQube (sonar.javascript.lcov.reportPaths).
    // Fournisseur v8 : celui de Vitest, aucune instrumentation Babel a maintenir.
    coverage: {
      provider: 'v8',
      // lcov pour Sonar ; text-summary pour garder la mesure lisible dans les
      // logs de CI sans avoir a ouvrir un artefact.
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: './coverage',
      // Aligne sur `sonar.sources` : le front n'est analyse que sur src/.
      include: ['src/**/*.{js,vue}'],
      exclude: [
        'src/main.js',
        'src/**/*.{spec,test}.js',
      ],
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
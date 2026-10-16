/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution')

module.exports = {
  root: true,
  'extends': [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    '@vue/eslint-config-prettier/skip-formatting'
  ],
  parserOptions: {
    ecmaVersion: 'latest'
  },
  ignorePatterns: ["node_modules/", "dist/"],
  overrides: [
    {
      // Specs et configurations Playwright : elles tournent sous Node (pas
      // dans le navigateur), donc `process` y est legitime. Declarer
      // l'environnement vaut mieux que semer des `eslint-disable no-undef`
      // fichier par fichier — chaque nouveau fichier oublierait la ligne et
      // casserait le lint en CI, ce qui est arrive le 2026-08-29.
      files: ['e2e/**/*.js', 'e2e-a11y/**/*.js', 'playwright*.config.js'],
      env: { node: true },
    },
  ],
}

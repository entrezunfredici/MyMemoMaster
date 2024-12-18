import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    //setupFiles: './test/setup.js', // Optionnel, si vous avez des fichiers de configuration de test
  },
});
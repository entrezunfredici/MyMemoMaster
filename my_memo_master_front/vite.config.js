/* eslint-disable no-undef */
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    base: process.env.BASE || '/', // ← important si tu sers à la racine (Traefik/Nginx)
    plugins: [
      vue(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: env.VITE_APP_NAME,
          short_name: env.VITE_APP_SHORT_NAME,
          description: env.VITE_APP_DESCRIPTION,
          theme_color: env.VITE_APP_THEME_COLOR,
          background_color: env.VITE_APP_BG_COLOR,
          icons: [
            { src: 'android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: 'android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    // ⚠️ Recommandé : utiliser import.meta.env.VITE_... dans TON code.
    // Ce bloc "define" garde la compat avec un code qui lirait encore process.env.*
    define: {
      'process.env': {
        VITE_APP_NAME: "my memo master",
        VITE_APP_COMPANY_NAME: env.VITE_APP_COMPANY_NAME,
        VITE_APP_AUTHOR_NAME: env.VITE_APP_AUTHOR_NAME,
        VITE_FRONT_URL: env.VITE_FRONT_URL,
        VITE_API_URL: env.VITE_API_URL,
      },
    },
    server: {
      port: Number(env.VITE_PORT) || 5173,
    },
  }
})


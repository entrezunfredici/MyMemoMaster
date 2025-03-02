/* eslint-disable no-undef */
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa';
import dotenv from 'dotenv';
import path from 'path';

// Resolve the path to the .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate', 
      manifest: {
        name: process.env.VITE_APP_NAME,
        short_name: process.env.VITE_APP_SHORT_NAME,
        description: process.env.VITE_APP_DESCRIPTION,
        theme_color: process.env.VITE_APP_THEME_COLOR,
        background_color: process.env.VITE_APP_BG_COLOR,
        icons: [
          {
            src: 'android-chrome-192x192.png', 
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'android-chrome-512x512.png', 
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'android-chrome-512x512.png', 
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  define: {
    'process.env': {
      VITE_APP_NAME: process.env.VITE_APP_NAME,
      VITE_APP_COMPANY_NAME: process.env.VITE_APP_COMPANY_NAME,
      VITE_APP_AUTHOR_NAME: process.env.VITE_APP_AUTHOR_NAME,
      VITE_BACKEND_API_URL: process.env.VITE_BACKEND_API_URL,
      VITE_FRONT_URL: process.env.VITE_FRONT_URL,
    }
  },
  server: {
    port: process.env.VITE_PORT,
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
})

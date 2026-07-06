// Police auto-hébergée (remplace le CDN Google Fonts : pas d'appel externe — RGPD, offline PWA)
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/700.css'

import './assets/base.css'
import './assets/main.css'
import './assets/modal-form.css'
import './assets/item-list.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Toast from 'vue-toastification'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import 'vue-toastification/dist/index.css'
import './tailwind.css'

import App from './App.vue'
import router from './router'

const app = createApp(App)

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app.use(pinia)
app.use(router)
app.use(Toast)

app.mount('#app')
<template>
  <div class="settings">

    <!-- Sidebar -->
    <aside class="settings__sidebar">
      <div class="settings__sidebar-group">
        <p class="settings__sidebar-label">Mon compte</p>
        <router-link to="/profile" class="settings__sidebar-link">Profil &amp; sécurité</router-link>
      </div>

      <div class="settings__sidebar-group">
        <p class="settings__sidebar-label">Application</p>
        <button
          v-for="item in appSections"
          :key="item.id"
          class="settings__sidebar-link"
          :class="{ 'settings__sidebar-link--active': activeSection === item.id }"
          @click="activeSection = item.id"
        >
          {{ item.label }}
        </button>
      </div>
    </aside>

    <!-- Panneau principal -->
    <main class="settings__panel">

      <!-- Apparence -->
      <template v-if="activeSection === 'apparence'">
        <h2 class="settings__title">Apparence</h2>
        <div class="settings__row">
          <div>
            <p class="settings__row-label">Mode sombre</p>
            <p class="settings__row-hint">Applique un thème sombre à l'interface.</p>
          </div>
          <ToggleButton v-model="darkMode" />
        </div>
      </template>

      <!-- Notifications -->
      <template v-if="activeSection === 'notifications'">
        <h2 class="settings__title">Notifications</h2>
        <div class="settings__info-box">
          <p>
            Les rappels sont gérés directement depuis la page
            <router-link to="/calendar" class="settings__link">Calendrier</router-link>.
            Vous pouvez y créer, modifier et supprimer des rappels liés à vos échéances et sessions de révision.
          </p>
        </div>
      </template>

      <!-- Accessibilité -->
      <template v-if="activeSection === 'accessibilite'">
        <h2 class="settings__title">Accessibilité</h2>
        <div class="settings__info-box">
          <p>Les options d'accessibilité (taille de police, contraste) seront disponibles dans une prochaine version.</p>
        </div>
      </template>

    </main>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import ToggleButton from '@/components/ToggleButton.vue'

const DARK_MODE_KEY = 'mmm_dark_mode'

const appSections = [
  { id: 'apparence', label: 'Apparence' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'accessibilite', label: 'Accessibilité' },
]

const activeSection = ref('apparence')
const darkMode = ref(false)

onMounted(() => {
  darkMode.value = localStorage.getItem(DARK_MODE_KEY) === 'true'
  applyDarkMode(darkMode.value)
})

watch(darkMode, (val) => {
  localStorage.setItem(DARK_MODE_KEY, String(val))
  applyDarkMode(val)
})

function applyDarkMode(enabled) {
  document.documentElement.classList.toggle('dark-mode', enabled)
}
</script>

<style scoped>
.settings {
  display: flex;
  gap: 0;
  min-height: calc(100vh - 80px);
}

.settings__sidebar {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid #e5e7eb;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.settings__sidebar-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.settings__sidebar-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #9ca3af;
  padding: 0 8px;
  margin-bottom: 4px;
}

.settings__sidebar-link {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.9rem;
  color: #374151;
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.12s, color 0.12s;
}

.settings__sidebar-link:hover {
  background: #f3f4f6;
  color: #1E3BA1;
}

.settings__sidebar-link--active {
  background: #eff2fb;
  color: #1E3BA1;
  font-weight: 600;
}

.settings__panel {
  flex: 1;
  padding: 32px 40px;
  max-width: 560px;
}

.settings__title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #1E3BA1;
  margin-bottom: 24px;
}

.settings__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid #f3f4f6;
}

.settings__row-label {
  font-size: 0.95rem;
  font-weight: 500;
  color: #1f2937;
}

.settings__row-hint {
  font-size: 0.82rem;
  color: #6b7280;
  margin-top: 2px;
}

.settings__info-box {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 16px 20px;
  font-size: 0.9rem;
  color: #374151;
  line-height: 1.6;
}

.settings__link {
  color: #1E3BA1;
  text-decoration: underline;
}
</style>

<template>
  <!-- CHOIX: barre fixe 4 onglets + bouton « Plus » (feuille du bas) plutôt que 10 icônes sur 2 lignes -->
  <!-- RAISON: les 10 icônes mangeaient ~25 % de la hauteur d'écran ; les 4 écrans d'étude restent à 1 tap -->
  <nav aria-label="Navigation principale" class="mobile-nav">
    <router-link
      v-for="item in primaryItems"
      :key="item.to"
      :to="item.to"
      :data-tour="item.tour"
      :aria-label="item.label"
      :class="['mobile-nav__tab', isActive(item) ? 'mobile-nav__tab--active' : '']"
    >
      <component :is="item.icon" class="size-7" />
      <span class="mobile-nav__label">{{ item.short || item.label }}</span>
    </router-link>

    <button
      type="button"
      class="mobile-nav__tab"
      :class="{ 'mobile-nav__tab--active': isMoreActive || isOpen }"
      aria-label="Plus"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      data-testid="mobile-nav-more"
      @click="isOpen = !isOpen"
    >
      <Bars3Icon class="size-7" />
      <span class="mobile-nav__label">Plus</span>
    </button>
  </nav>

  <Teleport to="body">
    <div v-if="isOpen" class="mobile-sheet__backdrop" data-testid="mobile-nav-backdrop" @click="isOpen = false" />
    <div
      v-if="isOpen"
      class="mobile-sheet"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      data-testid="mobile-nav-sheet"
    >
      <router-link
        v-for="item in moreItems"
        :key="item.to"
        :to="item.to"
        :data-tour="item.tour"
        :aria-label="item.label"
        :class="['mobile-sheet__item', isActive(item) ? 'mobile-sheet__item--active' : '']"
      >
        <component :is="item.icon" class="size-7" />
        <span>{{ item.label }}</span>
      </router-link>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { Bars3Icon, HomeIcon, CalendarIcon, CheckCircleIcon, ShieldCheckIcon } from '@heroicons/vue/24/outline'
import ExercisesIcon from '@/icons/ExercisesIcon.vue'
import FlashardIcon from '@/icons/FlashardIcon.vue'
import MindmapIcon from '@/icons/MindmapIcon.vue'
import ProfileIcon from '@/icons/ProfileIcon.vue'
import SettingsIcon from '@/icons/SettingsIcon.vue'
import ClassroomIcon from '@/icons/ClassroomIcon.vue'
import KpiIcon from '@/icons/KpiIcon.vue'
import { useRole } from '@/composables/useRole'

const route = useRoute()
const { isAdminPlateforme } = useRole()
const isOpen = ref(false)

// `match` : sous-chaîne du nom de route qui marque l'entrée comme active ('' = égalité stricte sur `name`)
const primaryItems = [
  { to: '/', label: 'Accueil', icon: HomeIcon, exact: 'home' },
  { to: '/mindmaps', label: 'Cartes mentales', short: 'Cartes', icon: MindmapIcon, tour: 'mindmaps', match: 'mindmaps' },
  { to: '/flashcards', label: 'Systèmes de Leitner', short: 'Leitner', icon: FlashardIcon, tour: 'flashcards', match: 'flashcards' },
  { to: '/exercises', label: 'Exercices', icon: ExercisesIcon, tour: 'exercises', match: 'exercises' }
]

const moreItems = computed(() => [
  { to: '/classroom', label: 'Classe', icon: ClassroomIcon, tour: 'classroom', match: 'classroom' },
  // TODO: ce lien reprend le comportement existant (même cible que « Classe ») — à revoir avec la page d'administration
  ...(isAdminPlateforme.value
    ? [{ to: '/classroom', label: 'Administration', icon: ShieldCheckIcon, exact: 'classroom-admin' }]
    : []),
  { to: '/calendar', label: 'Calendrier & rappels', icon: CalendarIcon, tour: 'calendar', match: 'calendar' },
  { to: '/todo', label: 'To-do', icon: CheckCircleIcon, tour: 'todo', exact: 'todo' },
  { to: '/kpi', label: 'Ma Progression', icon: KpiIcon, tour: 'kpi', exact: 'kpi' },
  { to: '/profile', label: 'Profil', icon: ProfileIcon, match: 'profile' },
  { to: '/settings', label: 'Réglages', icon: SettingsIcon, match: 'settings' }
])

/**
 * Indique si l'entrée de menu correspond à la route courante.
 *
 * @param {{exact?: string, match?: string}} item - Entrée de menu
 * @returns {boolean} true si la route courante correspond
 */
const isActive = (item) => {
  const name = route?.name
  if (!name) return false
  if (item.exact) return name === item.exact
  return typeof name === 'string' && name.includes(item.match)
}

// « Plus » est mis en évidence quand la page courante est l'une de ses entrées
const isMoreActive = computed(() => moreItems.value.some(isActive))

watch(() => route?.fullPath, () => { isOpen.value = false })

const onKeydown = (event) => {
  if (event.key === 'Escape') isOpen.value = false
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.mobile-nav {
  position: fixed;
  inset: auto 0 0 0;
  z-index: 46;
  display: flex;
  justify-content: space-around;
  align-items: stretch;
  gap: 4px;
  padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
  background: rgb(var(--light));
  border-top: 1px solid #e2e8f0;
  box-shadow: 0 -4px 16px rgba(15, 23, 42, 0.08);
}

.mobile-nav__tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 56px;
  border-radius: 12px;
  border: none;
  background: transparent;
  color: rgb(var(--primary));
  cursor: pointer;
}

.mobile-nav__tab--active {
  background: rgb(var(--primary));
  color: #ffffff;
}

.mobile-nav__label {
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
}

.mobile-sheet__backdrop {
  position: fixed;
  inset: 0;
  z-index: 44;
  background: rgba(15, 23, 42, 0.45);
}

.mobile-sheet {
  position: fixed;
  /* CHOIX: feuille posée au-dessus de la barre (≈ 68 px) plutôt que par-dessus */
  /* RAISON: le bouton « Plus » reste visible et permet de refermer le menu */
  inset: auto 0 calc(68px + env(safe-area-inset-bottom)) 0;
  z-index: 45;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 16px;
  background: rgb(var(--light));
  border-radius: 20px;
  margin: 0 8px;
  box-shadow: 0 -8px 24px rgba(15, 23, 42, 0.18);
}

.mobile-sheet__item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  padding: 8px 12px;
  border-radius: 12px;
  background: #f1f5f9;
  color: rgb(var(--primary));
  font-weight: 600;
  font-size: 14px;
}

.mobile-sheet__item--active {
  background: rgb(var(--primary));
  color: #ffffff;
}
</style>

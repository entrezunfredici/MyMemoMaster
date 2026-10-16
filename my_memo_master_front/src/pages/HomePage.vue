<template>
  <div class="home">
    <section class="home__tour">
      <button type="button" class="home__tour-btn" data-tour="guided-tour" @click="startGuidedTour">
        <span class="home__tour-icon" aria-hidden="true">🧭</span>
        <span class="home__tour-text">
          <span class="home__tour-title">Parcours guidé</span>
          <span class="home__tour-subtitle">
            Créez pas à pas votre carte mentale, vos flashcards, vos exercices et planifiez vos révisions.
          </span>
        </span>
      </button>
      <button type="button" class="home__replay-btn" @click="replayInterfaceTour">
        🔍 Revoir la visite de l'interface
      </button>
    </section>
    <section class="home_menu">
      <Grid :items="menuItems">
        <template #item="{ item }">
          <Button class="w-full" :callback="() => goTo(item.to)">
            {{ item.label }}
          </Button>
        </template>
      </Grid>
    </section>
    <section class="home__alerts">
      <KpiAlertWidgetComponent />
    </section>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import Button from '@/components/ButtonComponent.vue'
import Grid from '@/components/GridComponent.vue'
import KpiAlertWidgetComponent from '@/components/KpiAlertWidgetComponent.vue'
import { useGuidedTourStore } from '@/stores/guidedTour'
import { useOnboardingTour } from '@/composables/useOnboardingTour'

const router = useRouter()
const tourStore = useGuidedTourStore()
const { startTour } = useOnboardingTour()

function startGuidedTour() {
  tourStore.start()
  router.push({ name: tourStore.currentStep.route })
}

function replayInterfaceTour() {
  startTour()
}

const menuItems = [
  { label: 'Mindmaps', to: '/mindmaps' },
  { label: 'Systemes de Leitner', to: '/flashcards' },
  { label: 'Exercices', to: '/exercises' },
  { label: 'Calendrier', to: '/calendar' },
]

function goTo(path) {
  router.push(path)
}
</script>

<style scoped>
.home {
  padding: 24px;
}

.home_menu {
  max-width: 960px;
  margin: 0 auto 24px;
  align-items: center;
}

.home__tour {
  max-width: 960px;
  margin: 0 auto 24px;
}

.home__tour-btn {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  text-align: left;
  background: rgb(var(--white));
  border: 2px solid var(--indigo-500);
  border-radius: 12px;
  padding: 16px 20px;
  cursor: pointer;
  transition: box-shadow 0.15s, background 0.15s;
}

.home__tour-btn:hover {
  background: var(--indigo-50);
  box-shadow: 0 4px 12px rgb(var(--indigo-500-rgb) / 0.2);
}

.home__tour-icon {
  font-size: 32px;
}

.home__tour-text {
  display: flex;
  flex-direction: column;
}

.home__tour-title {
  font-weight: 700;
  font-size: 18px;
  color: var(--indigo-700);
}

.home__tour-subtitle {
  font-size: 14px;
  color: var(--gray-500);
}

.home__replay-btn {
  margin-top: 8px;
  background: none;
  border: none;
  font-size: 13px;
  color: var(--gray-500);
  cursor: pointer;
  text-decoration: underline;
  padding: 4px 0;
}

.home__replay-btn:hover {
  color: var(--indigo-700);
}

.home__alerts {
  max-width: 960px;
  margin: 0 auto 24px;
}

.home__interpreter {
  max-width: 960px;
  margin: 0 auto;
}
</style>

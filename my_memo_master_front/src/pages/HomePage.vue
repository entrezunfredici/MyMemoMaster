<template>
  <div class="home">
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
    <section class="home__interpreter">
      <Interpreter />
    </section>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import Button from '@/components/ButtonComponent.vue'
import Grid from '@/components/GridComponent.vue'
import Interpreter from '@/components/interpreter/Interpreter.vue'
import KpiAlertWidgetComponent from '@/components/KpiAlertWidgetComponent.vue'

const router = useRouter()

const menuItems = [
  { label: 'Mindmaps', to: '/mindmaps' },
  { label: 'Systemes de Leitner', to: '/flashcards' },
  { label: 'Exercices', to: '/exercises' },
  { label: 'Calendar', to: '/calendar' },
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

.home__alerts {
  max-width: 960px;
  margin: 0 auto 24px;
}

.home__interpreter {
  max-width: 960px;
  margin: 0 auto;
}
</style>

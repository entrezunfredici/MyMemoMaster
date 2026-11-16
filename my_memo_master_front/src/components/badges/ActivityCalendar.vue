<template>
  <section class="bg-white border-2 border-gray-100 rounded-xl p-4" aria-labelledby="activity-title">
    <h2 id="activity-title" class="text-xl font-bold text-primary">Mon activité</h2>
    <p class="text-sm text-dark/70 mb-2" data-testid="activity-summary">{{ summary }}</p>

    <div ref="scroller" class="overflow-x-auto" role="region" aria-label="Calendrier d'activité des 12 dernières semaines" tabindex="0">
      <table class="border-separate" style="border-spacing: 3px" aria-describedby="activity-summary-text">
        <caption class="sr-only">Jours d'activité par semaine, du lundi au dimanche</caption>
        <thead>
          <tr>
            <td></td>
            <th v-for="week in weeks" :key="week.week + week.days[0].date" scope="col" class="text-xs font-normal text-dark/70 px-0">
              S{{ week.week }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(dayName, row) in DAY_NAMES" :key="dayName">
            <th scope="row" class="text-xs font-normal text-dark/70 text-left pr-2">{{ dayName }}</th>
            <td v-for="week in weeks" :key="week.days[row].date" class="p-0 text-center">
              <span
                v-if="!week.days[row].future"
                class="cal-cell"
                :class="{ 'cal-cell--active': week.days[row].active, 'cal-cell--today': week.days[row].isToday }"
              >
                <span class="sr-only">{{ week.days[row].label }}</span>
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p id="activity-summary-text" class="sr-only">{{ summary }}</p>
    <p class="text-xs text-dark/70 mt-2">
      <span class="cal-cell cal-cell--inline cal-cell--active" aria-hidden="true"></span> jour d'activité ·
      <span class="cal-cell cal-cell--inline" aria-hidden="true"></span> pas d'activité ·
      <span class="cal-cell cal-cell--inline cal-cell--today" aria-hidden="true"></span> aujourd'hui
    </p>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { activitySummary, buildCalendar } from '@/helpers/badges'

const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const props = defineProps({
  activity: { type: Object, required: true },
})

const scroller = ref(null)
const weeks = computed(() => buildCalendar(props.activity))
const summary = computed(() => activitySummary(props.activity))

// Petit écran : la semaine en cours (à droite) doit rester visible
onMounted(async () => {
  await nextTick()
  if (scroller.value) scroller.value.scrollLeft = scroller.value.scrollWidth
})
</script>

<style scoped>
/* Forme + couleur : plein = actif, contour seul = inactif (jamais la couleur seule) */
.cal-cell {
  display: block;
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 0.25rem;
  border: 2px solid var(--gray-500);
  background: transparent;
}
/* Légende : à côté du texte (le display:block ci-dessus l'emporterait sur la classe utilitaire) */
.cal-cell--inline {
  display: inline-block;
  vertical-align: middle;
}
.cal-cell--active {
  background: rgb(var(--primary));
  border-color: rgb(var(--primary));
}
.cal-cell--today {
  outline: 2px solid var(--gray-700);
  outline-offset: 2px;
}
</style>

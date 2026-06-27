<template>
  <div v-if="store.loading" class="flex items-center justify-center py-20">
    <LoaderComponent />
  </div>

  <div v-else-if="!store.kpis" class="text-center py-20 text-gray-400">
    <p>Aucune donnée disponible pour le moment.</p>
    <p class="text-sm mt-1">Commence à réviser pour voir tes indicateurs !</p>
  </div>

  <div v-else class="space-y-8 pb-8">

    <!-- BADGES -->
    <section>
      <h2 class="text-xl font-bold text-primary mb-3">Succès & Badges</h2>
      <div class="flex flex-wrap gap-3">
        <div
          v-for="badge in store.kpis.badges"
          :key="badge.id"
          :class="[
            'flex items-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-medium',
            badge.unlocked
              ? 'border-primary bg-primary text-white'
              : 'border-gray-200 bg-white text-gray-400'
          ]"
          :title="badge.description"
        >
          <span>{{ badge.icon }}</span>
          <span>{{ badge.label }}</span>
        </div>
      </div>
    </section>

    <!-- RÉVISION & RÉGULARITÉ -->
    <section>
      <h2 class="text-xl font-bold text-primary mb-3">Révision & Régularité</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatCard label="Sessions planifiées" :value="store.kpis.revision.totalPlanned" />
        <StatCard label="Sessions complétées" :value="store.kpis.revision.totalCompleted" />
        <StatCard label="Taux de complétion" :value="store.kpis.revision.completionRate + ' %'" />
        <StatCard label="Streak actuel" :value="store.kpis.revision.streakDays + ' j'" highlight />
      </div>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
        <StatCard label="30 derniers jours" :value="store.kpis.revision.sessionsLast30Days + ' sessions'" />
        <StatCard label="Temps total de révision" :value="formatMinutes(store.kpis.revision.totalMinutes)" />
        <StatCard label="Complétées / 30 j" :value="store.kpis.revision.completedLast30Days + ' sessions'" />
      </div>

      <!-- Graphique activité hebdomadaire -->
      <div class="bg-white border-2 border-gray-100 rounded-xl p-4">
        <p class="text-sm font-medium text-gray-500 mb-3">Activité hebdomadaire (sessions complétées)</p>
        <div class="relative h-48">
          <Bar :data="weeklyChartData" :options="barOptions" />
        </div>
      </div>
    </section>

    <!-- DISCIPLINE -->
    <section>
      <h2 class="text-xl font-bold text-primary mb-3">Discipline</h2>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
        <StatCard label="Planifiées cette semaine" :value="store.kpis.discipline.plannedThisWeek" />
        <StatCard label="Complétées cette semaine" :value="store.kpis.discipline.completedThisWeek" />
        <StatCard label="Score discipline (30 j)" :value="store.kpis.discipline.disciplineScore + ' %'" :highlight="store.kpis.discipline.disciplineScore >= 70" />
      </div>
      <div class="bg-white border-2 border-gray-100 rounded-xl p-4">
        <div class="flex justify-between text-xs text-gray-500 mb-1">
          <span>Score de discipline (sessions planifiées vs complétées)</span>
          <span>{{ store.kpis.discipline.disciplineScore }} %</span>
        </div>
        <div class="w-full bg-gray-100 rounded-full h-3">
          <div
            class="h-3 rounded-full transition-all"
            :class="disciplineColor"
            :style="{ width: store.kpis.discipline.disciplineScore + '%' }"
          />
        </div>
      </div>
    </section>

    <!-- SCORES AUX EXERCICES -->
    <section>
      <h2 class="text-xl font-bold text-primary mb-3">Scores aux exercices</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatCard label="Exercices passés" :value="store.kpis.exercises.totalTests" />
        <StatCard label="Score moyen" :value="store.kpis.exercises.avgScore + ' %'" />
        <StatCard label="Meilleur score" :value="store.kpis.exercises.maxScore + ' %'" highlight />
        <StatCard
          label="Tendance"
          :value="(store.kpis.exercises.recentTrend >= 0 ? '+' : '') + store.kpis.exercises.recentTrend + ' %'"
          :highlight="store.kpis.exercises.recentTrend > 0"
        />
      </div>

      <div v-if="store.kpis.exercises.scoreHistory.length > 0" class="bg-white border-2 border-gray-100 rounded-xl p-4">
        <p class="text-sm font-medium text-gray-500 mb-3">Évolution des 10 derniers scores</p>
        <div class="relative h-56">
          <Line :data="scoreChartData" :options="lineOptions" />
        </div>
      </div>
      <p v-else class="text-sm text-gray-400">Aucun exercice complété pour le moment.</p>
    </section>

    <!-- CARTES LEITNER -->
    <section>
      <h2 class="text-xl font-bold text-primary mb-3">Système Leitner</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatCard label="Total cartes" :value="store.kpis.leitner.totalCards" />
        <StatCard label="Cartes dues maintenant" :value="store.kpis.leitner.cardsDue" />
        <StatCard label="Taux de réussite global" :value="store.kpis.leitner.globalSuccessRate + ' %'" />
        <StatCard label="Maîtrise (B4-B5)" :value="store.kpis.leitner.mastery + ' %'" :highlight="store.kpis.leitner.mastery >= 50" />
      </div>

      <div v-if="store.kpis.leitner.totalCards > 0" class="bg-white border-2 border-gray-100 rounded-xl p-4">
        <p class="text-sm font-medium text-gray-500 mb-3">Répartition des cartes par boîte</p>
        <div class="relative h-52">
          <Bar :data="leitnerChartData" :options="leitnerBarOptions" />
        </div>
      </div>
      <p v-else class="text-sm text-gray-400">Aucune carte Leitner créée pour le moment.</p>
    </section>

    <!-- DIVERSITÉ DES SUJETS -->
    <section>
      <h2 class="text-xl font-bold text-primary mb-3">Diversité des matières</h2>
      <div class="mb-4">
        <StatCard label="Matières différentes étudiées" :value="store.kpis.subjects.totalUnique" />
      </div>
      <div v-if="store.kpis.subjects.list.length > 0" class="flex flex-wrap gap-2">
        <div
          v-for="sub in store.kpis.subjects.list"
          :key="sub.subjectId"
          class="bg-white border-2 border-primary/20 rounded-lg px-3 py-2 text-sm"
        >
          <span class="font-medium text-primary">{{ sub.name }}</span>
          <div class="text-xs text-gray-400 mt-0.5">
            <span v-if="sub.tests > 0">{{ sub.tests }} exercice{{ sub.tests > 1 ? 's' : '' }}</span>
            <span v-if="sub.tests > 0 && sub.systems > 0"> · </span>
            <span v-if="sub.systems > 0">{{ sub.systems }} système{{ sub.systems > 1 ? 's' : '' }} Leitner</span>
          </div>
        </div>
      </div>
      <p v-else class="text-sm text-gray-400">Aucune matière enregistrée pour le moment.</p>
    </section>

  </div>
</template>

<script setup>
import { computed, onMounted, defineComponent, h } from 'vue'
import { Bar, Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { useKpiStore } from '@/stores/kpi'
import LoaderComponent from '@/components/LoaderComponent.vue'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler)

const store = useKpiStore()

onMounted(() => { store.fetchMyKpis() })

// ---- Composant inline StatCard ----
const StatCard = defineComponent({
  props: { label: String, value: [String, Number], highlight: Boolean },
  setup(props) {
    return () => h('div', { class: 'bg-white border-2 border-gray-100 rounded-xl p-4' }, [
      h('p', { class: 'text-xs text-gray-400 mb-1' }, props.label),
      h('p', { class: `text-2xl font-bold ${props.highlight ? 'text-primary' : 'text-gray-800'}` }, String(props.value ?? '—'))
    ])
  }
})

// ---- Couleurs ----
const PRIMARY = 'rgb(30, 59, 161)'
const PRIMARY_LIGHT = 'rgba(30, 59, 161, 0.15)'
const LEITNER_COLORS = [
  'rgba(239,68,68,0.85)',   // B1 rouge
  'rgba(249,115,22,0.85)',  // B2 orange
  'rgba(234,179,8,0.85)',   // B3 jaune
  'rgba(59,130,246,0.85)',  // B4 bleu
  'rgba(34,197,94,0.85)'   // B5 vert
]

// ---- Données des graphiques ----
const weeklyChartData = computed(() => {
  const weeks = store.kpis?.revision?.weeklyActivity || []
  return {
    labels: weeks.map((w) => formatWeekLabel(w.week)),
    datasets: [{
      label: 'Sessions complétées',
      data: weeks.map((w) => w.count),
      backgroundColor: PRIMARY,
      borderRadius: 6,
      borderSkipped: false
    }]
  }
})

const scoreChartData = computed(() => {
  const history = store.kpis?.exercises?.scoreHistory || []
  return {
    labels: history.map((e) => `${formatDate(e.date)} — ${e.testName}`),
    datasets: [{
      label: 'Score (%)',
      data: history.map((e) => e.percentage),
      borderColor: PRIMARY,
      backgroundColor: PRIMARY_LIGHT,
      fill: true,
      tension: 0.4,
      pointRadius: 5,
      pointBackgroundColor: PRIMARY
    }]
  }
})

const leitnerChartData = computed(() => {
  const boxes = store.kpis?.leitner?.cardsByBox || {}
  return {
    labels: ['Boîte 1', 'Boîte 2', 'Boîte 3', 'Boîte 4', 'Boîte 5'],
    datasets: [{
      label: 'Cartes',
      data: [boxes[1] || 0, boxes[2] || 0, boxes[3] || 0, boxes[4] || 0, boxes[5] || 0],
      backgroundColor: LEITNER_COLORS,
      borderRadius: 6,
      borderSkipped: false
    }]
  }
})

// ---- Options Chart.js ----
const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => ` ${ctx.parsed.y} session${ctx.parsed.y !== 1 ? 's' : ''}`
      }
    }
  },
  scales: {
    y: { beginAtZero: true, ticks: { stepSize: 1, color: '#9ca3af' }, grid: { color: '#f3f4f6' } },
    x: { ticks: { color: '#9ca3af' }, grid: { display: false } }
  }
}

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => ` ${ctx.parsed.y} %`
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      max: 100,
      ticks: { callback: (v) => v + ' %', color: '#9ca3af' },
      grid: { color: '#f3f4f6' }
    },
    x: {
      ticks: {
        color: '#9ca3af',
        maxTicksLimit: 5,
        callback: function(val) {
          const label = this.getLabelForValue(val)
          return label.split(' — ')[0]
        }
      },
      grid: { display: false }
    }
  }
}

const leitnerBarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => ` ${ctx.parsed.y} carte${ctx.parsed.y !== 1 ? 's' : ''}`
      }
    }
  },
  scales: {
    y: { beginAtZero: true, ticks: { stepSize: 1, color: '#9ca3af' }, grid: { color: '#f3f4f6' } },
    x: { ticks: { color: '#9ca3af' }, grid: { display: false } }
  }
}

// ---- Computed ----
const disciplineColor = computed(() => {
  const score = store.kpis?.discipline?.disciplineScore ?? 0
  if (score >= 70) return 'bg-green-500'
  if (score >= 40) return 'bg-yellow-400'
  return 'bg-red-400'
})

// ---- Helpers ----
function formatMinutes(mins) {
  if (!mins) return '0 min'
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h} h ${m} min` : `${h} h`
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

function formatWeekLabel(weekStart) {
  if (!weekStart) return ''
  const d = new Date(weekStart)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}
</script>

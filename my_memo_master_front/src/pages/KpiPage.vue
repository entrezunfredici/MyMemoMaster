<template>
  <div class="max-w-4xl mx-auto p-6 space-y-6">
    <h1 class="text-2xl font-bold text-primary">Mes indicateurs de progression</h1>

    <section class="flex items-center gap-4">
      <label class="text-sm font-medium text-gray-600">Matière :</label>
      <SubjectFilterComponent />
    </section>

    <div v-if="loading" class="text-center text-gray-400 py-12">Chargement…</div>

    <template v-else>
      <!-- Alertes de régularité -->
      <section v-if="alerts.length > 0" class="space-y-2">
        <h2 class="text-lg font-semibold text-primary">Alertes</h2>
        <div
          v-for="alert in alerts"
          :key="alert.type"
          :class="['flex items-start gap-3 p-4 rounded-lg border', alertClass(alert.severity)]"
        >
          <ExclamationTriangleIcon class="size-5 flex-shrink-0 mt-0.5" />
          <span class="text-sm">{{ alert.message }}</span>
        </div>
      </section>

      <!-- Taux de maîtrise -->
      <section class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 class="text-lg font-semibold text-primary mb-4">Taux de maîtrise global</h2>
        <div class="flex items-center gap-4">
          <div class="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
            <div
              class="h-5 bg-primary rounded-full transition-all duration-700"
              :style="{ width: summary.masteryAvg + '%' }"
            ></div>
          </div>
          <span class="text-3xl font-bold text-primary w-20 text-right">
            {{ summary.masteryAvg }}%
          </span>
        </div>
        <p class="text-sm text-gray-400 mt-2">
          {{ summary.sessionsCount }} session(s) sur la période analysée
        </p>
      </section>

      <!-- Distribution par boîte -->
      <section class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 class="text-lg font-semibold text-primary mb-4">Répartition par boîte Leitner</h2>
        <div class="space-y-3">
          <div v-for="box in 5" :key="box" class="flex items-center gap-3">
            <span class="w-16 text-sm font-medium text-gray-500">Boîte {{ box }}</span>
            <div class="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                class="h-3 rounded-full transition-all duration-500"
                :class="BOX_COLORS[box - 1]"
                :style="{ width: boxPercent(box) + '%' }"
              ></div>
            </div>
            <span class="w-8 text-sm text-gray-500 text-right">
              {{ summary.masteryDistribution?.[box] ?? 0 }}
            </span>
          </div>
        </div>
        <p class="text-xs text-gray-400 mt-3">
          Boîte 1 = à retravailler · Boîte 5 = maîtrisé
        </p>
      </section>

      <!-- Historique de progression -->
      <section class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 class="text-lg font-semibold text-primary mb-4">Historique de progression</h2>
        <div v-if="!summary.timeseries?.length" class="text-sm text-gray-400">
          Aucune donnée disponible sur la période.
        </div>
        <div v-else class="divide-y divide-gray-50">
          <div
            v-for="point in reversedTimeseries"
            :key="point.date"
            class="flex items-center justify-between py-2.5"
          >
            <span class="text-sm text-gray-500 w-28">{{ point.date }}</span>
            <span class="text-sm text-gray-400">{{ point.count }} session(s)</span>
            <div class="flex items-center gap-3">
              <div class="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  class="h-2 bg-primary rounded-full"
                  :style="{ width: point.masteryAvg + '%' }"
                ></div>
              </div>
              <span class="text-sm font-semibold text-primary w-12 text-right">
                {{ point.masteryAvg }}%
              </span>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/helpers/api'
import SubjectFilterComponent from '@/components/SubjectFilterComponent.vue'
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'

const route = useRoute()

const loading = ref(false)
const summary = ref({
  masteryAvg: 0,
  masteryDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  sessionsCount: 0,
  timeseries: [],
})
const alerts = ref([])

const BOX_COLORS = [
  'bg-red-400',
  'bg-orange-400',
  'bg-yellow-400',
  'bg-blue-400',
  'bg-green-500',
]

const reversedTimeseries = computed(() =>
  [...(summary.value.timeseries ?? [])].reverse()
)

function alertClass(severity) {
  return severity === 'danger'
    ? 'bg-red-50 text-red-700 border-red-200'
    : 'bg-yellow-50 text-yellow-700 border-yellow-200'
}

function boxPercent(box) {
  const dist = summary.value.masteryDistribution ?? {}
  const total = Object.values(dist).reduce((a, b) => a + b, 0)
  return total > 0 ? Math.round(((dist[box] ?? 0) / total) * 100) : 0
}

async function load() {
  loading.value = true
  const subjectId = route.query.subject
  const params = subjectId ? { subjectId } : {}

  const [summaryRes, alertsRes] = await Promise.all([
    api.get('/student_kpi/summary', params),
    api.get('/student_kpi/alerts', params),
  ])

  if (summaryRes) summary.value = summaryRes.data
  if (alertsRes) alerts.value = alertsRes.data
  loading.value = false
}

onMounted(load)
watch(() => route.query.subject, load)
</script>

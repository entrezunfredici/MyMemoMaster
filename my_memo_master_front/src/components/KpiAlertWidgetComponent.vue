<template>
  <div class="kpi-widget">
    <div class="kpi-widget__header">
      <span class="kpi-widget__title">Alertes &amp; Suggestions</span>
      <router-link to="/kpi" class="kpi-widget__link">Voir mes stats →</router-link>
    </div>

    <div v-if="loading" class="kpi-widget__loading">
      <LoaderComponent />
    </div>

    <div v-else-if="items.length === 0" class="kpi-widget__empty">
      <span aria-hidden="true">🎉</span>
      <p>Tout va bien ! Continue comme ça.</p>
    </div>

    <ul v-else class="kpi-widget__list">
      <li
        v-for="(item, i) in items"
        :key="i"
        class="kpi-widget__item"
        :class="`kpi-widget__item--${item.type}`"
      >
        <span class="kpi-widget__icon" aria-hidden="true">{{ item.icon }}</span>
        <span class="kpi-widget__text">{{ item.text }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useKpiStore } from '@/stores/kpi'
import { useKpiAlertSettingsStore } from '@/stores/kpiAlertSettings'
import LoaderComponent from '@/components/LoaderComponent.vue'

const kpiStore = useKpiStore()
const settingsStore = useKpiAlertSettingsStore()

const loading = computed(() => kpiStore.loading || settingsStore.loading)

const items = computed(() => {
  const kpis = kpiStore.kpis
  const settings = settingsStore.settings

  if (!kpis) return []

  const result = []

  if (kpis.leitner.cardsDue > 0) {
    const n = kpis.leitner.cardsDue
    result.push({
      icon: '🃏',
      text: `${n} carte${n > 1 ? 's' : ''} Leitner à réviser maintenant.`,
      type: 'leitner_due'
    })
  }

  if (!settings || !settings.enabled) return result

  if (settings.streakAlertEnabled && kpis.revision.streakDays > 0 && !kpis.revision.revivedToday) {
    const n = kpis.revision.streakDays
    result.push({
      icon: '🔥',
      text: `Ton streak de ${n} jour${n > 1 ? 's' : ''} est en danger ! Révise aujourd'hui pour ne pas le perdre.`,
      type: 'streak_risk'
    })
  }

  if (
    settings.disciplineAlertEnabled &&
    kpis.discipline.disciplineScore > 0 &&
    kpis.discipline.disciplineScore < settings.thresholdDiscipline
  ) {
    result.push({
      icon: '📉',
      text: `Ton score de discipline est à ${kpis.discipline.disciplineScore} %. Complète tes sessions planifiées.`,
      type: 'discipline_low'
    })
  }

  if (settings.scoreDropAlertEnabled && kpis.exercises.recentTrend <= -10) {
    result.push({
      icon: '📚',
      text: `Tes scores ont baissé de ${Math.abs(kpis.exercises.recentTrend)} points. Pense à revoir certaines notions.`,
      type: 'score_drop'
    })
  }

  return result
})

onMounted(() => {
  kpiStore.fetchMyKpis()
  settingsStore.fetchSettings()
})
</script>

<style scoped>
.kpi-widget {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.kpi-widget__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.kpi-widget__title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.kpi-widget__link {
  font-size: 12px;
  color: #1e3ba1;
  text-decoration: none;
  font-weight: 500;
}

.kpi-widget__link:hover {
  text-decoration: underline;
}

.kpi-widget__loading {
  display: flex;
  justify-content: center;
  padding: 12px 0;
}

.kpi-widget__empty {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 13px;
}

.kpi-widget__empty p {
  margin: 0;
}

.kpi-widget__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.kpi-widget__item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #f8fafc;
  border-left: 3px solid #94a3b8;
}

.kpi-widget__item--streak_risk {
  border-left-color: #f97316;
  background: #fff7ed;
}

.kpi-widget__item--discipline_low {
  border-left-color: #eab308;
  background: #fefce8;
}

.kpi-widget__item--score_drop {
  border-left-color: #ef4444;
  background: #fef2f2;
}

.kpi-widget__item--leitner_due {
  border-left-color: #1e3ba1;
  background: #eff6ff;
}

.kpi-widget__icon {
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 1px;
}

.kpi-widget__text {
  font-size: 13px;
  color: #334155;
  line-height: 1.4;
}
</style>

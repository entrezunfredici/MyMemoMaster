<template>
  <section class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-dark">Analyse pédagogique</h2>
      <button @click="loadStudentAnalytics(groupId)"
        class="rounded-lg border border-gray px-2 py-1 text-xs text-primary hover:bg-light transition">
        Actualiser
      </button>
    </div>
    <div v-if="analyticsLoading" class="py-4 text-center text-sm text-dark/60">Chargement...</div>
    <template v-else-if="analytics">
      <div class="grid grid-cols-3 gap-2 text-center">
        <div class="rounded-xl border border-gray bg-light p-3">
          <p class="text-2xl font-bold text-success">{{ analytics.activeStudentsCount }}</p>
          <p class="mt-1 text-xs text-dark/60">Actifs (7j)</p>
        </div>
        <div :class="['rounded-xl border p-3', analytics.atRiskCount > 0 ? 'border-secondary/40 bg-secondary/5' : 'border-gray bg-light']">
          <p class="text-2xl font-bold" :class="analytics.atRiskCount > 0 ? 'text-secondary' : 'text-success'">{{ analytics.atRiskCount }}</p>
          <p class="mt-1 text-xs text-dark/60">À risque</p>
        </div>
        <div class="rounded-xl border border-gray bg-light p-3">
          <p class="text-2xl font-bold" :class="currentWeekScore !== null ? scoreTextClass(currentWeekScore) : 'text-dark/40'">
            {{ currentWeekScore !== null ? currentWeekScore + ' %' : '—' }}
          </p>
          <p class="mt-1 text-xs text-dark/60">Score semaine</p>
        </div>
      </div>

      <!-- Alertes décrochage -->
      <div v-if="atRiskStudents.length > 0" class="space-y-2">
        <p class="text-sm font-medium text-secondary">Alertes décrochage ({{ atRiskStudents.length }})</p>
        <div v-for="s in atRiskStudents" :key="s.userId" class="rounded-xl border border-secondary/30 bg-secondary/5 px-3 py-2">
          <p class="text-sm font-semibold text-dark">{{ s.name }}</p>
          <div class="mt-1 flex flex-wrap gap-1">
            <span v-for="r in s.atRiskReasons" :key="r" class="rounded-full bg-secondary/10 px-2 py-0.5 text-xs text-secondary">{{ r }}</span>
          </div>
        </div>
      </div>

      <!-- Liste étudiants -->
      <div v-if="analytics.students.length > 0" class="space-y-2">
        <p class="text-sm font-medium text-dark/80">Étudiants ({{ analytics.students.length }})</p>
        <div v-for="s in analytics.students" :key="s.userId"
          :class="['rounded-xl border transition', expandedAnalyticsStudents[s.userId] ? 'border-primary bg-light/50' : 'border-gray']">
          <!-- L'en-tête est le bouton ; le détail déplié est HORS du bouton (contenu interactif non imbriqué) -->
          <button type="button" class="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left"
            :aria-expanded="!!expandedAnalyticsStudents[s.userId]"
            @click="toggleStudentAndLoadKpis(s.userId)">
            <div class="flex items-center gap-2">
              <span :class="['rounded-full px-2 py-0.5 text-xs font-semibold', s.atRisk ? 'bg-secondary/10 text-secondary' : 'bg-success/10 text-success']">
                {{ s.atRisk ? '⚠ Risque' : '✓ OK' }}
              </span>
              <span class="text-sm font-semibold text-dark">{{ s.name }}</span>
            </div>
            <div class="flex items-center gap-2">
              <!-- Badge consentement KPI (visible après premier chargement) -->
              <span v-if="s.userId in kpiConsentStore.studentKpis"
                :class="[
                  'rounded-full px-2 py-0.5 text-xs font-semibold',
                  kpiConsentStore.studentKpis[s.userId] ? 'bg-success/10 text-success' : 'bg-gray text-dark/40'
                ]">
                {{ kpiConsentStore.studentKpis[s.userId] ? 'KPI ✓' : 'KPI —' }}
              </span>
              <span :class="['text-xs', s.avgScore !== null ? scoreTextClass(s.avgScore) : 'text-dark/40']">
                {{ s.avgScore !== null ? s.avgScore + ' %' : '—' }}
              </span>
            </div>
          </button>
          <StudentDetailComponent v-if="expandedAnalyticsStudents[s.userId]" :student="s" />
          <!-- Panneau KPI personnels partagés — S-02.07 -->
          <TeacherStudentKpi
            v-if="expandedAnalyticsStudents[s.userId]"
            :loaded="s.userId in kpiConsentStore.studentKpis"
            :kpi="kpiConsentStore.studentKpis[s.userId]"
          />
        </div>
      </div>
      <p v-else class="text-center text-sm text-dark/60">Aucun étudiant dans ce groupe.</p>
    </template>
    <p v-else class="text-center text-sm text-dark/60 py-4">Sélectionnez un groupe pour voir l'analyse.</p>
  </section>
</template>

<script setup>
// Analyse pédagogique du groupe : compteurs, alertes de décrochage, liste des étudiants et leurs KPI.
// Extrait de pages/ClassroomEnseignantView.vue ; possède son état d'analyse (useTeacherAnalytics).
import { watch } from 'vue'
import StudentDetailComponent from '@/components/StudentDetailComponent.vue'
import TeacherStudentKpi from '@/components/classroom/teacher/TeacherStudentKpi.vue'
import { useKpiConsentStore } from '@/stores/kpiConsent'
import { useTeacherAnalytics } from '@/composables/useTeacherAnalytics'

const props = defineProps({
  groupId: { type: Number, required: true },
  // Incrémenté par la page à chaque (re)sélection de groupe : recharge l'analyse même si c'est le même groupe
  refreshToken: { type: Number, default: 0 },
})

const kpiConsentStore = useKpiConsentStore()
const {
  analytics,
  analyticsLoading,
  expandedAnalyticsStudents,
  currentWeekScore,
  atRiskStudents,
  scoreTextClass,
  toggleStudentDetail,
  loadStudentAnalytics,
} = useTeacherAnalytics()

// Ouvre/ferme l'accordéon étudiant et (re)charge ses KPI à chaque ouverture
function toggleStudentAndLoadKpis(userId) {
  toggleStudentDetail(userId)
  if (expandedAnalyticsStudents[userId]) {
    kpiConsentStore.fetchStudentKpis(userId, props.groupId)
  }
}

watch(() => [props.groupId, props.refreshToken], () => loadStudentAnalytics(props.groupId), { immediate: true })
</script>

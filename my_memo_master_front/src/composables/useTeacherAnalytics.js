import { ref, computed, reactive } from 'vue'

/**
 * Composable dashboard KPI enseignant.
 * Encapsule l'état, les calculs et l'appel API de la section analytics.
 *
 * Usage : const { analytics, loadStudentAnalytics, ... } = useTeacherAnalytics()
 */
export function useTeacherAnalytics() {
  const analytics = ref(null)
  const analyticsLoading = ref(false)
  const expandedAnalyticsStudents = reactive({})

  const currentWeekScore = computed(() => {
    const trend = analytics.value?.scoreWeeklyTrend
    if (!trend || trend.length === 0) return null
    return trend[trend.length - 1].avgScore
  })

  const atRiskStudents = computed(() => analytics.value?.students.filter((s) => s.atRisk) ?? [])

  function scoreTextClass(score) {
    if (score >= 70) return 'text-success'
    if (score >= 50) return 'text-dark'
    return 'text-secondary'
  }

  function formatShortDate(dateStr) {
    const [, month, day] = dateStr.split('-').map(Number)
    const months = ['jan.', 'fév.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sep.', 'oct.', 'nov.', 'déc.']
    return `${day} ${months[month - 1]}`
  }

  function toggleStudentDetail(userId) {
    expandedAnalyticsStudents[userId] = !expandedAnalyticsStudents[userId]
  }

  async function loadStudentAnalytics(groupId) {
    if (!groupId) return
    analyticsLoading.value = true
    analytics.value = null
    try {
      const { api } = await import('@/helpers/api')
      const resp = await api.get(`class-groups/${groupId}/kpi/students`)
      analytics.value = resp?.status === 200 ? resp.data.data : null
    } catch {
      analytics.value = null
    } finally {
      analyticsLoading.value = false
    }
  }

  return {
    analytics,
    analyticsLoading,
    expandedAnalyticsStudents,
    currentWeekScore,
    atRiskStudents,
    scoreTextClass,
    formatShortDate,
    toggleStudentDetail,
    loadStudentAnalytics,
  }
}

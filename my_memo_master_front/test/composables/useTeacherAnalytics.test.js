import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTeacherAnalytics } from '@/composables/useTeacherAnalytics'

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }))

vi.mock('@/helpers/api', () => ({ api: { get: mockGet } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: vi.fn() } }))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const STUDENT_OK = {
  userId: 2, name: 'Alice Dupont', email: 'alice@test.com',
  lastActivityAt: '2026-06-23', daysInactive: 2, avgScore: 78.5,
  scoreTrend: [], atRisk: false, atRiskReasons: []
}

const STUDENT_AT_RISK = {
  userId: 3, name: 'Bob Martin', email: 'bob@test.com',
  lastActivityAt: '2026-06-10', daysInactive: 15, avgScore: 55.0,
  scoreTrend: [], atRisk: true, atRiskReasons: ['Inactif depuis 15 jours', 'Aucun exercice complété depuis 14 jours']
}

const ANALYTICS_FIXTURE = {
  activeStudentsCount: 1,
  atRiskCount: 1,
  scoreWeeklyTrend: [
    { weekStart: '2026-06-02', avgScore: 72.5 },
    { weekStart: '2026-06-09', avgScore: 68.0 },
    { weekStart: '2026-06-16', avgScore: 75.3 },
    { weekStart: '2026-06-23', avgScore: null }
  ],
  students: [STUDENT_OK, STUDENT_AT_RISK]
}

// ─────────────────────────────────────────────────────────────────────────────

describe('useTeacherAnalytics', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // ── scoreTextClass ─────────────────────────────────────────────────────────

  describe('scoreTextClass', () => {
    it('score >= 70 → text-success', () => {
      const { scoreTextClass } = useTeacherAnalytics()
      expect(scoreTextClass(70)).toBe('text-success')
      expect(scoreTextClass(100)).toBe('text-success')
    })

    it('score 50–69 → text-dark', () => {
      const { scoreTextClass } = useTeacherAnalytics()
      expect(scoreTextClass(50)).toBe('text-dark')
      expect(scoreTextClass(69)).toBe('text-dark')
    })

    it('score < 50 → text-secondary', () => {
      const { scoreTextClass } = useTeacherAnalytics()
      expect(scoreTextClass(49)).toBe('text-secondary')
      expect(scoreTextClass(0)).toBe('text-secondary')
    })
  })

  // ── formatShortDate ────────────────────────────────────────────────────────

  describe('formatShortDate', () => {
    it('2026-06-23 → "23 juin"', () => {
      const { formatShortDate } = useTeacherAnalytics()
      expect(formatShortDate('2026-06-23')).toBe('23 juin')
    })

    it('2026-01-01 → "1 jan."', () => {
      const { formatShortDate } = useTeacherAnalytics()
      expect(formatShortDate('2026-01-01')).toBe('1 jan.')
    })

    it('2026-12-31 → "31 déc."', () => {
      const { formatShortDate } = useTeacherAnalytics()
      expect(formatShortDate('2026-12-31')).toBe('31 déc.')
    })

    it('2026-03-09 → "9 mars"', () => {
      const { formatShortDate } = useTeacherAnalytics()
      expect(formatShortDate('2026-03-09')).toBe('9 mars')
    })
  })

  // ── atRiskStudents ─────────────────────────────────────────────────────────

  describe('atRiskStudents', () => {
    it('retourne uniquement les étudiants atRisk = true', () => {
      const { analytics, atRiskStudents } = useTeacherAnalytics()
      analytics.value = ANALYTICS_FIXTURE
      expect(atRiskStudents.value).toHaveLength(1)
      expect(atRiskStudents.value[0].userId).toBe(3)
      expect(atRiskStudents.value[0].atRiskReasons).toHaveLength(2)
    })

    it('retourne [] si analytics est null', () => {
      const { atRiskStudents } = useTeacherAnalytics()
      expect(atRiskStudents.value).toEqual([])
    })

    it('retourne [] si aucun étudiant à risque', () => {
      const { analytics, atRiskStudents } = useTeacherAnalytics()
      analytics.value = { ...ANALYTICS_FIXTURE, students: [STUDENT_OK] }
      expect(atRiskStudents.value).toEqual([])
    })
  })

  // ── currentWeekScore ───────────────────────────────────────────────────────

  describe('currentWeekScore', () => {
    it('retourne null si la dernière semaine n\'a pas de score', () => {
      const { analytics, currentWeekScore } = useTeacherAnalytics()
      analytics.value = ANALYTICS_FIXTURE
      expect(currentWeekScore.value).toBeNull()
    })

    it('retourne le avgScore de la dernière semaine si présent', () => {
      const { analytics, currentWeekScore } = useTeacherAnalytics()
      analytics.value = {
        ...ANALYTICS_FIXTURE,
        scoreWeeklyTrend: [
          { weekStart: '2026-06-02', avgScore: 72.5 },
          { weekStart: '2026-06-09', avgScore: 68.0 },
          { weekStart: '2026-06-16', avgScore: 75.3 },
          { weekStart: '2026-06-23', avgScore: 80.0 }
        ]
      }
      expect(currentWeekScore.value).toBe(80.0)
    })

    it('retourne null si analytics est null', () => {
      const { currentWeekScore } = useTeacherAnalytics()
      expect(currentWeekScore.value).toBeNull()
    })

    it('retourne null si scoreWeeklyTrend est vide', () => {
      const { analytics, currentWeekScore } = useTeacherAnalytics()
      analytics.value = { ...ANALYTICS_FIXTURE, scoreWeeklyTrend: [] }
      expect(currentWeekScore.value).toBeNull()
    })
  })

  // ── toggleStudentDetail ────────────────────────────────────────────────────

  describe('toggleStudentDetail', () => {
    it('premier clic → expanded = true', () => {
      const { expandedAnalyticsStudents, toggleStudentDetail } = useTeacherAnalytics()
      toggleStudentDetail(42)
      expect(expandedAnalyticsStudents[42]).toBe(true)
    })

    it('double clic → expanded = false', () => {
      const { expandedAnalyticsStudents, toggleStudentDetail } = useTeacherAnalytics()
      toggleStudentDetail(42)
      toggleStudentDetail(42)
      expect(expandedAnalyticsStudents[42]).toBe(false)
    })

    it('deux étudiants sont indépendants', () => {
      const { expandedAnalyticsStudents, toggleStudentDetail } = useTeacherAnalytics()
      toggleStudentDetail(1)
      toggleStudentDetail(2)
      toggleStudentDetail(2)
      expect(expandedAnalyticsStudents[1]).toBe(true)
      expect(expandedAnalyticsStudents[2]).toBe(false)
    })
  })

  // ── loadStudentAnalytics ───────────────────────────────────────────────────

  describe('loadStudentAnalytics', () => {
    it('200 — peuple analytics et remet loading à false', async () => {
      mockGet.mockResolvedValueOnce({ status: 200, data: { data: ANALYTICS_FIXTURE } })
      const { analytics, analyticsLoading, loadStudentAnalytics } = useTeacherAnalytics()

      await loadStudentAnalytics(1)

      expect(mockGet).toHaveBeenCalledWith('class-groups/1/kpi/students')
      expect(analytics.value).toEqual(ANALYTICS_FIXTURE)
      expect(analyticsLoading.value).toBe(false)
    })

    it('403 — analytics reste null', async () => {
      mockGet.mockResolvedValueOnce({ status: 403, data: { message: 'Accès refusé.' } })
      const { analytics, analyticsLoading, loadStudentAnalytics } = useTeacherAnalytics()

      await loadStudentAnalytics(1)

      expect(analytics.value).toBeNull()
      expect(analyticsLoading.value).toBe(false)
    })

    it('erreur réseau — analytics reste null et loading repasse à false', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'))
      const { analytics, analyticsLoading, loadStudentAnalytics } = useTeacherAnalytics()

      await loadStudentAnalytics(1)

      expect(analytics.value).toBeNull()
      expect(analyticsLoading.value).toBe(false)
    })

    it('groupId null — n\'appelle pas l\'API', async () => {
      const { loadStudentAnalytics } = useTeacherAnalytics()

      await loadStudentAnalytics(null)

      expect(mockGet).not.toHaveBeenCalled()
    })

    it('deux appels successifs — seul le dernier résultat est conservé', async () => {
      const ANALYTICS_2 = { ...ANALYTICS_FIXTURE, activeStudentsCount: 5 }
      mockGet
        .mockResolvedValueOnce({ status: 200, data: { data: ANALYTICS_FIXTURE } })
        .mockResolvedValueOnce({ status: 200, data: { data: ANALYTICS_2 } })

      const { analytics, loadStudentAnalytics } = useTeacherAnalytics()

      await loadStudentAnalytics(1)
      await loadStudentAnalytics(2)

      expect(analytics.value.activeStudentsCount).toBe(5)
    })
  })
})

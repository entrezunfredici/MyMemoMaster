import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useKpiStore } from '@/stores/kpi'

const { mockGet, mockNotify } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockNotify: vi.fn()
}))

vi.mock('@/helpers/api', () => ({ api: { get: mockGet } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: mockNotify } }))

const KPI_FIXTURE = {
  revision: {
    totalPlanned: 10, totalCompleted: 8, completionRate: 80,
    streakDays: 5, sessionsLast30Days: 10, completedLast30Days: 8,
    weeklyActivity: [{ week: '2026-06-23', count: 3 }],
    totalMinutes: 120, revivedToday: true
  },
  exercises: { totalTests: 5, avgScore: 72, maxScore: 90, minScore: 50, recentTrend: 10, scoreHistory: [] },
  leitner: { totalCards: 20, cardsByBox: { 1: 5, 2: 4, 3: 4, 4: 4, 5: 3 }, globalSuccessRate: 68, mastery: 35, cardsDue: 4 },
  subjects: { totalUnique: 2, list: [{ subjectId: 1, name: 'Maths', tests: 3, systems: 1 }] },
  discipline: { plannedThisWeek: 3, completedThisWeek: 2, disciplineScore: 75 },
  badges: [{ id: 'streak7', label: '7 jours de suite', icon: '🔥', unlocked: false, description: '' }]
}

describe('useKpiStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // ── État initial ───────────────────────────────────────────────────────────

  it('kpis est null par défaut', () => {
    const store = useKpiStore()
    expect(store.kpis).toBeNull()
  })

  it('loading est false par défaut', () => {
    const store = useKpiStore()
    expect(store.loading).toBe(false)
  })

  // ── fetchMyKpis ────────────────────────────────────────────────────────────

  it('fetchMyKpis - succès - peuple kpis et retourne true', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: KPI_FIXTURE })

    const store = useKpiStore()
    const result = await store.fetchMyKpis()

    expect(mockGet).toHaveBeenCalledWith('kpi/my')
    expect(store.kpis).toEqual(KPI_FIXTURE)
    expect(result).toBe(true)
    expect(mockNotify).not.toHaveBeenCalled()
  })

  it('fetchMyKpis - réponse non-200 - kpis reste null, notifie erreur, retourne false', async () => {
    mockGet.mockResolvedValueOnce({ status: 500, data: { message: 'Erreur serveur.' } })

    const store = useKpiStore()
    const result = await store.fetchMyKpis()

    expect(store.kpis).toBeNull()
    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith(expect.any(String), 'error')
  })

  it('fetchMyKpis - réponse 401 - kpis reste null, notifie erreur', async () => {
    mockGet.mockResolvedValueOnce({ status: 401, data: { message: 'Non authentifié.' } })

    const store = useKpiStore()
    const result = await store.fetchMyKpis()

    expect(store.kpis).toBeNull()
    expect(result).toBe(false)
  })

  it('fetchMyKpis - erreur réseau - kpis reste null, notifie erreur, retourne false', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'))

    const store = useKpiStore()
    const result = await store.fetchMyKpis()

    expect(store.kpis).toBeNull()
    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith(expect.any(String), 'error')
  })

  it('fetchMyKpis - loading passe à true pendant l\'appel, false après succès', async () => {
    let capturedLoading = false
    mockGet.mockImplementationOnce(async () => {
      capturedLoading = useKpiStore().loading
      return { status: 200, data: KPI_FIXTURE }
    })

    const store = useKpiStore()
    await store.fetchMyKpis()

    expect(capturedLoading).toBe(true)
    expect(store.loading).toBe(false)
  })

  it('fetchMyKpis - loading repasse à false même après une erreur', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'))

    const store = useKpiStore()
    await store.fetchMyKpis()

    expect(store.loading).toBe(false)
  })

  it('fetchMyKpis - deux appels successifs - kpis est toujours la dernière réponse', async () => {
    const first = { ...KPI_FIXTURE, revision: { ...KPI_FIXTURE.revision, streakDays: 1 } }
    const second = { ...KPI_FIXTURE, revision: { ...KPI_FIXTURE.revision, streakDays: 7 } }

    mockGet.mockResolvedValueOnce({ status: 200, data: first })
    mockGet.mockResolvedValueOnce({ status: 200, data: second })

    const store = useKpiStore()
    await store.fetchMyKpis()
    await store.fetchMyKpis()

    expect(store.kpis.revision.streakDays).toBe(7)
  })
})

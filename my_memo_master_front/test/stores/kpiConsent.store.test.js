import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useKpiConsentStore } from '@/stores/kpiConsent'

const { mockGet, mockPost, mockDel, mockNotify } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockDel: vi.fn(),
  mockNotify: vi.fn()
}))

vi.mock('@/helpers/api', () => ({ api: { get: mockGet, post: mockPost, del: mockDel } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: mockNotify } }))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CONSENT = {
  id: 1, studentId: 2, teacherId: 10, classGroupId: 5, subjectId: null,
  teacher: { userId: 10, name: 'M. Dupont', email: 'dupont@school.fr' },
  classGroup: { id: 5, name: 'MP2I A' },
  subject: null
}

const CONSENT_SUBJECT = { ...CONSENT, id: 2, subjectId: 7, subject: { subjectId: 7, name: 'Maths' } }

const KPI = {
  revision: { totalPlanned: 10, totalCompleted: 8, completionRate: 80, streakDays: 5,
    sessionsLast30Days: 10, completedLast30Days: 8, weeklyActivity: [], totalMinutes: 120, revivedToday: false },
  exercises: { totalTests: 3, avgScore: 75, maxScore: 90, minScore: 60, recentTrend: 5, scoreHistory: [] },
  leitner: { totalCards: 15, cardsByBox: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3 }, globalSuccessRate: 70, mastery: 40, cardsDue: 2 },
  subjects: { totalUnique: 1, list: [{ subjectId: 7, name: 'Maths', tests: 3, systems: 1 }] },
  discipline: { plannedThisWeek: 3, completedThisWeek: 2, disciplineScore: 75 },
  badges: [{ id: 'streak7', label: '7 jours de suite', icon: '🔥', unlocked: false, description: '' }]
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useKpiConsentStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // ── État initial ───────────────────────────────────────────────────────────

  it('consents est [] par défaut', () => {
    const store = useKpiConsentStore()
    expect(store.consents).toEqual([])
  })

  it('studentKpis est {} par défaut', () => {
    const store = useKpiConsentStore()
    expect(store.studentKpis).toEqual({})
  })

  it('loading est false par défaut', () => {
    const store = useKpiConsentStore()
    expect(store.loading).toBe(false)
  })

  it('granting est false par défaut', () => {
    const store = useKpiConsentStore()
    expect(store.granting).toBe(false)
  })

  it('_consentsFetchedAt est null par défaut', () => {
    const store = useKpiConsentStore()
    expect(store._consentsFetchedAt).toBeNull()
  })

  // ── fetchMyConsents ────────────────────────────────────────────────────────

  it('fetchMyConsents — 200 — peuple consents, met à jour _consentsFetchedAt, retourne true', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: { data: [CONSENT] } })

    const store = useKpiConsentStore()
    const result = await store.fetchMyConsents()

    expect(mockGet).toHaveBeenCalledWith('kpi/consent/my')
    expect(store.consents).toEqual([CONSENT])
    expect(store._consentsFetchedAt).toBeGreaterThan(0)
    expect(result).toBe(true)
    expect(mockNotify).not.toHaveBeenCalled()
  })

  it('fetchMyConsents — data null — consents = []', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: { data: null } })

    const store = useKpiConsentStore()
    await store.fetchMyConsents()

    expect(store.consents).toEqual([])
  })

  it('fetchMyConsents — TTL valide — deuxième appel sans force ne rappelle pas l\'API', async () => {
    mockGet.mockResolvedValue({ status: 200, data: { data: [] } })

    const store = useKpiConsentStore()
    await store.fetchMyConsents()
    await store.fetchMyConsents()

    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('fetchMyConsents — force=true — rappelle l\'API malgré TTL valide', async () => {
    mockGet.mockResolvedValue({ status: 200, data: { data: [] } })

    const store = useKpiConsentStore()
    await store.fetchMyConsents()
    await store.fetchMyConsents(true)

    expect(mockGet).toHaveBeenCalledTimes(2)
  })

  it('fetchMyConsents — TTL expirée — rappelle l\'API', async () => {
    mockGet.mockResolvedValue({ status: 200, data: { data: [] } })

    const store = useKpiConsentStore()
    store._consentsFetchedAt = Date.now() - 6 * 60 * 1000 // 6 min > TTL 5 min
    await store.fetchMyConsents()

    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('fetchMyConsents — non-200 — notifie erreur, retourne false, consents inchangé', async () => {
    mockGet.mockResolvedValueOnce({ status: 500, data: { message: 'Erreur serveur.' } })

    const store = useKpiConsentStore()
    store.consents = [CONSENT]
    const result = await store.fetchMyConsents()

    expect(result).toBe(false)
    expect(store.consents).toEqual([CONSENT])
    expect(mockNotify).toHaveBeenCalledWith('Erreur serveur.', 'error')
  })

  it('fetchMyConsents — erreur réseau — notifie erreur générique, retourne false', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'))

    const store = useKpiConsentStore()
    const result = await store.fetchMyConsents()

    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith('Erreur lors du chargement des partages.', 'error')
  })

  it('fetchMyConsents — loading passe true pendant l\'appel, false après succès', async () => {
    let capturedLoading = false
    mockGet.mockImplementationOnce(async () => {
      capturedLoading = useKpiConsentStore().loading
      return { status: 200, data: { data: [] } }
    })

    const store = useKpiConsentStore()
    await store.fetchMyConsents()

    expect(capturedLoading).toBe(true)
    expect(store.loading).toBe(false)
  })

  it('fetchMyConsents — loading repasse false même après erreur réseau', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'))

    const store = useKpiConsentStore()
    await store.fetchMyConsents()

    expect(store.loading).toBe(false)
  })

  // ── grantConsent ───────────────────────────────────────────────────────────

  it('grantConsent — 201 sans subjectId — corps sans subjectId, notifie success, retourne true', async () => {
    mockPost.mockResolvedValueOnce({ status: 201, data: { message: 'Consentement accordé.', data: CONSENT } })
    mockGet.mockResolvedValueOnce({ status: 200, data: { data: [CONSENT] } })

    const store = useKpiConsentStore()
    const result = await store.grantConsent(10, 5)

    expect(mockPost).toHaveBeenCalledWith('kpi/consent', { teacherId: 10, classGroupId: 5 })
    expect(mockNotify).toHaveBeenCalledWith('Accès accordé.', 'success')
    expect(mockGet).toHaveBeenCalledWith('kpi/consent/my')
    expect(store.consents).toEqual([CONSENT])
    expect(result).toBe(true)
  })

  it('grantConsent — 201 avec subjectId — corps inclut subjectId', async () => {
    mockPost.mockResolvedValueOnce({ status: 201, data: { data: CONSENT_SUBJECT } })
    mockGet.mockResolvedValueOnce({ status: 200, data: { data: [CONSENT_SUBJECT] } })

    const store = useKpiConsentStore()
    await store.grantConsent(10, 5, 7)

    expect(mockPost).toHaveBeenCalledWith('kpi/consent', { teacherId: 10, classGroupId: 5, subjectId: 7 })
  })

  it('grantConsent — 404 — notifie message enseignant indisponible, retourne false', async () => {
    mockPost.mockResolvedValueOnce({ status: 404, data: { message: "Enseignant introuvable." } })

    const store = useKpiConsentStore()
    const result = await store.grantConsent(10, 5)

    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith("Cet enseignant n'est plus disponible dans ce groupe.", 'error')
  })

  it('grantConsent — non-2xx autre — notifie message serveur, retourne false', async () => {
    mockPost.mockResolvedValueOnce({ status: 403, data: { message: 'Accès refusé.' } })

    const store = useKpiConsentStore()
    const result = await store.grantConsent(10, 5)

    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith('Accès refusé.', 'error')
  })

  it('grantConsent — erreur réseau — notifie erreur générique, retourne false', async () => {
    mockPost.mockRejectedValueOnce(new Error('Network error'))

    const store = useKpiConsentStore()
    const result = await store.grantConsent(10, 5)

    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith("Erreur lors de l'accord de l'accès.", 'error')
  })

  it('grantConsent — granting passe true pendant l\'appel, false après succès', async () => {
    let capturedGranting = false
    mockPost.mockImplementationOnce(async () => {
      capturedGranting = useKpiConsentStore().granting
      return { status: 201, data: {} }
    })
    mockGet.mockResolvedValueOnce({ status: 200, data: { data: [] } })

    const store = useKpiConsentStore()
    await store.grantConsent(10, 5)

    expect(capturedGranting).toBe(true)
    expect(store.granting).toBe(false)
  })

  it('grantConsent — granting repasse false même après erreur réseau', async () => {
    mockPost.mockRejectedValueOnce(new Error('Network error'))

    const store = useKpiConsentStore()
    await store.grantConsent(10, 5)

    expect(store.granting).toBe(false)
  })

  // ── revokeConsent ──────────────────────────────────────────────────────────

  it('revokeConsent — 200 sans subjectId — endpoint sans query, notifie success, force refresh, retourne true', async () => {
    mockDel.mockResolvedValueOnce({ status: 200 })
    mockGet.mockResolvedValueOnce({ status: 200, data: { data: [] } })

    const store = useKpiConsentStore()
    store.consents = [CONSENT]
    const result = await store.revokeConsent(10, 5)

    expect(mockDel).toHaveBeenCalledWith('kpi/consent/10/5')
    expect(mockGet).toHaveBeenCalledWith('kpi/consent/my')
    expect(mockNotify).toHaveBeenCalledWith('Accès révoqué.', 'success')
    expect(result).toBe(true)
  })

  it('revokeConsent — 200 avec subjectId — endpoint inclut ?subjectId=X', async () => {
    mockDel.mockResolvedValueOnce({ status: 200 })
    mockGet.mockResolvedValueOnce({ status: 200, data: { data: [] } })

    const store = useKpiConsentStore()
    await store.revokeConsent(10, 5, 7)

    expect(mockDel).toHaveBeenCalledWith('kpi/consent/10/5?subjectId=7')
  })

  it('revokeConsent — 404 — notifie "Consentement introuvable.", retourne false', async () => {
    mockDel.mockResolvedValueOnce({ status: 404, data: { message: 'Consentement introuvable.' } })

    const store = useKpiConsentStore()
    const result = await store.revokeConsent(10, 5)

    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith('Consentement introuvable.', 'error')
  })

  it('revokeConsent — non-2xx autre — notifie message serveur, retourne false', async () => {
    mockDel.mockResolvedValueOnce({ status: 403, data: { message: 'Accès refusé.' } })

    const store = useKpiConsentStore()
    const result = await store.revokeConsent(10, 5)

    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith('Accès refusé.', 'error')
  })

  it('revokeConsent — erreur réseau — notifie erreur générique, retourne false', async () => {
    mockDel.mockRejectedValueOnce(new Error('Network error'))

    const store = useKpiConsentStore()
    const result = await store.revokeConsent(10, 5)

    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith('Erreur lors de la révocation.', 'error')
  })

  // ── fetchStudentKpis ───────────────────────────────────────────────────────

  it('fetchStudentKpis — 200 — stocke KPI dans studentKpis[studentId], retourne true', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: KPI })

    const store = useKpiConsentStore()
    const result = await store.fetchStudentKpis(42, 5)

    expect(mockGet).toHaveBeenCalledWith('kpi/student/42', { classGroupId: 5 })
    expect(store.studentKpis[42]).toEqual(KPI)
    expect(result).toBe(true)
  })

  it('fetchStudentKpis — 403 (pas de consentement) — studentKpis[studentId] = null, retourne false', async () => {
    mockGet.mockResolvedValueOnce({ status: 403, data: { message: "L'étudiant n'a pas accordé l'accès." } })

    const store = useKpiConsentStore()
    const result = await store.fetchStudentKpis(42, 5)

    expect(store.studentKpis[42]).toBeNull()
    expect(result).toBe(false)
  })

  it('fetchStudentKpis — erreur réseau — studentKpis[studentId] = null, retourne false', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'))

    const store = useKpiConsentStore()
    const result = await store.fetchStudentKpis(42, 5)

    expect(store.studentKpis[42]).toBeNull()
    expect(result).toBe(false)
  })

  it('fetchStudentKpis — deux étudiants — stockés dans des clés séparées indépendantes', async () => {
    const kpiA = { ...KPI, revision: { ...KPI.revision, streakDays: 3 } }
    const kpiB = { ...KPI, revision: { ...KPI.revision, streakDays: 7 } }
    mockGet.mockResolvedValueOnce({ status: 200, data: kpiA })
    mockGet.mockResolvedValueOnce({ status: 200, data: kpiB })

    const store = useKpiConsentStore()
    await store.fetchStudentKpis(10, 5)
    await store.fetchStudentKpis(20, 5)

    expect(store.studentKpis[10].revision.streakDays).toBe(3)
    expect(store.studentKpis[20].revision.streakDays).toBe(7)
  })

  it('fetchStudentKpis — étudiant absent de studentKpis avant appel, présent après', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: KPI })

    const store = useKpiConsentStore()
    expect(42 in store.studentKpis).toBe(false)
    await store.fetchStudentKpis(42, 5)
    expect(42 in store.studentKpis).toBe(true)
  })

  // ── clearStudentKpis ───────────────────────────────────────────────────────

  it('clearStudentKpis — vide studentKpis peu importe son contenu', async () => {
    const store = useKpiConsentStore()
    store.studentKpis = { 10: KPI, 20: null, 30: KPI }
    store.clearStudentKpis()
    expect(store.studentKpis).toEqual({})
  })
})

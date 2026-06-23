import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useKpiAlertSettingsStore } from '@/stores/kpiAlertSettings'

const { mockGet, mockPut, mockNotify } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPut: vi.fn(),
  mockNotify: vi.fn()
}))

vi.mock('@/helpers/api', () => ({ api: { get: mockGet, put: mockPut } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: mockNotify } }))

const SETTINGS_FIXTURE = {
  id: 1, userId: 1,
  enabled: true,
  inAppEnabled: true,
  emailEnabled: false,
  pushEnabled: false,
  streakAlertEnabled: true,
  disciplineAlertEnabled: true,
  scoreDropAlertEnabled: true,
  thresholdDiscipline: 40,
  lastDigestSentAt: null
}

describe('useKpiAlertSettingsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // ── État initial ───────────────────────────────────────────────────────────

  it('settings est null par défaut', () => {
    expect(useKpiAlertSettingsStore().settings).toBeNull()
  })

  it('loading et saving sont false par défaut', () => {
    const store = useKpiAlertSettingsStore()
    expect(store.loading).toBe(false)
    expect(store.saving).toBe(false)
  })

  // ── fetchSettings ──────────────────────────────────────────────────────────

  it('fetchSettings - succès - peuple settings', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: SETTINGS_FIXTURE })

    const store = useKpiAlertSettingsStore()
    await store.fetchSettings()

    expect(mockGet).toHaveBeenCalledWith('kpi/alert-settings')
    expect(store.settings).toEqual(SETTINGS_FIXTURE)
    expect(mockNotify).not.toHaveBeenCalled()
  })

  it('fetchSettings - erreur réseau - settings reste null, notifie erreur', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'))

    const store = useKpiAlertSettingsStore()
    await store.fetchSettings()

    expect(store.settings).toBeNull()
    expect(mockNotify).toHaveBeenCalledWith(expect.any(String), 'error')
  })

  it('fetchSettings - loading passe à true pendant l\'appel, false après', async () => {
    let capturedLoading = false
    mockGet.mockImplementationOnce(async () => {
      capturedLoading = useKpiAlertSettingsStore().loading
      return { status: 200, data: SETTINGS_FIXTURE }
    })

    const store = useKpiAlertSettingsStore()
    await store.fetchSettings()

    expect(capturedLoading).toBe(true)
    expect(store.loading).toBe(false)
  })

  it('fetchSettings - loading repasse à false même après erreur', async () => {
    mockGet.mockRejectedValueOnce(new Error('fail'))

    const store = useKpiAlertSettingsStore()
    await store.fetchSettings()

    expect(store.loading).toBe(false)
  })

  // ── updateSettings ─────────────────────────────────────────────────────────

  it('updateSettings - succès - met à jour settings, notifie succès, retourne true', async () => {
    const updated = { ...SETTINGS_FIXTURE, emailEnabled: true }
    mockPut.mockResolvedValueOnce({ status: 200, data: updated })

    const store = useKpiAlertSettingsStore()
    const result = await store.updateSettings({ emailEnabled: true })

    expect(mockPut).toHaveBeenCalledWith('kpi/alert-settings', { emailEnabled: true })
    expect(store.settings.emailEnabled).toBe(true)
    expect(result).toBe(true)
    expect(mockNotify).toHaveBeenCalledWith(expect.any(String), 'success')
  })

  it('updateSettings - réponse non-200 - retourne false sans notifier succès', async () => {
    mockPut.mockResolvedValueOnce({ status: 400, data: {} })

    const store = useKpiAlertSettingsStore()
    const result = await store.updateSettings({ emailEnabled: true })

    expect(result).toBe(false)
    expect(mockNotify).not.toHaveBeenCalledWith(expect.any(String), 'success')
  })

  it('updateSettings - erreur réseau - notifie erreur, retourne false', async () => {
    mockPut.mockRejectedValueOnce(new Error('Network error'))

    const store = useKpiAlertSettingsStore()
    const result = await store.updateSettings({ emailEnabled: true })

    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith(expect.any(String), 'error')
  })

  it('updateSettings - saving passe à true pendant l\'appel, false après', async () => {
    let capturedSaving = false
    mockPut.mockImplementationOnce(async () => {
      capturedSaving = useKpiAlertSettingsStore().saving
      return { status: 200, data: SETTINGS_FIXTURE }
    })

    const store = useKpiAlertSettingsStore()
    await store.updateSettings({ enabled: false })

    expect(capturedSaving).toBe(true)
    expect(store.saving).toBe(false)
  })

  it('updateSettings - saving repasse à false même après erreur', async () => {
    mockPut.mockRejectedValueOnce(new Error('fail'))

    const store = useKpiAlertSettingsStore()
    await store.updateSettings({})

    expect(store.saving).toBe(false)
  })

  it('updateSettings - plusieurs champs - tous transmis à l\'API', async () => {
    mockPut.mockResolvedValueOnce({ status: 200, data: SETTINGS_FIXTURE })

    const store = useKpiAlertSettingsStore()
    await store.updateSettings({ enabled: false, emailEnabled: true, thresholdDiscipline: 60 })

    expect(mockPut).toHaveBeenCalledWith('kpi/alert-settings', {
      enabled: false, emailEnabled: true, thresholdDiscipline: 60
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useOnboardingStore } from '@/stores/onboarding'

const { mockGet, mockPut, mockAuthUser } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPut: vi.fn(),
  mockAuthUser: { userId: 1 }
}))

vi.mock('@/helpers/api', () => ({ api: { get: mockGet, put: mockPut } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ user: mockAuthUser }) }))

describe('useOnboardingStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockAuthUser.userId = 1
  })

  // ── État initial ───────────────────────────────────────────────────────────

  it('tourSeen est null par défaut (état inconnu)', () => {
    const store = useOnboardingStore()
    expect(store.tourSeen).toBeNull()
  })

  it('checklist est {} par défaut', () => {
    const store = useOnboardingStore()
    expect(store.checklist).toEqual({})
  })

  it('loading est false par défaut', () => {
    const store = useOnboardingStore()
    expect(store.loading).toBe(false)
  })

  // ── fetchState ───────────────────────────────────────────────────────────────

  it('fetchState - 200 avec tour_seen false - peuple le store et retourne true', async () => {
    mockGet.mockResolvedValueOnce({
      status: 200,
      data: { tour_seen: false, checklist: { first_action: false } }
    })

    const store = useOnboardingStore()
    const result = await store.fetchState()

    expect(mockGet).toHaveBeenCalledWith('onboardingState/byUserId')
    expect(result).toBe(true)
    expect(store.tourSeen).toBe(false)
    expect(store.checklist).toEqual({ first_action: false })
  })

  it('fetchState - 200 avec tour_seen true - tourSeen vaut true', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: { tour_seen: true, checklist: {} } })

    const store = useOnboardingStore()
    await store.fetchState()

    expect(store.tourSeen).toBe(true)
  })

  it('fetchState - 200 sans checklist - checklist retombe sur {}', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: { tour_seen: false } })

    const store = useOnboardingStore()
    await store.fetchState()

    expect(store.checklist).toEqual({})
  })

  it('fetchState - 404 - retourne false et tourSeen reste null', async () => {
    mockGet.mockResolvedValueOnce({ status: 404, data: { message: 'Introuvable' } })

    const store = useOnboardingStore()
    const result = await store.fetchState()

    expect(result).toBe(false)
    expect(store.tourSeen).toBeNull()
  })

  it('fetchState - erreur réseau (api retourne undefined) - retourne false', async () => {
    mockGet.mockResolvedValueOnce(undefined)

    const store = useOnboardingStore()
    const result = await store.fetchState()

    expect(result).toBe(false)
    expect(store.tourSeen).toBeNull()
  })

  it('fetchState - loading repasse à false après le chargement', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: { tour_seen: false, checklist: {} } })

    const store = useOnboardingStore()
    await store.fetchState()

    expect(store.loading).toBe(false)
  })

  // ── markTourSeen ─────────────────────────────────────────────────────────────

  it('markTourSeen - 200 - PUT sur onboardingState/:userId avec tour_seen true', async () => {
    mockPut.mockResolvedValueOnce({ status: 200, data: { tour_seen: true, checklist: {} } })

    const store = useOnboardingStore()
    store.tourSeen = false
    const result = await store.markTourSeen()

    expect(mockPut).toHaveBeenCalledWith('onboardingState/1', { tour_seen: true })
    expect(result).toBe(true)
    expect(store.tourSeen).toBe(true)
  })

  it('markTourSeen - déjà vu - retourne true sans appel réseau', async () => {
    const store = useOnboardingStore()
    store.tourSeen = true

    const result = await store.markTourSeen()

    expect(result).toBe(true)
    expect(mockPut).not.toHaveBeenCalled()
  })

  it('markTourSeen - utilisateur sans userId - retourne false sans appel réseau', async () => {
    mockAuthUser.userId = undefined

    const store = useOnboardingStore()
    store.tourSeen = false
    const result = await store.markTourSeen()

    expect(result).toBe(false)
    expect(mockPut).not.toHaveBeenCalled()
  })

  it('markTourSeen - 500 - retourne false et tourSeen inchangé', async () => {
    mockPut.mockResolvedValueOnce({ status: 500, data: { message: 'Erreur' } })

    const store = useOnboardingStore()
    store.tourSeen = false
    const result = await store.markTourSeen()

    expect(result).toBe(false)
    expect(store.tourSeen).toBe(false)
  })

  it('markTourSeen - erreur réseau (api retourne undefined) - retourne false', async () => {
    mockPut.mockResolvedValueOnce(undefined)

    const store = useOnboardingStore()
    store.tourSeen = false
    const result = await store.markTourSeen()

    expect(result).toBe(false)
  })
})

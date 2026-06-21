import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTestResultStore } from '@/stores/testResults'

const { mockGet, mockPost, mockNotify } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockNotify: vi.fn()
}))

vi.mock('@/helpers/api', () => ({ api: { get: mockGet, post: mockPost } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: mockNotify } }))

const RESULT_FIXTURE = {
  resultId: 1,
  testId: 1,
  userId: 1,
  score: 7,
  total: 10,
  completedAt: '2026-06-21T10:00:00.000Z'
}

const HISTORY_FIXTURE = {
  ...RESULT_FIXTURE,
  test: { testId: 1, name: 'Contrôle Maths', subject: { subjectId: 1, name: 'Maths' } }
}

describe('useTestResultStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // ── fetchByTest ────────────────────────────────────────────────────────────────

  it('fetchByTest - succès - peuple results et retourne true', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: [RESULT_FIXTURE] })

    const store = useTestResultStore()
    const result = await store.fetchByTest(1)

    expect(mockGet).toHaveBeenCalledWith('test-results/test/1')
    expect(store.results).toEqual([RESULT_FIXTURE])
    expect(result).toBe(true)
  })

  it('fetchByTest - réponse non-200 - results reste vide et retourne false', async () => {
    mockGet.mockResolvedValueOnce({ status: 404, data: { message: 'Introuvable.' } })

    const store = useTestResultStore()
    const result = await store.fetchByTest(99)

    expect(store.results).toEqual([])
    expect(result).toBe(false)
    expect(mockNotify).not.toHaveBeenCalled()
  })

  it('fetchByTest - erreur réseau - retourne false', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'))

    const store = useTestResultStore()
    const result = await store.fetchByTest(1)

    expect(store.results).toEqual([])
    expect(result).toBe(false)
  })

  // ── fetchByUser ────────────────────────────────────────────────────────────────

  it('fetchByUser - succès - peuple history et retourne true', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: [HISTORY_FIXTURE] })

    const store = useTestResultStore()
    const result = await store.fetchByUser()

    expect(mockGet).toHaveBeenCalledWith('test-results')
    expect(store.history).toEqual([HISTORY_FIXTURE])
    expect(result).toBe(true)
  })

  it('fetchByUser - réponse non-200 - history reste vide et retourne false', async () => {
    mockGet.mockResolvedValueOnce({ status: 500, data: {} })

    const store = useTestResultStore()
    const result = await store.fetchByUser()

    expect(store.history).toEqual([])
    expect(result).toBe(false)
  })

  it('fetchByUser - erreur réseau - retourne false', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'))

    const store = useTestResultStore()
    const result = await store.fetchByUser()

    expect(store.history).toEqual([])
    expect(result).toBe(false)
  })

  // ── saveResult ─────────────────────────────────────────────────────────────────

  it('saveResult - succès - ajoute le résultat en tête de results et retourne true', async () => {
    mockPost.mockResolvedValueOnce({ status: 201, data: RESULT_FIXTURE })

    const store = useTestResultStore()
    const result = await store.saveResult(1, 7, 10)

    expect(mockPost).toHaveBeenCalledWith('test-results', { testId: 1, score: 7, total: 10 })
    expect(store.results[0]).toEqual(RESULT_FIXTURE)
    expect(result).toBe(true)
    expect(mockNotify).not.toHaveBeenCalled()
  })

  it('saveResult - réponse non-201 - retourne false sans notification', async () => {
    mockPost.mockResolvedValueOnce({ status: 500, data: {} })

    const store = useTestResultStore()
    const result = await store.saveResult(1, 7, 10)

    expect(result).toBe(false)
    expect(store.results).toEqual([])
    expect(mockNotify).not.toHaveBeenCalled()
  })

  it('saveResult - erreur réseau - retourne false et notifie l\'erreur', async () => {
    mockPost.mockRejectedValueOnce(new Error('Network error'))

    const store = useTestResultStore()
    const result = await store.saveResult(1, 7, 10)

    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith(expect.any(String), 'error')
  })

  it('saveResult - résultats existants - ajoute en tête (unshift)', async () => {
    const existing = { resultId: 0, testId: 1, userId: 1, score: 5, total: 10, completedAt: '2026-06-20T00:00:00.000Z' }
    mockPost.mockResolvedValueOnce({ status: 201, data: RESULT_FIXTURE })

    const store = useTestResultStore()
    store.results = [existing]
    await store.saveResult(1, 7, 10)

    expect(store.results[0]).toEqual(RESULT_FIXTURE)
    expect(store.results[1]).toEqual(existing)
  })

  // ── getter bestScore ───────────────────────────────────────────────────────────

  it('bestScore - results vide - retourne null', () => {
    const store = useTestResultStore()
    expect(store.bestScore).toBeNull()
  })

  it('bestScore - un seul résultat - retourne ce résultat', () => {
    const store = useTestResultStore()
    store.results = [RESULT_FIXTURE]
    expect(store.bestScore).toEqual(RESULT_FIXTURE)
  })

  it('bestScore - plusieurs résultats - retourne celui avec le meilleur ratio score/total', () => {
    const best = { resultId: 2, testId: 1, userId: 1, score: 9, total: 10, completedAt: '2026-06-22T00:00:00.000Z' }
    const worse = { resultId: 3, testId: 1, userId: 1, score: 3, total: 10, completedAt: '2026-06-23T00:00:00.000Z' }

    const store = useTestResultStore()
    store.results = [RESULT_FIXTURE, best, worse] // 0.7, 0.9, 0.3

    expect(store.bestScore).toEqual(best)
  })

  it('bestScore - égalité de ratio - retourne le premier rencontré', () => {
    const equal = { resultId: 4, testId: 1, userId: 1, score: 14, total: 20, completedAt: '2026-06-24T00:00:00.000Z' }

    const store = useTestResultStore()
    store.results = [RESULT_FIXTURE, equal] // 7/10 = 14/20 = 0.7

    expect(store.bestScore).toEqual(RESULT_FIXTURE)
  })
})

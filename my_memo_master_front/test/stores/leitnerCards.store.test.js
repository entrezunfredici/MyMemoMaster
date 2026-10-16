import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLeitnerCardStore } from '@/stores/leitnerCards'

const { mockGet, mockPost, mockNotify } = vi.hoisted(() => ({
  mockGet:    vi.fn(),
  mockPost:   vi.fn(),
  mockNotify: vi.fn(),
}))

vi.mock('@/helpers/api',  () => ({ api: { get: mockGet, post: mockPost } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: mockNotify } }))

describe('useLeitnerCardStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // ── fetchDueCards ──────────────────────────────────────────────────────────

  it('fetchDueCards - succès - peuple dueCards et retourne true', async () => {
    const cards = [{ idCard: 1, idBox: 1, leitnerBox: { level: 1 } }]
    mockGet.mockResolvedValueOnce({ status: 200, data: cards })

    const store = useLeitnerCardStore()
    const result = await store.fetchDueCards(5)

    expect(mockGet).toHaveBeenCalledWith('leitnercards/due/5')
    expect(store.dueCards).toEqual(cards)
    expect(result).toBe(true)
  })

  it('fetchDueCards - réponse non-200 - dueCards reste vide, notifie erreur', async () => {
    mockGet.mockResolvedValueOnce({ status: 404, data: { message: 'Système introuvable.' } })

    const store = useLeitnerCardStore()
    const result = await store.fetchDueCards(99)

    expect(store.dueCards).toEqual([])
    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith(expect.any(String), 'error')
  })

  it('fetchDueCards - erreur réseau - retourne false et notifie', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'))

    const store = useLeitnerCardStore()
    const result = await store.fetchDueCards(5)

    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith(expect.any(String), 'error')
  })

  // ── submitResponse ─────────────────────────────────────────────────────────

  it('submitResponse - bonne réponse - lastCorrection mis à jour, niveau boîte incrémenté', async () => {
    const correction = { success: true, score: 0.95, newLevel: 2, correction: 'Paris', explanation: 'Correct.', decision_zone: 'high' }
    mockPost.mockResolvedValueOnce({ status: 200, data: correction })

    const store = useLeitnerCardStore()
    store.dueCards = [{ idCard: 1, leitnerBox: { level: 1 } }]

    const result = await store.submitResponse(1, 'Paris')

    expect(mockPost).toHaveBeenCalledWith(
      'leitnercards/response',
      { cardId: 1, studentAnswer: 'Paris' },
      expect.objectContaining({ timeout: 90000 })
    )
    expect(store.lastCorrection).toEqual(correction)
    expect(store.dueCards[0].leitnerBox.level).toBe(2)  // niveau mis à jour localement
    expect(result).toBe(true)
  })

  it('submitResponse - mauvaise réponse - success false, niveau retombé à 1', async () => {
    const correction = { success: false, score: 0.1, newLevel: 1, correction: 'Paris', explanation: 'Incorrect.', decision_zone: 'low' }
    mockPost.mockResolvedValueOnce({ status: 200, data: correction })

    const store = useLeitnerCardStore()
    store.dueCards = [{ idCard: 1, leitnerBox: { level: 3 } }]

    await store.submitResponse(1, 'Lyon')

    expect(store.lastCorrection?.success).toBe(false)
    expect(store.dueCards[0].leitnerBox.level).toBe(1)
  })

  it('submitResponse - réponse API non-200 - retourne false, lastCorrection inchangé', async () => {
    mockPost.mockResolvedValueOnce({ status: 500, data: { message: 'Erreur serveur.' } })

    const store = useLeitnerCardStore()
    const result = await store.submitResponse(1, 'Paris')

    expect(result).toBe(false)
    expect(store.lastCorrection).toBeNull()
    expect(mockNotify).toHaveBeenCalledWith(expect.any(String), 'error')
  })

  it('submitResponse - erreur réseau - retourne false et notifie', async () => {
    mockPost.mockRejectedValueOnce(new Error('Timeout'))

    const store = useLeitnerCardStore()
    const result = await store.submitResponse(1, 'Paris')

    expect(result).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith(expect.any(String), 'error')
  })
})

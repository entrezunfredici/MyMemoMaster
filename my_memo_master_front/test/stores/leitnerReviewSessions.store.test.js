import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLeitnerReviewSessionStore } from '@/stores/leitnerReviewSessions'

const { mockPost } = vi.hoisted(() => ({ mockPost: vi.fn() }))

vi.mock('@/helpers/api', () => ({ api: { post: mockPost } }))

describe('useLeitnerReviewSessionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('logSession - envoie idSystem, cardsReviewed, durationSeconds et completed (défaut true)', async () => {
    mockPost.mockResolvedValueOnce({ status: 201, data: { id: 1 } })

    const store = useLeitnerReviewSessionStore()
    await store.logSession(2, 5, 120)

    expect(mockPost).toHaveBeenCalledWith('leitner-review-sessions', { idSystem: 2, cardsReviewed: 5, durationSeconds: 120, completed: true })
  })

  it('logSession - completed explicite à false (sortie anticipée)', async () => {
    mockPost.mockResolvedValueOnce({ status: 201, data: { id: 1 } })

    const store = useLeitnerReviewSessionStore()
    await store.logSession(2, 3, 60, false)

    expect(mockPost).toHaveBeenCalledWith('leitner-review-sessions', { idSystem: 2, cardsReviewed: 3, durationSeconds: 60, completed: false })
  })

  it('logSession - erreur réseau - ne lève pas (best-effort)', async () => {
    mockPost.mockRejectedValueOnce(new Error('Network error'))

    const store = useLeitnerReviewSessionStore()

    await expect(store.logSession(2, 5, 120)).resolves.toBeUndefined()
  })
})

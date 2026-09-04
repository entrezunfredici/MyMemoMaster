import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMindMapViewSessionStore } from '@/stores/mindmapViewSessions'

const { mockPost, mockPostBeacon } = vi.hoisted(() => ({ mockPost: vi.fn(), mockPostBeacon: vi.fn() }))

vi.mock('@/helpers/api', () => ({ api: { post: mockPost, postBeacon: mockPostBeacon } }))

describe('useMindMapViewSessionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('logSession - envoie idMindMap et durationSeconds', async () => {
    mockPost.mockResolvedValueOnce({ status: 201, data: { id: 1 } })

    const store = useMindMapViewSessionStore()
    await store.logSession(2, 120)

    expect(mockPost).toHaveBeenCalledWith('mindmap-view-sessions', { idMindMap: 2, durationSeconds: 120 })
  })

  it('logSession - erreur réseau - ne lève pas (best-effort)', async () => {
    mockPost.mockRejectedValueOnce(new Error('Network error'))

    const store = useMindMapViewSessionStore()

    await expect(store.logSession(2, 120)).resolves.toBeUndefined()
  })

  it('logSessionBeacon - délègue à api.postBeacon avec idMindMap et durationSeconds', () => {
    const store = useMindMapViewSessionStore()
    store.logSessionBeacon(2, 120)

    expect(mockPostBeacon).toHaveBeenCalledWith('mindmap-view-sessions', { idMindMap: 2, durationSeconds: 120 })
  })
})

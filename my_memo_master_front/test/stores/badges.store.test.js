import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useBadgesStore } from '@/stores/badges'

const { mockList, mockSummary, mockMarkSeen, mockNotify } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockSummary: vi.fn(),
  mockMarkSeen: vi.fn(),
  mockNotify: vi.fn(),
}))

vi.mock('@/helpers/badgesApi', () => ({ badgesApi: { list: mockList, summary: mockSummary, markSeen: mockMarkSeen } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: mockNotify } }))

const BADGES = [
  { code: 'a', earned: true, seenAt: null },
  { code: 'b', earned: true, seenAt: '2026-10-01T00:00:00Z' },
  { code: 'c', earned: false, seenAt: null },
]
const SUMMARY = { level: { name: 'Débutant', next: { name: 'Apprenti', min: 5 } }, earnedCount: 2, totalCount: 14, streakCurrent: 1, streakBest: 3 }

describe('useBadgesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('fetchAll', () => {
    it('succès - peuple badges et résumé', async () => {
      mockList.mockResolvedValueOnce({ status: 200, data: BADGES })
      mockSummary.mockResolvedValueOnce({ status: 200, data: SUMMARY })
      const store = useBadgesStore()

      expect(await store.fetchAll()).toBe(true)
      expect(store.badges).toEqual(BADGES)
      expect(store.summary).toEqual(SUMMARY)
      expect(store.error).toBe(false)
      expect(store.loading).toBe(false)
    })

    it('cache court - deuxième appel sans requête', async () => {
      mockList.mockResolvedValue({ status: 200, data: BADGES })
      mockSummary.mockResolvedValue({ status: 200, data: SUMMARY })
      const store = useBadgesStore()

      await store.fetchAll()
      await store.fetchAll()
      expect(mockList).toHaveBeenCalledTimes(1)
    })

    it('force - ignore le cache', async () => {
      mockList.mockResolvedValue({ status: 200, data: BADGES })
      mockSummary.mockResolvedValue({ status: 200, data: SUMMARY })
      const store = useBadgesStore()

      await store.fetchAll()
      await store.fetchAll(true)
      expect(mockList).toHaveBeenCalledTimes(2)
    })

    it('statut non 200 - error vrai, retourne false', async () => {
      mockList.mockResolvedValueOnce({ status: 500, data: {} })
      mockSummary.mockResolvedValueOnce({ status: 200, data: SUMMARY })
      const store = useBadgesStore()

      expect(await store.fetchAll()).toBe(false)
      expect(store.error).toBe(true)
      expect(store.loading).toBe(false)
    })

    it('réponse absente (401 / réseau) - error vrai', async () => {
      mockList.mockResolvedValueOnce(undefined)
      mockSummary.mockResolvedValueOnce(undefined)
      const store = useBadgesStore()

      expect(await store.fetchAll()).toBe(false)
      expect(store.error).toBe(true)
    })

    it('exception - error vrai, loading remis à faux', async () => {
      mockList.mockRejectedValueOnce(new Error('réseau'))
      mockSummary.mockResolvedValueOnce({ status: 200, data: SUMMARY })
      const store = useBadgesStore()

      expect(await store.fetchAll()).toBe(false)
      expect(store.error).toBe(true)
      expect(store.loading).toBe(false)
    })

    it('échec - ne mémorise pas le cache, le prochain appel réessaie', async () => {
      mockList.mockResolvedValueOnce(undefined).mockResolvedValueOnce({ status: 200, data: BADGES })
      mockSummary.mockResolvedValueOnce(undefined).mockResolvedValueOnce({ status: 200, data: SUMMARY })
      const store = useBadgesStore()

      await store.fetchAll()
      expect(await store.fetchAll()).toBe(true)
      expect(store.error).toBe(false)
    })
  })

  describe('markAllSeen', () => {
    it('envoie seulement les badges obtenus non vus et met à jour seenAt', async () => {
      const store = useBadgesStore()
      store.badges = BADGES.map((b) => ({ ...b }))
      mockMarkSeen.mockResolvedValueOnce({ status: 200, data: { updated: 1 } })

      expect(await store.markAllSeen()).toBe(true)
      expect(mockMarkSeen).toHaveBeenCalledWith(['a'])
      expect(store.unseenCodes).toEqual([])
    })

    it('rien à marquer - aucun appel', async () => {
      const store = useBadgesStore()
      store.badges = [{ code: 'b', earned: true, seenAt: 'x' }]

      expect(await store.markAllSeen()).toBe(true)
      expect(mockMarkSeen).not.toHaveBeenCalled()
    })

    it('erreur serveur - notifie en français et garde les badges non vus', async () => {
      const store = useBadgesStore()
      store.badges = BADGES.map((b) => ({ ...b }))
      mockMarkSeen.mockResolvedValueOnce({ status: 500, data: { message: 'Erreur lors de la mise à jour des badges.' } })

      expect(await store.markAllSeen()).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Erreur lors de la mise à jour des badges.', 'error')
      expect(store.unseenCodes).toEqual(['a'])
    })

    it('exception réseau - notifie', async () => {
      const store = useBadgesStore()
      store.badges = BADGES.map((b) => ({ ...b }))
      mockMarkSeen.mockRejectedValueOnce(new Error('réseau'))

      expect(await store.markAllSeen()).toBe(false)
      expect(mockNotify).toHaveBeenCalled()
    })
  })
})

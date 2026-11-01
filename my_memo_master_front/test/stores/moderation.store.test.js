import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useModerationStore } from '@/stores/moderation'

const { mockGet, mockPatch, mockNotify } = vi.hoisted(() => ({ mockGet: vi.fn(), mockPatch: vi.fn(), mockNotify: vi.fn() }))

vi.mock('@/helpers/api', () => ({ api: { get: mockGet, patch: mockPatch } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: mockNotify } }))

const ITEM = { id: 5, contentType: 'resource', contentId: 4, status: 'pending', priority: 'high' }

describe('useModerationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('fetchQueue', () => {
    it('fetchQueue - succès - peuple la file et la pagination, retourne true', async () => {
      mockGet.mockResolvedValueOnce({ status: 200, data: { data: { items: [ITEM], total: 45, page: 2, limit: 20 } } })
      const store = useModerationStore()

      const result = await store.fetchQueue({ page: 2 })

      expect(mockGet).toHaveBeenCalledWith('content-reports', { page: 2, limit: 20 })
      expect(store.items).toEqual([ITEM])
      expect(store.total).toBe(45)
      expect(store.page).toBe(2)
      expect(store.pageCount).toBe(3)
      expect(result).toBe(true)
      expect(store.loading).toBe(false)
    })

    it('fetchQueue - filtres renseignés - les transmet, les filtres vides sont ignorés', async () => {
      mockGet.mockResolvedValueOnce({ status: 200, data: { data: { items: [], total: 0, page: 1, limit: 20 } } })
      const store = useModerationStore()

      await store.fetchQueue({ status: 'hidden', reason: '', contentType: 'section' })

      expect(mockGet).toHaveBeenCalledWith('content-reports', { page: 1, limit: 20, status: 'hidden', contentType: 'section' })
    })

    it('fetchQueue - refus de l\'API - notifie le message et retourne false', async () => {
      mockGet.mockResolvedValueOnce({ status: 403, data: { message: 'Accès refusé. Permissions insuffisantes.' } })
      const store = useModerationStore()

      expect(await store.fetchQueue()).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Accès refusé. Permissions insuffisantes.', 'error')
    })

    it('fetchQueue - serveur injoignable - message générique et retourne false', async () => {
      mockGet.mockResolvedValueOnce(undefined)
      const store = useModerationStore()

      expect(await store.fetchQueue()).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Erreur lors du chargement de la file de traitement.', 'error')
    })

    it('pageCount - file vide - retourne au moins 1', () => {
      expect(useModerationStore().pageCount).toBe(1)
    })
  })

  describe('fetchDetail', () => {
    it('fetchDetail - succès - stocke le détail et retourne true', async () => {
      const detail = { report: ITEM, reports: [ITEM], content: {}, author: { userId: 3, isActive: true } }
      mockGet.mockResolvedValueOnce({ status: 200, data: { data: detail } })
      const store = useModerationStore()

      expect(await store.fetchDetail(5)).toBe(true)
      expect(mockGet).toHaveBeenCalledWith('content-reports/5')
      expect(store.detail).toEqual(detail)
    })

    it('fetchDetail - hors périmètre (404) - détail vidé, message affiché, retourne false', async () => {
      mockGet.mockResolvedValueOnce({ status: 404, data: { message: 'Signalement ou contenu introuvable.' } })
      const store = useModerationStore()
      store.detail = { report: ITEM }

      expect(await store.fetchDetail(5)).toBe(false)
      expect(store.detail).toBeNull()
      expect(mockNotify).toHaveBeenCalledWith('Signalement ou contenu introuvable.', 'error')
    })
  })

  describe('act', () => {
    it.each([
      ['claim', 'claim', {}],
      ['restore', 'restore', {}],
      ['dismiss', 'dismiss', { decisionNote: 'Conforme' }],
      ['hide', 'hide', { decisionNote: 'Conforme' }],
      ['remove', 'remove-content', { decisionNote: 'Conforme' }],
      ['suspend', 'suspend-author', { decisionNote: 'Conforme' }],
    ])('act - %s - appelle PATCH /%s avec le bon corps', async (action, route, body) => {
      mockPatch.mockResolvedValueOnce({ status: 200, data: { data: {} } })
      const store = useModerationStore()

      const result = await store.act(5, action, '  Conforme  ')

      expect(mockPatch).toHaveBeenCalledWith(`content-reports/5/${route}`, body)
      expect(mockNotify).toHaveBeenCalledWith(expect.any(String), 'success')
      expect(result).toBe(true)
      expect(store.acting).toBe(false)
    })

    it('act - dossier déjà traité (409) - avertissement avec le message de l\'API, retourne false', async () => {
      mockPatch.mockResolvedValueOnce({ status: 409, data: { message: 'Ce signalement ne peut pas recevoir cette action dans son état actuel.' } })
      const store = useModerationStore()

      expect(await store.act(5, 'hide', 'x')).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Ce signalement ne peut pas recevoir cette action dans son état actuel.', 'warning')
    })

    it('act - signalement visant son propre contenu (403) - erreur avec le message de l\'API', async () => {
      mockPatch.mockResolvedValueOnce({ status: 403, data: { message: 'Vous ne pouvez pas traiter un signalement visant votre propre contenu.' } })
      const store = useModerationStore()

      expect(await store.act(5, 'dismiss', 'x')).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Vous ne pouvez pas traiter un signalement visant votre propre contenu.', 'error')
    })

    it('act - serveur injoignable - message générique et retourne false', async () => {
      mockPatch.mockResolvedValueOnce(undefined)
      const store = useModerationStore()

      expect(await store.act(5, 'remove', 'x')).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith("Erreur lors de l'action de modération.", 'error')
    })

    it('act - action inconnue - n\'appelle pas l\'API et retourne false', async () => {
      const store = useModerationStore()

      expect(await store.act(5, 'explode', 'x')).toBe(false)
      expect(mockPatch).not.toHaveBeenCalled()
    })

    it('act - pendant l\'appel - acting vaut true puis repasse à false', async () => {
      let resolve
      mockPatch.mockReturnValueOnce(new Promise((r) => { resolve = r }))
      const store = useModerationStore()

      const pending = store.act(5, 'claim')
      expect(store.acting).toBe(true)
      resolve({ status: 200, data: {} })
      await pending

      expect(store.acting).toBe(false)
    })
  })
})

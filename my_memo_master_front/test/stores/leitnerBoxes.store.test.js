import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLeitnerBoxStore } from '@/stores/leitnerBoxes'

const { mockGet, mockPost, mockPut, mockDel, mockNotify } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockDel: vi.fn(),
  mockNotify: vi.fn(),
}))

vi.mock('@/helpers/api', () => ({ api: { get: mockGet, post: mockPost, put: mockPut, del: mockDel } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: mockNotify } }))

describe('useLeitnerBoxStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('levelsForSystem', () => {
    it('retourne les niveaux du système demandé, triés croissants', () => {
      const store = useLeitnerBoxStore()
      store.boxes = [
        { idSystem: 1, level: 3 },
        { idSystem: 2, level: 1 },
        { idSystem: 1, level: 1 },
        { idSystem: 1, level: 2 },
      ]
      expect(store.levelsForSystem(1)).toEqual([1, 2, 3])
      expect(store.levelsForSystem(2)).toEqual([1])
    })

    it('système sans boîte - liste vide', () => {
      expect(useLeitnerBoxStore().levelsForSystem(99)).toEqual([])
    })
  })

  describe('fetchBoxes', () => {
    it('200 - peuple les boîtes', async () => {
      mockGet.mockResolvedValueOnce({ status: 200, data: [{ id: 1 }] })
      const store = useLeitnerBoxStore()
      expect(await store.fetchBoxes()).toBe(true)
      expect(mockGet).toHaveBeenCalledWith('leitnerboxes')
      expect(store.boxes).toEqual([{ id: 1 }])
    })

    it('non-200 - message du serveur, false', async () => {
      mockGet.mockResolvedValueOnce({ status: 500, data: { message: 'Panne' } })
      expect(await useLeitnerBoxStore().fetchBoxes()).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Panne', 'error')
    })

    it('erreur réseau - message fixe, false', async () => {
      mockGet.mockRejectedValueOnce(new Error('KO'))
      expect(await useLeitnerBoxStore().fetchBoxes()).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Erreur lors du chargement des boîtes.', 'error')
    })
  })

  describe('fetchBoxById', () => {
    it('200 - remplit la boîte courante', async () => {
      mockGet.mockResolvedValueOnce({ status: 200, data: { id: 4, level: 2 } })
      const store = useLeitnerBoxStore()
      expect(await store.fetchBoxById(4)).toBe(true)
      expect(mockGet).toHaveBeenCalledWith('leitnerboxes/4')
      expect(store.box).toEqual({ id: 4, level: 2 })
    })

    it('404 - message par défaut', async () => {
      mockGet.mockResolvedValueOnce({ status: 404, data: null })
      expect(await useLeitnerBoxStore().fetchBoxById(4)).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Boîte introuvable.', 'error')
    })

    it('erreur réseau', async () => {
      mockGet.mockRejectedValueOnce(new Error('KO'))
      expect(await useLeitnerBoxStore().fetchBoxById(4)).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Erreur lors de la récupération de la boîte.', 'error')
    })
  })

  describe('createBox', () => {
    it('201 - mémorise la boîte créée, notifie et recharge la liste', async () => {
      mockPost.mockResolvedValueOnce({ status: 201, data: { id: 8, level: 1 } })
      mockGet.mockResolvedValueOnce({ status: 200, data: [{ id: 8 }] })
      const store = useLeitnerBoxStore()
      store.box = { level: 1 }
      expect(await store.createBox()).toBe(true)
      expect(mockPost).toHaveBeenCalledWith('leitnerboxes', { level: 1 })
      expect(store.box).toEqual({ id: 8, level: 1 })
      expect(mockNotify).toHaveBeenCalledWith('Boîte créée avec succès.', 'success')
      expect(mockGet).toHaveBeenCalledWith('leitnerboxes')
    })

    it('non-201 - pas de rechargement', async () => {
      mockPost.mockResolvedValueOnce({ status: 400, data: { message: 'Niveau invalide' } })
      expect(await useLeitnerBoxStore().createBox()).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Niveau invalide', 'error')
      expect(mockGet).not.toHaveBeenCalled()
    })

    it('erreur réseau', async () => {
      mockPost.mockRejectedValueOnce(new Error('KO'))
      expect(await useLeitnerBoxStore().createBox()).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Erreur lors de la création de la boîte.', 'error')
    })
  })

  describe('updateBox', () => {
    it('200 - PUT, notification et rechargement', async () => {
      mockPut.mockResolvedValueOnce({ status: 200, data: {} })
      mockGet.mockResolvedValueOnce({ status: 200, data: [] })
      const store = useLeitnerBoxStore()
      store.box = { id: 2, level: 3 }
      expect(await store.updateBox(2)).toBe(true)
      expect(mockPut).toHaveBeenCalledWith('leitnerboxes/2', { id: 2, level: 3 })
      expect(mockNotify).toHaveBeenCalledWith('Boîte mise à jour avec succès.', 'success')
      expect(mockGet).toHaveBeenCalledWith('leitnerboxes')
    })

    it('non-200 - message par défaut, pas de rechargement', async () => {
      mockPut.mockResolvedValueOnce({ status: 500, data: {} })
      expect(await useLeitnerBoxStore().updateBox(2)).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Erreur lors de la mise à jour.', 'error')
      expect(mockGet).not.toHaveBeenCalled()
    })

    it('erreur réseau', async () => {
      mockPut.mockRejectedValueOnce(new Error('KO'))
      expect(await useLeitnerBoxStore().updateBox(2)).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Erreur lors de la mise à jour de la boîte.', 'error')
    })
  })

  describe('deleteBox', () => {
    it('200 - supprime, notifie et recharge', async () => {
      mockDel.mockResolvedValueOnce({ status: 200 })
      mockGet.mockResolvedValueOnce({ status: 200, data: [] })
      expect(await useLeitnerBoxStore().deleteBox(6)).toBe(true)
      expect(mockDel).toHaveBeenCalledWith('leitnerboxes/6')
      expect(mockNotify).toHaveBeenCalledWith('Boîte supprimée avec succès.', 'success')
      expect(mockGet).toHaveBeenCalledWith('leitnerboxes')
    })

    it('non-200 - false', async () => {
      mockDel.mockResolvedValueOnce({ status: 409, data: { message: 'Boîte non vide' } })
      expect(await useLeitnerBoxStore().deleteBox(6)).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Boîte non vide', 'error')
    })

    it('erreur réseau', async () => {
      mockDel.mockRejectedValueOnce(new Error('KO'))
      expect(await useLeitnerBoxStore().deleteBox(6)).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Erreur lors de la suppression de la boîte.', 'error')
    })
  })
})

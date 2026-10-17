import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFieldStore } from '@/stores/fields'

const { mockGet, mockPost, mockPut, mockDel, mockNotify } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockDel: vi.fn(),
  mockNotify: vi.fn(),
}))

vi.mock('@/helpers/api', () => ({ api: { get: mockGet, post: mockPost, put: mockPut, del: mockDel } }))
vi.mock('@/helpers/notif.js', () => ({ notif: { notify: mockNotify } }))

describe('useFieldStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('état initial : aucun champ', () => {
    const store = useFieldStore()
    expect(store.fields).toEqual([])
    expect(store.field).toEqual({ fieldletter: '', idType: null, data: null })
  })

  describe('fetchFields', () => {
    it('succès - peuple la liste et retourne true', async () => {
      mockGet.mockResolvedValueOnce({ status: 200, data: [{ id: 1 }, { id: 2 }] })
      const store = useFieldStore()
      expect(await store.fetchFields()).toBe(true)
      expect(mockGet).toHaveBeenCalledWith('fields')
      expect(store.fields).toEqual([{ id: 1 }, { id: 2 }])
    })

    it('réponse non-200 - notifie le message du serveur et retourne false', async () => {
      mockGet.mockResolvedValueOnce({ status: 500, data: { message: 'Panne' } })
      const store = useFieldStore()
      expect(await store.fetchFields()).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Panne', 'error')
      expect(store.fields).toEqual([])
    })

    it('réponse non-200 sans message - message par défaut', async () => {
      mockGet.mockResolvedValueOnce({ status: 500, data: {} })
      await useFieldStore().fetchFields()
      expect(mockNotify).toHaveBeenCalledWith('Erreur lors du chargement des champs.', 'error')
    })

    it('erreur réseau - retourne false et notifie', async () => {
      mockGet.mockRejectedValueOnce(new Error('réseau'))
      expect(await useFieldStore().fetchFields()).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith(expect.stringContaining('réseau'), 'error')
    })
  })

  describe('fetchFieldById', () => {
    it('succès - remplit le champ courant', async () => {
      mockGet.mockResolvedValueOnce({ status: 200, data: { fieldletter: 'E', idType: 2, data: 'x' } })
      const store = useFieldStore()
      expect(await store.fetchFieldById(7)).toBe(true)
      expect(mockGet).toHaveBeenCalledWith('fields/7')
      expect(store.field.fieldletter).toBe('E')
    })

    it('introuvable - message par défaut et false', async () => {
      mockGet.mockResolvedValueOnce({ status: 404, data: null })
      const store = useFieldStore()
      expect(await store.fetchFieldById(7)).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Champ introuvable.', 'error')
    })

    it('erreur réseau - false', async () => {
      mockGet.mockRejectedValueOnce(new Error('KO'))
      expect(await useFieldStore().fetchFieldById(1)).toBe(false)
    })
  })

  describe('createField', () => {
    it('201 - envoie le champ courant et notifie le succès', async () => {
      mockPost.mockResolvedValueOnce({ status: 201, data: {} })
      const store = useFieldStore()
      store.field = { fieldletter: 'V', idType: 1, data: 3 }
      expect(await store.createField()).toBe(true)
      expect(mockPost).toHaveBeenCalledWith('fields', { fieldletter: 'V', idType: 1, data: 3 })
      expect(mockNotify).toHaveBeenCalledWith('Champ créé avec succès.', 'success')
    })

    it('autre statut - notifie et retourne false', async () => {
      mockPost.mockResolvedValueOnce({ status: 400, data: { message: 'Invalide' } })
      expect(await useFieldStore().createField()).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Invalide', 'error')
    })

    it('erreur réseau - false', async () => {
      mockPost.mockRejectedValueOnce(new Error('KO'))
      expect(await useFieldStore().createField()).toBe(false)
    })
  })

  describe('updateField', () => {
    it('200 - PUT sur l’identifiant et notifie', async () => {
      mockPut.mockResolvedValueOnce({ status: 200, data: {} })
      const store = useFieldStore()
      expect(await store.updateField(4)).toBe(true)
      expect(mockPut).toHaveBeenCalledWith('fields/4', store.field)
      expect(mockNotify).toHaveBeenCalledWith('Champ mis à jour avec succès.', 'success')
    })

    it('non-200 - false et message par défaut', async () => {
      mockPut.mockResolvedValueOnce({ status: 500, data: {} })
      expect(await useFieldStore().updateField(4)).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Erreur lors de la mise à jour.', 'error')
    })

    it('erreur réseau - false', async () => {
      mockPut.mockRejectedValueOnce(new Error('KO'))
      expect(await useFieldStore().updateField(4)).toBe(false)
    })
  })

  describe('deleteField', () => {
    it('204 - succès', async () => {
      mockDel.mockResolvedValueOnce({ status: 204 })
      expect(await useFieldStore().deleteField(9)).toBe(true)
      expect(mockDel).toHaveBeenCalledWith('fields/9')
      expect(mockNotify).toHaveBeenCalledWith('Champ supprimé avec succès.', 'success')
    })

    it('200 n’est pas un succès (la suppression attend 204)', async () => {
      mockDel.mockResolvedValueOnce({ status: 200, data: {} })
      expect(await useFieldStore().deleteField(9)).toBe(false)
    })

    it('erreur réseau - false', async () => {
      mockDel.mockRejectedValueOnce(new Error('KO'))
      expect(await useFieldStore().deleteField(9)).toBe(false)
    })
  })
})

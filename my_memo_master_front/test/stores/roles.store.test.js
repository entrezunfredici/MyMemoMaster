import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRoleStore } from '@/stores/roles'

const { mockGet, mockPost, mockPut, mockDel, mockNotify } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockDel: vi.fn(),
  mockNotify: vi.fn(),
}))

vi.mock('@/helpers/api', () => ({ api: { get: mockGet, post: mockPost, put: mockPut, del: mockDel } }))
vi.mock('@/helpers/notif.js', () => ({ notif: { notify: mockNotify } }))

// Caractérisation : les actions de ce store n'ont PAS de valeur de retour exploitable (les `return`
// sont dans des callbacks `.then`). On vérifie donc l'état et les notifications, qui sont ce que les
// appelants observent réellement.
describe('useRoleStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('état initial', () => {
    const store = useRoleStore()
    expect(store.roles).toEqual([])
    expect(store.role).toEqual({})
  })

  describe('fetchRoles', () => {
    it('200 - peuple la liste', async () => {
      mockGet.mockResolvedValueOnce({ status: 200, data: [{ id: 1, name: 'admin' }] })
      const store = useRoleStore()
      await store.fetchRoles()
      expect(mockGet).toHaveBeenCalledWith('roles')
      expect(store.roles).toEqual([{ id: 1, name: 'admin' }])
      expect(mockNotify).not.toHaveBeenCalled()
    })

    it('non-200 - notifie et laisse la liste vide', async () => {
      mockGet.mockResolvedValueOnce({ status: 500, data: { message: 'Panne' } })
      const store = useRoleStore()
      await store.fetchRoles()
      expect(mockNotify).toHaveBeenCalledWith('Panne', 'error')
      expect(store.roles).toEqual([])
    })

    it('non-200 sans message - message par défaut', async () => {
      mockGet.mockResolvedValueOnce({ status: 500, data: {} })
      await useRoleStore().fetchRoles()
      expect(mockNotify).toHaveBeenCalledWith('Erreur lors du chargement.', 'error')
    })

    it('erreur réseau - notifie sans lever d’exception', async () => {
      mockGet.mockRejectedValueOnce(new Error('réseau'))
      await expect(useRoleStore().fetchRoles()).resolves.toBeUndefined()
      expect(mockNotify).toHaveBeenCalledWith(expect.stringContaining('réseau'), 'error')
    })
  })

  describe('fetchRoleById', () => {
    it('200 - remplit le rôle courant', async () => {
      mockGet.mockResolvedValueOnce({ status: 200, data: { id: 3, name: 'prof' } })
      const store = useRoleStore()
      await store.fetchRoleById(3)
      expect(mockGet).toHaveBeenCalledWith('roles/3')
      expect(store.role).toEqual({ id: 3, name: 'prof' })
    })

    it('404 - message par défaut, rôle inchangé', async () => {
      mockGet.mockResolvedValueOnce({ status: 404, data: null })
      const store = useRoleStore()
      await store.fetchRoleById(3)
      expect(mockNotify).toHaveBeenCalledWith('Rôle introuvable.', 'error')
      expect(store.role).toEqual({})
    })

    it('erreur réseau - notifie', async () => {
      mockGet.mockRejectedValueOnce(new Error('KO'))
      await useRoleStore().fetchRoleById(3)
      expect(mockNotify).toHaveBeenCalledWith(expect.stringContaining('KO'), 'error')
    })
  })

  describe('addRole', () => {
    it('201 - envoie le rôle courant et notifie', async () => {
      mockPost.mockResolvedValueOnce({ status: 201, data: {} })
      const store = useRoleStore()
      store.role = { name: 'élève' }
      await store.addRole()
      expect(mockPost).toHaveBeenCalledWith('roles', { name: 'élève' })
      expect(mockNotify).toHaveBeenCalledWith('Rôle créé avec succès.', 'success')
    })

    it('non-201 - notifie l’erreur', async () => {
      mockPost.mockResolvedValueOnce({ status: 400, data: { message: 'Nom requis' } })
      await useRoleStore().addRole()
      expect(mockNotify).toHaveBeenCalledWith('Nom requis', 'error')
    })

    it('erreur réseau - notifie', async () => {
      mockPost.mockRejectedValueOnce(new Error('KO'))
      await useRoleStore().addRole()
      expect(mockNotify).toHaveBeenCalledWith(expect.stringContaining('KO'), 'error')
    })
  })

  describe('updateRole', () => {
    it('200 - PUT sur l’identifiant', async () => {
      mockPut.mockResolvedValueOnce({ status: 200, data: {} })
      const store = useRoleStore()
      store.role = { name: 'x' }
      await store.updateRole(5)
      expect(mockPut).toHaveBeenCalledWith('roles/5', { name: 'x' })
      expect(mockNotify).toHaveBeenCalledWith('Rôle mis à jour avec succès.', 'success')
    })

    it('non-200 - message par défaut', async () => {
      mockPut.mockResolvedValueOnce({ status: 500, data: {} })
      await useRoleStore().updateRole(5)
      expect(mockNotify).toHaveBeenCalledWith('Erreur lors de la mise à jour.', 'error')
    })

    it('erreur réseau - notifie', async () => {
      mockPut.mockRejectedValueOnce(new Error('KO'))
      await useRoleStore().updateRole(5)
      expect(mockNotify).toHaveBeenCalledWith(expect.stringContaining('KO'), 'error')
    })
  })

  describe('deleteRole', () => {
    it('réponse undefined (204 sans contenu) - succès', async () => {
      mockDel.mockResolvedValueOnce(undefined)
      await useRoleStore().deleteRole(5)
      expect(mockDel).toHaveBeenCalledWith('roles/5', {})
      expect(mockNotify).toHaveBeenCalledWith('Rôle supprimé avec succès.', 'success')
    })

    it('réponse définie (erreur renvoyée par l’API) - notifie l’erreur', async () => {
      mockDel.mockResolvedValueOnce({ status: 403, data: { message: 'Interdit' } })
      await useRoleStore().deleteRole(5)
      expect(mockNotify).toHaveBeenCalledWith('Interdit', 'error')
      expect(mockNotify).not.toHaveBeenCalledWith('Rôle supprimé avec succès.', 'success')
    })

    it('erreur réseau - notifie', async () => {
      mockDel.mockRejectedValueOnce(new Error('KO'))
      await useRoleStore().deleteRole(5)
      expect(mockNotify).toHaveBeenCalledWith(expect.stringContaining('KO'), 'error')
    })
  })
})

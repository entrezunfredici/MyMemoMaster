import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAdminUserStore } from '@/stores/adminUsers'

const { mockGet, mockPut, mockPatch, mockDel, mockNotify } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPatch: vi.fn(),
  mockPut: vi.fn(),
  mockDel: vi.fn(),
  mockNotify: vi.fn(),
}))

vi.mock('@/helpers/api', () => ({ api: { get: mockGet, put: mockPut, patch: mockPatch, del: mockDel } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: mockNotify } }))

const PAGE = {
  users: [
    { userId: 2, name: 'Alice', email: 'a@x.fr', roleId: 2 },
    { userId: 3, name: 'Bob', email: 'b@x.fr', roleId: 3 },
  ],
  total: 45,
  page: 2,
  limit: 20,
}

describe('useAdminUserStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('état initial', () => {
    const store = useAdminUserStore()
    expect(store).toMatchObject({ users: [], total: 0, page: 1, limit: 20, loading: false })
    expect(store.pageCount).toBe(1)
  })

  describe('search', () => {
    it('200 — peuple la page et le total, puis retombe à loading=false', async () => {
      mockGet.mockResolvedValueOnce({ status: 200, data: { data: PAGE } })
      const store = useAdminUserStore()
      const promise = store.search({ page: 2 })
      expect(store.loading).toBe(true)
      expect(await promise).toBe(true)
      expect(store.loading).toBe(false)
      expect(store).toMatchObject({ users: PAGE.users, total: 45, page: 2, limit: 20 })
      expect(store.pageCount).toBe(3)
    })

    it('envoie les filtres renseignés, sans espaces, et ignore les vides', async () => {
      mockGet.mockResolvedValue({ status: 200, data: { data: PAGE } })
      const store = useAdminUserStore()
      await store.search({ search: '  ali  ', roleId: 3, page: 4 })
      expect(mockGet).toHaveBeenLastCalledWith('users', { page: 4, search: 'ali', roleId: 3 })
      await store.search({ search: '   ', roleId: '' })
      expect(mockGet).toHaveBeenLastCalledWith('users', { page: 1 })
      await store.search()
      expect(mockGet).toHaveBeenLastCalledWith('users', { page: 1 })
    })

    it('le rôle 0 est un filtre valide', async () => {
      mockGet.mockResolvedValue({ status: 200, data: { data: PAGE } })
      await useAdminUserStore().search({ roleId: 0 })
      expect(mockGet).toHaveBeenLastCalledWith('users', { page: 1, roleId: 0 })
    })

    it('non-200 — notifie le message de l’API et garde la liste', async () => {
      mockGet.mockResolvedValueOnce({ status: 403, data: { message: 'Accès refusé.' } })
      const store = useAdminUserStore()
      expect(await store.search()).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Accès refusé.', 'error')
      expect(store.users).toEqual([])
      expect(store.loading).toBe(false)
    })

    it('réponse absente (réseau, 401) — message par défaut', async () => {
      mockGet.mockResolvedValueOnce(undefined)
      expect(await useAdminUserStore().search()).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Erreur lors du chargement des comptes.', 'error')
    })

    it('exception — notifie et libère loading', async () => {
      mockGet.mockRejectedValueOnce(new Error('boom'))
      const store = useAdminUserStore()
      expect(await store.search()).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Une erreur est survenue : Error: boom', 'error')
      expect(store.loading).toBe(false)
    })
  })

  describe('setRole', () => {
    it('200 — met à jour le rôle du compte déjà chargé et notifie', async () => {
      mockPut.mockResolvedValueOnce({ status: 200, data: { message: 'ok' } })
      const store = useAdminUserStore()
      store.users = structuredClone(PAGE.users)
      expect(await store.setRole(2, 4)).toBe(true)
      expect(mockPut).toHaveBeenCalledWith('users/2/role', { roleId: 4 })
      expect(store.users[0].roleId).toBe(4)
      expect(store.users[1].roleId).toBe(3)
      expect(mockNotify).toHaveBeenCalledWith('Rôle mis à jour.', 'success')
    })

    it('compte absent de la page — succès sans erreur', async () => {
      mockPut.mockResolvedValueOnce({ status: 200, data: {} })
      expect(await useAdminUserStore().setRole(99, 4)).toBe(true)
    })

    it('refus (403 : son propre compte) — message de l’API, liste inchangée', async () => {
      mockPut.mockResolvedValueOnce({ status: 403, data: { message: 'Vous ne pouvez pas retirer votre propre rôle d’administrateur.' } })
      const store = useAdminUserStore()
      store.users = structuredClone(PAGE.users)
      expect(await store.setRole(2, 4)).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Vous ne pouvez pas retirer votre propre rôle d’administrateur.', 'error')
      expect(store.users[0].roleId).toBe(2)
    })

    it('réponse absente — message par défaut ; exception — notifiée', async () => {
      mockPut.mockResolvedValueOnce(undefined)
      expect(await useAdminUserStore().setRole(2, 4)).toBe(false)
      expect(mockNotify).toHaveBeenLastCalledWith('Erreur lors de la mise à jour du rôle.', 'error')
      mockPut.mockRejectedValueOnce(new Error('boom'))
      expect(await useAdminUserStore().setRole(2, 4)).toBe(false)
      expect(mockNotify).toHaveBeenLastCalledWith('Une erreur est survenue : Error: boom', 'error')
    })
  })

  describe('removeRole', () => {
    it('200 — le compte n’a plus de rôle', async () => {
      mockDel.mockResolvedValueOnce({ status: 200, data: { message: 'ok' } })
      const store = useAdminUserStore()
      store.users = structuredClone(PAGE.users)
      expect(await store.removeRole(3)).toBe(true)
      expect(mockDel).toHaveBeenCalledWith('users/3/role')
      expect(store.users[1].roleId).toBeNull()
      expect(store.users[0].roleId).toBe(2)
      expect(mockNotify).toHaveBeenCalledWith('Rôle retiré.', 'success')
    })

    it('refus — message de l’API, liste inchangée', async () => {
      mockDel.mockResolvedValueOnce({ status: 403, data: { message: 'Refusé.' } })
      const store = useAdminUserStore()
      store.users = structuredClone(PAGE.users)
      expect(await store.removeRole(3)).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Refusé.', 'error')
      expect(store.users[1].roleId).toBe(3)
    })

    it('réponse absente — message par défaut ; exception — notifiée', async () => {
      mockDel.mockResolvedValueOnce(undefined)
      expect(await useAdminUserStore().removeRole(3)).toBe(false)
      expect(mockNotify).toHaveBeenLastCalledWith('Erreur lors du retrait du rôle.', 'error')
      mockDel.mockRejectedValueOnce(new Error('boom'))
      expect(await useAdminUserStore().removeRole(3)).toBe(false)
      expect(mockNotify).toHaveBeenLastCalledWith('Une erreur est survenue : Error: boom', 'error')
    })
  })

  describe('activate / deactivate', () => {
    const loaded = () => {
      const store = useAdminUserStore()
      store.users = [
        { userId: 2, name: 'Alice', roleId: 2, isActive: true },
        { userId: 3, name: 'Bob', roleId: 3, isActive: false },
      ]
      return store
    }

    it('deactivate — PATCH, compte marqué désactivé, les autres inchangés', async () => {
      mockPatch.mockResolvedValueOnce({ status: 200, data: { message: 'Compte désactivé.' } })
      const store = loaded()
      expect(await store.deactivate(2)).toBe(true)
      expect(mockPatch).toHaveBeenCalledWith('users/2/deactivate')
      expect(store.users.map((u) => u.isActive)).toEqual([false, false])
      expect(mockNotify).toHaveBeenCalledWith('Compte désactivé.', 'success')
    })

    it('activate — PATCH, compte marqué actif', async () => {
      mockPatch.mockResolvedValueOnce({ status: 200, data: {} })
      const store = loaded()
      expect(await store.activate(3)).toBe(true)
      expect(mockPatch).toHaveBeenCalledWith('users/3/activate')
      expect(store.users.map((u) => u.isActive)).toEqual([true, true])
      expect(mockNotify).toHaveBeenCalledWith('Compte réactivé.', 'success')
    })

    it.each([['deactivate', 2, true], ['activate', 3, false]])('%s — refus de l’API : message notifié, état inchangé', async (method, id, before) => {
      mockPatch.mockResolvedValueOnce({ status: 403, data: { message: 'Accès refusé.' } })
      const store = loaded()
      expect(await store[method](id)).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Accès refusé.', 'error')
      expect(store.users.find((u) => u.userId === id).isActive).toBe(before)
    })

    it('réponse absente — message par défaut selon l’action ; exception — notifiée', async () => {
      mockPatch.mockResolvedValueOnce(undefined)
      expect(await loaded().deactivate(2)).toBe(false)
      expect(mockNotify).toHaveBeenLastCalledWith('Erreur lors de la désactivation du compte.', 'error')
      mockPatch.mockResolvedValueOnce(undefined)
      expect(await loaded().activate(3)).toBe(false)
      expect(mockNotify).toHaveBeenLastCalledWith("Erreur lors de l'activation du compte.", 'error')
      mockPatch.mockRejectedValueOnce(new Error('boom'))
      expect(await loaded().deactivate(2)).toBe(false)
      expect(mockNotify).toHaveBeenLastCalledWith('Une erreur est survenue : Error: boom', 'error')
    })

    it('compte absent de la page — succès sans erreur', async () => {
      mockPatch.mockResolvedValueOnce({ status: 200, data: {} })
      expect(await loaded().deactivate(99)).toBe(true)
    })
  })
})

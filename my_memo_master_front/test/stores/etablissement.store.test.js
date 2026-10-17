import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEtablissementStore } from '@/stores/etablissement'

const { mockGet, mockPost, mockPut, mockPatch, mockDel, mockNotify } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockPatch: vi.fn(),
  mockDel: vi.fn(),
  mockNotify: vi.fn(),
}))

vi.mock('@/helpers/api', () => ({
  api: { get: mockGet, post: mockPost, put: mockPut, patch: mockPatch, del: mockDel },
}))
vi.mock('@/helpers/notif', () => ({ notif: { notify: mockNotify } }))

const ok = (data, status = 200) => ({ status, data: { data } })
const ko = (message, status = 500) => ({ status, data: message ? { message } : {} })

describe('useEtablissementStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('fetchAll', () => {
    it('200 - peuple la liste et remet loading à false', async () => {
      mockGet.mockResolvedValueOnce(ok([{ id: 1 }, { id: 2 }]))
      const store = useEtablissementStore()
      const promise = store.fetchAll()
      expect(store.loading).toBe(true)
      expect(await promise).toBe(true)
      expect(store.list).toEqual([{ id: 1 }, { id: 2 }])
      expect(store.loading).toBe(false)
    })

    it('non-200 - notifie, false, loading remis à false', async () => {
      mockGet.mockResolvedValueOnce(ko('Panne'))
      const store = useEtablissementStore()
      expect(await store.fetchAll()).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Panne', 'error')
      expect(store.loading).toBe(false)
    })

    it('réponse absente - message par défaut', async () => {
      mockGet.mockResolvedValueOnce(undefined)
      expect(await useEtablissementStore().fetchAll()).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Erreur lors du chargement des établissements.', 'error')
    })

    it('exception - loading remis à false (finally)', async () => {
      mockGet.mockRejectedValueOnce(new Error('KO'))
      const store = useEtablissementStore()
      await expect(store.fetchAll()).rejects.toThrow('KO')
      expect(store.loading).toBe(false)
    })
  })

  describe('fetchMine / fetchOne', () => {
    it('fetchMine - mémorise et retourne l’établissement', async () => {
      mockGet.mockResolvedValueOnce(ok({ id: 3, name: 'Lycée' }))
      const store = useEtablissementStore()
      expect(await store.fetchMine()).toEqual({ id: 3, name: 'Lycée' })
      expect(mockGet).toHaveBeenCalledWith('etablissements/mine')
      expect(store.current).toEqual({ id: 3, name: 'Lycée' })
    })

    it('fetchMine - aucun établissement : message par défaut, false', async () => {
      mockGet.mockResolvedValueOnce(ko(null, 404))
      expect(await useEtablissementStore().fetchMine()).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Aucun établissement associé à ce compte.', 'error')
    })

    it('fetchOne - mémorise l’établissement', async () => {
      mockGet.mockResolvedValueOnce(ok({ id: 4 }))
      const store = useEtablissementStore()
      expect(await store.fetchOne(4)).toEqual({ id: 4 })
      expect(mockGet).toHaveBeenCalledWith('etablissements/4')
      expect(store.current).toEqual({ id: 4 })
    })

    it('fetchOne - introuvable', async () => {
      mockGet.mockResolvedValueOnce(ko(null, 404))
      expect(await useEtablissementStore().fetchOne(4)).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Établissement introuvable.', 'error')
    })
  })

  describe('createEtab', () => {
    it('201 - ajoute à la liste et retourne l’établissement créé', async () => {
      mockPost.mockResolvedValueOnce(ok({ id: 9, name: 'Nouveau' }, 201))
      const store = useEtablissementStore()
      expect(await store.createEtab({ name: 'Nouveau' })).toEqual({ id: 9, name: 'Nouveau' })
      expect(mockPost).toHaveBeenCalledWith('etablissements', { name: 'Nouveau' })
      expect(store.list).toEqual([{ id: 9, name: 'Nouveau' }])
      expect(mockNotify).toHaveBeenCalledWith('Établissement créé.', 'success')
    })

    it('erreur - false, liste inchangée', async () => {
      mockPost.mockResolvedValueOnce(ko('Nom déjà pris', 409))
      const store = useEtablissementStore()
      expect(await store.createEtab({})).toBe(false)
      expect(store.list).toEqual([])
      expect(mockNotify).toHaveBeenCalledWith('Nom déjà pris', 'error')
    })
  })

  describe('updateEtab', () => {
    it('met à jour la liste et l’établissement courant', async () => {
      mockPut.mockResolvedValueOnce(ok({ id: 1, name: 'Renommé' }))
      const store = useEtablissementStore()
      store.list = [{ id: 1, name: 'Ancien' }, { id: 2, name: 'Autre' }]
      store.current = { id: 1, name: 'Ancien' }
      expect(await store.updateEtab(1, { name: 'Renommé' })).toBe(true)
      expect(mockPut).toHaveBeenCalledWith('etablissements/1', { name: 'Renommé' })
      expect(store.list[0]).toEqual({ id: 1, name: 'Renommé' })
      expect(store.list[1]).toEqual({ id: 2, name: 'Autre' })
      expect(store.current).toEqual({ id: 1, name: 'Renommé' })
    })

    it('établissement courant différent - laissé tel quel', async () => {
      mockPut.mockResolvedValueOnce(ok({ id: 1, name: 'Renommé' }))
      const store = useEtablissementStore()
      store.list = [{ id: 1 }]
      store.current = { id: 2, name: 'Autre' }
      await store.updateEtab(1, {})
      expect(store.current).toEqual({ id: 2, name: 'Autre' })
    })

    it('identifiant absent de la liste - liste inchangée', async () => {
      mockPut.mockResolvedValueOnce(ok({ id: 5 }))
      const store = useEtablissementStore()
      store.list = [{ id: 1 }]
      expect(await store.updateEtab(5, {})).toBe(true)
      expect(store.list).toEqual([{ id: 1 }])
    })

    it('erreur - false', async () => {
      mockPut.mockResolvedValueOnce(ko(null))
      expect(await useEtablissementStore().updateEtab(1, {})).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Erreur lors de la mise à jour.', 'error')
    })
  })

  describe('deleteEtab', () => {
    it('retire de la liste et réinitialise le contexte si c’était l’établissement courant', async () => {
      mockDel.mockResolvedValueOnce({ status: 200, data: {} })
      const store = useEtablissementStore()
      store.list = [{ id: 1 }, { id: 2 }]
      store.current = { id: 1 }
      store.stats = { a: 1 }
      store.audit = [{ x: 1 }]
      store.content = { resources: [] }
      expect(await store.deleteEtab(1)).toBe(true)
      expect(mockDel).toHaveBeenCalledWith('etablissements/1')
      expect(store.list).toEqual([{ id: 2 }])
      expect(store.current).toBeNull()
      expect(store.stats).toBeNull()
      expect(store.audit).toEqual([])
      expect(store.content).toBeNull()
    })

    it('autre établissement courant - contexte conservé', async () => {
      mockDel.mockResolvedValueOnce({ status: 200, data: {} })
      const store = useEtablissementStore()
      store.list = [{ id: 1 }, { id: 2 }]
      store.current = { id: 2 }
      store.stats = { a: 1 }
      await store.deleteEtab(1)
      expect(store.current).toEqual({ id: 2 })
      expect(store.stats).toEqual({ a: 1 })
    })

    it('erreur - liste inchangée', async () => {
      mockDel.mockResolvedValueOnce(ko('Interdit', 403))
      const store = useEtablissementStore()
      store.list = [{ id: 1 }]
      expect(await store.deleteEtab(1)).toBe(false)
      expect(store.list).toEqual([{ id: 1 }])
    })
  })

  describe('fetchStats / fetchContent', () => {
    it('fetchStats - 200', async () => {
      mockGet.mockResolvedValueOnce(ok({ users: 12 }))
      const store = useEtablissementStore()
      expect(await store.fetchStats(1)).toBe(true)
      expect(mockGet).toHaveBeenCalledWith('etablissements/1/stats')
      expect(store.stats).toEqual({ users: 12 })
    })

    it('fetchStats - erreur', async () => {
      mockGet.mockResolvedValueOnce(ko(null))
      expect(await useEtablissementStore().fetchStats(1)).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Erreur lors du chargement des statistiques.', 'error')
    })

    it('fetchContent - 200', async () => {
      mockGet.mockResolvedValueOnce(ok({ resources: [], sections: [] }))
      const store = useEtablissementStore()
      expect(await store.fetchContent(1)).toBe(true)
      expect(mockGet).toHaveBeenCalledWith('etablissements/1/content')
      expect(store.content).toEqual({ resources: [], sections: [] })
    })

    it('fetchContent - erreur', async () => {
      mockGet.mockResolvedValueOnce(ko(null))
      expect(await useEtablissementStore().fetchContent(1)).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Erreur lors du chargement du contenu.', 'error')
    })
  })

  describe('fetchAudit', () => {
    it('sans filtre - aucun paramètre envoyé', async () => {
      mockGet.mockResolvedValueOnce(ok([{ id: 1 }]))
      const store = useEtablissementStore()
      expect(await store.fetchAudit(2)).toBe(true)
      expect(mockGet).toHaveBeenCalledWith('etablissements/2/audit', {})
      expect(store.audit).toEqual([{ id: 1 }])
    })

    it('avec filtres - seuls les filtres renseignés sont envoyés', async () => {
      mockGet.mockResolvedValueOnce(ok([]))
      await useEtablissementStore().fetchAudit(2, { action: 'delete', entityType: '', limit: 50, ignore: 'x' })
      expect(mockGet).toHaveBeenCalledWith('etablissements/2/audit', { action: 'delete', limit: 50 })
    })

    it('erreur - false', async () => {
      mockGet.mockResolvedValueOnce(ko(null))
      expect(await useEtablissementStore().fetchAudit(2)).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Erreur lors du chargement du journal.', 'error')
    })
  })

  describe('deleteContent', () => {
    const withContent = () => {
      const store = useEtablissementStore()
      store.content = { resources: [{ id: 1 }, { id: 2 }], sections: [{ id: 1 }, { id: 3 }] }
      return store
    }

    it('type « resource » - retire seulement la ressource', async () => {
      mockDel.mockResolvedValueOnce({ status: 200, data: {} })
      const store = withContent()
      expect(await store.deleteContent(5, 'resource', 1)).toBe(true)
      expect(mockDel).toHaveBeenCalledWith('etablissements/5/content/resource/1')
      expect(store.content.resources).toEqual([{ id: 2 }])
      expect(store.content.sections).toEqual([{ id: 1 }, { id: 3 }])
    })

    it('autre type - retire la section', async () => {
      mockDel.mockResolvedValueOnce({ status: 200, data: {} })
      const store = withContent()
      await store.deleteContent(5, 'section', 1)
      expect(store.content.sections).toEqual([{ id: 3 }])
      expect(store.content.resources).toHaveLength(2)
    })

    it('contenu non chargé - pas d’erreur', async () => {
      mockDel.mockResolvedValueOnce({ status: 200, data: {} })
      expect(await useEtablissementStore().deleteContent(5, 'resource', 1)).toBe(true)
    })

    it('erreur - contenu conservé', async () => {
      mockDel.mockResolvedValueOnce(ko('Interdit', 403))
      const store = withContent()
      expect(await store.deleteContent(5, 'resource', 1)).toBe(false)
      expect(store.content.resources).toHaveLength(2)
    })
  })

  describe('assignAdmin', () => {
    it('assignation directe - met à jour la liste et le courant, notification « success »', async () => {
      mockPost.mockResolvedValueOnce({
        status: 200,
        data: { message: 'Gérant assigné.', data: { directlyAssigned: true, etab: { id: 1, admin: 'a@b.fr' } } },
      })
      const store = useEtablissementStore()
      store.list = [{ id: 1 }]
      store.current = { id: 1 }
      const data = await store.assignAdmin(1, 'a@b.fr')
      expect(mockPost).toHaveBeenCalledWith('etablissements/1/assign-admin', { email: 'a@b.fr' })
      expect(data.directlyAssigned).toBe(true)
      expect(store.list[0]).toEqual({ id: 1, admin: 'a@b.fr' })
      expect(store.current).toEqual({ id: 1, admin: 'a@b.fr' })
      expect(mockNotify).toHaveBeenCalledWith('Gérant assigné.', 'success')
    })

    it('invitation (non directe) - état local inchangé, notification « info »', async () => {
      mockPost.mockResolvedValueOnce({
        status: 200,
        data: { message: 'Invitation envoyée.', data: { directlyAssigned: false } },
      })
      const store = useEtablissementStore()
      store.list = [{ id: 1 }]
      await store.assignAdmin(1, 'a@b.fr')
      expect(store.list).toEqual([{ id: 1 }])
      expect(mockNotify).toHaveBeenCalledWith('Invitation envoyée.', 'info')
    })

    it('erreur - false et message par défaut', async () => {
      mockPost.mockResolvedValueOnce(ko(null))
      expect(await useEtablissementStore().assignAdmin(1, 'a@b.fr')).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith("Erreur lors de l'assignation du gérant.", 'error')
    })
  })

  describe('activateUser / deactivateUser', () => {
    it('activateUser - PATCH puis succès', async () => {
      mockPatch.mockResolvedValueOnce({ status: 200, data: {} })
      expect(await useEtablissementStore().activateUser(7)).toBe(true)
      expect(mockPatch).toHaveBeenCalledWith('users/7/activate')
      expect(mockNotify).toHaveBeenCalledWith('Compte activé.', 'success')
    })

    it('activateUser - erreur', async () => {
      mockPatch.mockResolvedValueOnce(ko(null))
      expect(await useEtablissementStore().activateUser(7)).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith("Erreur lors de l'activation.", 'error')
    })

    it('deactivateUser - PATCH puis succès', async () => {
      mockPatch.mockResolvedValueOnce({ status: 200, data: {} })
      expect(await useEtablissementStore().deactivateUser(7)).toBe(true)
      expect(mockPatch).toHaveBeenCalledWith('users/7/deactivate')
      expect(mockNotify).toHaveBeenCalledWith('Compte désactivé.', 'success')
    })

    it('deactivateUser - erreur', async () => {
      mockPatch.mockResolvedValueOnce(ko(null))
      expect(await useEtablissementStore().deactivateUser(7)).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Erreur lors de la désactivation.', 'error')
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDiagrammeStore } from '@/stores/diagrammes'

const { api, notify } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() },
  notify: vi.fn(),
}))
vi.mock('@/helpers/api', () => ({ api }))
vi.mock('@/helpers/notif.js', () => ({ notif: { notify } }))

describe('useDiagrammeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetchDiagrammes — range la liste reçue', async () => {
    api.get.mockResolvedValue({ status: 200, data: [{ idMindMap: 1 }] })
    const store = useDiagrammeStore()
    await store.fetchDiagrammes()
    expect(api.get).toHaveBeenCalledWith('diagrammes')
    expect(store.diagrammes).toEqual([{ idMindMap: 1 }])
  })

  it('fetchDiagrammes — statut inattendu : notification du message serveur, liste inchangée', async () => {
    api.get.mockResolvedValue({ status: 500, data: { message: 'Erreur serveur' } })
    const store = useDiagrammeStore()
    await store.fetchDiagrammes()
    expect(notify).toHaveBeenCalledWith('Erreur serveur', 'error')
    expect(store.diagrammes).toEqual([])
  })

  it('fetchDiagrammes — erreur réseau : notification', async () => {
    api.get.mockRejectedValue('réseau')
    await useDiagrammeStore().fetchDiagrammes()
    expect(notify).toHaveBeenCalledWith('Une erreur est survenue : réseau', 'error')
  })

  it('fetchDiagrammeById — range le diagramme ; introuvable : message par défaut', async () => {
    const store = useDiagrammeStore()
    api.get.mockResolvedValueOnce({ status: 200, data: { idMindMap: 4 } })
    await store.fetchDiagrammeById(4)
    expect(api.get).toHaveBeenCalledWith('diagrammes/4')
    expect(store.diagramme).toEqual({ idMindMap: 4 })
    api.get.mockResolvedValueOnce({ status: 404, data: {} })
    await store.fetchDiagrammeById(9)
    expect(notify).toHaveBeenCalledWith('Diagramme introuvable.', 'error')
  })

  it('addDiagramme — envoie le diagramme courant ; succès attendu en 201', async () => {
    const store = useDiagrammeStore()
    store.diagramme = { mmName: 'A' }
    api.post.mockResolvedValueOnce({ status: 201, data: {} })
    await store.addDiagramme()
    expect(api.post).toHaveBeenCalledWith('diagrammes', { mmName: 'A' })
    expect(notify).toHaveBeenCalledWith('Diagramme créé avec succès.', 'success')
    api.post.mockResolvedValueOnce({ status: 400, data: { message: 'Nom requis' } })
    await store.addDiagramme()
    expect(notify).toHaveBeenLastCalledWith('Nom requis', 'error')
  })

  it('updateDiagramme — succès en 200, sinon message d’erreur', async () => {
    const store = useDiagrammeStore()
    store.diagramme = { mmName: 'B' }
    api.put.mockResolvedValueOnce({ status: 200, data: {} })
    await store.updateDiagramme(4)
    expect(api.put).toHaveBeenCalledWith('diagrammes/4', { mmName: 'B' })
    expect(notify).toHaveBeenCalledWith('Diagramme mis à jour avec succès.', 'success')
    api.put.mockResolvedValueOnce({ status: 500, data: {} })
    await store.updateDiagramme(4)
    expect(notify).toHaveBeenLastCalledWith('Erreur lors de la mise à jour.', 'error')
  })

  it('deleteDiagramme — api.del renvoie undefined sur un 204 : c’est un succès', async () => {
    const store = useDiagrammeStore()
    api.del.mockResolvedValueOnce(undefined)
    await store.deleteDiagramme(4)
    expect(notify).toHaveBeenCalledWith('Diagramme supprimé avec succès.', 'success')
    api.del.mockResolvedValueOnce({ status: 403, data: { message: 'Interdit' } })
    await store.deleteDiagramme(4)
    expect(notify).toHaveBeenLastCalledWith('Interdit', 'error')
  })
})

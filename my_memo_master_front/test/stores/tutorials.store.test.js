import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTutorialStore } from '@/stores/tutorials'

const { mockGet, mockNotify } = vi.hoisted(() => ({ mockGet: vi.fn(), mockNotify: vi.fn() }))
vi.mock('@/helpers/api', () => ({ api: { get: mockGet } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: mockNotify } }))

const TUTORIALS = [{ id: 1, name: 'Bien démarrer', link: 'https://x.fr', revision_tips: false, subjectId: 2 }]

describe('useTutorialStore.fetchTutorials', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('succès : peuple la liste et la pagination, sans notification', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: { status: 'success', data: TUTORIALS, pagination: { page: 1, perPage: 100, total: 1 } } })
    const store = useTutorialStore()
    expect(await store.fetchTutorials()).toBe(true)
    expect(store.tutorials).toEqual(TUTORIALS)
    expect(store.pagination).toEqual({ page: 1, perPage: 100, total: 1 })
    expect(mockNotify).not.toHaveBeenCalled()
  })

  it('demande 100 tutoriels par page par défaut, sans filtre', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: { data: [] } })
    await useTutorialStore().fetchTutorials()
    expect(mockGet).toHaveBeenCalledWith('tutorials', { perPage: 100 })
  })

  it('transmet les filtres renseignés, et seulement ceux-là', async () => {
    mockGet.mockResolvedValue({ status: 200, data: { data: [] } })
    const store = useTutorialStore()
    await store.fetchTutorials({ subjectId: '3', revisionTips: true, search: 'react', page: 2, perPage: 20 })
    expect(mockGet).toHaveBeenLastCalledWith('tutorials', { perPage: 20, subjectId: '3', revisionTips: true, search: 'react', page: 2 })
    await store.fetchTutorials({ subjectId: undefined, revisionTips: undefined, search: '' })
    expect(mockGet).toHaveBeenLastCalledWith('tutorials', { perPage: 100 })
  })

  it('revisionTips à false est un filtre valide (transmis)', async () => {
    mockGet.mockResolvedValue({ status: 200, data: { data: [] } })
    await useTutorialStore().fetchTutorials({ revisionTips: false })
    expect(mockGet).toHaveBeenCalledWith('tutorials', { perPage: 100, revisionTips: false })
  })

  it('indicateur de chargement : actif pendant la requête, retombé ensuite', async () => {
    let release
    mockGet.mockReturnValueOnce(new Promise((resolve) => { release = resolve }))
    const store = useTutorialStore()
    const pending = store.fetchTutorials()
    expect(store.loading).toBe(true)
    release({ status: 200, data: { data: [] } })
    await pending
    expect(store.loading).toBe(false)
  })

  it('erreur serveur : liste vidée, message du serveur notifié', async () => {
    const store = useTutorialStore()
    store.tutorials = TUTORIALS
    mockGet.mockResolvedValueOnce({ status: 500, data: { message: 'Panne' } })
    expect(await store.fetchTutorials()).toBe(false)
    expect(store.tutorials).toEqual([])
    expect(mockNotify).toHaveBeenCalledWith('Panne', 'error')
    expect(store.loading).toBe(false)
  })

  it('réponse absente ou exception réseau : message par défaut', async () => {
    const store = useTutorialStore()
    mockGet.mockResolvedValueOnce(undefined)
    expect(await store.fetchTutorials()).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith('Erreur lors du chargement des tutoriels.', 'error')
    mockGet.mockRejectedValueOnce(new Error('KO'))
    expect(await store.fetchTutorials()).toBe(false)
    expect(mockNotify).toHaveBeenCalledTimes(2)
    expect(store.loading).toBe(false)
  })

  it('réponse sans data : liste vide, pas d’exception', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: {} })
    const store = useTutorialStore()
    expect(await store.fetchTutorials()).toBe(true)
    expect(store.tutorials).toEqual([])
    expect(store.pagination).toBeNull()
  })
})

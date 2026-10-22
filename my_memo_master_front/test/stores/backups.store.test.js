import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useBackupStore } from '@/stores/backups'

const { mockGet, mockPost, mockNotify } = vi.hoisted(() => ({ mockGet: vi.fn(), mockPost: vi.fn(), mockNotify: vi.fn() }))

vi.mock('@/helpers/api', () => ({ api: { get: mockGet, post: mockPost } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: mockNotify } }))

const PAYLOAD = { status: { supported: true, running: false }, runs: [{ id: 1, status: 'success' }] }

describe('useBackupStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('état initial', () => {
    expect(useBackupStore()).toMatchObject({ status: null, runs: [], loading: false, launching: false })
  })

  it('fetchBackups - 200 - peuple l\'état et l\'historique puis retombe à loading=false', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: { data: PAYLOAD } })
    const store = useBackupStore()
    const promise = store.fetchBackups()
    expect(store.loading).toBe(true)
    expect(await promise).toBe(true)
    expect(store.loading).toBe(false)
    expect(store.status).toEqual(PAYLOAD.status)
    expect(store.runs).toEqual(PAYLOAD.runs)
    expect(mockGet).toHaveBeenCalledWith('backups', { limit: 30 })
  })

  it('fetchBackups - statut inattendu - notifie l\'erreur et renvoie false', async () => {
    mockGet.mockResolvedValueOnce({ status: 500, data: { message: 'Erreur serveur.' } })
    expect(await useBackupStore().fetchBackups()).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith('Erreur serveur.', 'error')
  })

  it('fetchBackups - mode silencieux - aucune notification ni indicateur de chargement', async () => {
    mockGet.mockRejectedValueOnce(new Error('réseau'))
    const store = useBackupStore()
    const promise = store.fetchBackups({ silent: true })
    expect(store.loading).toBe(false)
    expect(await promise).toBe(false)
    expect(mockNotify).not.toHaveBeenCalled()
  })

  it('fetchBackups - exception - notifie et renvoie false', async () => {
    mockGet.mockRejectedValueOnce(new Error('réseau'))
    expect(await useBackupStore().fetchBackups()).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith(expect.stringContaining('réseau'), 'error')
  })

  it('launchBackup - 201 - notifie, rafraîchit l\'état et renvoie true', async () => {
    mockPost.mockResolvedValueOnce({ status: 201, data: { data: { id: 2, status: 'running' } } })
    mockGet.mockResolvedValueOnce({ status: 200, data: { data: PAYLOAD } })
    const store = useBackupStore()
    expect(await store.launchBackup()).toBe(true)
    expect(mockPost).toHaveBeenCalledWith('backups')
    expect(mockNotify).toHaveBeenCalledWith('Sauvegarde lancée.', 'success')
    expect(store.runs).toEqual(PAYLOAD.runs)
    expect(store.launching).toBe(false)
  })

  it('launchBackup - refus de l\'API - notifie le message et renvoie false', async () => {
    mockPost.mockResolvedValueOnce({ status: 400, data: { message: 'Une sauvegarde est déjà en cours.' } })
    expect(await useBackupStore().launchBackup()).toBe(false)
    expect(mockNotify).toHaveBeenCalledWith('Une sauvegarde est déjà en cours.', 'error')
  })

  it('launchBackup - exception - notifie et libère le bouton', async () => {
    mockPost.mockRejectedValueOnce(new Error('réseau'))
    const store = useBackupStore()
    expect(await store.launchBackup()).toBe(false)
    expect(store.launching).toBe(false)
  })
})

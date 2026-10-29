import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

const { mockGet, mockPost, mockNotify, mockPush } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockNotify: vi.fn(),
  mockPush: vi.fn(),
}))

vi.mock('@/helpers/api', () => ({ api: { get: mockGet, post: mockPost } }))
vi.mock('@/helpers/notif.js', () => ({ notif: { notify: mockNotify, clear: vi.fn() } }))
vi.mock('@/router', () => ({ default: { push: mockPush } }))

const jwt = (payload) => `h.${btoa(JSON.stringify(payload))}.s`

const openSession = (store, user = { userId: 7 }) => {
  store.authenticated = true
  store.token = jwt({ id: 7 })
  store.user = user
}

describe('useAuthStore — checkSession (contrôle de session au démarrage)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('sans session - ne fait aucun appel', async () => {
    expect(await useAuthStore().checkSession()).toBe(false)
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('200 - session conservée et profil rechargé', async () => {
    const store = useAuthStore()
    openSession(store)
    mockGet.mockResolvedValueOnce({ status: 200, data: { userId: 7, name: 'Fred' } })

    expect(await store.checkSession()).toBe(true)
    expect(mockGet).toHaveBeenCalledWith('users/7')
    expect(store.user.name).toBe('Fred')
    expect(store.authenticated).toBe(true)
  })

  it('404 (compte inexistant) - déconnecte, redirige vers /auth et prévient', async () => {
    const store = useAuthStore()
    openSession(store)
    mockGet.mockResolvedValueOnce({ status: 404, data: { message: 'Utilisateur introuvable.' } })

    expect(await store.checkSession()).toBe(false)
    expect(store.authenticated).toBe(false)
    expect(store.token).toBeNull()
    expect(store.user).toEqual({})
    expect(mockPush).toHaveBeenCalledWith('/auth')
    expect(mockNotify).toHaveBeenCalledWith(expect.stringContaining('session'), 'info')
  })

  it('403 - déconnecte', async () => {
    const store = useAuthStore()
    openSession(store)
    mockGet.mockResolvedValueOnce({ status: 403, data: {} })

    expect(await store.checkSession()).toBe(false)
    expect(store.authenticated).toBe(false)
  })

  it('401 - api.js a déjà fermé la session : renvoie false sans second logout', async () => {
    const store = useAuthStore()
    openSession(store)
    mockGet.mockImplementationOnce(async () => {
      store.authenticated = false
      store.token = null
    })

    expect(await store.checkSession()).toBe(false)
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('API injoignable (undefined) - la session est conservée', async () => {
    const store = useAuthStore()
    openSession(store)
    mockGet.mockResolvedValueOnce(undefined)

    expect(await store.checkSession()).toBe(true)
    expect(store.authenticated).toBe(true)
    expect(store.token).not.toBeNull()
  })

  it('500 - la session est conservée (erreur serveur transitoire)', async () => {
    const store = useAuthStore()
    openSession(store)
    mockGet.mockResolvedValueOnce({ status: 500, data: {} })

    expect(await store.checkSession()).toBe(true)
    expect(store.authenticated).toBe(true)
  })

  it('userId absent du store - repris du JWT', async () => {
    const store = useAuthStore()
    openSession(store, {})
    mockGet.mockResolvedValueOnce({ status: 200, data: { userId: 7 } })

    expect(await store.checkSession()).toBe(true)
    expect(mockGet).toHaveBeenCalledWith('users/7')
  })

  it('token illisible et userId absent - déconnecte sans appel API', async () => {
    const store = useAuthStore()
    store.authenticated = true
    store.token = 'pas-un-jwt'
    store.user = {}

    expect(await store.checkSession()).toBe(false)
    expect(mockGet).not.toHaveBeenCalled()
    expect(store.authenticated).toBe(false)
  })
})

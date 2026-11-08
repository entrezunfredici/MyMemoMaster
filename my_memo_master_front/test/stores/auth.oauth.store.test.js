import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

const { mockPost, mockGet, mockNotify, mockPush } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockGet: vi.fn(),
  mockNotify: vi.fn(),
  mockPush: vi.fn(),
}))

vi.mock('@/helpers/api', () => ({ api: { post: mockPost, put: vi.fn(), get: mockGet, del: vi.fn() } }))
vi.mock('@/helpers/notif.js', () => ({ notif: { notify: mockNotify, clear: vi.fn() } }))
vi.mock('@/router', () => ({ default: { push: mockPush } }))

const fakeJwt = (id) => `x.${btoa(JSON.stringify({ id }))}.y`

describe('useAuthStore — connexion OAuth', () => {
  let assignMock
  const originalLocation = window.location

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    sessionStorage.clear()
    assignMock = vi.fn()
    Object.defineProperty(window, 'location', { configurable: true, value: { assign: assignMock } })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  })

  describe('loadOAuthProviders', () => {
    it('réponse valide - mémorise les fournisseurs', async () => {
      mockGet.mockResolvedValueOnce({ status: 200, data: { providers: [{ id: 'google', label: 'Google' }] } })
      const store = useAuthStore()
      await store.loadOAuthProviders()
      expect(store.oauthProviders).toEqual([{ id: 'google', label: 'Google' }])
    })

    it('API injoignable - liste vide sans erreur', async () => {
      mockGet.mockResolvedValueOnce(undefined)
      const store = useAuthStore()
      await store.loadOAuthProviders()
      expect(store.oauthProviders).toEqual([])
    })

    it('réponse inattendue (tableau) - liste vide', async () => {
      mockGet.mockResolvedValueOnce({ status: 200, data: [] })
      const store = useAuthStore()
      await store.loadOAuthProviders()
      expect(store.oauthProviders).toEqual([])
    })
  })

  describe('startOAuth', () => {
    it('cas nominal - garde le state et redirige vers le fournisseur', async () => {
      mockGet.mockResolvedValueOnce({ status: 200, data: { url: 'https://idp.test/auth', state: 'st' } })
      const store = useAuthStore()
      expect(await store.startOAuth('google')).toBe(true)
      expect(sessionStorage.getItem('oauthState')).toBe('st')
      expect(assignMock).toHaveBeenCalledWith('https://idp.test/auth')
    })

    it('fournisseur non configuré - notifie et ne redirige pas', async () => {
      mockGet.mockResolvedValueOnce({ status: 404, data: { message: "Ce mode de connexion n'est pas disponible." } })
      const store = useAuthStore()
      expect(await store.startOAuth('github')).toBe(false)
      expect(assignMock).not.toHaveBeenCalled()
      expect(mockNotify).toHaveBeenCalledWith("Ce mode de connexion n'est pas disponible.", 'error')
    })
  })

  describe('completeOAuth', () => {
    it('cas nominal - échange le code et ouvre la session', async () => {
      sessionStorage.setItem('oauthState', 'st')
      mockPost.mockResolvedValueOnce({ status: 200, data: { token: fakeJwt(7), refreshToken: 'rt' } })
      mockGet.mockResolvedValue({ status: 200, data: { userId: 7, name: 'Bob' } })
      const store = useAuthStore()

      expect(await store.completeOAuth('google', 'code', 'st', '/')).toBe(true)

      expect(mockPost).toHaveBeenCalledWith('users/oauth/google/login', { code: 'code', state: 'st' })
      expect(store.authenticated).toBe(true)
      expect(store.refreshToken).toBe('rt')
      expect(sessionStorage.getItem('oauthState')).toBeNull()
      expect(mockPush).toHaveBeenCalledWith('/')
    })

    it('state différent de celui mémorisé - refuse sans appeler l’API', async () => {
      sessionStorage.setItem('oauthState', 'attendu')
      const store = useAuthStore()
      expect(await store.completeOAuth('google', 'code', 'autre', '/')).toBe(false)
      expect(mockPost).not.toHaveBeenCalled()
      expect(store.authenticated).toBe(false)
    })

    it('aucun state mémorisé (retour forgé) - refuse sans appeler l’API', async () => {
      const store = useAuthStore()
      expect(await store.completeOAuth('google', 'code', 'st', '/')).toBe(false)
      expect(mockPost).not.toHaveBeenCalled()
    })

    it('code absent - refuse sans appeler l’API', async () => {
      sessionStorage.setItem('oauthState', 'st')
      const store = useAuthStore()
      expect(await store.completeOAuth('google', undefined, 'st', '/')).toBe(false)
      expect(mockPost).not.toHaveBeenCalled()
    })

    it('le state est à usage unique - un second essai est refusé', async () => {
      sessionStorage.setItem('oauthState', 'st')
      mockPost.mockResolvedValueOnce({ status: 401, data: { message: 'Connexion refusée par Google.' } })
      const store = useAuthStore()
      expect(await store.completeOAuth('google', 'code', 'st', '/')).toBe(false)
      expect(await store.completeOAuth('google', 'code', 'st', '/')).toBe(false)
      expect(mockPost).toHaveBeenCalledTimes(1)
    })

    it('API refuse (409 email déjà pris) - notifie le message et n’ouvre aucune session', async () => {
      sessionStorage.setItem('oauthState', 'st')
      mockPost.mockResolvedValueOnce({ status: 409, data: { message: 'Un compte existe déjà avec cette adresse email.' } })
      const store = useAuthStore()
      expect(await store.completeOAuth('microsoft', 'code', 'st', '/')).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Un compte existe déjà avec cette adresse email.', 'error')
      expect(store.authenticated).toBe(false)
    })

    it('administrateur - mémorise le défi 2FA, retourne "twoFactor" et renvoie vers /auth', async () => {
      sessionStorage.setItem('oauthState', 'st')
      mockPost.mockResolvedValueOnce({
        status: 200,
        data: { twoFactorRequired: true, challengeToken: 'chal', message: 'Code envoyé.' },
      })
      const store = useAuthStore()

      expect(await store.completeOAuth('google', 'code', 'st', '/')).toBe('twoFactor')

      expect(store.twoFactorChallenge).toBe('chal')
      expect(store.authenticated).toBe(false)
      expect(mockPush).toHaveBeenCalledWith('/auth')
    })
  })
})

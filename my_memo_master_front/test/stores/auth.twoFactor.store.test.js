import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

const { mockPost, mockPut, mockGet, mockNotify, mockPush } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockGet: vi.fn(),
  mockNotify: vi.fn(),
  mockPush: vi.fn(),
}))

vi.mock('@/helpers/api', () => ({ api: { post: mockPost, put: mockPut, get: mockGet, del: vi.fn() } }))
vi.mock('@/helpers/notif.js', () => ({ notif: { notify: mockNotify, clear: vi.fn() } }))
vi.mock('@/router', () => ({ default: { push: mockPush } }))

// JWT factice : seule la partie payload (id) est lue côté front
const fakeJwt = (id) => `x.${btoa(JSON.stringify({ id }))}.y`

describe('useAuthStore — double authentification par email', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockGet.mockResolvedValue({ status: 200, data: { userId: 7, name: 'Bob' } })
  })

  describe('login', () => {
    it('2FA exigée - mémorise le défi, retourne "twoFactor" et n\'ouvre aucune session', async () => {
      mockPost.mockResolvedValueOnce({
        status: 200,
        data: { twoFactorRequired: true, challengeToken: 'chal', message: 'Code envoyé.' },
      })
      const store = useAuthStore()

      const result = await store.login('a@b.fr', 'Password1!', '/')

      expect(result).toBe('twoFactor')
      expect(store.twoFactorChallenge).toBe('chal')
      expect(store.authenticated).toBe(false)
      expect(store.token).toBeNull()
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('sans 2FA - ouvre la session directement', async () => {
      mockPost.mockResolvedValueOnce({ status: 200, data: { token: fakeJwt(7), refreshToken: 'rt' } })
      const store = useAuthStore()

      expect(await store.login('a@b.fr', 'Password1!', '/')).toBe(true)

      expect(store.authenticated).toBe(true)
      expect(store.refreshToken).toBe('rt')
      expect(store.twoFactorChallenge).toBeNull()
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  describe('verifyTwoFactor', () => {
    it('bon code - envoie le défi et le code, ouvre la session et efface le défi', async () => {
      mockPost.mockResolvedValueOnce({ status: 200, data: { token: fakeJwt(7), refreshToken: 'rt' } })
      const store = useAuthStore()
      store.twoFactorChallenge = 'chal'

      expect(await store.verifyTwoFactor('123456', '/')).toBe(true)

      expect(mockPost).toHaveBeenCalledWith('users/login/2fa', { challengeToken: 'chal', code: '123456' })
      expect(store.authenticated).toBe(true)
      expect(store.twoFactorChallenge).toBeNull()
      expect(mockPush).toHaveBeenCalledWith('/')
    })

    it('mauvais code - retourne false, garde le défi pour un nouvel essai', async () => {
      mockPost.mockResolvedValueOnce({ status: 401, data: { message: 'Code invalide ou expiré.' } })
      const store = useAuthStore()
      store.twoFactorChallenge = 'chal'

      expect(await store.verifyTwoFactor('000000', '/')).toBe(false)

      expect(store.twoFactorChallenge).toBe('chal')
      expect(store.authenticated).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Code invalide ou expiré.', 'error')
    })

    it('défi expiré - retourne "expired" et efface le défi', async () => {
      mockPost.mockResolvedValueOnce({
        status: 401,
        data: { message: 'Vérification expirée. Reconnectez-vous.', challengeExpired: true },
      })
      const store = useAuthStore()
      store.twoFactorChallenge = 'chal'

      expect(await store.verifyTwoFactor('123456', '/')).toBe('expired')
      expect(store.twoFactorChallenge).toBeNull()
    })

    it('réponse absente - retourne false avec le message par défaut', async () => {
      mockPost.mockResolvedValueOnce(undefined)
      const store = useAuthStore()
      store.twoFactorChallenge = 'chal'

      expect(await store.verifyTwoFactor('123456', '/')).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Code invalide ou expiré.', 'error')
    })
  })

  describe('resendTwoFactorCode', () => {
    it('200 - notifie le succès', async () => {
      mockPost.mockResolvedValueOnce({ status: 200, data: { message: 'Nouveau code envoyé.' } })
      const store = useAuthStore()
      store.twoFactorChallenge = 'chal'

      expect(await store.resendTwoFactorCode()).toBe(true)
      expect(mockPost).toHaveBeenCalledWith('users/login/2fa/resend', { challengeToken: 'chal' })
      expect(mockNotify).toHaveBeenCalledWith('Nouveau code envoyé.', 'success')
    })

    it('429 - notifie l\'erreur et conserve le défi', async () => {
      mockPost.mockResolvedValueOnce({ status: 429, data: { message: 'Patientez une minute.' } })
      const store = useAuthStore()
      store.twoFactorChallenge = 'chal'

      expect(await store.resendTwoFactorCode()).toBe(false)
      expect(store.twoFactorChallenge).toBe('chal')
      expect(mockNotify).toHaveBeenCalledWith('Patientez une minute.', 'error')
    })

    it('défi expiré - efface le défi', async () => {
      mockPost.mockResolvedValueOnce({ status: 401, data: { message: 'Vérification expirée.', challengeExpired: true } })
      const store = useAuthStore()
      store.twoFactorChallenge = 'chal'

      expect(await store.resendTwoFactorCode()).toBe(false)
      expect(store.twoFactorChallenge).toBeNull()
    })
  })

  describe('cancelTwoFactor / logout', () => {
    it('cancelTwoFactor - efface le défi', () => {
      const store = useAuthStore()
      store.twoFactorChallenge = 'chal'
      store.cancelTwoFactor()
      expect(store.twoFactorChallenge).toBeNull()
    })

    it('logout - efface aussi le défi', () => {
      mockPost.mockResolvedValue({ status: 200 })
      const store = useAuthStore()
      store.twoFactorChallenge = 'chal'
      store.logout(false, null)
      expect(store.twoFactorChallenge).toBeNull()
    })
  })

  describe('setTwoFactorEnabled', () => {
    it('200 - met à jour l\'utilisateur et notifie', async () => {
      mockPut.mockResolvedValueOnce({
        status: 200,
        data: { message: 'Double authentification activée.', twoFactorEnabled: true },
      })
      const store = useAuthStore()
      store.user = { userId: 7, name: 'Bob' }

      expect(await store.setTwoFactorEnabled({ enabled: true, password: 'Password1!' })).toBe(true)

      expect(mockPut).toHaveBeenCalledWith('users/two-factor', { enabled: true, password: 'Password1!' })
      expect(store.user).toEqual({ userId: 7, name: 'Bob', twoFactorEnabled: true })
      expect(mockNotify).toHaveBeenCalledWith('Double authentification activée.', 'success')
    })

    it('mot de passe incorrect - retourne false sans modifier l\'utilisateur', async () => {
      mockPut.mockResolvedValueOnce({ status: 401, data: { message: 'Mot de passe incorrect.' } })
      const store = useAuthStore()
      store.user = { userId: 7, twoFactorEnabled: false }

      expect(await store.setTwoFactorEnabled({ enabled: true, password: 'x' })).toBe(false)

      expect(store.user.twoFactorEnabled).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Mot de passe incorrect.', 'error')
    })
  })
})

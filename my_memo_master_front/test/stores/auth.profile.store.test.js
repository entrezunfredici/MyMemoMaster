import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

const { mockPost, mockPut, mockNotify } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockNotify: vi.fn(),
}))

vi.mock('@/helpers/api', () => ({ api: { post: mockPost, put: mockPut, get: vi.fn(), del: vi.fn() } }))
vi.mock('@/helpers/notif.js', () => ({ notif: { notify: mockNotify } }))
vi.mock('@/router', () => ({ default: { push: vi.fn() } }))

const NETWORK_MESSAGE = 'Impossible de contacter le serveur. Réessayez dans un instant.'

describe('useAuthStore — mot de passe oublié, réinitialisation, profil', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('requestPasswordReset', () => {
    it('200 - { ok: true }, aucune notification (la page décide)', async () => {
      mockPost.mockResolvedValueOnce({ status: 200 })
      const result = await useAuthStore().requestPasswordReset('a@b.fr')
      expect(mockPost).toHaveBeenCalledWith('users/forgot-password', { email: 'a@b.fr' })
      expect(result).toEqual({ ok: true })
      expect(mockNotify).not.toHaveBeenCalled()
    })

    it('erreur serveur - renvoie le message du serveur', async () => {
      mockPost.mockResolvedValueOnce({ status: 429, data: { message: 'Trop de demandes.' } })
      expect(await useAuthStore().requestPasswordReset('a@b.fr')).toEqual({ ok: false, message: 'Trop de demandes.' })
    })

    it('réponse absente ou sans message - message par défaut', async () => {
      mockPost.mockResolvedValueOnce(undefined)
      expect(await useAuthStore().requestPasswordReset('a@b.fr')).toEqual({ ok: false, message: "Erreur lors de l'envoi." })
      mockPost.mockResolvedValueOnce({ status: 500, data: {} })
      expect((await useAuthStore().requestPasswordReset('a@b.fr')).message).toBe("Erreur lors de l'envoi.")
    })

    it('exception réseau - { ok: false } avec message, sans lever', async () => {
      mockPost.mockRejectedValueOnce(new Error('KO'))
      expect(await useAuthStore().requestPasswordReset('a@b.fr')).toEqual({ ok: false, message: NETWORK_MESSAGE })
    })
  })

  describe('resetPasswordWithCode', () => {
    const payload = { email: 'a@b.fr', code: '123456', newPassword: 'Motdepasse1X' }

    it('201 - { ok: true }', async () => {
      mockPost.mockResolvedValueOnce({ status: 201 })
      expect(await useAuthStore().resetPasswordWithCode(payload)).toEqual({ ok: true })
      expect(mockPost).toHaveBeenCalledWith('users/reset-password', payload)
    })

    it('200 n’est pas un succès (l’API répond 201)', async () => {
      mockPost.mockResolvedValueOnce({ status: 200, data: {} })
      expect(await useAuthStore().resetPasswordWithCode(payload)).toEqual({ ok: false, message: 'Code invalide ou expiré.' })
    })

    it('code refusé - message du serveur', async () => {
      mockPost.mockResolvedValueOnce({ status: 400, data: { message: 'Code expiré.' } })
      expect(await useAuthStore().resetPasswordWithCode(payload)).toEqual({ ok: false, message: 'Code expiré.' })
    })

    it('exception réseau', async () => {
      mockPost.mockRejectedValueOnce(new Error('KO'))
      expect(await useAuthStore().resetPasswordWithCode(payload)).toEqual({ ok: false, message: NETWORK_MESSAGE })
    })
  })

  describe('updateProfile', () => {
    const seed = () => {
      const store = useAuthStore()
      store.user = { userId: 7, name: 'Dupont', email: 'd@x.fr', roleId: 2 }
      return store
    }

    it('200 - met à jour l’utilisateur courant, notifie le succès', async () => {
      mockPut.mockResolvedValueOnce({ status: 200, data: { name: 'Durand', email: 'new@x.fr' } })
      const store = seed()
      expect(await store.updateProfile({ name: 'Durand', email: 'new@x.fr' })).toBe(true)
      expect(mockPut).toHaveBeenCalledWith('users/7', { name: 'Durand', email: 'new@x.fr' })
      expect(store.user).toEqual({ userId: 7, name: 'Durand', email: 'new@x.fr', roleId: 2 })
      expect(mockNotify).toHaveBeenCalledWith('Profil mis à jour avec succès.', 'success')
    })

    it('erreur - notifie le message du serveur, utilisateur inchangé', async () => {
      mockPut.mockResolvedValueOnce({ status: 400, data: { message: 'Email déjà utilisé.' } })
      const store = seed()
      expect(await store.updateProfile({ name: 'X', email: 'd@x.fr' })).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Email déjà utilisé.', 'error')
      expect(store.user.name).toBe('Dupont')
    })

    it('réponse absente - message générique', async () => {
      mockPut.mockResolvedValueOnce(undefined)
      expect(await seed().updateProfile({ name: 'X', email: 'd@x.fr' })).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Erreur lors de la mise à jour.', 'error')
    })
  })

  describe('changePassword', () => {
    it('200 - envoie l’identifiant dans la route et le corps, notifie le succès', async () => {
      mockPut.mockResolvedValueOnce({ status: 200, data: {} })
      const store = useAuthStore()
      store.user = { userId: 7 }
      expect(await store.changePassword({ oldPassword: 'Old1!', newPassword: 'New1!' })).toBe(true)
      expect(mockPut).toHaveBeenCalledWith('users/7/change-password', { id: 7, oldPassword: 'Old1!', newPassword: 'New1!' })
      expect(mockNotify).toHaveBeenCalledWith('Mot de passe modifié avec succès.', 'success')
    })

    it('ancien mot de passe refusé - notifie le message du serveur', async () => {
      mockPut.mockResolvedValueOnce({ status: 401, data: { message: 'Mot de passe incorrect.' } })
      const store = useAuthStore()
      store.user = { userId: 7 }
      expect(await store.changePassword({ oldPassword: 'x', newPassword: 'y' })).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Mot de passe incorrect.', 'error')
    })

    it('réponse absente - message générique', async () => {
      mockPut.mockResolvedValueOnce(undefined)
      const store = useAuthStore()
      store.user = { userId: 7 }
      expect(await store.changePassword({ oldPassword: 'x', newPassword: 'y' })).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith('Erreur lors du changement de mot de passe.', 'error')
    })
  })
})

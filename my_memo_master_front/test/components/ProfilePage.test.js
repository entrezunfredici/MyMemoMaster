import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import ProfilePage from '@/pages/ProfilePage.vue'
import { useAuthStore } from '@/stores/auth'

// ── Mocks globaux ─────────────────────────────────────────────────────────────

const { mockPut, mockNotify } = vi.hoisted(() => ({
  mockPut: vi.fn(),
  mockNotify: vi.fn(),
}))

vi.mock('@/helpers/api', () => ({
  api: {
    get: vi.fn(),
    put: mockPut,
    post: vi.fn(),
    del: vi.fn(),
  },
}))

vi.mock('@/helpers/notif', () => ({
  notif: { notify: mockNotify },
}))

// ── Données de test ───────────────────────────────────────────────────────────

const mockUser = {
  userId: 1,
  name: 'Dupont',
  email: 'dupont@test.fr',
  roleId: 2,
}

// ── Helper de montage ─────────────────────────────────────────────────────────

function mountProfile(user = mockUser) {
  return mount(ProfilePage, {
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: true,
          initialState: {
            auth: { user, authenticated: true, token: 'fake-token' },
          },
        }),
      ],
    },
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ProfilePage', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Rendu initial ──────────────────────────────────────────────────────────

  it('affiche le nom depuis authStore.user', async () => {
    const wrapper = mountProfile()
    await flushPromises()
    expect(wrapper.text()).toContain('Dupont')
  })

  it("affiche l'email depuis authStore.user", async () => {
    const wrapper = mountProfile()
    await flushPromises()
    expect(wrapper.text()).toContain('dupont@test.fr')
  })

  it('affiche le label de rôle calculé depuis roleId', async () => {
    const wrapper = mountProfile()
    await flushPromises()
    expect(wrapper.text()).toContain('Étudiant')
  })

  it("roleId inconnu — affiche 'Inconnu'", async () => {
    const wrapper = mountProfile({ ...mockUser, roleId: 99 })
    await flushPromises()
    expect(wrapper.text()).toContain('Inconnu')
  })

  it('le formulaire est pré-rempli avec le nom et l\'email au montage', async () => {
    const wrapper = mountProfile()
    await flushPromises()
    expect(wrapper.find('#profile-name').element.value).toBe('Dupont')
    expect(wrapper.find('#profile-email').element.value).toBe('dupont@test.fr')
  })

  it('appelle fetchUserInfos() au montage', async () => {
    mountProfile()
    await flushPromises()
    const authStore = useAuthStore()
    expect(authStore.fetchUserInfos).toHaveBeenCalledOnce()
  })

  // ── saveProfile() ──────────────────────────────────────────────────────────

  it('saveProfile — succès — notifie success et met à jour authStore.user', async () => {
    const updatedUser = { ...mockUser, name: 'Durand' }
    mockPut.mockResolvedValueOnce({ status: 200, data: updatedUser })

    const wrapper = mountProfile()
    await flushPromises()

    await wrapper.find('#profile-name').setValue('Durand')
    await wrapper.findAll('form')[0].trigger('submit')
    await flushPromises()

    expect(mockPut).toHaveBeenCalledWith('users/1', { name: 'Durand', email: 'dupont@test.fr' })
    expect(mockNotify).toHaveBeenCalledWith('Profil mis à jour avec succès.', 'success')
    const authStore = useAuthStore()
    expect(authStore.user.name).toBe('Durand')
  })

  it('saveProfile — erreur API — notifie le message du serveur', async () => {
    mockPut.mockResolvedValueOnce({ status: 400, data: { message: 'Email déjà utilisé.' } })

    const wrapper = mountProfile()
    await flushPromises()

    await wrapper.findAll('form')[0].trigger('submit')
    await flushPromises()

    expect(mockNotify).toHaveBeenCalledWith('Email déjà utilisé.', 'error')
  })

  it('saveProfile — réponse absente — notifie erreur générique', async () => {
    mockPut.mockResolvedValueOnce(undefined)

    const wrapper = mountProfile()
    await flushPromises()

    await wrapper.findAll('form')[0].trigger('submit')
    await flushPromises()

    expect(mockNotify).toHaveBeenCalledWith('Erreur lors de la mise à jour.', 'error')
  })

  // ── changePassword() ───────────────────────────────────────────────────────

  it('changePassword — mots de passe différents — affiche passwordError, n\'appelle pas l\'API', async () => {
    const wrapper = mountProfile()
    await flushPromises()

    await wrapper.find('#new-password').setValue('NewPassword1!')
    await wrapper.find('#confirm-password').setValue('AutrePassword1!')
    await wrapper.findAll('form')[1].trigger('submit')

    expect(wrapper.text()).toContain('Les mots de passe ne correspondent pas.')
    expect(mockPut).not.toHaveBeenCalled()
  })

  it('changePassword — mot de passe trop faible — affiche les critères manquants', async () => {
    const wrapper = mountProfile()
    await flushPromises()

    await wrapper.find('#new-password').setValue('faible')
    await wrapper.find('#confirm-password').setValue('faible')
    await wrapper.findAll('form')[1].trigger('submit')

    expect(wrapper.text()).toContain('Le mot de passe doit contenir')
    expect(mockPut).not.toHaveBeenCalled()
  })

  it('changePassword — succès — notifie success et réinitialise le formulaire', async () => {
    mockPut.mockResolvedValueOnce({ status: 200, data: { message: 'Mot de passe modifié.' } })

    const wrapper = mountProfile()
    await flushPromises()

    await wrapper.find('#old-password').setValue('OldPassword1!')
    await wrapper.find('#new-password').setValue('NewPassword1!')
    await wrapper.find('#confirm-password').setValue('NewPassword1!')
    await wrapper.findAll('form')[1].trigger('submit')
    await flushPromises()

    expect(mockPut).toHaveBeenCalledWith('users/1/change-password', {
      id: 1,
      oldPassword: 'OldPassword1!',
      newPassword: 'NewPassword1!',
    })
    expect(mockNotify).toHaveBeenCalledWith('Mot de passe modifié avec succès.', 'success')
    expect(wrapper.find('#old-password').element.value).toBe('')
    expect(wrapper.find('#new-password').element.value).toBe('')
  })

  it('changePassword — erreur API — notifie le message du serveur', async () => {
    mockPut.mockResolvedValueOnce({ status: 401, data: { message: 'Mot de passe incorrect.' } })

    const wrapper = mountProfile()
    await flushPromises()

    await wrapper.find('#old-password').setValue('WrongOldPass1!')
    await wrapper.find('#new-password').setValue('NewPassword1!')
    await wrapper.find('#confirm-password').setValue('NewPassword1!')
    await wrapper.findAll('form')[1].trigger('submit')
    await flushPromises()

    expect(mockNotify).toHaveBeenCalledWith('Mot de passe incorrect.', 'error')
  })

  // ── Déconnexion ────────────────────────────────────────────────────────────

  it('clic Se déconnecter — appelle authStore.logout()', async () => {
    const wrapper = mountProfile()
    await flushPromises()

    const logoutBtn = wrapper.findAll('button').find((b) => b.text() === 'Se déconnecter')
    await logoutBtn?.trigger('click')

    const authStore = useAuthStore()
    expect(authStore.logout).toHaveBeenCalledOnce()
  })

  // ── Zone dangereuse — deleteAccount ───────────────────────────────────────

  it('bouton suppression désactivé si deleteConfirm ≠ "SUPPRIMER"', async () => {
    const wrapper = mountProfile()
    await flushPromises()
    expect(wrapper.find('.profile__btn--red').attributes('disabled')).toBeDefined()
  })

  it('bouton suppression activé si deleteConfirm === "SUPPRIMER"', async () => {
    const wrapper = mountProfile()
    await flushPromises()
    await wrapper.find('#delete-confirm').setValue('SUPPRIMER')
    expect(wrapper.find('.profile__btn--red').attributes('disabled')).toBeUndefined()
  })

  it('clic suppression avec "SUPPRIMER" — appelle authStore.deleteAccount()', async () => {
    const wrapper = mountProfile()
    await flushPromises()
    await wrapper.find('#delete-confirm').setValue('SUPPRIMER')
    await wrapper.find('.profile__btn--red').trigger('click')
    await flushPromises()

    const authStore = useAuthStore()
    expect(authStore.deleteAccount).toHaveBeenCalledOnce()
  })
})

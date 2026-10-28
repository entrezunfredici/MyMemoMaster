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

  // La requête et les notifications vivent dans le store (voir test/stores/auth.profile.store.test.js) ;
  // la page ne porte que le contrat : quelles données elle transmet, et ce qu'elle fait du résultat.
  it('saveProfile — transmet nom et email saisis au store', async () => {
    const wrapper = mountProfile()
    await flushPromises()

    await wrapper.find('#profile-name').setValue('Durand')
    await wrapper.findAll('form')[0].trigger('submit')
    await flushPromises()

    const authStore = useAuthStore()
    expect(authStore.updateProfile).toHaveBeenCalledWith({ name: 'Durand', email: 'dupont@test.fr' })
  })

  it('saveProfile — le bouton est désactivé pendant l\'enregistrement puis réactivé', async () => {
    let release
    const wrapper = mountProfile()
    await flushPromises()
    const authStore = useAuthStore()
    authStore.updateProfile.mockReturnValueOnce(new Promise((resolve) => { release = resolve }))

    await wrapper.findAll('form')[0].trigger('submit')
    expect(wrapper.findAll('form')[0].find('button[type="submit"]').attributes('disabled')).toBeDefined()
    release(true)
    await flushPromises()
    expect(wrapper.findAll('form')[0].find('button[type="submit"]').attributes('disabled')).toBeUndefined()
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

  async function submitPasswordForm(wrapper) {
    await wrapper.find('#old-password').setValue('OldPassword1!')
    await wrapper.find('#new-password').setValue('NewPassword1!')
    await wrapper.find('#confirm-password').setValue('NewPassword1!')
    await wrapper.findAll('form')[1].trigger('submit')
    await flushPromises()
  }

  it('changePassword — transmet ancien et nouveau mot de passe au store', async () => {
    const wrapper = mountProfile()
    await flushPromises()
    useAuthStore().changePassword.mockResolvedValueOnce(true)

    await submitPasswordForm(wrapper)

    expect(useAuthStore().changePassword).toHaveBeenCalledWith({
      oldPassword: 'OldPassword1!',
      newPassword: 'NewPassword1!',
    })
  })

  it('changePassword — succès — réinitialise le formulaire', async () => {
    const wrapper = mountProfile()
    await flushPromises()
    useAuthStore().changePassword.mockResolvedValueOnce(true)

    await submitPasswordForm(wrapper)

    expect(wrapper.find('#old-password').element.value).toBe('')
    expect(wrapper.find('#new-password').element.value).toBe('')
    expect(wrapper.find('#confirm-password').element.value).toBe('')
  })

  it('changePassword — échec — conserve la saisie pour permettre de corriger', async () => {
    const wrapper = mountProfile()
    await flushPromises()
    useAuthStore().changePassword.mockResolvedValueOnce(false)

    await submitPasswordForm(wrapper)

    expect(wrapper.find('#old-password').element.value).toBe('OldPassword1!')
    expect(wrapper.find('#new-password').element.value).toBe('NewPassword1!')
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

  // ── Double authentification ────────────────────────────────────────────────

  describe('double authentification', () => {
    const card = (w) => w.find('[data-testid="two-factor-card"]')

    it('utilisateur standard sans 2FA - affiche « désactivée » et le bouton d’activation', async () => {
      const wrapper = mountProfile()
      await flushPromises()
      expect(card(wrapper).text()).toContain('désactivée')
      expect(card(wrapper).find('button').text()).toBe('Activer la double authentification')
    })

    it('2FA activée - affiche « activée » et le bouton de désactivation', async () => {
      const wrapper = mountProfile({ ...mockUser, twoFactorEnabled: true })
      await flushPromises()
      expect(card(wrapper).text()).toContain('activée')
      expect(card(wrapper).find('button').text()).toBe('Désactiver la double authentification')
    })

    it('envoie enabled: true avec le mot de passe saisi', async () => {
      const wrapper = mountProfile()
      await flushPromises()
      await card(wrapper).find('#two-factor-password').setValue('Password1!')
      await card(wrapper).find('form').trigger('submit')
      await flushPromises()

      expect(useAuthStore().setTwoFactorEnabled).toHaveBeenCalledWith({ enabled: true, password: 'Password1!' })
    })

    it('2FA activée - envoie enabled: false', async () => {
      const wrapper = mountProfile({ ...mockUser, twoFactorEnabled: true })
      await flushPromises()
      await card(wrapper).find('#two-factor-password').setValue('Password1!')
      await card(wrapper).find('form').trigger('submit')
      await flushPromises()

      expect(useAuthStore().setTwoFactorEnabled).toHaveBeenCalledWith({ enabled: false, password: 'Password1!' })
    })

    it('administrateur - explique que la 2FA est obligatoire et n’affiche aucun formulaire', async () => {
      const wrapper = mountProfile({ ...mockUser, roleId: 1, twoFactorRequired: true })
      await flushPromises()
      expect(card(wrapper).text()).toContain('Obligatoire')
      expect(card(wrapper).find('form').exists()).toBe(false)
    })
  })
})

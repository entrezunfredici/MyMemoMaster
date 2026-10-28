import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import ConnexionPage from '@/pages/login/ConnexionPage.vue'
import { useAuthStore } from '@/stores/auth'

vi.mock('@/helpers/api', () => ({ api: { get: vi.fn(), put: vi.fn(), post: vi.fn(), del: vi.fn() } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: vi.fn() } }))
vi.mock('@/router', () => ({ default: { push: vi.fn() } }))

function mountPage(initialState = {}) {
  const wrapper = mount(ConnexionPage, {
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: true, initialState: { auth: initialState } })],
      stubs: { AuthFormLayout: { template: '<div><h1>{{ title }}</h1><slot /></div>', props: ['title', 'titleClass'] }, 'router-link': true },
    },
  })
  return { wrapper, store: useAuthStore() }
}

describe('ConnexionPage — double authentification', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sans défi - affiche le formulaire email / mot de passe', () => {
    const { wrapper } = mountPage()
    expect(wrapper.text()).toContain('Connexion')
    expect(wrapper.find('#login-email').exists()).toBe(true)
    expect(wrapper.find('#login-code').exists()).toBe(false)
  })

  it('après un mot de passe valide avec 2FA - passe à l\'étape du code et vide le mot de passe', async () => {
    const { wrapper, store } = mountPage()
    store.login.mockImplementation(async () => {
      store.twoFactorChallenge = 'chal'
      return 'twoFactor'
    })

    await wrapper.find('#login-email').setValue('a@b.fr')
    await wrapper.find('#login-password').setValue('Password1!')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(store.login).toHaveBeenCalledWith('a@b.fr', 'Password1!', '/')
    expect(wrapper.text()).toContain('Vérification')
    expect(wrapper.find('#login-code').exists()).toBe(true)
    expect(wrapper.find('#login-password').exists()).toBe(false)
  })

  it('le champ du code a un libellé, le mode numérique et l\'autocomplétion one-time-code', () => {
    const { wrapper } = mountPage({ twoFactorChallenge: 'chal' })
    const input = wrapper.find('#login-code')
    expect(wrapper.find('label[for="login-code"]').exists()).toBe(true)
    expect(input.attributes('inputmode')).toBe('numeric')
    expect(input.attributes('autocomplete')).toBe('one-time-code')
    expect(input.attributes('maxlength')).toBe('6')
  })

  it('saisie du code - appelle verifyTwoFactor avec le code', async () => {
    const { wrapper, store } = mountPage({ twoFactorChallenge: 'chal' })
    store.verifyTwoFactor.mockResolvedValue(true)

    await wrapper.find('#login-code').setValue('123456')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(store.verifyTwoFactor).toHaveBeenCalledWith('123456', '/')
  })

  it('mauvais code - affiche une erreur annoncée (role="alert") et vide le champ', async () => {
    const { wrapper, store } = mountPage({ twoFactorChallenge: 'chal' })
    store.verifyTwoFactor.mockResolvedValue(false)

    await wrapper.find('#login-code').setValue('000000')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toContain('Code invalide ou expiré.')
    expect(wrapper.find('#login-code').element.value).toBe('')
  })

  it('défi expiré - affiche le message de reconnexion', async () => {
    const { wrapper, store } = mountPage({ twoFactorChallenge: 'chal' })
    store.verifyTwoFactor.mockResolvedValue('expired')

    await wrapper.find('#login-code').setValue('123456')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('La vérification a expiré')
  })

  it('« Renvoyer le code » - appelle resendTwoFactorCode', async () => {
    const { wrapper, store } = mountPage({ twoFactorChallenge: 'chal' })
    store.resendTwoFactorCode.mockResolvedValue(true)

    const resend = wrapper.findAll('button').find((b) => b.text() === 'Renvoyer le code')
    await resend.trigger('click')
    await flushPromises()

    expect(store.resendTwoFactorCode).toHaveBeenCalledTimes(1)
  })

  it('« Retour à la connexion » - annule le défi', async () => {
    const { wrapper, store } = mountPage({ twoFactorChallenge: 'chal' })

    const back = wrapper.findAll('button').find((b) => b.text() === 'Retour à la connexion')
    await back.trigger('click')

    expect(store.cancelTwoFactor).toHaveBeenCalledTimes(1)
  })
})

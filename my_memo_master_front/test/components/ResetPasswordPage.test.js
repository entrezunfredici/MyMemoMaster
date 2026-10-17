import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import ResetPasswordPage from '@/pages/ResetPasswordPage.vue'

const { mockPost, mockNotify, mockPush, route } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockNotify: vi.fn(),
  mockPush: vi.fn(),
  route: { query: {} },
}))
vi.mock('@/helpers/api', () => ({ api: { post: mockPost } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: mockNotify } }))
vi.mock('@/router', () => ({ default: { push: vi.fn() } }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mockPush }), useRoute: () => route }))

const mountPage = () =>
  mount(ResetPasswordPage, { global: { plugins: [createPinia()], stubs: { RouterLink: { template: '<a><slot /></a>' }, AuthFormLayout: { template: '<div><slot /></div>' } } } })

const fill = async (wrapper, code = '123456', password = 'Motdepasse1X') => {
  await wrapper.find('#rp-code').setValue(code)
  await wrapper.find('#rp-password').setValue(password)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    route.query = { email: 'eleve@mail.fr' }
  })

  it('champs étiquetés ; le code attend 6 chiffres (RGAA 11.1)', () => {
    const wrapper = mountPage()
    expect(wrapper.find('label[for="rp-code"]').exists()).toBe(true)
    expect(wrapper.find('label[for="rp-password"]').exists()).toBe(true)
    const code = wrapper.find('#rp-code')
    expect(code.attributes('maxlength')).toBe('6')
    expect(code.attributes('autocomplete')).toBe('one-time-code')
    expect(wrapper.find('#rp-password').attributes('type')).toBe('password')
  })

  it('succès (201) - envoie email, code, mot de passe ; notifie et redirige vers /auth', async () => {
    mockPost.mockResolvedValueOnce({ status: 201 })
    await fill(mountPage(), ' 123456 ', 'Motdepasse1X')
    expect(mockPost).toHaveBeenCalledWith('users/reset-password', {
      email: 'eleve@mail.fr',
      code: '123456',
      newPassword: 'Motdepasse1X',
    })
    expect(mockNotify).toHaveBeenCalledWith('Mot de passe réinitialisé avec succès !', 'success')
    expect(mockPush).toHaveBeenCalledWith('/auth')
  })

  it('email absent de l’URL - message explicite, aucun appel API', async () => {
    route.query = {}
    const wrapper = mountPage()
    await fill(wrapper)
    expect(wrapper.find('p.text-red-600').text()).toContain('Email manquant')
    expect(mockPost).not.toHaveBeenCalled()
  })

  it('code invalide - affiche le message du serveur', async () => {
    mockPost.mockResolvedValueOnce({ status: 400, data: { message: 'Code expiré.' } })
    const wrapper = mountPage()
    await fill(wrapper)
    expect(wrapper.find('p.text-red-600').text()).toBe('Code expiré.')
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('un statut 200 n’est pas un succès (l’API répond 201)', async () => {
    mockPost.mockResolvedValueOnce({ status: 200, data: {} })
    const wrapper = mountPage()
    await fill(wrapper)
    expect(wrapper.find('p.text-red-600').text()).toBe('Code invalide ou expiré.')
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('réponse absente - message par défaut', async () => {
    mockPost.mockResolvedValueOnce(undefined)
    const wrapper = mountPage()
    await fill(wrapper)
    expect(wrapper.find('p.text-red-600').text()).toBe('Code invalide ou expiré.')
  })

  it('erreur réseau - message visible, pas de redirection, bouton réactivé', async () => {
    mockPost.mockRejectedValueOnce(new Error('KO'))
    const wrapper = mountPage()
    await fill(wrapper)
    expect(wrapper.find('p.text-red-600').text()).toContain('Impossible de contacter le serveur')
    expect(mockPush).not.toHaveBeenCalled()
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })

  it('bouton désactivé pendant l’envoi', async () => {
    let release
    mockPost.mockReturnValueOnce(new Promise((resolve) => { release = resolve }))
    const wrapper = mountPage()
    await wrapper.find('#rp-code').setValue('123456')
    await wrapper.find('#rp-password').setValue('Motdepasse1X')
    await wrapper.find('form').trigger('submit')
    const button = wrapper.find('button[type="submit"]')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.text()).toBe('Réinitialisation...')
    release({ status: 201 })
    await flushPromises()
    expect(button.attributes('disabled')).toBeUndefined()
  })
})

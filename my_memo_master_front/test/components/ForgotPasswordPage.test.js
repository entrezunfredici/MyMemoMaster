import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage.vue'

const { mockPost, mockNotify, mockPush } = vi.hoisted(() => ({ mockPost: vi.fn(), mockNotify: vi.fn(), mockPush: vi.fn() }))
vi.mock('@/helpers/api', () => ({ api: { post: mockPost } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: mockNotify } }))
vi.mock('@/router', () => ({ default: { push: vi.fn() } }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mockPush }) }))

const mountPage = () =>
  mount(ForgotPasswordPage, { global: { plugins: [createPinia()], stubs: { RouterLink: { template: '<a><slot /></a>' }, AuthFormLayout: { template: '<div><slot /></div>' } } } })

const submit = async (wrapper, email) => {
  await wrapper.find('#fp-email').setValue(email)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('le champ email est étiqueté et obligatoire (RGAA 11.1)', () => {
    const wrapper = mountPage()
    expect(wrapper.find('label[for="fp-email"]').text()).toBe('Email')
    const input = wrapper.find('#fp-email')
    expect(input.attributes('type')).toBe('email')
    expect(input.attributes('required')).toBeDefined()
  })

  it('succès - envoie l’email nettoyé, notifie et redirige vers la réinitialisation', async () => {
    mockPost.mockResolvedValueOnce({ status: 200 })
    await submit(mountPage(), '  eleve@mail.fr  ')
    expect(mockPost).toHaveBeenCalledWith('users/forgot-password', { email: 'eleve@mail.fr' })
    expect(mockNotify).toHaveBeenCalledWith('Code envoyé ! Vérifiez votre email.', 'success')
    expect(mockPush).toHaveBeenCalledWith({ path: '/reset-password', query: { email: 'eleve@mail.fr' } })
  })

  it('erreur API - affiche le message du serveur, ne redirige pas', async () => {
    mockPost.mockResolvedValueOnce({ status: 429, data: { message: 'Trop de demandes.' } })
    const wrapper = mountPage()
    await submit(wrapper, 'a@b.fr')
    expect(wrapper.find('p.text-red-600').text()).toBe('Trop de demandes.')
    expect(mockPush).not.toHaveBeenCalled()
    expect(mockNotify).not.toHaveBeenCalled()
  })

  it('réponse absente - message par défaut', async () => {
    mockPost.mockResolvedValueOnce(undefined)
    const wrapper = mountPage()
    await submit(wrapper, 'a@b.fr')
    expect(wrapper.find('p.text-red-600').text()).toBe("Erreur lors de l'envoi.")
  })

  it('le message d’erreur est effacé à l’envoi suivant', async () => {
    mockPost.mockResolvedValueOnce({ status: 500, data: { message: 'Panne' } }).mockResolvedValueOnce({ status: 200 })
    const wrapper = mountPage()
    await submit(wrapper, 'a@b.fr')
    expect(wrapper.find('p.text-red-600').exists()).toBe(true)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('p.text-red-600').exists()).toBe(false)
  })

  it('bouton désactivé pendant l’envoi puis réactivé', async () => {
    let release
    mockPost.mockReturnValueOnce(new Promise((resolve) => { release = resolve }))
    const wrapper = mountPage()
    await wrapper.find('#fp-email').setValue('a@b.fr')
    await wrapper.find('form').trigger('submit')
    const button = wrapper.find('button[type="submit"]')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.text()).toBe('Envoi...')
    release({ status: 200 })
    await flushPromises()
    expect(button.attributes('disabled')).toBeUndefined()
  })

  it('erreur réseau - message visible, pas de redirection, bouton réactivé', async () => {
    mockPost.mockRejectedValueOnce(new Error('KO'))
    const wrapper = mountPage()
    await submit(wrapper, 'a@b.fr')
    expect(wrapper.find('p.text-red-600').text()).toContain('Impossible de contacter le serveur')
    expect(mockPush).not.toHaveBeenCalled()
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })
})

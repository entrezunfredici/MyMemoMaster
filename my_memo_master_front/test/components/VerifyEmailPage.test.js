import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import VerifyEmailPage from '@/pages/VerifyEmailPage.vue'
import { useAuthStore } from '@/stores/auth'

const { mockPush, route } = vi.hoisted(() => ({ mockPush: vi.fn(), route: { query: {} } }))
vi.mock('@/router', () => ({ default: { push: vi.fn() } }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mockPush }), useRoute: () => route }))

// Le store doit être configuré AVANT le montage (onMounted lit la requête) : on prépare donc le pinia à part.
function mountWith(query, { verify = true } = {}) {
  route.query = query
  const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true })
  const auth = useAuthStore(pinia)
  auth.verifyEmail.mockResolvedValue(verify)
  auth.resendVerificationEmail.mockResolvedValue(true)
  const wrapper = mount(VerifyEmailPage, {
    global: {
      plugins: [pinia],
      stubs: { RouterLink: { template: '<a><slot /></a>' }, AuthFormLayout: { template: '<div><slot /></div>' } },
    },
  })
  return { wrapper, auth }
}

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  describe('sans paramètres', () => {
    it('affiche le formulaire manuel, champs étiquetés (RGAA 11.1)', () => {
      const { wrapper } = mountWith({})
      expect(wrapper.find('form').exists()).toBe(true)
      expect(wrapper.find('label[for="ve-email"]').exists()).toBe(true)
      expect(wrapper.find('label[for="ve-code"]').exists()).toBe(true)
      expect(wrapper.find('#ve-code').attributes('maxlength')).toBe('6')
    })

    it('n’appelle pas la vérification automatique', async () => {
      const { auth } = mountWith({})
      await flushPromises()
      expect(auth.verifyEmail).not.toHaveBeenCalled()
    })

    it('pas d’avis d’expiration par défaut', () => {
      expect(mountWith({}).wrapper.text()).not.toContain('a expiré')
    })
  })

  it('?expired=1 - affiche l’avis d’expiration', () => {
    expect(mountWith({ expired: '1' }).wrapper.text()).toContain('Votre code de vérification a expiré')
  })

  describe('lien reçu par email (?email=&code=)', () => {
    it('vérifie automatiquement, sans connecter (3e argument false), puis affiche le succès', async () => {
      const { wrapper, auth } = mountWith({ email: 'a@b.fr', code: '123456' })
      await flushPromises()
      expect(auth.verifyEmail).toHaveBeenCalledWith('a@b.fr', '123456', false)
      expect(wrapper.text()).toContain('Votre email a été vérifié avec succès')
      expect(wrapper.find('form').exists()).toBe(false)
    })

    it('affiche « Vérification en cours » pendant l’appel', async () => {
      route.query = { email: 'a@b.fr', code: '123456' }
      let release
      const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true })
      useAuthStore(pinia).verifyEmail.mockReturnValue(new Promise((resolve) => { release = resolve }))
      const wrapper = mount(VerifyEmailPage, {
        global: { plugins: [pinia], stubs: { RouterLink: true, AuthFormLayout: { template: '<div><slot /></div>' } } },
      })
      await flushPromises()
      expect(wrapper.text()).toContain('Vérification en cours')
      release(true)
      await flushPromises()
      expect(wrapper.text()).not.toContain('Vérification en cours')
    })

    it('lien invalide - formulaire prérempli et message d’erreur', async () => {
      const { wrapper } = mountWith({ email: 'a@b.fr', code: '000000' }, { verify: false })
      await flushPromises()
      expect(wrapper.find('form').exists()).toBe(true)
      expect(wrapper.find('#ve-email').element.value).toBe('a@b.fr')
      expect(wrapper.find('#ve-code').element.value).toBe('000000')
      expect(wrapper.find('p.text-red-600').text()).toContain('invalide ou expiré')
    })
  })

  describe('?email= seul', () => {
    it('préremplit l’email sans vérifier', async () => {
      const { wrapper, auth } = mountWith({ email: 'a@b.fr' })
      await flushPromises()
      expect(wrapper.find('#ve-email').element.value).toBe('a@b.fr')
      expect(auth.verifyEmail).not.toHaveBeenCalled()
    })
  })

  describe('saisie manuelle', () => {
    it('succès - affiche la confirmation puis redirige vers /auth après 1,5 s', async () => {
      const { wrapper, auth } = mountWith({})
      await wrapper.find('#ve-email').setValue('  a@b.fr ')
      await wrapper.find('#ve-code').setValue(' 123456 ')
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(auth.verifyEmail).toHaveBeenCalledWith('a@b.fr', '123456')
      expect(wrapper.text()).toContain('Votre email a été vérifié avec succès')
      expect(mockPush).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1500)
      expect(mockPush).toHaveBeenCalledWith('/auth')
    })

    it('échec - reste sur le formulaire, pas de redirection', async () => {
      const { wrapper } = mountWith({}, { verify: false })
      await wrapper.find('#ve-email').setValue('a@b.fr')
      await wrapper.find('#ve-code').setValue('999999')
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      vi.advanceTimersByTime(2000)
      expect(wrapper.find('form').exists()).toBe(true)
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('renvoi du code', () => {
    it('sans email - message, aucun appel', async () => {
      const { wrapper, auth } = mountWith({})
      await wrapper.findAll('button').find((b) => b.text() === 'Renvoyer le code').trigger('click')
      await flushPromises()
      expect(wrapper.find('p.text-red-600').text()).toBe('Veuillez saisir votre adresse email.')
      expect(auth.resendVerificationEmail).not.toHaveBeenCalled()
    })

    it('avec email - renvoie le code (email nettoyé)', async () => {
      const { wrapper, auth } = mountWith({})
      await wrapper.find('#ve-email').setValue(' a@b.fr ')
      await wrapper.findAll('button').find((b) => b.text() === 'Renvoyer le code').trigger('click')
      await flushPromises()
      expect(auth.resendVerificationEmail).toHaveBeenCalledWith('a@b.fr')
    })
  })
})

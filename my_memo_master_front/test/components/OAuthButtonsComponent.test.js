import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import OAuthButtonsComponent from '@/components/OAuthButtonsComponent.vue'
import { useAuthStore } from '@/stores/auth'

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }))

vi.mock('@/helpers/api', () => ({ api: { post: vi.fn(), put: vi.fn(), get: mockGet, del: vi.fn() } }))
vi.mock('@/helpers/notif.js', () => ({ notif: { notify: vi.fn(), clear: vi.fn() } }))
vi.mock('@/router', () => ({ default: { push: vi.fn() } }))

describe('OAuthButtonsComponent', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('aucun fournisseur activé - ne rend rien', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: { providers: [] } })
    const wrapper = mount(OAuthButtonsComponent)
    await flushPromises()
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('fournisseurs activés - un bouton « Continuer avec … » par fournisseur', async () => {
    mockGet.mockResolvedValueOnce({
      status: 200,
      data: { providers: [{ id: 'google', label: 'Google' }, { id: 'github', label: 'GitHub' }] },
    })
    const wrapper = mount(OAuthButtonsComponent)
    await flushPromises()
    const labels = wrapper.findAll('button').map((b) => b.text())
    expect(labels).toEqual(['Continuer avec Google', 'Continuer avec GitHub'])
  })

  it('clic - démarre la connexion du bon fournisseur et désactive les boutons', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: { providers: [{ id: 'google', label: 'Google' }] } })
    const wrapper = mount(OAuthButtonsComponent)
    await flushPromises()
    const store = useAuthStore()
    const start = vi.spyOn(store, 'startOAuth').mockReturnValue(new Promise(() => {}))

    await wrapper.find('button').trigger('click')

    expect(start).toHaveBeenCalledWith('google')
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })

  it('échec du démarrage - réactive les boutons', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: { providers: [{ id: 'google', label: 'Google' }] } })
    const wrapper = mount(OAuthButtonsComponent)
    await flushPromises()
    const store = useAuthStore()
    vi.spyOn(store, 'startOAuth').mockResolvedValue(false)

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(wrapper.find('button').attributes('disabled')).toBeUndefined()
  })

  it('contenu du slot - affiché sous les boutons', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: { providers: [{ id: 'google', label: 'Google' }] } })
    const wrapper = mount(OAuthButtonsComponent, { slots: { default: '<p class="mention">Mention</p>' } })
    await flushPromises()
    expect(wrapper.find('.mention').exists()).toBe(true)
  })
})

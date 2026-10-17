import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import OnboardingTourComponent from '@/components/OnboardingTourComponent.vue'
import { useOnboardingStore } from '@/stores/onboarding'

const { mockStartTour } = vi.hoisted(() => ({ mockStartTour: vi.fn() }))
vi.mock('@/composables/useOnboardingTour', () => ({ useOnboardingTour: () => ({ startTour: mockStartTour }) }))

function mountTour({ authenticated = true, loaded = true, tourSeen = false } = {}) {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
    initialState: {
      auth: { authenticated, user: authenticated ? { userId: 1 } : null, token: authenticated ? 't' : null },
      onboarding: { tourSeen },
    },
  })
  const store = useOnboardingStore(pinia)
  store.fetchState.mockResolvedValue(loaded)
  const wrapper = mount(OnboardingTourComponent, { global: { plugins: [pinia] } })
  return { wrapper, store }
}

describe('OnboardingTourComponent', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ne rend rien de visible ni de vocalisé (composant sans rendu)', () => {
    const { wrapper } = mountTour()
    const el = wrapper.find('span')
    expect(el.attributes('hidden')).toBeDefined()
    expect(el.attributes('aria-hidden')).toBe('true')
    expect(wrapper.text()).toBe('')
  })

  it('première connexion (tourSeen=false) : charge l’état puis lance la visite', async () => {
    const { store } = mountTour({ tourSeen: false })
    await flushPromises()
    expect(store.fetchState).toHaveBeenCalledTimes(1)
    expect(mockStartTour).toHaveBeenCalledTimes(1)
  })

  it('visite déjà vue : pas de relance automatique', async () => {
    mountTour({ tourSeen: true })
    await flushPromises()
    expect(mockStartTour).not.toHaveBeenCalled()
  })

  it('état inconnu (tourSeen=null) : jamais de visite par défaut', async () => {
    mountTour({ tourSeen: null })
    await flushPromises()
    expect(mockStartTour).not.toHaveBeenCalled()
  })

  it('échec de chargement de l’état : pas de visite, même si tourSeen vaut false', async () => {
    mountTour({ loaded: false, tourSeen: false })
    await flushPromises()
    expect(mockStartTour).not.toHaveBeenCalled()
  })

  it('utilisateur non authentifié : l’API n’est même pas interrogée', async () => {
    const { store } = mountTour({ authenticated: false })
    await flushPromises()
    expect(store.fetchState).not.toHaveBeenCalled()
    expect(mockStartTour).not.toHaveBeenCalled()
  })
})

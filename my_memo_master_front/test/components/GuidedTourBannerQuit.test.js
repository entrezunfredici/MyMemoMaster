import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import GuidedTourBannerComponent from '@/components/GuidedTourBannerComponent.vue'
import { useGuidedTourStore } from '@/stores/guidedTour'

vi.mock('vue-router', () => ({
  useRoute: () => ({ name: 'home' }),
  useRouter: () => ({ push: vi.fn() }),
}))

function mountBanner() {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
    initialState: { guidedTour: { active: true, stepIndex: 0, completed: false } },
  })
  const wrapper = mount(GuidedTourBannerComponent, { attachTo: document.body, global: { plugins: [pinia] } })
  return { wrapper, store: useGuidedTourStore(pinia) }
}

describe('GuidedTourBannerComponent — quitter le parcours (modale de confirmation commune)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('« × » ouvre la modale (jamais window.confirm) ; le parcours n’est pas quitté avant la réponse', async () => {
    const nativeConfirm = vi.spyOn(window, 'confirm')
    const { wrapper, store } = mountBanner()
    await wrapper.find('button[aria-label="Quitter le parcours guidé"]').trigger('click')
    expect(nativeConfirm).not.toHaveBeenCalled()
    const dialog = wrapper.find('[role="dialog"]')
    expect(dialog.attributes('aria-label')).toBe('Quitter le parcours guidé')
    expect(dialog.text()).toContain('Votre progression sera perdue.')
    expect(store.quit).not.toHaveBeenCalled()
  })

  it('« Annuler » garde le parcours', async () => {
    const { wrapper, store } = mountBanner()
    await wrapper.find('button[aria-label="Quitter le parcours guidé"]').trigger('click')
    await wrapper.find('.btn-modal-cancel').trigger('click')
    expect(store.quit).not.toHaveBeenCalled()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('« Confirmer » quitte le parcours', async () => {
    const { wrapper, store } = mountBanner()
    await wrapper.find('button[aria-label="Quitter le parcours guidé"]').trigger('click')
    await wrapper.find('.btn-modal-danger').trigger('click')
    expect(store.quit).toHaveBeenCalledTimes(1)
  })
})

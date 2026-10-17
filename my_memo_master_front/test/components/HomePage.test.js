import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import HomePage from '@/pages/HomePage.vue'
import { useGuidedTourStore, GUIDED_TOUR_STEPS } from '@/stores/guidedTour'

const { mockPush, mockStartTour } = vi.hoisted(() => ({ mockPush: vi.fn(), mockStartTour: vi.fn() }))
vi.mock('vue-router', async (importOriginal) => ({ ...(await importOriginal()), useRouter: () => ({ push: mockPush }) }))
vi.mock('@/composables/useOnboardingTour', () => ({ useOnboardingTour: () => ({ startTour: mockStartTour }) }))

function mountPage() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const wrapper = mount(HomePage, {
    global: {
      plugins: [pinia],
      stubs: { KpiAlertWidgetComponent: { template: '<div data-testid="kpi-alerts" />' } },
    },
  })
  return { wrapper, tour: useGuidedTourStore() }
}

const buttonByText = (wrapper, text) => wrapper.findAll('button').find((b) => b.text().includes(text))

describe('HomePage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('affiche le widget d’alertes KPI', () => {
    expect(mountPage().wrapper.find('[data-testid="kpi-alerts"]').exists()).toBe(true)
  })

  describe('menu principal', () => {
    it('propose les 4 entrées dans l’ordre', () => {
      const labels = mountPage().wrapper.findAll('.home_menu button').map((b) => b.text())
      expect(labels).toEqual(['Mindmaps', 'Systemes de Leitner', 'Exercices', 'Calendrier'])
    })

    it.each([
      ['Mindmaps', '/mindmaps'],
      ['Systemes de Leitner', '/flashcards'],
      ['Exercices', '/exercises'],
      ['Calendrier', '/calendar'],
    ])('« %s » navigue vers %s', async (label, path) => {
      const { wrapper } = mountPage()
      await buttonByText(wrapper, label).trigger('click')
      expect(mockPush).toHaveBeenCalledWith(path)
    })
  })

  describe('parcours guidé', () => {
    it('le bouton porte l’ancre utilisée par la visite guidée', () => {
      expect(mountPage().wrapper.find('[data-tour="guided-tour"]').exists()).toBe(true)
    })

    it('démarre le parcours et ouvre la route de sa première étape', async () => {
      const { wrapper, tour } = mountPage()
      const start = vi.spyOn(tour, 'start')
      await wrapper.find('[data-tour="guided-tour"]').trigger('click')
      expect(start).toHaveBeenCalledTimes(1)
      expect(mockPush).toHaveBeenCalledWith({ name: GUIDED_TOUR_STEPS[0].route })
    })

    it('l’icône décorative est masquée aux lecteurs d’écran (RGAA 1.2)', () => {
      const icon = mountPage().wrapper.find('.home__tour-icon')
      expect(icon.attributes('aria-hidden')).toBe('true')
    })
  })

  it('« Revoir la visite de l’interface » relance la visite sans naviguer', async () => {
    const { wrapper } = mountPage()
    await buttonByText(wrapper, 'Revoir la visite').trigger('click')
    expect(mockStartTour).toHaveBeenCalledTimes(1)
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('tous les boutons sont de vrais <button type="button"> (pas de soumission implicite)', () => {
    const { wrapper } = mountPage()
    wrapper.findAll('.home__tour button').forEach((b) => expect(b.attributes('type')).toBe('button'))
  })
})

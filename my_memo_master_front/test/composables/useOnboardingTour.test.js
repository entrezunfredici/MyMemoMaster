import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useOnboardingTour, ONBOARDING_TOUR_STEPS } from '@/composables/useOnboardingTour'
import { useOnboardingStore } from '@/stores/onboarding'

const { mockDriver, mockDrive } = vi.hoisted(() => {
  const mockDrive = vi.fn()
  const mockDriver = vi.fn(() => ({ drive: mockDrive }))
  return { mockDriver, mockDrive }
})

vi.mock('driver.js', () => ({ driver: mockDriver }))
vi.mock('@/helpers/api', () => ({ api: { get: vi.fn(), put: vi.fn() } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ user: { userId: 1 } }) }))

describe('useOnboardingTour', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('startTour - DOM vide - démarre avec uniquement les étapes flottantes', () => {
    const { startTour } = useOnboardingTour()
    const result = startTour()

    expect(result).toBe(true)
    const { steps } = mockDriver.mock.calls[0][0]
    const floatingCount = ONBOARDING_TOUR_STEPS.filter((s) => s.selector === null).length
    expect(steps).toHaveLength(floatingCount)
    expect(mockDrive).toHaveBeenCalled()
  })

  it('startTour - éléments présents - inclut les étapes ancrées correspondantes', () => {
    document.body.innerHTML = `
      <a data-tour="mindmaps"></a>
      <a data-tour="calendar"></a>
    `

    const { startTour } = useOnboardingTour()
    startTour()

    const { steps } = mockDriver.mock.calls[0][0]
    const floatingCount = ONBOARDING_TOUR_STEPS.filter((s) => s.selector === null).length
    expect(steps).toHaveLength(floatingCount + 2)
    const anchored = steps.filter((s) => s.element)
    expect(anchored.map((s) => s.element.dataset.tour)).toEqual(['mindmaps', 'calendar'])
  })

  it('startTour - labels des boutons en français', () => {
    const { startTour } = useOnboardingTour()
    startTour()

    const options = mockDriver.mock.calls[0][0]
    expect(options.nextBtnText).toBe('Suivant')
    expect(options.prevBtnText).toBe('Précédent')
    expect(options.doneBtnText).toBe('Terminer')
  })

  it('startTour - chaque étape porte un titre et une description', () => {
    const { startTour } = useOnboardingTour()
    startTour()

    const { steps } = mockDriver.mock.calls[0][0]
    for (const step of steps) {
      expect(step.popover.title).toBeTruthy()
      expect(step.popover.description).toBeTruthy()
    }
  })

  it('startTour - la destruction de la visite marque tour_seen via le store', () => {
    const { startTour } = useOnboardingTour()
    const store = useOnboardingStore()
    const markSpy = vi.spyOn(store, 'markTourSeen').mockResolvedValue(true)

    startTour()

    const { onDestroyed } = mockDriver.mock.calls[0][0]
    expect(onDestroyed).toBeTypeOf('function')
    onDestroyed()
    expect(markSpy).toHaveBeenCalledTimes(1)
  })

  it('ONBOARDING_TOUR_STEPS - chaque étape a un titre et un texte', () => {
    for (const step of ONBOARDING_TOUR_STEPS) {
      expect(step.title).toBeTruthy()
      expect(step.intro).toBeTruthy()
    }
  })
})

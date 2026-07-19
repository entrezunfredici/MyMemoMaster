import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGuidedTourStore, GUIDED_TOUR_STEPS } from '@/stores/guidedTour'

describe('useGuidedTourStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // ── état initial ─────────────────────────────────────────────────────────────

  it('état initial - parcours inactif à la première étape sans liens', () => {
    const store = useGuidedTourStore()

    expect(store.active).toBe(false)
    expect(store.stepIndex).toBe(0)
    expect(store.links.subjectId).toBeNull()
    expect(store.links.mindMapId).toBeNull()
    expect(store.currentStep).toEqual(GUIDED_TOUR_STEPS[0])
  })

  // ── start ────────────────────────────────────────────────────────────────────

  it('start - active le parcours et réinitialise la progression et les liens', () => {
    const store = useGuidedTourStore()
    store.active = true
    store.stepIndex = 2
    store.links.subjectId = 5

    store.start()

    expect(store.active).toBe(true)
    expect(store.stepIndex).toBe(0)
    expect(store.links.subjectId).toBeNull()
    expect(store.currentStep.key).toBe('mindmap')
  })

  // ── recordLinks ──────────────────────────────────────────────────────────────

  it('recordLinks - parcours actif - enregistre les IDs connus', () => {
    const store = useGuidedTourStore()
    store.start()

    store.recordLinks({ mindMapId: 3, subjectId: 1 })

    expect(store.links.mindMapId).toBe(3)
    expect(store.links.subjectId).toBe(1)
  })

  it('recordLinks - parcours inactif - ne fait rien', () => {
    const store = useGuidedTourStore()

    store.recordLinks({ mindMapId: 3 })

    expect(store.links.mindMapId).toBeNull()
  })

  it('recordLinks - clé inconnue ou valeur nulle - ignorée', () => {
    const store = useGuidedTourStore()
    store.start()
    store.recordLinks({ mindMapId: 3 })

    store.recordLinks({ inconnu: 42, mindMapId: null })

    expect(store.links.inconnu).toBeUndefined()
    expect(store.links.mindMapId).toBe(3)
  })

  // ── currentStepDone ──────────────────────────────────────────────────────────

  it("currentStepDone - élément de l'étape non créé - retourne false", () => {
    const store = useGuidedTourStore()
    store.start()

    expect(store.currentStepDone).toBe(false)
  })

  it("currentStepDone - élément de l'étape créé - retourne true", () => {
    const store = useGuidedTourStore()
    store.start()

    store.recordLinks({ mindMapId: 3 })

    expect(store.currentStepDone).toBe(true)
  })

  // ── advance ──────────────────────────────────────────────────────────────────

  it("advance - étape intermédiaire - passe à l'étape suivante et retourne sa route", () => {
    const store = useGuidedTourStore()
    store.start()

    const route = store.advance()

    expect(store.stepIndex).toBe(1)
    expect(route).toBe('flashcards')
    expect(store.currentStep.key).toBe('leitner')
  })

  it('advance - dernière étape - termine le parcours et retourne null', () => {
    const store = useGuidedTourStore()
    store.start()
    store.stepIndex = GUIDED_TOUR_STEPS.length - 1

    const route = store.advance()

    expect(route).toBeNull()
    expect(store.active).toBe(false)
    expect(store.stepIndex).toBe(0)
  })

  it('advance - parcours inactif - ne fait rien et retourne null', () => {
    const store = useGuidedTourStore()

    const route = store.advance()

    expect(route).toBeNull()
    expect(store.stepIndex).toBe(0)
  })

  // ── quit ─────────────────────────────────────────────────────────────────────

  it('quit - parcours en cours - désactive et réinitialise la progression', () => {
    const store = useGuidedTourStore()
    store.start()
    store.advance()

    store.quit()

    expect(store.active).toBe(false)
    expect(store.stepIndex).toBe(0)
  })

  // ── reset (déconnexion) ──────────────────────────────────────────────────────

  it('reset - parcours en cours avec liens - remet tout à zéro (état + liens)', () => {
    const store = useGuidedTourStore()
    store.start()
    store.recordLinks({ subjectId: 1, mindMapId: 3 })
    store.advance()

    store.reset()

    expect(store.active).toBe(false)
    expect(store.stepIndex).toBe(0)
    expect(store.links.subjectId).toBeNull()
    expect(store.links.mindMapId).toBeNull()
    expect(store.links.leitnerSystemId).toBeNull()
  })

  // ── parcours complet ─────────────────────────────────────────────────────────

  it('parcours complet - enchaîne les 4 étapes dans le bon ordre puis se termine', () => {
    const store = useGuidedTourStore()
    store.start()

    expect(store.currentStep.route).toBe('mindmaps')
    store.recordLinks({ mindMapId: 1, subjectId: 1 })
    expect(store.advance()).toBe('flashcards')

    store.recordLinks({ leitnerSystemId: 2 })
    expect(store.advance()).toBe('exercises')

    store.recordLinks({ testId: 3 })
    expect(store.advance()).toBe('calendar')

    store.recordLinks({ revisionSessionId: 4 })
    expect(store.advance()).toBeNull()
    expect(store.active).toBe(false)
  })
})

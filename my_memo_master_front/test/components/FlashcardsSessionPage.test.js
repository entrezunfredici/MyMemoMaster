import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import FlashcardsSessionPage from '@/pages/FlashcardsSessionPage.vue'
import { useLeitnerCardStore } from '@/stores/leitnerCards'

// ── Mocks globaux ────────────────────────────────────────────────────────────

const { mockRouterPush } = vi.hoisted(() => ({ mockRouterPush: vi.fn() }))

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useRouter: () => ({ push: mockRouterPush }),
    useRoute:  () => ({ params: { systemId: '1' } }),
  }
})

// Stub ButtonComponent : rend un <button> qui appelle `callback` au clic
const ButtonStub = {
  props: ['callback', 'disabled'],
  template: '<button :disabled="disabled" @click="callback?.()"><slot /></button>',
}

// Données de test
const mockCard = {
  idCard: 1,
  idBox: 1,
  idQuestion: 1,
  leitnerBox: { level: 1, idSystem: 1 },
  question: { statement: 'Quelle est la capitale de la France ?' },
}
const mockCard2 = {
  idCard: 2,
  idBox: 1,
  idQuestion: 2,
  leitnerBox: { level: 1, idSystem: 1 },
  question: { statement: 'Quelle est la capitale de l\'Espagne ?' },
}

function mountSession(initialCards = [mockCard], extraCardState = {}) {
  return mount(FlashcardsSessionPage, {
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: true,
          initialState: {
            leitnerCards: { dueCards: initialCards, lastCorrection: null, ...extraCardState },
            leitnerSystems: { system: { idSystem: 1, name: 'Système Test' } },
            leitnerBoxes: {
              boxes: [
                { idBox: 1, idSystem: 1, level: 1 },
                { idBox: 2, idSystem: 1, level: 2 },
              ],
            },
          },
        }),
      ],
      components: { Button: ButtonStub },
    },
  })
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('FlashcardsSessionPage', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── État de chargement ────────────────────────────────────────────────────

  it('affiche "Chargement" pendant onMounted, puis le masque après résolution', async () => {
    const wrapper = mountSession()

    expect(wrapper.text()).toContain('Chargement des cartes')

    await flushPromises()

    expect(wrapper.text()).not.toContain('Chargement des cartes')
  })

  // ── Aucune carte ──────────────────────────────────────────────────────────

  it('affiche "Aucune carte à réviser" quand dueCards est vide', async () => {
    const wrapper = mountSession([])
    await flushPromises()

    expect(wrapper.text()).toContain('Aucune carte à réviser')
  })

  // ── Affichage de la carte courante ────────────────────────────────────────

  it('affiche la question de la première carte', async () => {
    const wrapper = mountSession()
    await flushPromises()

    expect(wrapper.text()).toContain('Quelle est la capitale de la France ?')
  })

  it('affiche le compteur de progression "1 / 1"', async () => {
    const wrapper = mountSession()
    await flushPromises()

    expect(wrapper.text()).toContain('1 / 1')
  })

  it('affiche le nom du système dans le titre', async () => {
    const wrapper = mountSession()
    await flushPromises()

    expect(wrapper.text()).toContain('Système Test')
  })

  // ── Bouton Valider ────────────────────────────────────────────────────────

  it('le bouton Valider est désactivé quand la réponse est vide', async () => {
    const wrapper = mountSession()
    await flushPromises()

    const validerBtn = wrapper.findAll('button').find(b => b.text() === 'Valider')
    expect(validerBtn?.attributes('disabled')).toBeDefined()
  })

  it('le bouton Valider est actif quand une réponse est saisie', async () => {
    const wrapper = mountSession()
    await flushPromises()

    await wrapper.find('textarea').setValue('Paris')
    const validerBtn = wrapper.findAll('button').find(b => b.text() === 'Valider')
    expect(validerBtn?.attributes('disabled')).toBeUndefined()
  })

  // ── Soumission bonne réponse ──────────────────────────────────────────────

  it('bonne réponse — affiche le feedback vert avec le score', async () => {
    const wrapper = mountSession()
    await flushPromises()

    const cardStore = useLeitnerCardStore()
    cardStore.submitResponse.mockImplementation(async () => {
      cardStore.lastCorrection = { success: true, score: 0.95, correction: 'Paris', explanation: 'Correct.', decision_zone: 'high' }
      return true
    })

    await wrapper.find('textarea').setValue('Paris')
    await wrapper.findAll('button').find(b => b.text() === 'Valider')?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Excellent')
    expect(wrapper.text()).toContain('95%')
  })

  // ── Soumission mauvaise réponse ───────────────────────────────────────────

  it('mauvaise réponse — affiche le feedback rouge avec la correction attendue', async () => {
    const wrapper = mountSession()
    await flushPromises()

    const cardStore = useLeitnerCardStore()
    cardStore.submitResponse.mockImplementation(async () => {
      cardStore.lastCorrection = { success: false, score: 0.1, correction: 'Paris', explanation: 'Incorrect.', decision_zone: 'low' }
      return true
    })

    await wrapper.find('textarea').setValue('Lyon')
    await wrapper.findAll('button').find(b => b.text() === 'Valider')?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('À revoir')
    expect(wrapper.text()).toContain('Paris')          // réponse attendue affichée
    expect(wrapper.text()).toContain('10%')
  })

  // ── Navigation entre cartes ───────────────────────────────────────────────

  it('clic Continuer — passe à la carte suivante', async () => {
    const wrapper = mountSession([mockCard, mockCard2])
    await flushPromises()

    const cardStore = useLeitnerCardStore()
    cardStore.submitResponse.mockImplementation(async () => {
      cardStore.lastCorrection = { success: true, score: 0.9, correction: 'Paris', explanation: '', decision_zone: 'high' }
      return true
    })

    await wrapper.find('textarea').setValue('Paris')
    await wrapper.findAll('button').find(b => b.text() === 'Valider')?.trigger('click')
    await flushPromises()

    await wrapper.findAll('button').find(b => b.text() === 'Continuer')?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Quelle est la capitale de l\'Espagne ?')
    expect(wrapper.text()).toContain('2 / 2')
  })

  // ── Fin de session ────────────────────────────────────────────────────────

  it('affiche "Session terminée" après la dernière carte', async () => {
    const wrapper = mountSession([mockCard])
    await flushPromises()

    const cardStore = useLeitnerCardStore()
    cardStore.submitResponse.mockImplementation(async () => {
      cardStore.lastCorrection = { success: true, score: 0.9, correction: 'Paris', explanation: '', decision_zone: 'high' }
      return true
    })

    await wrapper.find('textarea').setValue('Paris')
    await wrapper.findAll('button').find(b => b.text() === 'Valider')?.trigger('click')
    await flushPromises()

    await wrapper.findAll('button').find(b => b.text() === 'Continuer')?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Session terminée')
    expect(wrapper.text()).toContain('1 cartes')
  })

  // ── Quitter la session ────────────────────────────────────────────────────

  it('bouton Retour + confirmation — redirige vers /flashcards', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = mountSession()
    await flushPromises()

    await wrapper.findAll('button').find(b => b.text().includes('Retour'))?.trigger('click')
    await flushPromises()

    expect(mockRouterPush).toHaveBeenCalledWith('/flashcards')
  })

  it('bouton Retour + annulation — reste sur la page', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const wrapper = mountSession()
    await flushPromises()

    await wrapper.findAll('button').find(b => b.text().includes('Retour'))?.trigger('click')

    expect(mockRouterPush).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Quelle est la capitale de la France ?')
  })
})

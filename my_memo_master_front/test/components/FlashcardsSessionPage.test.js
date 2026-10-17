import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import FlashcardsSessionPage from '@/pages/FlashcardsSessionPage.vue'
import { useLeitnerCardStore } from '@/stores/leitnerCards'
import { useLeitnerReviewSessionStore } from '@/stores/leitnerReviewSessions'

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

    expect(wrapper.text()).toContain('Correct')
    expect(wrapper.text()).not.toContain('Excellent')
    expect(wrapper.text()).toContain('réussite à partir de 80%')
    expect(wrapper.text()).toContain('95%')
  })

  it("correction dégradée — affiche l'avertissement de risque d'erreur", async () => {
    const wrapper = mountSession()
    await flushPromises()

    const cardStore = useLeitnerCardStore()
    cardStore.submitResponse.mockImplementation(async () => {
      cardStore.lastCorrection = {
        success: false, score: 0.67, correction: 'Paris', explanation: 'Incorrect.', decision_zone: 'low',
        degraded: true, degraded_message: "Correction automatique limitée : risque d'erreur plus élevé."
      }
      return true
    })

    await wrapper.find('textarea').setValue('Paris')
    await wrapper.findAll('button').find(b => b.text() === 'Valider')?.trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="degraded-notice"]').text()).toContain("risque d'erreur plus élevé")
  })

  it("correction normale — n'affiche aucun avertissement de correction dégradée", async () => {
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

    expect(wrapper.find('[data-testid="degraded-notice"]').exists()).toBe(false)
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

  it('score de 100 % — affiche "Excellent"', async () => {
    const wrapper = mountSession()
    await flushPromises()

    const cardStore = useLeitnerCardStore()
    cardStore.submitResponse.mockImplementation(async () => {
      cardStore.lastCorrection = { success: true, score: 1, correction: 'Paris', explanation: '', decision_zone: 'llm' }
      return true
    })

    await wrapper.find('textarea').setValue('Paris')
    await wrapper.findAll('button').find(b => b.text() === 'Valider')?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Excellent')
  })

  it('fin de session — affiche le score moyen et conserve les dernières erreurs', async () => {
    const wrapper = mountSession([mockCard])
    await flushPromises()

    const cardStore = useLeitnerCardStore()
    cardStore.submitResponse.mockImplementation(async () => {
      cardStore.lastCorrection = { success: false, score: 0.4, correction: 'Paris', explanation: '', decision_zone: 'llm' }
      return true
    })

    await wrapper.find('textarea').setValue('Lyon')
    await wrapper.findAll('button').find(b => b.text() === 'Valider')?.trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find(b => b.text() === 'Continuer')?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Session terminée')
    expect(wrapper.find('[data-testid="average-score"]').text()).toContain('40%')
    expect(wrapper.text()).toContain('Dernières erreurs')
  })

  // ── QCM : ordre des options et score moyen ──────────────────────────────────
  describe('QCM', () => {
    const mcqCard = (id, correctIndex = 0) => ({
      idCard: id,
      idBox: 1,
      idQuestion: id,
      leitnerBox: { level: 1, idSystem: 1 },
      question: {
        statement: `Question QCM ${id} ?`,
        type: 'mcq',
        content: {
          options: ['Alpha', 'Beta', 'Gamma', 'Delta'].map((text, i) => ({ text, correct: i === correctIndex })),
        },
      },
    })
    const optionTexts = (wrapper) => wrapper.findAll('[role="radiogroup"] label').map((l) => l.text())
    const optionValues = (wrapper) => wrapper.findAll('[role="radiogroup"] input').map((i) => i.element.value)
    const click = async (wrapper, label) => {
      await wrapper.findAll('button').find((b) => b.text() === label)?.trigger('click')
      await flushPromises()
    }

    afterEach(() => vi.restoreAllMocks())

    it('les options sont affichées dans un ordre mélangé, sans en perdre ni en dupliquer', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0) // tirage fixe : [1, 2, 3, 0]
      const wrapper = mountSession([mcqCard(10)])
      await flushPromises()
      expect(optionTexts(wrapper)).toEqual(['Beta', 'Gamma', 'Delta', 'Alpha'])
      expect([...optionTexts(wrapper)].sort()).toEqual(['Alpha', 'Beta', 'Delta', 'Gamma'])
    })

    it('la bonne réponse n’est plus systématiquement en première position', async () => {
      const firstPositions = new Set()
      for (let k = 0; k < 40; k++) {
        const wrapper = mountSession([mcqCard(100 + k)])
        await flushPromises()
        firstPositions.add(optionTexts(wrapper)[0])
        wrapper.unmount()
      }
      expect(firstPositions.size).toBeGreaterThan(1)
    })

    it('la valeur envoyée à la correction est l’indice D’ORIGINE de l’option choisie', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const wrapper = mountSession([mcqCard(11, 0)]) // « Alpha » (indice 0) est la bonne réponse
      await flushPromises()
      const cardStore = useLeitnerCardStore()
      cardStore.submitResponse.mockImplementation(async () => {
        cardStore.lastCorrection = { success: true, score: 1, correction: 'Alpha', explanation: '', decision_zone: 'high' }
        return true
      })
      const alphaRadio = wrapper.findAll('[role="radiogroup"] label').find((l) => l.text() === 'Alpha').find('input')
      expect(alphaRadio.element.value).toBe('0') // 4e à l'écran, mais indice 0
      await alphaRadio.setValue(true)
      await click(wrapper, 'Valider')
      expect(cardStore.submitResponse).toHaveBeenCalledWith(11, '0')
    })

    it('les valeurs des options restent les indices d’origine, quel que soit l’affichage', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const wrapper = mountSession([mcqCard(12)])
      await flushPromises()
      expect(optionValues(wrapper)).toEqual(['1', '2', '3', '0'])
    })

    it('l’ordre reste le même après la correction (pas de remélange au rendu suivant)', async () => {
      const wrapper = mountSession([mcqCard(13)])
      await flushPromises()
      const before = optionTexts(wrapper)
      const cardStore = useLeitnerCardStore()
      cardStore.submitResponse.mockImplementation(async () => {
        cardStore.lastCorrection = { success: false, score: 0, correction: 'Alpha', explanation: '', decision_zone: 'high' }
        return true
      })
      await wrapper.findAll('[role="radiogroup"] input')[0].setValue(true)
      await click(wrapper, 'Valider')
      expect(optionTexts(wrapper)).toEqual(before)
    })

    it('chaque carte a son propre ordre', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const wrapper = mountSession([mcqCard(14), mcqCard(15)])
      await flushPromises()
      const cardStore = useLeitnerCardStore()
      cardStore.submitResponse.mockImplementation(async () => {
        cardStore.lastCorrection = { success: true, score: 1, correction: 'Alpha', explanation: '', decision_zone: 'high' }
        return true
      })
      await wrapper.findAll('[role="radiogroup"] input')[0].setValue(true)
      await click(wrapper, 'Valider')
      await click(wrapper, 'Continuer')
      expect(wrapper.text()).toContain('Question QCM 15 ?')
      expect(optionTexts(wrapper)).toHaveLength(4)
    })

    it('fin de session : un QCM raté compte pour 0 dans le score moyen (2 justes + 1 raté = 67 %)', async () => {
      const wrapper = mountSession([mockCard, mockCard2, mcqCard(16)])
      await flushPromises()
      const cardStore = useLeitnerCardStore()
      const answers = [
        { success: true, score: 1 },
        { success: true, score: 1 },
        { success: false, score: 0 },
      ]
      let turn = 0
      cardStore.submitResponse.mockImplementation(async () => {
        cardStore.lastCorrection = { ...answers[turn++], correction: 'x', explanation: '', decision_zone: 'high' }
        return true
      })
      for (let i = 0; i < 3; i++) {
        if (i < 2) await wrapper.find('textarea').setValue('réponse')
        else await wrapper.findAll('[role="radiogroup"] input')[0].setValue(true)
        await click(wrapper, 'Valider')
        await click(wrapper, 'Continuer')
      }
      const summary = wrapper.find('[data-testid="average-score"]').text()
      expect(summary).toContain('67%')
      expect(summary).toContain('2 réussie(s), 1 à revoir')
    })

    it('un QCM réussi compte pour 100 %', async () => {
      const wrapper = mountSession([mcqCard(17)])
      await flushPromises()
      const cardStore = useLeitnerCardStore()
      cardStore.submitResponse.mockImplementation(async () => {
        cardStore.lastCorrection = { success: true, correction: 'Alpha', explanation: '', decision_zone: 'high' }
        return true
      })
      await wrapper.findAll('[role="radiogroup"] input')[0].setValue(true)
      await click(wrapper, 'Valider')
      await click(wrapper, 'Continuer')
      expect(wrapper.find('[data-testid="average-score"]').text()).toContain('100%')
    })
  })

  it('fin de session — journalise la session (système, nb de cartes, durée >= 0)', async () => {
    const wrapper = mountSession([mockCard])
    await flushPromises()

    const cardStore = useLeitnerCardStore()
    cardStore.submitResponse.mockImplementation(async () => {
      cardStore.lastCorrection = { success: true, score: 0.9, correction: 'Paris', explanation: '', decision_zone: 'high' }
      return true
    })
    const reviewSessionStore = useLeitnerReviewSessionStore()

    await wrapper.find('textarea').setValue('Paris')
    await wrapper.findAll('button').find(b => b.text() === 'Valider')?.trigger('click')
    await flushPromises()

    expect(reviewSessionStore.logSession).not.toHaveBeenCalled() // pas avant la fin réelle

    await wrapper.findAll('button').find(b => b.text() === 'Continuer')?.trigger('click')
    await flushPromises()

    expect(reviewSessionStore.logSession).toHaveBeenCalledWith(1, 1, expect.any(Number), true)
    expect(reviewSessionStore.logSession.mock.calls[0][2]).toBeGreaterThanOrEqual(0)
  })

  // ── Quitter la session ────────────────────────────────────────────────────

  it('« Retour » ouvre la modale commune (jamais window.confirm) ; rien ne part avant la réponse', async () => {
    const nativeConfirm = vi.spyOn(window, 'confirm')
    const wrapper = mountSession()
    await flushPromises()

    await wrapper.findAll('button').find(b => b.text().includes('Retour'))?.trigger('click')

    expect(nativeConfirm).not.toHaveBeenCalled()
    const dialog = wrapper.find('[role="dialog"]')
    expect(dialog.attributes('aria-label')).toBe('Quitter la session')
    expect(dialog.text()).toContain('la session en cours sera perdue')
    expect(mockRouterPush).not.toHaveBeenCalled()
  })

  it('bouton Retour + confirmation — redirige vers /flashcards', async () => {
        const wrapper = mountSession()
    await flushPromises()

    await wrapper.findAll('button').find(b => b.text().includes('Retour'))?.trigger('click')
    await wrapper.find('.btn-modal-danger').trigger('click')
    await flushPromises()

    expect(mockRouterPush).toHaveBeenCalledWith('/flashcards')
  })

  it('bouton Retour + annulation — reste sur la page', async () => {
        const wrapper = mountSession()
    await flushPromises()

    await wrapper.findAll('button').find(b => b.text().includes('Retour'))?.trigger('click')
    await wrapper.find('.btn-modal-cancel').trigger('click')

    expect(mockRouterPush).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Quelle est la capitale de la France ?')
  })

  // Régression : jusqu'ici, quitter une session en cours (bouton "← Retour") ne
  // journalisait jamais rien, même si des cartes avaient déjà été corrigées —
  // seule une session menée à son terme comptait. Revenu sur demande explicite
  // de l'utilisateur : le temps déjà passé doit être journalisé.
  it('quitte après avoir corrigé au moins une carte — journalise une session partielle (nb de cartes réellement corrigées, pas le total dû)', async () => {
        const wrapper = mountSession([mockCard, mockCard2])
    await flushPromises()

    const cardStore = useLeitnerCardStore()
    cardStore.submitResponse.mockImplementation(async () => {
      cardStore.lastCorrection = { success: true, score: 0.9, correction: 'Paris', explanation: '', decision_zone: 'high' }
      return true
    })
    const reviewSessionStore = useLeitnerReviewSessionStore()

    // Corrige uniquement la 1ʳᵉ carte (sur 2 dues), puis quitte sans aller plus loin
    await wrapper.find('textarea').setValue('Paris')
    await wrapper.findAll('button').find(b => b.text() === 'Valider')?.trigger('click')
    await flushPromises()

    await wrapper.findAll('button').find(b => b.text().includes('Retour'))?.trigger('click')
    await wrapper.find('.btn-modal-danger').trigger('click')
    await flushPromises()

    expect(reviewSessionStore.logSession).toHaveBeenCalledWith(1, 1, expect.any(Number), false)
    expect(mockRouterPush).toHaveBeenCalledWith('/flashcards')
  })

  it('quitte sans avoir corrigé aucune carte — ne journalise rien (rien à mesurer)', async () => {
        const wrapper = mountSession([mockCard, mockCard2])
    await flushPromises()

    const reviewSessionStore = useLeitnerReviewSessionStore()

    await wrapper.findAll('button').find(b => b.text().includes('Retour'))?.trigger('click')
    await wrapper.find('.btn-modal-danger').trigger('click')
    await flushPromises()

    expect(reviewSessionStore.logSession).not.toHaveBeenCalled()
    expect(mockRouterPush).toHaveBeenCalledWith('/flashcards')
  })

  it('quitte + annule la confirmation — ne journalise rien (session pas réellement quittée)', async () => {
        const wrapper = mountSession([mockCard, mockCard2])
    await flushPromises()

    const cardStore = useLeitnerCardStore()
    cardStore.submitResponse.mockImplementation(async () => {
      cardStore.lastCorrection = { success: true, score: 0.9, correction: 'Paris', explanation: '', decision_zone: 'high' }
      return true
    })
    const reviewSessionStore = useLeitnerReviewSessionStore()

    await wrapper.find('textarea').setValue('Paris')
    await wrapper.findAll('button').find(b => b.text() === 'Valider')?.trigger('click')
    await flushPromises()

    await wrapper.findAll('button').find(b => b.text().includes('Retour'))?.trigger('click')
    await wrapper.find('.btn-modal-cancel').trigger('click')
    await flushPromises()

    expect(reviewSessionStore.logSession).not.toHaveBeenCalled()
    expect(mockRouterPush).not.toHaveBeenCalled()
  })
})

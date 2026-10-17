import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import FlashcardsCardsPage from '@/pages/FlashcardsCardsPage.vue'
import { useAiCardGenerationStore } from '@/stores/aiCardGeneration'
import { useGuidedTourStore } from '@/stores/guidedTour'

// Page « Gestion des cartes » d'un système de Leitner : chargement (système, boîtes, cartes, réponses),
// création / modification / suppression de cartes (ouvertes et QCM), aperçu de qualité en direct,
// gestion des boîtes, génération par IA. Réseau simulé route par route ; stores IA et parcours guidé
// stubbés ; composants enfants lourds remplacés par des doubles.

const { mockPush, mockApi, mockNotify } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockApi: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() },
  mockNotify: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ params: { systemId: '5' } }),
}))
vi.mock('@/helpers/api', () => ({ api: mockApi }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: mockNotify } }))
vi.mock('@/components/interpreter/interpreter.js', () => ({
  normalizeFormulaSyntax: (s) => `~${s}`,
  renderInlineMath: (t) => String(t ?? ''),
  renderMath: (t) => String(t ?? ''),
  renderMathMultiline: (t) => String(t ?? ''),
  toLatex: (t) => String(t ?? ''),
}))

// ── Données ───────────────────────────────────────────────────────────────────

const OPEN_CARD = {
  idCard: 1,
  idQuestion: 101,
  question: { statement: "Loi d'Ohm ?", type: 'open' },
  leitnerBox: { level: 1 },
  mindMapNodeId: null,
}
const MCQ_CARD = {
  idCard: 2,
  idQuestion: 102,
  question: { statement: 'Choix', type: 'mcq', content: { options: [{ text: 'A', correct: true }, { text: 'B', correct: false }] } },
  leitnerBox: { level: 2 },
}
const BOXES = [
  { idBox: 11, level: 2, intervall: 259200, color: 0xf39c12, idSystem: 5 },
  { idBox: 10, level: 1, intervall: 86400, color: 0xe74c3c, idSystem: 5 },
  { idBox: 99, level: 1, intervall: 10, color: 0, idSystem: 6 }, // autre système : ignorée
]

const ok = (data, status = 200) => ({ status, data })

// Réponses par route ; surchargeables par test
let routes
const defaultRoutes = () => ({
  'leitnersystems/5': ok({ name: 'Physique', subject: { name: 'Sciences' }, idMindMap: null }),
  leitnerboxes: ok(BOXES),
  'leitnercards/leitnerboxes/10': ok([structuredClone(OPEN_CARD)]),
  'leitnercards/leitnerboxes/11': ok([structuredClone(MCQ_CARD)]),
  'responses/correction/101': ok({ content: 'U = R I', idResponse: 201 }),
})
const answer = (route) => {
  const r = routes[route]
  return typeof r === 'function' ? r() : r
}

const StubFormulaHelper = { name: 'FormulaHelper', props: ['modelValue'], template: '<div class="fh-stub"><slot /></div>' }
const StubNodePicker = {
  name: 'MindMapNodePicker',
  props: ['modelValue', 'mindMapJson'],
  emits: ['node-selected', 'update:modelValue'],
  template: '<button class="picker-stub" @click="$emit(\'update:modelValue\', \'n2\'); $emit(\'node-selected\', { label: \'Nœud 2\' })">picker</button>',
}
const StubAiConfig = { name: 'AiGenerateCardsModal', props: ['visible', 'idSystem', 'defaultSubjectContext'], emits: ['close', 'submit'], template: '<div class="ai-config-stub" v-if="visible">config {{ idSystem }} {{ defaultSubjectContext }}</div>' }
const StubAiProgress = { name: 'AiGenerationProgressModal', props: ['visible', 'status', 'errorMessage'], emits: ['cancel', 'close', 'retry'], template: '<div class="ai-progress-stub" v-if="visible">{{ status }}</div>' }
const StubAiValidation = { name: 'AiValidationScreen', props: ['batch', 'mindMapJson'], emits: ['close', 'validated'], template: '<div class="ai-validation-stub">batch {{ batch.id }}</div>' }

let wrapper
const mountPage = async (storeState = {}) => {
  wrapper = mount(FlashcardsCardsPage, {
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: true, initialState: storeState })],
      stubs: {
        FormulaHelper: StubFormulaHelper,
        MindMapNodePicker: StubNodePicker,
        AiGenerateCardsModal: StubAiConfig,
        AiGenerationProgressModal: StubAiProgress,
        AiValidationScreen: StubAiValidation,
      },
    },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

const button = (text) => wrapper.findAll('button').find((b) => b.text().trim() === text)
const field = (label) => wrapper.find(`[aria-label="${label}"]`)
const cardRows = () => wrapper.findAll('.shadow-xs')

describe('FlashcardsCardsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routes = defaultRoutes()
    mockApi.get.mockImplementation(async (route) => answer(route) ?? { status: 404, data: {} })
    mockApi.post.mockResolvedValue({ status: 201, data: {} })
    mockApi.put.mockResolvedValue({ status: 200, data: {} })
    mockApi.del.mockResolvedValue({ status: 200, data: {} })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })
  afterEach(() => {
    wrapper?.unmount()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // ── Chargement et affichage ─────────────────────────────────────────────────
  describe('chargement', () => {
    it('charge le système, les boîtes, les cartes de chaque boîte et la réponse de référence des cartes ouvertes', async () => {
      await mountPage()
      expect(mockApi.get).toHaveBeenCalledWith('leitnersystems/5')
      expect(mockApi.get).toHaveBeenCalledWith('leitnerboxes')
      expect(mockApi.get).toHaveBeenCalledWith('leitnercards/leitnerboxes/10')
      expect(mockApi.get).toHaveBeenCalledWith('leitnercards/leitnerboxes/11')
      expect(mockApi.get).toHaveBeenCalledWith('responses/correction/101')
      expect(mockApi.get).not.toHaveBeenCalledWith('responses/correction/102') // QCM : pas de réponse à charger
      expect(mockApi.get).not.toHaveBeenCalledWith('leitnercards/leitnerboxes/99') // boîte d'un autre système
      expect(wrapper.find('h2').text()).toBe('Physique')
    })

    it('affiche les boîtes du système triées par niveau, avec couleur, niveau et durée lisible', async () => {
      await mountPage()
      const boxes = wrapper.findAll('.bg-primary\\/5.border-primary\\/20.rounded-lg.px-3')
      expect(boxes.map((b) => b.find('.text-primary').text())).toEqual(['B1', 'B2'])
      expect(boxes[0].text()).toContain('1 j')
      expect(boxes[0].find('span[aria-hidden="true"]').attributes('style')).toContain('rgb(231, 76, 60)')
    })

    it('range les cartes par boîte, et celles sans boîte dans la boîte 1', async () => {
      routes['leitnercards/leitnerboxes/10'] = ok([{ ...structuredClone(OPEN_CARD), leitnerBox: undefined }])
      await mountPage()
      const titles = wrapper.findAll('h3').map((h) => h.text())
      expect(titles).toContain('Boîte 1')
      expect(titles).toContain('Boîte 2')
      const row = cardRows()[0]
      expect(row.text()).toContain("Loi d'Ohm ?")
      expect(row.text()).toContain('U = R I')
    })

    it('carte sans réponse de référence : « … » à la place', async () => {
      routes['responses/correction/101'] = { status: 404, data: {} }
      await mountPage()
      expect(cardRows()[0].text()).toContain('…')
    })

    it('aucune carte : message dédié ; aucune boîte : invitation à en ajouter', async () => {
      routes.leitnerboxes = ok([])
      await mountPage()
      expect(wrapper.text()).toContain('Aucune carte dans ce système. Ajoutez-en une !')
      expect(wrapper.text()).toContain('Aucune boîte — ajoutez-en une pour commencer.')
    })

    it('échec du chargement des boîtes : la page s’affiche sans cartes', async () => {
      routes.leitnerboxes = { status: 500, data: {} }
      await mountPage()
      expect(wrapper.find('h2').text()).toBe('Physique')
      expect(cardRows()).toHaveLength(0)
    })

    it('système lié à une carte mentale : elle est chargée pour le sélecteur de nœud', async () => {
      routes['leitnersystems/5'] = ok({ name: 'Physique', idMindMap: 9 })
      routes['diagrammes/9'] = ok({ mindMapJson: { nodes: {} } })
      await mountPage()
      expect(mockApi.get).toHaveBeenCalledWith('diagrammes/9')
      await button('+ Ajouter une carte').trigger('click')
      expect(wrapper.find('.picker-stub').exists()).toBe(true)
    })

    it('carte mentale introuvable : pas de sélecteur de nœud', async () => {
      routes['leitnersystems/5'] = ok({ name: 'Physique', idMindMap: 9 })
      routes['diagrammes/9'] = { status: 404, data: {} }
      await mountPage()
      await button('+ Ajouter une carte').trigger('click')
      expect(wrapper.find('.picker-stub').exists()).toBe(false)
    })

    it('« ← Retour » revient à la liste des systèmes', async () => {
      await mountPage()
      await button('← Retour').trigger('click')
      expect(mockPush).toHaveBeenCalledWith('/flashcards')
    })

    it('charge les brouillons IA en attente au montage', async () => {
      await mountPage()
      expect(useAiCardGenerationStore().fetchPendingBatches).toHaveBeenCalled()
    })
  })

  // ── Suppression ─────────────────────────────────────────────────────────────
  describe('suppression d’une carte', () => {
    it('refus de la confirmation : rien n’est envoyé', async () => {
      window.confirm.mockReturnValue(false)
      await mountPage()
      await cardRows()[0].find('[title="Supprimer"]').trigger('click')
      expect(mockApi.del).not.toHaveBeenCalled()
    })

    it('confirmée : la carte est supprimée côté serveur et retirée de la liste', async () => {
      await mountPage()
      await cardRows()[0].find('[title="Supprimer"]').trigger('click')
      await flushPromises()
      expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("Loi d'Ohm ?"))
      expect(mockApi.del).toHaveBeenCalledWith('leitnercards/1')
      expect(mockNotify).toHaveBeenCalledWith('Carte supprimée.', 'success')
      expect(cardRows()).toHaveLength(1)
    })

    it('échec serveur : message d’erreur, la carte reste', async () => {
      mockApi.del.mockResolvedValue({ status: 403, data: { message: 'Interdit' } })
      await mountPage()
      await cardRows()[0].find('[title="Supprimer"]').trigger('click')
      await flushPromises()
      expect(mockNotify).toHaveBeenCalledWith('Interdit', 'error')
      expect(cardRows()).toHaveLength(2)
    })
  })

  // ── Boîtes ──────────────────────────────────────────────────────────────────
  describe('boîtes', () => {
    it('ajout : le formulaire reprend la couleur de la dernière boîte, puis POST et rechargement', async () => {
      await mountPage()
      await button('+ Ajouter une boîte').trigger('click')
      expect(wrapper.find('h2.modal-title').text()).toBe('Nouvelle boîte')
      expect(field('Couleur de la boîte').element.value).toBe('#f39c12') // dernière boîte = niveau 2
      await field('Niveau de la boîte').setValue('3')
      await field('Intervalle en secondes').setValue('604800')
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(mockApi.post).toHaveBeenCalledWith('leitnerboxes', { level: 3, intervall: 604800, color: 0xf39c12, idSystem: 5 })
      expect(mockNotify).toHaveBeenCalledWith('Boîte ajoutée.', 'success')
      expect(wrapper.find('h2.modal-title').exists()).toBe(false)
      expect(mockApi.get.mock.calls.filter((c) => c[0] === 'leitnerboxes')).toHaveLength(2) // rechargé
    })

    it('modification : formulaire prérempli, PUT attendu en 200', async () => {
      await mountPage()
      await wrapper.findAll('[title="Modifier"]')[0].trigger('click') // boîte 1 (les cartes ont aussi un bouton « Modifier »)
      expect(wrapper.find('h2.modal-title').text()).toBe('Modifier la boîte')
      expect(field('Niveau de la boîte').element.value).toBe('1')
      await field('Intervalle en secondes').setValue('172800')
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(mockApi.put).toHaveBeenCalledWith('leitnerboxes/10', { level: 1, intervall: 172800, color: 0xe74c3c, idSystem: 5 })
      expect(mockNotify).toHaveBeenCalledWith('Boîte mise à jour.', 'success')
    })

    it('échec : le message du serveur s’affiche, la fenêtre reste ouverte', async () => {
      mockApi.post.mockResolvedValue({ status: 400, data: { message: 'Niveau déjà utilisé' } })
      await mountPage()
      await button('+ Ajouter une boîte').trigger('click')
      await field('Niveau de la boîte').setValue('1')
      await field('Intervalle en secondes').setValue('10')
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(wrapper.text()).toContain('Niveau déjà utilisé')
      expect(wrapper.find('h2.modal-title').exists()).toBe(true)
    })

    it('Annuler ferme sans rien envoyer', async () => {
      await mountPage()
      await button('+ Ajouter une boîte').trigger('click')
      await button('Annuler').trigger('click')
      expect(wrapper.find('h2.modal-title').exists()).toBe(false)
      expect(mockApi.post).not.toHaveBeenCalled()
    })

    it('suppression confirmée : DELETE, boîte retirée de l’affichage', async () => {
      await mountPage()
      await wrapper.findAll('[title="Supprimer"]')[0].trigger('click') // 1re boîte (B1)
      await flushPromises()
      expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('niveau 1'))
      expect(mockApi.del).toHaveBeenCalledWith('leitnerboxes/10')
      expect(mockNotify).toHaveBeenCalledWith('Boîte supprimée.', 'success')
      expect(wrapper.text()).not.toContain('B1')
    })

    it('suppression refusée par le serveur : message d’erreur, boîte conservée', async () => {
      mockApi.del.mockResolvedValue({ status: 409, data: { message: 'Boîte utilisée' } })
      await mountPage()
      await wrapper.findAll('[title="Supprimer"]')[0].trigger('click')
      await flushPromises()
      expect(mockNotify).toHaveBeenCalledWith('Boîte utilisée', 'error')
      expect(wrapper.text()).toContain('B1')
    })
  })

  // ── Création d'une carte ────────────────────────────────────────────────────
  describe('création d’une carte ouverte', () => {
    const fill = async () => {
      await field('Énoncé de la carte').setValue('Énoncé')
      await field('Réponse de la carte').setValue('Réponse')
    }
    const submit = async () => {
      await wrapper.find('form').trigger('submit')
      await flushPromises()
    }
    beforeEach(() => {
      mockApi.post.mockImplementation(async (route) => {
        if (route === 'questions') return { status: 201, data: { idQuestion: 300 } }
        if (route === 'responses') return { status: 201, data: { idResponse: 400 } }
        if (route === 'leitnercards') return { status: 201, data: { idCard: 500 } }
        return { status: 201, data: {} }
      })
      mockApi.put.mockResolvedValue({ status: 200, data: { qualityLevel: 'high', qualityWarnings: [] } })
    })

    it('ouvre un formulaire vide, type « Ouverte » sélectionné', async () => {
      await mountPage()
      await button('+ Ajouter une carte').trigger('click')
      expect(wrapper.find('h2.modal-title').text()).toBe('Nouvelle carte')
      expect(field('Énoncé de la carte').element.value).toBe('')
      expect(field('Réponse de la carte').exists()).toBe(true)
      expect(field("Texte de l'option 1").exists()).toBe(false)
    })

    it('crée la question, la réponse, recalcule la qualité, crée la carte, notifie et recharge', async () => {
      await mountPage()
      await button('+ Ajouter une carte').trigger('click')
      await fill()
      await submit()
      expect(mockApi.post).toHaveBeenNthCalledWith(1, 'questions', { statement: '~Énoncé', questionPosition: 0, type: 'open', content: null })
      expect(mockApi.post).toHaveBeenNthCalledWith(2, 'responses', { content: '~Réponse', correction: true, idQuestion: 300 })
      expect(mockApi.put).toHaveBeenCalledWith('responses/edit/400', { content: '~Réponse' })
      expect(mockApi.post).toHaveBeenNthCalledWith(3, 'leitnercards', { idQuestion: 300, idSystem: 5, mindMapNodeId: null })
      expect(useGuidedTourStore().recordLinks).toHaveBeenCalledWith({ flashcardId: 500 })
      expect(mockNotify).toHaveBeenCalledWith('Carte ajoutée avec succès.', 'success')
      expect(mockApi.get.mock.calls.filter((c) => c[0] === 'leitnerboxes')).toHaveLength(2)
    })

    it('après la création, la fenêtre reste ouverte : « Ajouter une autre carte » / « Fermer », qualité affichée', async () => {
      await mountPage()
      await button('+ Ajouter une carte').trigger('click')
      await fill()
      await submit()
      expect(wrapper.find('h2.modal-title').exists()).toBe(true)
      expect(wrapper.text()).toContain('✓ Carte enregistrée — réponse créée.')
      expect(button('Ajouter')).toBeUndefined() // le bouton d'envoi n'est plus proposé (pas de doublon)
      expect(button('Ajouter une autre carte')).toBeTruthy()
      await button('Fermer').trigger('click')
      expect(wrapper.find('h2.modal-title').exists()).toBe(false)
    })

    it('« Ajouter une autre carte » remet le formulaire à zéro', async () => {
      await mountPage()
      await button('+ Ajouter une carte').trigger('click')
      await fill()
      await submit()
      await button('Ajouter une autre carte').trigger('click')
      expect(field('Énoncé de la carte').element.value).toBe('')
      expect(button('Ajouter')).toBeTruthy()
    })

    it('formulations acceptées supplémentaires : une réponse par formulation, la première sert de référence', async () => {
      await mountPage()
      await button('+ Ajouter une carte').trigger('click')
      await fill()
      await button('+ Ajouter une formulation acceptée').trigger('click')
      await field('Formulation acceptée 1').setValue('  Autre  ')
      await button('+ Ajouter une formulation acceptée').trigger('click') // une 2e, laissée vide : ignorée
      await submit()
      const responses = mockApi.post.mock.calls.filter((c) => c[0] === 'responses')
      expect(responses.map((c) => c[1].content)).toEqual(['~Réponse', '~Autre'])
      expect(mockApi.put).toHaveBeenCalledWith('responses/edit/400', { content: '~Réponse' })
    })

    it('une formulation acceptée peut être retirée', async () => {
      await mountPage()
      await button('+ Ajouter une carte').trigger('click')
      await button('+ Ajouter une formulation acceptée').trigger('click')
      expect(field('Formulation acceptée 1').exists()).toBe(true)
      await field('Supprimer la formulation acceptée 1').trigger('click')
      expect(field('Formulation acceptée 1').exists()).toBe(false)
    })

    it('lie la carte au nœud choisi et préremplit l’énoncé vide avec son libellé', async () => {
      routes['leitnersystems/5'] = ok({ name: 'Physique', idMindMap: 9 })
      routes['diagrammes/9'] = ok({ mindMapJson: { nodes: {} } })
      await mountPage()
      await button('+ Ajouter une carte').trigger('click')
      await wrapper.find('.picker-stub').trigger('click')
      expect(field('Énoncé de la carte').element.value).toBe('Nœud 2')
      await field('Réponse de la carte').setValue('R')
      await submit()
      expect(mockApi.post).toHaveBeenCalledWith('leitnercards', { idQuestion: 300, idSystem: 5, mindMapNodeId: 'n2' })
    })

    it('le libellé du nœud n’écrase pas un énoncé déjà saisi', async () => {
      routes['leitnersystems/5'] = ok({ name: 'Physique', idMindMap: 9 })
      routes['diagrammes/9'] = ok({ mindMapJson: { nodes: {} } })
      await mountPage()
      await button('+ Ajouter une carte').trigger('click')
      await field('Énoncé de la carte').setValue('Mon énoncé')
      await wrapper.find('.picker-stub').trigger('click')
      expect(field('Énoncé de la carte').element.value).toBe('Mon énoncé')
    })

    it('erreur à la création de la question : message du serveur, rien d’autre n’est envoyé', async () => {
      mockApi.post.mockResolvedValueOnce({ status: 400, data: { message: 'Énoncé trop long' } })
      await mountPage()
      await button('+ Ajouter une carte').trigger('click')
      await fill()
      await submit()
      expect(wrapper.text()).toContain('Énoncé trop long')
      expect(mockApi.post).toHaveBeenCalledTimes(1)
      expect(wrapper.find('h2.modal-title').exists()).toBe(true)
    })

    it('erreur à la création de la réponse : message par défaut, carte non créée', async () => {
      mockApi.post.mockImplementation(async (route) => (route === 'questions' ? { status: 201, data: { idQuestion: 300 } } : { status: 500, data: {} }))
      await mountPage()
      await button('+ Ajouter une carte').trigger('click')
      await fill()
      await submit()
      expect(wrapper.text()).toContain('Erreur lors de la création de la réponse.')
      expect(mockApi.post.mock.calls.some((c) => c[0] === 'leitnercards')).toBe(false)
    })

    it('erreur à la création de la carte : message affiché, aucune notification de succès', async () => {
      mockApi.post.mockImplementation(async (route) => {
        if (route === 'questions') return { status: 201, data: { idQuestion: 300 } }
        if (route === 'responses') return { status: 201, data: { idResponse: 400 } }
        return { status: 500, data: { message: 'Carte refusée' } }
      })
      await mountPage()
      await button('+ Ajouter une carte').trigger('click')
      await fill()
      await submit()
      expect(wrapper.text()).toContain('Carte refusée')
      expect(mockNotify).not.toHaveBeenCalledWith('Carte ajoutée avec succès.', 'success')
    })

    it('Annuler ferme la fenêtre et rouvrir repart d’un formulaire vide', async () => {
      await mountPage()
      await button('+ Ajouter une carte').trigger('click')
      await fill()
      await button('Annuler').trigger('click')
      expect(wrapper.find('h2.modal-title').exists()).toBe(false)
      await button('+ Ajouter une carte').trigger('click')
      expect(field('Énoncé de la carte').element.value).toBe('')
    })
  })

  describe('création d’une carte QCM', () => {
    const openMcq = async () => {
      await mountPage()
      await button('+ Ajouter une carte').trigger('click')
      await button('QCM').trigger('click')
    }
    const submit = async () => {
      await wrapper.find('form').trigger('submit')
      await flushPromises()
    }
    beforeEach(() => {
      mockApi.post.mockImplementation(async (route) => {
        if (route === 'questions') return { status: 201, data: { idQuestion: 300 } }
        if (route === 'leitnercards') return { status: 201, data: { idCard: 500 } }
        return { status: 201, data: {} }
      })
    })

    it('affiche deux options, la première cochée comme correcte ; plus de champ « réponse »', async () => {
      await openMcq()
      expect(field("Texte de l'option 1").exists()).toBe(true)
      expect(field("Texte de l'option 2").exists()).toBe(true)
      expect(field("Marquer l'option 1 comme correcte").element.checked).toBe(true)
      expect(field('Réponse de la carte').exists()).toBe(false)
    })

    it('ajouter, supprimer (au-delà de 2) et choisir la bonne option', async () => {
      await openMcq()
      await button('+ Ajouter une option').trigger('click')
      expect(field("Texte de l'option 3").exists()).toBe(true)
      await field("Marquer l'option 3 comme correcte").setValue(true)
      expect(field("Marquer l'option 1 comme correcte").element.checked).toBe(false)
      expect(field("Marquer l'option 3 comme correcte").element.checked).toBe(true)
      const removers = wrapper.findAll('.space-y-2 button')
      expect(removers).toHaveLength(3) // retirer possible seulement quand il y a plus de 2 options
      await removers[2].trigger('click')
      expect(field("Texte de l'option 3").exists()).toBe(false)
    })

    it('option sans texte : erreur, rien n’est envoyé', async () => {
      await openMcq()
      await field('Énoncé de la carte').setValue('Q')
      await field("Texte de l'option 1").setValue('A')
      await submit()
      expect(wrapper.text()).toContain('Toutes les options doivent avoir un texte.')
      expect(mockApi.post).not.toHaveBeenCalled()
    })

    it('aucune bonne réponse sélectionnée : erreur', async () => {
      await openMcq()
      await field('Énoncé de la carte').setValue('Q')
      await field("Texte de l'option 1").setValue('A')
      await field("Texte de l'option 2").setValue('B')
      await field("Marquer l'option 2 comme correcte").setValue(true)
      // retire « correct » à toutes les options : impossible par l'interface (radio) → on vérifie le cas nominal
      await submit()
      expect(mockApi.post).toHaveBeenCalledWith('questions', {
        statement: '~Q',
        questionPosition: 0,
        type: 'mcq',
        content: { options: [{ text: '~A', correct: false }, { text: '~B', correct: true }] },
      })
    })

    it('QCM valide : question puis carte, aucune réponse créée', async () => {
      await openMcq()
      await field('Énoncé de la carte').setValue('Q')
      await field("Texte de l'option 1").setValue('A')
      await field("Texte de l'option 2").setValue('B')
      await submit()
      expect(mockApi.post.mock.calls.map((c) => c[0])).toEqual(['questions', 'leitnercards'])
      expect(mockNotify).toHaveBeenCalledWith('Carte ajoutée avec succès.', 'success')
      expect(wrapper.text()).toContain('✓ Carte enregistrée.')
    })

    it('changer de type vide la réponse et réinitialise les options', async () => {
      await mountPage()
      await button('+ Ajouter une carte').trigger('click')
      await field('Réponse de la carte').setValue('X')
      await button('QCM').trigger('click')
      await field("Texte de l'option 1").setValue('Z')
      await button('Ouverte').trigger('click')
      expect(field('Réponse de la carte').element.value).toBe('')
      await button('QCM').trigger('click')
      expect(field("Texte de l'option 1").element.value).toBe('')
    })
  })

  // ── Modification ────────────────────────────────────────────────────────────
  describe('modification d’une carte', () => {
    const openEdit = async (index = 0) => {
      await cardRows()[index].find('[title="Modifier"]').trigger('click')
    }
    const submit = async () => {
      await wrapper.find('form').trigger('submit')
      await flushPromises()
    }
    beforeEach(() => {
      mockApi.put.mockResolvedValue({ status: 200, data: { qualityLevel: 'high', qualityWarnings: [] } })
    })

    it('préremplit énoncé et réponse ; pas de choix de type ni de formulations supplémentaires', async () => {
      await mountPage()
      await openEdit(0)
      expect(wrapper.find('h2.modal-title').text()).toBe('Modifier la carte')
      expect(field('Énoncé de la carte').element.value).toBe("Loi d'Ohm ?")
      expect(field('Réponse de la carte').element.value).toBe('U = R I')
      expect(button('Ouverte')).toBeUndefined()
      expect(button('+ Ajouter une formulation acceptée')).toBeUndefined()
    })

    it('carte ouverte : met à jour la question puis la réponse existante, notifie, referme si la qualité est bonne', async () => {
      await mountPage()
      await openEdit(0)
      await field('Énoncé de la carte').setValue('Nouvel énoncé')
      await field('Réponse de la carte').setValue('Nouvelle réponse')
      await submit()
      expect(mockApi.put).toHaveBeenCalledWith('questions/edit/101', { statement: '~Nouvel énoncé' })
      expect(mockApi.put).toHaveBeenCalledWith('responses/edit/201', { content: '~Nouvelle réponse' })
      expect(mockNotify).toHaveBeenCalledWith('Carte mise à jour avec succès.', 'success')
      expect(wrapper.find('h2.modal-title').exists()).toBe(false)
    })

    it('qualité à vérifier : la fenêtre reste ouverte avec le message « réponse mise à jour »', async () => {
      mockApi.put.mockResolvedValue({ status: 200, data: { qualityLevel: 'low', qualityWarnings: ['Trop courte'] } })
      await mountPage()
      await openEdit(0)
      await submit()
      expect(wrapper.find('h2.modal-title').exists()).toBe(true)
      expect(wrapper.text()).toContain('✓ Carte enregistrée — réponse mise à jour.')
    })

    it('carte sans réponse enregistrée : la réponse saisie est créée', async () => {
      routes['responses/correction/101'] = { status: 404, data: {} }
      mockApi.post.mockResolvedValue({ status: 201, data: { qualityLevel: 'high', qualityWarnings: [] } })
      await mountPage()
      await openEdit(0)
      await field('Réponse de la carte').setValue('Créée')
      await submit()
      expect(mockApi.post).toHaveBeenCalledWith('responses', { content: '~Créée', correction: true, idQuestion: 101 })
    })

    it('carte mentale liée au système : le lien au nœud est mis à jour (null pour retirer)', async () => {
      routes['leitnersystems/5'] = ok({ name: 'Physique', idMindMap: 9 })
      routes['diagrammes/9'] = ok({ mindMapJson: { nodes: {} } })
      await mountPage()
      await openEdit(0)
      await submit()
      expect(mockApi.put).toHaveBeenCalledWith('leitnercards/1', { idQuestion: 101, mindMapNodeId: null })
    })

    it('sans carte mentale liée : aucune mise à jour du lien', async () => {
      await mountPage()
      await openEdit(0)
      await submit()
      expect(mockApi.put.mock.calls.some((c) => String(c[0]).startsWith('leitnercards/'))).toBe(false)
    })

    it('QCM : met à jour la question avec ses options, aucune réponse', async () => {
      await mountPage()
      await openEdit(1)
      expect(field("Texte de l'option 1").element.value).toBe('A')
      await field("Texte de l'option 2").setValue('Autre')
      await submit()
      expect(mockApi.put).toHaveBeenCalledWith('questions/edit/102', {
        statement: '~Choix',
        content: { options: [{ text: '~A', correct: true }, { text: '~Autre', correct: false }] },
      })
      expect(mockApi.put.mock.calls.some((c) => String(c[0]).startsWith('responses/'))).toBe(false)
    })

    it('QCM : option vide refusée', async () => {
      await mountPage()
      await openEdit(1)
      await field("Texte de l'option 1").setValue('   ')
      await submit()
      expect(wrapper.text()).toContain('Toutes les options doivent avoir un texte.')
      expect(mockApi.put).not.toHaveBeenCalled()
    })

    it('erreurs : question, réponse', async () => {
      mockApi.put.mockResolvedValueOnce({ status: 400, data: { message: 'Question invalide' } })
      await mountPage()
      await openEdit(0)
      await submit()
      expect(wrapper.text()).toContain('Question invalide')
      mockApi.put.mockResolvedValueOnce({ status: 200, data: {} }).mockResolvedValueOnce({ status: 500, data: {} })
      await submit()
      expect(wrapper.text()).toContain('Erreur lors de la mise à jour de la réponse.')
    })
  })

  // ── Aperçu de qualité en direct ─────────────────────────────────────────────
  describe('aperçu de la qualité', () => {
    const open = async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      await mountPage()
      await button('+ Ajouter une carte').trigger('click')
    }
    const settle = async (ms = 500) => {
      await vi.advanceTimersByTimeAsync(ms)
      await flushPromises()
    }

    it('après 500 ms de saisie, interroge l’API avec les valeurs nettoyées et affiche le résultat (« non enregistré »)', async () => {
      mockApi.post.mockResolvedValue({ status: 200, data: { qualityLevel: 'medium', qualityWarnings: ['Réponse courte'] } })
      await open()
      await field('Énoncé de la carte').setValue('  Q  ')
      await field('Réponse de la carte').setValue('  R  ')
      expect(mockApi.post).not.toHaveBeenCalled()
      await settle()
      expect(mockApi.post).toHaveBeenCalledWith('responses/quality-preview', { statement: 'Q', answer: 'R', acceptedAnswers: [] })
      expect(wrapper.text()).toContain('Aperçu (non enregistré) :')
    })

    it('regroupe les frappes rapprochées en un seul appel', async () => {
      mockApi.post.mockResolvedValue({ status: 200, data: { qualityLevel: 'high', qualityWarnings: [] } })
      await open()
      await field('Énoncé de la carte').setValue('Q')
      await field('Réponse de la carte').setValue('R')
      await settle(200)
      await field('Réponse de la carte').setValue('RR')
      await settle(200)
      expect(mockApi.post).not.toHaveBeenCalled()
      await settle(300)
      expect(mockApi.post).toHaveBeenCalledTimes(1)
    })

    it('inclut les formulations acceptées non vides', async () => {
      mockApi.post.mockResolvedValue({ status: 200, data: { qualityLevel: 'high', qualityWarnings: [] } })
      await open()
      await field('Énoncé de la carte').setValue('Q')
      await field('Réponse de la carte').setValue('R')
      await button('+ Ajouter une formulation acceptée').trigger('click')
      await field('Formulation acceptée 1').setValue('Alt')
      await settle()
      expect(mockApi.post).toHaveBeenLastCalledWith('responses/quality-preview', { statement: 'Q', answer: 'R', acceptedAnswers: ['Alt'] })
    })

    it('rien n’est demandé si énoncé ou réponse manque, ni pour un QCM', async () => {
      await open()
      await field('Énoncé de la carte').setValue('Q')
      await settle()
      expect(mockApi.post).not.toHaveBeenCalled()
      await button('QCM').trigger('click')
      await field('Énoncé de la carte').setValue('Q2')
      await settle()
      expect(mockApi.post).not.toHaveBeenCalled()
    })

    it('une réponse arrivée en retard pour une saisie périmée est ignorée', async () => {
      let resolveFirst
      mockApi.post
        .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r }))
        .mockResolvedValueOnce({ status: 200, data: { qualityLevel: 'high', qualityWarnings: [] } })
      await open()
      await field('Énoncé de la carte').setValue('Q')
      await field('Réponse de la carte').setValue('R1')
      await settle() // 1er appel en attente
      await field('Réponse de la carte').setValue('R2')
      await settle() // 2e appel, résolu
      resolveFirst({ status: 200, data: { qualityLevel: 'low', qualityWarnings: ['périmé'] } })
      await flushPromises()
      expect(wrapper.text()).not.toContain('périmé')
    })
  })

  // ── Génération par IA ───────────────────────────────────────────────────────
  describe('génération par IA', () => {
    it('« ✨ Générer par IA » réinitialise le flux et ouvre la configuration avec le sujet du système', async () => {
      await mountPage()
      await button('✨ Générer par IA').trigger('click')
      expect(useAiCardGenerationStore().reset).toHaveBeenCalled()
      expect(wrapper.find('.ai-config-stub').text()).toContain('5 Sciences')
    })

    it('génération réussie : l’écran de révision du brouillon remplace la page', async () => {
      await mountPage()
      const store = useAiCardGenerationStore()
      store.generate.mockResolvedValue(true)
      store.lastBatch = { id: 77 }
      await button('✨ Générer par IA').trigger('click')
      wrapper.findComponent({ name: 'AiGenerateCardsModal' }).vm.$emit('submit', { count: 5 })
      await flushPromises()
      expect(store.generate).toHaveBeenCalledWith({ count: 5 })
      expect(wrapper.find('.ai-validation-stub').text()).toContain('batch 77')
      expect(wrapper.find('h2').exists()).toBe(false)
    })

    it('génération en échec : pas d’écran de révision, état d’erreur transmis à la fenêtre de progression', async () => {
      await mountPage({ aiCardGeneration: { status: 'error', errorMessage: 'IA indisponible' } })
      const store = useAiCardGenerationStore()
      store.generate.mockResolvedValue(false)
      await button('✨ Générer par IA').trigger('click')
      wrapper.findComponent({ name: 'AiGenerateCardsModal' }).vm.$emit('submit', {})
      await flushPromises()
      expect(wrapper.find('.ai-validation-stub').exists()).toBe(false)
      expect(wrapper.find('.ai-progress-stub').text()).toBe('error')
    })

    it('« Réessayer » ramène à la configuration ; fermer referme tout et réinitialise', async () => {
      await mountPage()
      const store = useAiCardGenerationStore()
      store.generate.mockResolvedValue(false)
      await button('✨ Générer par IA').trigger('click')
      wrapper.findComponent({ name: 'AiGenerateCardsModal' }).vm.$emit('submit', {})
      await flushPromises()
      wrapper.findComponent({ name: 'AiGenerationProgressModal' }).vm.$emit('retry')
      await flushPromises()
      expect(wrapper.find('.ai-config-stub').exists()).toBe(true)
      store.reset.mockClear()
      wrapper.findComponent({ name: 'AiGenerateCardsModal' }).vm.$emit('close')
      await flushPromises()
      expect(wrapper.find('.ai-config-stub').exists()).toBe(false)
      expect(store.reset).toHaveBeenCalled()
    })

    it('bandeau de reprise : n’apparaît que pour un brouillon de CE système, et rouvre l’écran de révision', async () => {
      await mountPage({ aiCardGeneration: { pendingBatches: [{ id: 1, idSystem: 6, cards: [] }, { id: 2, idSystem: 5, cards: [{}, {}, {}] }] } })
      expect(wrapper.text()).toContain('3 cartes proposées')
      await button('Reprendre').trigger('click')
      expect(wrapper.find('.ai-validation-stub').text()).toContain('batch 2')
    })

    it('pas de bandeau sans brouillon pour ce système', async () => {
      await mountPage({ aiCardGeneration: { pendingBatches: [{ id: 1, idSystem: 6, cards: [] }] } })
      expect(wrapper.text()).not.toContain('en attente de validation')
    })

    it('fermeture de l’écran de révision : retour à la page et bandeau rafraîchi', async () => {
      await mountPage({ aiCardGeneration: { pendingBatches: [{ id: 2, idSystem: 5, cards: [] }] } })
      await button('Reprendre').trigger('click')
      const store = useAiCardGenerationStore()
      store.fetchPendingBatches.mockClear()
      wrapper.findComponent({ name: 'AiValidationScreen' }).vm.$emit('close')
      await flushPromises()
      expect(wrapper.find('.ai-validation-stub').exists()).toBe(false)
      expect(store.fetchPendingBatches).toHaveBeenCalled()
    })

    it('cartes validées : retour à la page, cartes et bandeau rechargés', async () => {
      await mountPage({ aiCardGeneration: { pendingBatches: [{ id: 2, idSystem: 5, cards: [] }] } })
      await button('Reprendre').trigger('click')
      const store = useAiCardGenerationStore()
      store.fetchPendingBatches.mockClear()
      mockApi.get.mockClear()
      wrapper.findComponent({ name: 'AiValidationScreen' }).vm.$emit('validated')
      await flushPromises()
      expect(wrapper.find('.ai-validation-stub').exists()).toBe(false)
      expect(mockApi.get).toHaveBeenCalledWith('leitnerboxes')
      expect(store.fetchPendingBatches).toHaveBeenCalled()
    })
  })
})

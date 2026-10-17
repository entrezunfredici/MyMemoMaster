import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import FlashcardsPage from '@/pages/FlashcardsPage.vue'
import { useLeitnerSystemStore } from '@/stores/leitnerSystems'
import { useLeitnerCardStore } from '@/stores/leitnerCards'
import { useLeitnerBoxStore } from '@/stores/leitnerBoxes'
import { useRevisionSessionStore } from '@/stores/revisionSessions'
import { useSubjectStore } from '@/stores/subjects'
import { useTagStore } from '@/stores/tags'
import { useGuidedTourStore } from '@/stores/guidedTour'
import { useDiagrammeStore } from '@/stores/diagrammes'

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }))
vi.mock('vue-router', async (importOriginal) => ({ ...(await importOriginal()), useRouter: () => ({ push: mockPush }) }))

// ── Doublures des composants de mise en page ─────────────────────────────────
const ItemListLayout = {
  props: ['search', 'selectedSubjectId', 'subjects', 'loading', 'filteredCount', 'searchPlaceholder', 'createLabel', 'itemLabel', 'emptyMessage'],
  emits: ['create', 'update:search', 'update:selectedSubjectId'],
  template: `
    <div>
      <span data-testid="loading">{{ loading }}</span>
      <span data-testid="count">{{ filteredCount }}</span>
      <button data-testid="create" @click="$emit('create')">{{ createLabel }}</button>
      <slot />
      <slot name="modals" />
    </div>`,
}
const MenuItem = {
  props: ['title', 'description', 'actionLabel', 'onAction', 'onEdit', 'onDelete'],
  template: `
    <article data-testid="system">
      <h3>{{ title }}</h3><p data-testid="description">{{ description }}</p>
      <button data-testid="launch" @click="onAction">{{ actionLabel }}</button>
      <button data-testid="edit" @click="onEdit">edit</button>
      <button data-testid="delete" @click="onDelete">delete</button>
      <slot name="stats" />
    </article>`,
}
const SubjectSelector = { props: ['modelValue'], template: '<div data-testid="subject-selector" />' }
const TagSelector = { props: ['modelValue'], template: '<div data-testid="tag-selector" />' }

const SYSTEMS = [
  { idSystem: 1, name: 'Maths S1', subjectId: 10, subject: { name: 'Maths' }, idMindMap: 5, tags: [{ tagId: 7 }, { tagId: 8 }] },
  { idSystem: 2, name: 'Anglais', subjectId: 20, subject: { name: 'Langues' }, tags: [] },
  { idSystem: 3, name: 'Maths avancées', subjectId: 10, subject: { name: 'Maths' }, tags: [] },
]
const DIAGRAMMES = [
  { idMindMap: 5, mmName: 'Algèbre', subjectId: 10 },
  { idMindMap: 6, mmName: 'Verbes', subjectId: 20 },
]

function mountPage({ systems = SYSTEMS, systemStats = {}, boxes = [], tour = {} } = {}) {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
    initialState: {
      leitnerSystems: { systems },
      leitnerCards: { systemStats },
      leitnerBoxes: { boxes },
      subjects: { subjects: [{ subjectId: 10, name: 'Maths' }, { subjectId: 20, name: 'Langues' }] },
      diagrammes: { diagrammes: DIAGRAMMES },
      guidedTour: tour,
    },
  })
  const stores = {
    system: useLeitnerSystemStore(pinia),
    card: useLeitnerCardStore(pinia),
    box: useLeitnerBoxStore(pinia),
    session: useRevisionSessionStore(pinia),
    subject: useSubjectStore(pinia),
    tag: useTagStore(pinia),
    tour: useGuidedTourStore(pinia),
    diagramme: useDiagrammeStore(pinia),
  }
  const wrapper = mount(FlashcardsPage, {
    global: {
      plugins: [pinia],
      stubs: { ItemListLayout, MenuItem, SubjectSelectorComponent: SubjectSelector, TagSelectorComponent: TagSelector },
    },
  })
  return { wrapper, ...stores }
}

const titles = (wrapper) => wrapper.findAll('[data-testid="system"] h3').map((h) => h.text())
const systemRow = (wrapper, name) => wrapper.findAll('[data-testid="system"]').find((r) => r.find('h3').text() === name)

describe('FlashcardsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('chargement', () => {
    it('charge systèmes, matières et cartes mentales puis les statistiques et les boîtes', async () => {
      const { wrapper, system, subject, diagramme, card, box } = mountPage()
      expect(wrapper.find('[data-testid="loading"]').text()).toBe('true')
      await flushPromises()
      expect(system.fetchSystems).toHaveBeenCalledTimes(1)
      expect(subject.fetchSubjects).toHaveBeenCalledTimes(1)
      expect(diagramme.fetchDiagrammes).toHaveBeenCalledTimes(1)
      expect(card.loadSystemStats).toHaveBeenCalledWith([1, 2, 3])
      expect(box.fetchBoxes).toHaveBeenCalledTimes(1)
      expect(wrapper.find('[data-testid="loading"]').text()).toBe('false')
    })

    it('aucun système - pas de chargement des statistiques', async () => {
      const { card } = mountPage({ systems: [] })
      await flushPromises()
      expect(card.loadSystemStats).not.toHaveBeenCalled()
    })
  })

  describe('liste', () => {
    it('affiche un élément par système avec sa matière', async () => {
      const { wrapper } = mountPage()
      await flushPromises()
      expect(titles(wrapper)).toEqual(['Maths S1', 'Anglais', 'Maths avancées'])
      expect(systemRow(wrapper, 'Anglais').find('[data-testid="description"]').text()).toBe('Langues')
      expect(wrapper.find('[data-testid="count"]').text()).toBe('3')
    })

    it('« Lancer la session » ouvre la session du système', async () => {
      const { wrapper } = mountPage()
      await flushPromises()
      await systemRow(wrapper, 'Anglais').find('[data-testid="launch"]').trigger('click')
      expect(mockPush).toHaveBeenCalledWith({ name: 'flashcardssession', params: { systemId: 2 } })
    })

    it('« Gérer les cartes » ouvre la gestion des cartes', async () => {
      const { wrapper } = mountPage()
      await flushPromises()
      const button = systemRow(wrapper, 'Anglais').findAll('button').find((b) => b.text().startsWith('Gérer les cartes'))
      await button.trigger('click')
      expect(mockPush).toHaveBeenCalledWith({ name: 'flashcards.cards', params: { systemId: 2 } })
    })

    describe('statistiques', () => {
      const stats = { 1: { total: 1, totalByLevel: { 1: 1 }, boxes: { 1: 1 } }, 2: { total: 5, totalByLevel: { 1: 3, 2: 2 }, boxes: { 2: 0 } } }

      it('singulier / pluriel du nombre de cartes', async () => {
        const { wrapper } = mountPage({ systemStats: stats })
        await flushPromises()
        expect(systemRow(wrapper, 'Maths S1').text()).toMatch(/1\s*carte à réviser/)
        expect(systemRow(wrapper, 'Anglais').text()).toMatch(/5\s*cartes à réviser/)
      })

      it('sans statistiques, aucun compteur', async () => {
        const { wrapper } = mountPage()
        await flushPromises()
        expect(systemRow(wrapper, 'Anglais').text()).not.toContain('à réviser')
      })

      it('sans boîtes connues, affiche 5 niveaux par défaut', async () => {
        const { wrapper } = mountPage({ systemStats: stats })
        await flushPromises()
        const labels = systemRow(wrapper, 'Anglais').findAll('.font-bold').map((n) => n.text())
        expect(labels).toEqual(['B1', 'B2', 'B3', 'B4', 'B5'])
      })

      it('avec boîtes connues, n’affiche que leurs niveaux (triés)', async () => {
        const { wrapper } = mountPage({
          systemStats: stats,
          boxes: [{ idSystem: 2, level: 2 }, { idSystem: 2, level: 1 }, { idSystem: 1, level: 1 }],
        })
        await flushPromises()
        expect(systemRow(wrapper, 'Anglais').findAll('.font-bold').map((n) => n.text())).toEqual(['B1', 'B2'])
      })

      it('affiche le total par niveau et les cartes à réviser (↑), en orange seulement si > 0', async () => {
        const { wrapper } = mountPage({ systemStats: stats })
        await flushPromises()
        const cells = systemRow(wrapper, 'Maths S1').findAll('.flex-1')
        expect(cells[0].find('.text-primary').text()).toBe('1')
        expect(cells[0].find('.text-orange-700').text()).toBe('1↑')
        expect(cells[1].find('.text-orange-700').exists()).toBe(false)
        expect(cells[1].find('.text-primary').text()).toBe('0')
      })
    })
  })

  describe('recherche locale', () => {
    // Le filtrage est piloté par le v-model du layout : on émet les mises à jour comme le ferait l'enfant.
    const layout = (wrapper) => wrapper.findComponent(ItemListLayout)

    it('par texte (insensible à la casse)', async () => {
      const { wrapper } = mountPage()
      await flushPromises()
      layout(wrapper).vm.$emit('update:search', 'MATHS')
      await flushPromises()
      expect(titles(wrapper)).toEqual(['Maths S1', 'Maths avancées'])
    })

    it('par sujet', async () => {
      const { wrapper } = mountPage()
      await flushPromises()
      layout(wrapper).vm.$emit('update:selectedSubjectId', 20)
      await flushPromises()
      expect(titles(wrapper)).toEqual(['Anglais'])
    })

    it('texte + sujet combinés', async () => {
      const { wrapper } = mountPage()
      await flushPromises()
      layout(wrapper).vm.$emit('update:selectedSubjectId', 10)
      layout(wrapper).vm.$emit('update:search', 'avanc')
      await flushPromises()
      expect(titles(wrapper)).toEqual(['Maths avancées'])
      expect(wrapper.find('[data-testid="count"]').text()).toBe('1')
    })

    it('une recherche ne contenant que des espaces ne filtre pas', async () => {
      const { wrapper } = mountPage()
      await flushPromises()
      layout(wrapper).vm.$emit('update:search', '   ')
      await flushPromises()
      expect(titles(wrapper)).toHaveLength(3)
    })
  })

  describe('création d’un système', () => {
    it('ouvre une fenêtre vide « Nouveau système Leitner »', async () => {
      const { wrapper } = mountPage()
      await flushPromises()
      await wrapper.find('[data-testid="create"]').trigger('click')
      expect(wrapper.find('.modal-title').text()).toBe('Nouveau système Leitner')
      expect(wrapper.find('input[aria-label="Nom du système de Leitner"]').element.value).toBe('')
    })

    it('crée le système puis redirige vers la gestion de ses cartes', async () => {
      const { wrapper, system, tag, tour } = mountPage({ tour: { active: true } })
      system.createSystem.mockImplementation(async () => {
        system.system = { ...system.system, idSystem: 99 }
        return true
      })
      await flushPromises()
      await wrapper.find('[data-testid="create"]').trigger('click')
      await wrapper.find('input[aria-label="Nom du système de Leitner"]').setValue('Physique')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(system.createSystem).toHaveBeenCalledTimes(1)
      expect(system.system).toMatchObject({ name: 'Physique', subjectId: null, idMindMap: null })
      expect(tag.setEntityTags).toHaveBeenCalledWith('leitnersystem', 99, [])
      expect(tour.recordLinks).toHaveBeenCalledWith({ leitnerSystemId: 99 })
      expect(mockPush).toHaveBeenCalledWith({ name: 'flashcards.cards', params: { systemId: 99 } })
      expect(wrapper.find('.modal-overlay').exists()).toBe(false)
    })

    it('échec - la fenêtre reste ouverte, pas de redirection ni d’étiquettes', async () => {
      const { wrapper, system, tag } = mountPage()
      system.createSystem.mockResolvedValue(false)
      await flushPromises()
      await wrapper.find('[data-testid="create"]').trigger('click')
      await wrapper.find('input[aria-label="Nom du système de Leitner"]').setValue('X')
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(wrapper.find('.modal-overlay').exists()).toBe(true)
      expect(tag.setEntityTags).not.toHaveBeenCalled()
      expect(mockPush).not.toHaveBeenCalled()
      expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
    })

    it('parcours guidé actif - présélectionne la matière, la carte mentale et son nom', async () => {
      const { wrapper } = mountPage({ tour: { active: true, links: { subjectId: 10, mindMapId: 5 } } })
      await flushPromises()
      await wrapper.find('[data-testid="create"]').trigger('click')
      expect(wrapper.find('input[aria-label="Nom du système de Leitner"]').element.value).toBe('Algèbre')
      expect(wrapper.findComponent(SubjectSelector).props('modelValue')).toBe(10)
      expect(wrapper.find('select').element.value).toBe('5')
    })

    it('parcours guidé inactif - ignore les liens du parcours', async () => {
      const { wrapper } = mountPage({ tour: { active: false, links: { subjectId: 10, mindMapId: 5 } } })
      await flushPromises()
      await wrapper.find('[data-testid="create"]').trigger('click')
      expect(wrapper.find('input[aria-label="Nom du système de Leitner"]').element.value).toBe('')
    })

    it('la liste de cartes mentales proposées est restreinte à la matière choisie', async () => {
      const { wrapper } = mountPage({ tour: { active: true, links: { subjectId: 20, mindMapId: null } } })
      await flushPromises()
      await wrapper.find('[data-testid="create"]').trigger('click')
      const options = wrapper.findAll('select option').map((o) => o.text())
      expect(options).toEqual(['Aucune', 'Verbes'])
    })

    it('sans matière, toutes les cartes mentales sont proposées', async () => {
      const { wrapper } = mountPage()
      await flushPromises()
      await wrapper.find('[data-testid="create"]').trigger('click')
      expect(wrapper.findAll('select option').map((o) => o.text())).toEqual(['Aucune', 'Algèbre', 'Verbes'])
    })
  })

  describe('fenêtres de dialogue (RGAA 7.1, 12.x)', () => {
    const dialog = (wrapper) => wrapper.find('[role="dialog"]')

    it('la fenêtre système est un dialogue modal nommé par son titre', async () => {
      const { wrapper } = mountPage()
      await flushPromises()
      await wrapper.find('[data-testid="create"]').trigger('click')
      const d = dialog(wrapper)
      expect(d.attributes('aria-modal')).toBe('true')
      expect(wrapper.find(`#${d.attributes('aria-labelledby')}`).text()).toBe('Nouveau système Leitner')
    })

    it('Échap ferme la fenêtre système', async () => {
      const { wrapper } = mountPage()
      await flushPromises()
      await wrapper.find('[data-testid="create"]').trigger('click')
      await dialog(wrapper).trigger('keydown', { key: 'Escape' })
      expect(dialog(wrapper).exists()).toBe(false)
    })

    it('la fenêtre de planification est un dialogue modal nommé et se ferme avec Échap', async () => {
      const { wrapper } = mountPage()
      await flushPromises()
      const plan = systemRow(wrapper, 'Anglais').findAll('button').find((b) => b.text().includes('Planifier'))
      await plan.trigger('click')
      const d = dialog(wrapper)
      expect(d.attributes('aria-modal')).toBe('true')
      expect(wrapper.find(`#${d.attributes('aria-labelledby')}`).text()).toBe('Planifier une session')
      await d.trigger('keydown', { key: 'Escape' })
      expect(dialog(wrapper).exists()).toBe(false)
    })
  })

  describe('modification d’un système', () => {
    async function openEdit(wrapper, name) {
      await systemRow(wrapper, name).find('[data-testid="edit"]').trigger('click')
    }

    it('préremplit nom, carte mentale et étiquettes', async () => {
      const { wrapper } = mountPage()
      await flushPromises()
      await openEdit(wrapper, 'Maths S1')
      expect(wrapper.find('.modal-title').text()).toBe('Modifier le système')
      expect(wrapper.find('input[aria-label="Nom du système de Leitner"]').element.value).toBe('Maths S1')
      expect(wrapper.findComponent(TagSelector).props('modelValue')).toEqual([7, 8])
      expect(wrapper.findComponent(SubjectSelector).props('modelValue')).toBe(10)
    })

    it('enregistre, met à jour les étiquettes puis recharge systèmes et statistiques (sans redirection)', async () => {
      const { wrapper, system, tag, card, tour } = mountPage()
      system.updateSystem.mockResolvedValue(true)
      await flushPromises()
      system.fetchSystems.mockClear()
      card.loadSystemStats.mockClear()
      await openEdit(wrapper, 'Maths S1')
      await wrapper.find('input[aria-label="Nom du système de Leitner"]').setValue('Maths S1 bis')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(system.updateSystem).toHaveBeenCalledWith(1)
      expect(system.system).toMatchObject({ name: 'Maths S1 bis', subjectId: 10, idMindMap: 5 })
      expect(tag.setEntityTags).toHaveBeenCalledWith('leitnersystem', 1, [7, 8])
      expect(system.fetchSystems).toHaveBeenCalledTimes(1)
      expect(card.loadSystemStats).toHaveBeenCalledTimes(1)
      expect(tour.recordLinks).not.toHaveBeenCalled()
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('fermer réinitialise le formulaire', async () => {
      const { wrapper } = mountPage()
      await flushPromises()
      await openEdit(wrapper, 'Maths S1')
      await wrapper.find('.btn-modal-cancel').trigger('click')
      expect(wrapper.find('.modal-overlay').exists()).toBe(false)
      await wrapper.find('[data-testid="create"]').trigger('click')
      expect(wrapper.find('input[aria-label="Nom du système de Leitner"]').element.value).toBe('')
    })

    it('un appui sur le fond de la fenêtre la ferme, un appui dans le panneau non', async () => {
      const { wrapper } = mountPage()
      await flushPromises()
      await openEdit(wrapper, 'Maths S1')
      await wrapper.find('.modal-panel').trigger('mousedown')
      expect(wrapper.find('.modal-overlay').exists()).toBe(true)
      await wrapper.find('.modal-overlay').trigger('mousedown')
      expect(wrapper.find('.modal-overlay').exists()).toBe(false)
    })
  })

  describe('suppression', () => {
    let confirmSpy
    beforeEach(() => { confirmSpy = vi.spyOn(window, 'confirm') })
    afterEach(() => confirmSpy.mockRestore())

    it('confirmation refusée - rien n’est supprimé', async () => {
      confirmSpy.mockReturnValue(false)
      const { wrapper, system } = mountPage()
      await flushPromises()
      await systemRow(wrapper, 'Anglais').find('[data-testid="delete"]').trigger('click')
      expect(confirmSpy).toHaveBeenCalledWith('Supprimer le système "Anglais" ? Cette action est irréversible.')
      expect(system.deleteSystem).not.toHaveBeenCalled()
    })

    it('confirmation acceptée - supprime et oublie les statistiques du système', async () => {
      confirmSpy.mockReturnValue(true)
      const { wrapper, system, card } = mountPage({ systemStats: { 2: { total: 1, boxes: {} } } })
      system.deleteSystem.mockResolvedValue(true)
      await flushPromises()
      await systemRow(wrapper, 'Anglais').find('[data-testid="delete"]').trigger('click')
      await flushPromises()
      expect(system.deleteSystem).toHaveBeenCalledWith(2)
      expect(card.systemStats[2]).toBeUndefined()
    })

    it('échec de suppression - les statistiques sont conservées', async () => {
      confirmSpy.mockReturnValue(true)
      const { wrapper, system, card } = mountPage({ systemStats: { 2: { total: 1, boxes: {} } } })
      system.deleteSystem.mockResolvedValue(false)
      await flushPromises()
      await systemRow(wrapper, 'Anglais').find('[data-testid="delete"]').trigger('click')
      await flushPromises()
      expect(card.systemStats[2]).toBeDefined()
    })
  })

  describe('planification d’une session', () => {
    async function openPlan(wrapper, name = 'Anglais') {
      const button = systemRow(wrapper, name).findAll('button').find((b) => b.text().includes('Planifier'))
      await button.trigger('click')
    }
    const fill = async (wrapper) => {
      await wrapper.find('input[aria-label="Date de la session"]').setValue('2026-11-02')
      await wrapper.find('input[aria-label="Heure de début"]').setValue('18:00')
      await wrapper.find('input[aria-label="Heure de fin"]').setValue('19:00')
    }

    it('ouvre la fenêtre avec le nom du système en proposition', async () => {
      const { wrapper } = mountPage()
      await flushPromises()
      await openPlan(wrapper)
      expect(wrapper.find('.modal-title').text()).toBe('Planifier une session')
      expect(wrapper.find('input[aria-label="Nom de la session"]').element.value).toBe('Anglais')
      expect(wrapper.text()).toContain('Système : Anglais')
    })

    it('le bouton « Fermer » a un nom accessible', async () => {
      const { wrapper } = mountPage()
      await flushPromises()
      await openPlan(wrapper)
      expect(wrapper.find('button.modal-close').attributes('aria-label')).toBe('Fermer')
    })

    it('succès - crée la session, enregistre le lien du parcours guidé et ferme', async () => {
      const { wrapper, session, tour } = mountPage({ tour: { active: true } })
      session.createSession.mockImplementation(async () => {
        session.sessions = [{ id: 4 }, { id: 12 }]
        return true
      })
      await flushPromises()
      await openPlan(wrapper)
      await fill(wrapper)
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(session.createSession).toHaveBeenCalledWith({
        name: 'Anglais',
        date: '2026-11-02',
        startTime: '18:00',
        endTime: '19:00',
        idSystem: 2,
      })
      expect(tour.recordLinks).toHaveBeenCalledWith({ revisionSessionId: 12 })
      expect(wrapper.find('.modal-overlay').exists()).toBe(false)
    })

    it('succès sans identifiant renvoyé - lien du parcours à -1', async () => {
      const { wrapper, session, tour } = mountPage({ tour: { active: true } })
      session.createSession.mockResolvedValue(true)
      await flushPromises()
      await openPlan(wrapper)
      await fill(wrapper)
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(tour.recordLinks).toHaveBeenCalledWith({ revisionSessionId: -1 })
    })

    it('échec - message d’erreur, fenêtre ouverte', async () => {
      const { wrapper, session } = mountPage()
      session.createSession.mockResolvedValue(false)
      await flushPromises()
      await openPlan(wrapper)
      await fill(wrapper)
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(wrapper.find('p.text-red-600').text()).toBe('Erreur lors de la création de la session.')
      expect(wrapper.find('.modal-overlay').exists()).toBe(true)
    })

    it('rouvrir la fenêtre efface l’erreur et les horaires précédents', async () => {
      const { wrapper, session } = mountPage()
      session.createSession.mockResolvedValue(false)
      await flushPromises()
      await openPlan(wrapper)
      await fill(wrapper)
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      await wrapper.find('.btn-modal-cancel').trigger('click')
      await openPlan(wrapper)
      expect(wrapper.find('p.text-red-600').exists()).toBe(false)
      expect(wrapper.find('input[aria-label="Date de la session"]').element.value).toBe('')
    })
  })
})

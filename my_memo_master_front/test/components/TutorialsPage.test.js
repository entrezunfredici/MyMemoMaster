import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import TutorialsPage from '@/pages/TutorialsPage.vue'
import { useTutorialStore } from '@/stores/tutorials'

// Route RÉACTIVE : le rechargement de la liste suit les changements d'URL
const { mockPush, route } = await vi.hoisted(async () => {
  const { reactive } = await import('vue')
  return { mockPush: vi.fn(), route: reactive({ path: '/tutorials', query: {} }) }
})
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal()),
  useRouter: () => ({ push: mockPush }),
  useRoute: () => route,
}))

const TUTORIALS = [
  { id: 1, name: 'Bien démarrer', link: 'https://exemple.fr/1', revision_tips: false, subjectId: 1 },
  { id: 2, name: 'Réviser efficacement', link: 'https://exemple.fr/2', revision_tips: true, subjectId: 2 },
  { id: 3, name: 'Sujet inconnu', link: 'https://exemple.fr/3', revision_tips: false, subjectId: 99 },
]

function mountPage({ tutorials = TUTORIALS, loading = false } = {}) {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
    initialState: {
      tutorials: { tutorials, loading, pagination: null },
      subjects: { subjects: [{ subjectId: 1, name: 'Maths' }, { subjectId: 2, name: 'Physique' }] },
    },
  })
  const wrapper = mount(TutorialsPage, {
    global: { plugins: [pinia], stubs: { SubjectFilter: { template: '<div data-testid="subject-filter" />' }, SubjectFilterComponent: { template: '<div data-testid="subject-filter" />' } } },
  })
  return { wrapper, store: useTutorialStore() }
}

describe('TutorialsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    route.path = '/tutorials'
    route.query = {}
  })

  describe('chargement des données', () => {
    it('charge tous les tutoriels au départ (aucun filtre)', () => {
      const { store } = mountPage()
      expect(store.fetchTutorials).toHaveBeenCalledTimes(1)
      expect(store.fetchTutorials).toHaveBeenCalledWith({ subjectId: undefined, revisionTips: undefined })
    })

    it('le sujet de l’URL devient un filtre serveur', () => {
      route.query = { subject: '3' }
      const { store } = mountPage()
      expect(store.fetchTutorials).toHaveBeenCalledWith({ subjectId: '3', revisionTips: undefined })
    })

    it('?tips filtre sur les tips de révision', () => {
      route.query = { tips: 'true' }
      const { store } = mountPage()
      expect(store.fetchTutorials).toHaveBeenCalledWith({ subjectId: undefined, revisionTips: true })
    })
  })

  describe('affichage', () => {
    it('un lien par tutoriel, avec le nom du sujet retrouvé par son identifiant', () => {
      const { wrapper } = mountPage()
      const links = wrapper.findAll('a')
      expect(links.map((a) => a.attributes('href'))).toEqual(['https://exemple.fr/1', 'https://exemple.fr/2', 'https://exemple.fr/3'])
      expect(wrapper.text()).toContain('Maths')
      expect(wrapper.text()).toContain('Physique')
    })

    it('tutoriel d’un sujet inconnu : affiché sans pastille de sujet', () => {
      const { wrapper } = mountPage({ tutorials: [TUTORIALS[2]] })
      expect(wrapper.text()).toContain('Sujet inconnu')
      expect(wrapper.text()).not.toContain('Maths')
    })

    it('les tips de révision portent leur pastille', () => {
      const { wrapper } = mountPage()
      expect(wrapper.findAll('a')[1].text()).toContain('Tips de révision')
      expect(wrapper.findAll('a')[0].text()).not.toContain('Tips de révision')
    })

    it('chargement : message dédié, pas de liste', () => {
      const { wrapper } = mountPage({ loading: true })
      expect(wrapper.text()).toContain('Chargement des tutoriels')
      expect(wrapper.findAll('a')).toHaveLength(0)
    })

    it('aucun résultat : message explicite en français', () => {
      const { wrapper } = mountPage({ tutorials: [] })
      expect(wrapper.text()).toContain('Aucun tutoriel ne correspond à ces critères.')
      expect(wrapper.text()).not.toContain('No item found')
    })

    it('la zone de résultats est annoncée aux lecteurs d’écran (aria-live)', () => {
      const { wrapper } = mountPage()
      expect(wrapper.find('section[aria-live="polite"]').exists()).toBe(true)
    })

    it('affiche le filtre par sujet', () => {
      expect(mountPage().wrapper.find('[data-testid="subject-filter"]').exists()).toBe(true)
    })
  })

  describe('case « Tips de révision »', () => {
    it('étiquetée (RGAA 11.1) et décochée par défaut', () => {
      const { wrapper } = mountPage()
      expect(wrapper.find('label[for="tips"]').text()).toBe('Tips de révision')
      expect(wrapper.find('#tips').element.checked).toBe(false)
    })

    it('reflète l’URL au chargement (cochée si ?tips)', () => {
      route.query = { tips: 'true' }
      expect(mountPage().wrapper.find('#tips').element.checked).toBe(true)
    })

    it('cocher ajoute ?tips en conservant les autres paramètres', async () => {
      route.query = { subject: '3' }
      const { wrapper } = mountPage()
      await wrapper.find('#tips').trigger('click')
      expect(mockPush).toHaveBeenCalledWith({ path: '/tutorials', query: { subject: '3', tips: true } })
    })

    it('décocher retire ?tips en conservant les autres paramètres', async () => {
      route.query = { subject: '3', tips: 'true' }
      const { wrapper } = mountPage()
      wrapper.find('#tips').element.checked = true
      await wrapper.find('#tips').trigger('click')
      expect(mockPush).toHaveBeenCalledWith({ path: '/tutorials', query: { subject: '3' } })
    })

    it('ne modifie pas l’objet de requête de la route (copie défensive)', async () => {
      route.query = { tips: 'true' }
      const { wrapper } = mountPage()
      wrapper.find('#tips').element.checked = true
      await wrapper.find('#tips').trigger('click')
      expect(route.query).toEqual({ tips: 'true' })
    })
  })

  it('un changement de filtre dans l’URL recharge la liste', async () => {
    const { store } = mountPage()
    store.fetchTutorials.mockClear()
    route.query = { subject: '5' }
    await flushPromises()
    expect(store.fetchTutorials).toHaveBeenCalledTimes(1)
    expect(store.fetchTutorials).toHaveBeenCalledWith({ subjectId: '5', revisionTips: undefined })
    route.query = { subject: '5', tips: true }
    await flushPromises()
    expect(store.fetchTutorials).toHaveBeenLastCalledWith({ subjectId: '5', revisionTips: true })
  })

  it('un changement sans rapport avec les filtres ne recharge pas la liste', async () => {
    const { store } = mountPage()
    store.fetchTutorials.mockClear()
    route.query = { autre: 'x' }
    await flushPromises()
    expect(store.fetchTutorials).not.toHaveBeenCalled()
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import SubjectsPage from '@/pages/SubjectsPage.vue'
import { useSearchStore } from '@/stores/search'
import { useSubjectStore } from '@/stores/subjects'

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }))
vi.mock('vue-router', async (importOriginal) => ({ ...(await importOriginal()), useRouter: () => ({ push: mockPush }) }))

const SUBJECTS = [
  { subjectId: 2, name: 'Physique' },
  { subjectId: 1, name: 'Chimie' },
  { subjectId: 3, name: 'Histoire' }, // sans contenu
]

const RESULTS = {
  mindMaps: [
    { idMindMap: 10, mmName: 'Cinématique', subjectId: 2, tags: [{ tagId: 1, name: 'cours', color: '#112233' }] },
    { idMindMap: 11, mmName: 'Orpheline', subjectId: null, tags: [] },
  ],
  leitnerSystems: [{ idSystem: 20, name: 'Atomes', subjectId: 1, tags: [] }],
  tests: [{ testId: 30, name: 'Contrôle 1', subjectId: 2, tags: [] }],
}

function mountPage({ results = RESULTS, subjects = SUBJECTS, loading = false } = {}) {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
    initialState: { search: { results, loading }, subjects: { subjects } },
  })
  const wrapper = mount(SubjectsPage, { global: { plugins: [pinia] } })
  return { wrapper, search: useSearchStore(pinia), subjectStore: useSubjectStore(pinia) }
}

const groupButtons = (wrapper) => wrapper.findAll('.space-y-3 > div > button')
const names = (wrapper) => groupButtons(wrapper).map((b) => b.find('.font-semibold').text())

describe('SubjectsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  it('charge les sujets et lance une recherche à l’ouverture', async () => {
    const { search, subjectStore } = mountPage()
    await flushPromises()
    expect(subjectStore.fetchSubjects).toHaveBeenCalledTimes(1)
    expect(search.searchAll).toHaveBeenCalledWith()
  })

  it('affiche un message de chargement et rien d’autre pendant la recherche', () => {
    const { wrapper } = mountPage({ loading: true })
    expect(wrapper.text()).toContain('Chargement des contenus')
    expect(groupButtons(wrapper)).toHaveLength(0)
  })

  describe('regroupement par sujet', () => {
    it('trie les sujets par nom et place « Sans sujet » en dernier', async () => {
      const { wrapper } = mountPage()
      await flushPromises()
      expect(names(wrapper)).toEqual(['Chimie', 'Histoire', 'Physique', 'Sans sujet'])
    })

    it('affiche le nombre de contenus par sujet (singulier / pluriel)', async () => {
      const { wrapper } = mountPage()
      await flushPromises()
      const counts = groupButtons(wrapper).map((b) => b.find('.text-xs').text())
      expect(counts).toEqual(['1 contenu', '0 contenu', '2 contenus', '1 contenu'])
    })

    it('compte les sujets quand aucune recherche n’est saisie', async () => {
      const { wrapper } = mountPage()
      await flushPromises()
      expect(wrapper.text()).toContain('4')
      expect(wrapper.text()).toMatch(/4\s*sujets/)
    })

    it('regroupe aussi les contenus dont le sujet n’est pas dans la liste connue', async () => {
      const { wrapper } = mountPage({
        subjects: [],
        results: { mindMaps: [], leitnerSystems: [{ idSystem: 1, name: 'X', subjectId: 9, subject: { name: 'Inconnu' }, tags: [] }], tests: [] },
      })
      await flushPromises()
      expect(names(wrapper)).toEqual(['Inconnu'])
    })
  })

  describe('accordéon', () => {
    it('déplie au départ les sujets qui ont du contenu, pas les vides', async () => {
      const { wrapper } = mountPage()
      await flushPromises()
      const groups = wrapper.findAll('.space-y-3 > div')
      const expanded = groups.map((g) => g.find('.border-t').exists())
      expect(expanded).toEqual([true, false, true, true])
    })

    it('un clic replie puis déplie un sujet', async () => {
      const { wrapper } = mountPage()
      await flushPromises()
      const chimie = () => wrapper.findAll('.space-y-3 > div')[0]
      await groupButtons(wrapper)[0].trigger('click')
      expect(chimie().find('.border-t').exists()).toBe(false)
      await groupButtons(wrapper)[0].trigger('click')
      expect(chimie().find('.border-t').exists()).toBe(true)
    })

    it('un sujet vide déplié affiche « Aucun contenu associé à ce sujet. »', async () => {
      const { wrapper } = mountPage()
      await flushPromises()
      await groupButtons(wrapper)[1].trigger('click') // Histoire
      expect(wrapper.text()).toContain('Aucun contenu associé à ce sujet.')
    })

    it('liste les sections cartes mentales, flashcards et exercices', async () => {
      const { wrapper } = mountPage()
      await flushPromises()
      const text = wrapper.text()
      expect(text).toContain('Cartes mentales')
      expect(text).toContain('Flashcards')
      expect(text).toContain('Exercices')
      expect(text).toContain('Cinématique')
      expect(text).toContain('Atomes')
      expect(text).toContain('Contrôle 1')
    })

    it('les étiquettes s’affichent avec la couleur du tag et un texte lisible', async () => {
      const { wrapper } = mountPage()
      await flushPromises()
      const tag = wrapper.findAll('span.rounded-full').find((s) => s.text() === 'cours')
      expect(tag.element.style.backgroundColor).toBe('rgb(17, 34, 51)')
      expect(tag.element.style.color).not.toBe('')
    })
  })

  describe('accessibilité clavier (RGAA 7.1, 12.x)', () => {
    it('chaque en-tête d’accordéon annonce son état et désigne le panneau qu’il commande', async () => {
      const { wrapper } = mountPage()
      await flushPromises()
      const buttons = groupButtons(wrapper)
      expect(buttons.map((b) => b.attributes('aria-expanded'))).toEqual(['true', 'false', 'true', 'true'])
      buttons.forEach((b) => {
        const panelId = b.attributes('aria-controls')
        expect(panelId).toMatch(/^subject-panel-/)
        if (b.attributes('aria-expanded') === 'true') expect(wrapper.find(`#${panelId}`).exists()).toBe(true)
      })
    })

    it('replier met à jour aria-expanded', async () => {
      const { wrapper } = mountPage()
      await flushPromises()
      await groupButtons(wrapper)[0].trigger('click')
      expect(groupButtons(wrapper)[0].attributes('aria-expanded')).toBe('false')
    })

    it('chaque contenu est un vrai bouton (atteignable au clavier), le <li> lui-même n’est pas cliquable', async () => {
      const { wrapper } = mountPage()
      await flushPromises()
      const items = wrapper.findAll('li')
      expect(items.length).toBeGreaterThan(0)
      items.forEach((li) => {
        const btn = li.find('button')
        expect(btn.exists()).toBe(true)
        expect(btn.attributes('type')).toBe('button')
        expect(btn.text().length).toBeGreaterThan(0)
      })
    })
  })

  describe('navigation', () => {
    it('une carte mentale ouvre la page des cartes mentales', async () => {
      const { wrapper } = mountPage()
      await flushPromises()
      await wrapper.findAll('li button').find((b) => b.text().includes('Cinématique')).trigger('click')
      expect(mockPush).toHaveBeenCalledWith({ name: 'mindmaps' })
    })

    it('un système de Leitner ouvre sa page de cartes', async () => {
      const { wrapper } = mountPage()
      await flushPromises()
      await wrapper.findAll('li button').find((b) => b.text().includes('Atomes')).trigger('click')
      expect(mockPush).toHaveBeenCalledWith({ name: 'flashcards.cards', params: { systemId: 20 } })
    })

    it('un exercice ouvre son détail', async () => {
      const { wrapper } = mountPage()
      await flushPromises()
      await wrapper.findAll('li button').find((b) => b.text().includes('Contrôle 1')).trigger('click')
      expect(mockPush).toHaveBeenCalledWith({ name: 'exercise-detail', params: { id: 30 } })
    })
  })

  describe('recherche', () => {
    it('le champ de recherche a un nom accessible (RGAA 11.1)', () => {
      const { wrapper } = mountPage()
      expect(wrapper.find('input').attributes('aria-label')).toBe('Rechercher dans tous les contenus')
    })

    it('la recherche est différée de 300 ms (anti-rebond) et nettoie la saisie', async () => {
      const { wrapper, search } = mountPage()
      await flushPromises()
      search.searchAll.mockClear()
      await wrapper.find('input').setValue('  new')
      await wrapper.find('input').setValue('  newton  ')
      vi.advanceTimersByTime(299)
      expect(search.searchAll).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1)
      expect(search.searchAll).toHaveBeenCalledTimes(1)
      expect(search.searchAll).toHaveBeenCalledWith({ q: 'newton' })
    })

    it('une saisie vide relance la recherche sans filtre (q = null)', async () => {
      const { wrapper, search } = mountPage()
      await flushPromises()
      await wrapper.find('input').setValue('abc')
      vi.advanceTimersByTime(300)
      search.searchAll.mockClear()
      await wrapper.find('input').setValue('   ')
      vi.advanceTimersByTime(300)
      expect(search.searchAll).toHaveBeenCalledWith({ q: null })
    })

    it('pendant une recherche, masque les sujets sans résultat et compte les résultats', async () => {
      const { wrapper } = mountPage()
      await flushPromises()
      await wrapper.find('input').setValue('cin')
      expect(names(wrapper)).toEqual(['Chimie', 'Physique', 'Sans sujet'])
      expect(wrapper.text()).toMatch(/4\s*résultats\s*pour « cin »/)
    })

    it('« Effacer la recherche » vide le champ et n’apparaît que s’il y a une saisie', async () => {
      const { wrapper } = mountPage()
      expect(wrapper.find('button[aria-label="Effacer la recherche"]').exists()).toBe(false)
      await wrapper.find('input').setValue('x')
      await wrapper.find('button[aria-label="Effacer la recherche"]').trigger('click')
      expect(wrapper.find('input').element.value).toBe('')
    })

    it('aucun résultat - message avec la requête', async () => {
      const { wrapper } = mountPage({ results: { mindMaps: [], leitnerSystems: [], tests: [] }, subjects: [] })
      await flushPromises()
      await wrapper.find('input').setValue('zzz')
      expect(wrapper.text()).toContain('Aucun contenu trouvé pour « zzz ».')
      // accord français : « 0 résultat » (singulier), pas « 0 résultats »
      expect(wrapper.text()).toMatch(/0\s*résultat\s+pour/)
    })

    it('aucun contenu du tout - message sans requête', async () => {
      const { wrapper } = mountPage({ results: { mindMaps: [], leitnerSystems: [], tests: [] }, subjects: [] })
      await flushPromises()
      expect(wrapper.text()).toContain('Aucun contenu trouvé.')
    })
  })
})

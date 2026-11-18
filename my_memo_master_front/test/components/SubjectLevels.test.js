import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import axe from 'axe-core'
import SubjectLevels from '@/components/badges/SubjectLevels.vue'
import { useBadgesStore } from '@/stores/badges'
import { nextLevelRequirements, subjectStatsText } from '@/helpers/subjectLevels'

const api = vi.hoisted(() => ({ subjectLevels: vi.fn(), settings: vi.fn(), notify: vi.fn() }))
vi.mock('@/helpers/badgesApi', () => ({ badgesApi: api }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: api.notify } }))

const ok = (data) => ({ status: 200, data })
const SETTINGS = { zenMode: false, animationsEnabled: true }
const ROWS = [
  {
    subjectId: 1, name: 'Mathématiques', rank: 2, level: { code: 'confirmed', label: 'Confirmé', icon: '🎯' },
    stats: { masteredCards: 60, totalCards: 80, exercises: 6, averagePercent: 70 },
    next: { code: 'expert', label: 'Expert', icon: '🏅', mode: 'both', cards: { current: 60, target: 150 }, exercises: { current: 6, target: 10 }, averagePercent: { current: 70, target: 80 } },
  },
  {
    subjectId: 2, name: 'Physique', rank: 1, level: { code: 'initiate', label: 'Initié', icon: '📘' },
    stats: { masteredCards: 0, totalCards: 0, exercises: 2, averagePercent: 63 },
    next: { code: 'confirmed', label: 'Confirmé', icon: '🎯', mode: 'both', cards: { current: 0, target: 50 }, exercises: { current: 2, target: 5 }, averagePercent: { current: 63, target: 65 } },
  },
  {
    subjectId: 3, name: 'Histoire', rank: 3, level: { code: 'expert', label: 'Expert', icon: '🏅' },
    stats: { masteredCards: 200, totalCards: 210, exercises: 12, averagePercent: 90 },
    next: null,
  },
]

const AXE_OPTIONS = { rules: { 'color-contrast': { enabled: false }, region: { enabled: false }, 'page-has-heading-one': { enabled: false } } }
const runAxe = async (element) => (await axe.run(element, AXE_OPTIONS)).violations.map((v) => `${v.id} : ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)

let wrapper
const mountIt = async () => {
  wrapper = mount(SubjectLevels, { global: { plugins: [createPinia()] }, attachTo: document.body })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
  api.settings.mockResolvedValue(ok(SETTINGS))
  api.subjectLevels.mockResolvedValue(ok(ROWS))
})

afterEach(() => {
  wrapper?.unmount()
  document.body.innerHTML = ''
})

describe('helpers/subjectLevels', () => {
  it('nextLevelRequirements - niveau maximal ou absent - null', () => {
    expect(nextLevelRequirements(null)).toBeNull()
    expect(nextLevelRequirements(undefined)).toBeNull()
  })

  it('nextLevelRequirements - trois conditions, atteintes ou non, avec la règle ET', () => {
    const result = nextLevelRequirements(ROWS[1].next)

    expect(result.rule).toContain('cartes ET les exercices')
    expect(result.items.map((i) => [i.key, i.met])).toEqual([['cards', false], ['exercises', false], ['average', false]])
    expect(result.items[2]).toMatchObject({ current: 63, target: 65, unit: ' %' })
  })

  it('nextLevelRequirements - mode « either » - règle OU, condition atteinte reconnue', () => {
    const result = nextLevelRequirements({ mode: 'either', cards: { current: 12, target: 10 }, exercises: { current: 0, target: 2 }, averagePercent: { current: 0, target: 50 } })

    expect(result.rule).toContain('cartes OU les exercices')
    expect(result.items[0].met).toBe(true)
  })

  it('subjectStatsText - cartes et exercices, singulier et pluriel', () => {
    expect(subjectStatsText({ masteredCards: 12, totalCards: 15, exercises: 2, averagePercent: 63 })).toBe('12 cartes maîtrisées sur 15 · 2 exercices, moyenne 63 %')
    expect(subjectStatsText({ masteredCards: 1, totalCards: 3, exercises: 1, averagePercent: 80 })).toBe('1 carte maîtrisée sur 3 · 1 exercice, moyenne 80 %')
    expect(subjectStatsText({ masteredCards: 0, totalCards: 0, exercises: 4, averagePercent: 50 })).toBe('4 exercices, moyenne 50 %')
    expect(subjectStatsText({ masteredCards: 5, totalCards: 5, exercises: 0, averagePercent: 0 })).toBe('5 cartes maîtrisées sur 5')
  })
})

describe('store — fetchSubjectLevels', () => {
  it('réponse valide - stocke les matières, sans erreur', async () => {
    const store = useBadgesStore()

    expect(await store.fetchSubjectLevels()).toBe(true)
    expect(store.subjectLevels).toHaveLength(3)
    expect(store.subjectLevelsError).toBe(false)
  })

  it('erreur serveur, réseau ou réponse invalide - false et erreur signalée', async () => {
    const store = useBadgesStore()
    api.subjectLevels.mockResolvedValueOnce({ status: 500 })
    expect(await store.fetchSubjectLevels()).toBe(false)
    expect(store.subjectLevelsError).toBe(true)
    api.subjectLevels.mockRejectedValueOnce(new Error('réseau'))
    expect(await store.fetchSubjectLevels()).toBe(false)
    api.subjectLevels.mockResolvedValueOnce(ok({ pas: 'un tableau' }))
    expect(await store.fetchSubjectLevels()).toBe(false)
    expect(store.subjectLevels).toBeNull()
  })

  it('reset - vide les niveaux (changement de compte)', async () => {
    const store = useBadgesStore()
    await store.fetchSubjectLevels()

    store.reset()

    expect(store.subjectLevels).toBeNull()
  })
})

describe('SubjectLevels — niveau par matière (B1)', () => {
  it('une ligne par matière avec niveau en texte et synthèse', async () => {
    await mountIt()

    const maths = wrapper.find('[data-testid="subject-level-1"]')
    expect(maths.text()).toContain('Mathématiques')
    expect(maths.text()).toContain('Confirmé')
    expect(maths.text()).toContain('60 cartes maîtrisées sur 80 · 6 exercices, moyenne 70 %')
    expect(wrapper.findAll('[data-testid^="subject-level-"]')).toHaveLength(3)
  })

  it('prochain niveau - conditions en jauges nommées, « atteint » signalé en texte', async () => {
    await mountIt()

    const physique = wrapper.find('[data-testid="subject-level-2"]')
    expect(physique.text()).toContain('Prochain niveau : Confirmé')
    expect(physique.text()).toContain('cartes ET les exercices')
    const bars = physique.findAll('progress')
    expect(bars).toHaveLength(3)
    expect(bars[0].attributes('aria-label')).toBe('Physique — Cartes maîtrisées pour Confirmé')
    expect(bars[0].attributes('max')).toBe('50')
  })

  it('niveau maximal - message dédié, aucune jauge', async () => {
    await mountIt()

    const histoire = wrapper.find('[data-testid="subject-level-3"]')
    expect(histoire.text()).toContain('Niveau maximal atteint')
    expect(histoire.findAll('progress')).toHaveLength(0)
  })

  it('compte sans activité - message d’invitation, sans reproche', async () => {
    api.subjectLevels.mockResolvedValue(ok([]))
    await mountIt()

    expect(wrapper.find('[data-testid="subject-levels-empty"]').text()).toContain('révise des cartes ou termine un exercice')
  })

  it('erreur de chargement - alerte et bouton Réessayer qui recharge', async () => {
    api.subjectLevels.mockResolvedValueOnce({ status: 500 })
    await mountIt()
    expect(wrapper.find('[role="alert"]').text()).toContain('Impossible de charger')

    await wrapper.find('[role="alert"] button').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-testid^="subject-level-"]')).toHaveLength(3)
  })

  it('mode zen - section masquée', async () => {
    api.settings.mockResolvedValue(ok({ ...SETTINGS, zenMode: true }))
    await mountIt()

    expect(wrapper.find('[data-testid="subject-levels"]').exists()).toBe(false)
  })

  it('axe - aucune violation', async () => {
    await mountIt()

    expect(await runAxe(wrapper.element)).toEqual([])
  })
})

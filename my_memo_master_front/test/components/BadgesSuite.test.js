import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import BadgeCelebration from '@/components/badges/BadgeCelebration.vue'
import DailyGoalRing from '@/components/badges/DailyGoalRing.vue'
import BadgeDetailModal from '@/components/badges/BadgeDetailModal.vue'
import GamificationSettings from '@/components/badges/GamificationSettings.vue'
import { useBadgesStore } from '@/stores/badges'
import { useAuthStore } from '@/stores/auth'
import { dailyGoalProgress, earnedSubjectNames } from '@/helpers/badges'

const api = vi.hoisted(() => ({
  list: vi.fn(),
  summary: vi.fn(),
  markSeen: vi.fn(),
  settings: vi.fn(),
  updateSettings: vi.fn(),
  dailyGoal: vi.fn(),
  recent: vi.fn(),
  notify: vi.fn(),
}))

vi.mock('@/helpers/badgesApi', () => ({ badgesApi: api }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: api.notify } }))
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal()),
  useRoute: () => ({ fullPath: '/' }),
}))

const ok = (data) => ({ status: 200, data })
const SETTINGS = { dailyGoalCards: 0, dailyGoalExercises: 0, streakReminderEnabled: false, badgesVisibleToTeachers: false, animationsEnabled: true, zenMode: false }
const RECENT = [
  { code: 'streak3', label: 'Premier élan', icon: '✨', rarity: 'common', description: 'Pratiquer 3 jours de suite' },
  { code: 'streak7', label: '7 jours de suite', icon: '🔥', rarity: 'rare', description: 'Pratiquer 7 jours consécutifs' },
]
const RouterLinkStub = { props: ['to'], template: '<a data-testid="link" @click="$emit(\'click\')"><slot /></a>' }

function mountWith(component, props = {}) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const wrapper = mount(component, { props, global: { plugins: [pinia], stubs: { RouterLink: RouterLinkStub } }, attachTo: document.body })
  return wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
  api.settings.mockResolvedValue(ok(SETTINGS))
  api.dailyGoal.mockResolvedValue(ok({ date: '2026-11-16', cards: { goal: 10, done: 4 }, exercises: { goal: 2, done: 1 }, achieved: false }))
  api.recent.mockResolvedValue(ok(RECENT))
  api.markSeen.mockResolvedValue(ok({ updated: 2 }))
  api.updateSettings.mockImplementation(async (patch) => ok({ message: 'ok', ...SETTINGS, ...patch }))
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('helpers — objectif quotidien et matières d\'obtention', () => {
  it('dailyGoalProgress - aucun objectif - inactif', () => {
    expect(dailyGoalProgress(null)).toEqual({ active: false, percent: 0, achieved: false, text: '' })
    expect(dailyGoalProgress({ cards: { goal: 0, done: 9 }, exercises: { goal: 0, done: 3 } }).active).toBe(false)
  })

  it('dailyGoalProgress - deux objectifs partiels - pourcentage cumulé et texte', () => {
    const result = dailyGoalProgress({ cards: { goal: 10, done: 4 }, exercises: { goal: 2, done: 1 } })

    expect(result).toEqual({ active: true, percent: 42, achieved: false, text: '4 / 10 cartes · 1 / 2 exercices' })
  })

  it('dailyGoalProgress - dépasser les cartes ne compense pas les exercices manquants', () => {
    const result = dailyGoalProgress({ cards: { goal: 10, done: 50 }, exercises: { goal: 10, done: 0 } })

    expect(result.percent).toBe(50)
    expect(result.achieved).toBe(false)
  })

  it('dailyGoalProgress - un seul objectif atteint - 100 % et atteint', () => {
    const result = dailyGoalProgress({ cards: { goal: 5, done: 5 }, exercises: { goal: 0, done: 0 } })

    expect(result).toMatchObject({ percent: 100, achieved: true, text: '5 / 5 cartes' })
  })

  it('earnedSubjectNames - noms joints, vides ignorés', () => {
    expect(earnedSubjectNames({ earnedSubjects: [{ name: 'Maths' }, { name: null }, { name: 'Physique' }] })).toBe('Maths, Physique')
    expect(earnedSubjectNames({})).toBe('')
    expect(earnedSubjectNames(null)).toBe('')
  })
})

describe('store badges — objectif quotidien et badges à fêter', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('fetchDailyGoal - réponse valide - stocke la progression', async () => {
    const store = useBadgesStore()

    expect(await store.fetchDailyGoal()).toBe(true)
    expect(store.dailyGoal.cards).toEqual({ goal: 10, done: 4 })
  })

  it('fetchDailyGoal - erreur serveur ou réseau - false, rien de stocké', async () => {
    const store = useBadgesStore()
    api.dailyGoal.mockResolvedValueOnce({ status: 500 })
    expect(await store.fetchDailyGoal()).toBe(false)
    api.dailyGoal.mockRejectedValueOnce(new Error('réseau'))
    expect(await store.fetchDailyGoal()).toBe(false)
    expect(store.dailyGoal).toBeNull()
  })

  it('fetchCelebrations - animations actives - charge les badges à fêter', async () => {
    const store = useBadgesStore()

    expect(await store.fetchCelebrations(true)).toBe(true)
    expect(store.celebrations).toHaveLength(2)
  })

  it('fetchCelebrations - mode zen - aucun appel à recent', async () => {
    api.settings.mockResolvedValue(ok({ ...SETTINGS, zenMode: true }))
    const store = useBadgesStore()

    expect(await store.fetchCelebrations(true)).toBe(false)
    expect(api.recent).not.toHaveBeenCalled()
    expect(store.celebrations).toEqual([])
  })

  it('fetchCelebrations - animations désactivées - aucun appel à recent', async () => {
    api.settings.mockResolvedValue(ok({ ...SETTINGS, animationsEnabled: false }))
    const store = useBadgesStore()

    expect(await store.fetchCelebrations(true)).toBe(false)
    expect(api.recent).not.toHaveBeenCalled()
  })

  it('fetchCelebrations - appels rapprochés - un seul appel API dans les 30 s', async () => {
    const store = useBadgesStore()

    await store.fetchCelebrations()
    await store.fetchCelebrations()

    expect(api.recent).toHaveBeenCalledTimes(1)
  })

  it('dismissCelebrations - marque les badges comme vus et vide la liste', async () => {
    const store = useBadgesStore()
    store.badges = [{ code: 'streak3', earned: true, seenAt: null }]
    await store.fetchCelebrations(true)

    expect(await store.dismissCelebrations()).toBe(true)

    expect(api.markSeen).toHaveBeenCalledWith(['streak3', 'streak7'])
    expect(store.celebrations).toEqual([])
    expect(store.badges[0].seenAt).not.toBeNull()
  })

  it('dismissCelebrations - échec d\'enregistrement - la liste est vidée, aucune erreur affichée', async () => {
    const store = useBadgesStore()
    await store.fetchCelebrations(true)
    api.markSeen.mockResolvedValueOnce({ status: 500 })

    expect(await store.dismissCelebrations()).toBe(false)
    expect(store.celebrations).toEqual([])
    expect(api.notify).not.toHaveBeenCalled()
  })

  it('reset - vide objectif quotidien et badges à fêter', async () => {
    const store = useBadgesStore()
    await store.fetchDailyGoal()
    await store.fetchCelebrations(true)

    store.reset()

    expect(store.dailyGoal).toBeNull()
    expect(store.celebrations).toEqual([])
  })
})

describe('BadgeCelebration', () => {
  async function mountCelebration({ authenticated = true } = {}) {
    const pinia = createPinia()
    setActivePinia(pinia)
    useAuthStore().authenticated = authenticated
    const wrapper = mount(BadgeCelebration, { global: { plugins: [pinia], stubs: { RouterLink: RouterLinkStub } }, attachTo: document.body })
    await flushPromises()
    return wrapper
  }

  it('badges non vus et animations actives - dialogue modal avec le premier badge et son compteur', async () => {
    const wrapper = await mountCelebration()

    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(dialog.text()).toContain('Premier élan')
    expect(dialog.text()).toContain('Nouveau badge (1 / 2)')
  })

  it('« Suivant » - affiche le badge suivant puis « Super ! » ferme et marque les deux comme vus', async () => {
    const wrapper = await mountCelebration()

    await wrapper.get('button.bg-primary').trigger('click')
    expect(wrapper.get('[role="dialog"]').text()).toContain('7 jours de suite')
    expect(wrapper.get('[role="dialog"]').text()).toContain('Rare')

    await wrapper.get('button.bg-primary').trigger('click')
    await flushPromises()

    expect(api.markSeen).toHaveBeenCalledWith(['streak3', 'streak7'])
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('« Suivant » - le bouton focalisé reste le même élément (Échap continue de fonctionner)', async () => {
    const wrapper = await mountCelebration()
    const button = wrapper.get('button.bg-primary')

    await button.trigger('click')

    expect(wrapper.get('button.bg-primary').element).toBe(button.element)
    expect(button.text()).toBe('Super !')
  })

  it('un seul badge - bouton « Super ! » directement, sans compteur', async () => {
    api.recent.mockResolvedValue(ok([RECENT[0]]))
    const wrapper = await mountCelebration()

    expect(wrapper.get('[role="dialog"]').text()).not.toContain('(1 / 1)')
    expect(wrapper.text()).toContain('Super !')
    expect(wrapper.text()).not.toContain('Suivant')
  })

  it('mode zen - aucune modale', async () => {
    api.settings.mockResolvedValue(ok({ ...SETTINGS, zenMode: true }))

    const wrapper = await mountCelebration()

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('animations désactivées - aucune modale et rien n\'est marqué comme vu', async () => {
    api.settings.mockResolvedValue(ok({ ...SETTINGS, animationsEnabled: false }))

    const wrapper = await mountCelebration()

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(api.markSeen).not.toHaveBeenCalled()
  })

  it('utilisateur non connecté - aucun appel API', async () => {
    await mountCelebration({ authenticated: false })

    expect(api.recent).not.toHaveBeenCalled()
  })

  it('aucun badge à fêter - aucune modale', async () => {
    api.recent.mockResolvedValue(ok([]))

    const wrapper = await mountCelebration()

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })
})

describe('DailyGoalRing', () => {
  it('objectifs définis - barre de progression nommée avec pourcentage et détail', async () => {
    api.settings.mockResolvedValue(ok({ ...SETTINGS, dailyGoalCards: 10, dailyGoalExercises: 2 }))
    const wrapper = mountWith(DailyGoalRing)
    await flushPromises()

    const bar = wrapper.get('[role="progressbar"]')
    expect(bar.attributes('aria-valuenow')).toBe('42')
    expect(bar.attributes('aria-labelledby')).toBe('daily-goal-title')
    expect(wrapper.text()).toContain('4 / 10 cartes · 1 / 2 exercices')
  })

  it('objectif atteint - message d\'encouragement', async () => {
    api.dailyGoal.mockResolvedValue(ok({ cards: { goal: 5, done: 5 }, exercises: { goal: 0, done: 0 }, achieved: true }))
    const wrapper = mountWith(DailyGoalRing)
    await flushPromises()

    expect(wrapper.text()).toContain('Objectif atteint')
  })

  it('aucun objectif - rien d\'affiché', async () => {
    api.dailyGoal.mockResolvedValue(ok({ cards: { goal: 0, done: 3 }, exercises: { goal: 0, done: 0 }, achieved: false }))
    const wrapper = mountWith(DailyGoalRing)
    await flushPromises()

    expect(wrapper.find('[data-testid="daily-goal"]').exists()).toBe(false)
  })

  it('mode zen - rien d\'affiché même avec des objectifs', async () => {
    api.settings.mockResolvedValue(ok({ ...SETTINGS, zenMode: true }))
    const wrapper = mountWith(DailyGoalRing)
    await flushPromises()

    expect(wrapper.find('[data-testid="daily-goal"]').exists()).toBe(false)
  })

  it('API indisponible - rien d\'affiché, aucune erreur', async () => {
    api.dailyGoal.mockRejectedValue(new Error('réseau'))
    const wrapper = mountWith(DailyGoalRing)
    await flushPromises()

    expect(wrapper.find('[data-testid="daily-goal"]').exists()).toBe(false)
  })
})

describe('BadgeDetailModal — Obtenu avec', () => {
  const badge = { code: 'tenTests', label: '10 exercices', icon: '📚', rarity: 'common', description: '10 séries', earned: true, earnedAt: '2026-10-12T10:00:00Z', progress: { current: 10, target: 10 } }

  it('badge obtenu avec des matières - noms affichés', () => {
    const wrapper = mountWith(BadgeDetailModal, { badge: { ...badge, earnedSubjects: [{ subjectId: 1, name: 'Maths' }, { subjectId: 2, name: 'Physique' }] } })

    expect(wrapper.get('[data-testid="earned-subjects"]').text()).toBe('Maths, Physique')
    expect(wrapper.text()).toContain('Obtenu avec')
  })

  it('badge sans matière (série) - pas de ligne « Obtenu avec »', () => {
    const wrapper = mountWith(BadgeDetailModal, { badge: { ...badge, earnedSubjects: [] } })

    expect(wrapper.text()).not.toContain('Obtenu avec')
  })

  it('badge non obtenu - pas de ligne « Obtenu avec »', () => {
    const wrapper = mountWith(BadgeDetailModal, { badge: { ...badge, earned: false, earnedSubjects: [{ name: 'Maths' }] } })

    expect(wrapper.text()).not.toContain('Obtenu avec')
  })
})

describe('GamificationSettings — objectifs', () => {
  it('enregistrement refusé - le champ revient à la valeur enregistrée', async () => {
    const wrapper = mountWith(GamificationSettings, { settings: { ...SETTINGS, dailyGoalCards: 10 } })
    const input = wrapper.get('input[max="500"]')

    input.element.value = '40'
    await input.trigger('change')
    const [patch, done] = wrapper.emitted('change')[0]
    expect(patch).toEqual({ dailyGoalCards: 40 })
    done(false)

    expect(input.element.value).toBe('10')
  })

  it('enregistrement réussi - la saisie est conservée', async () => {
    const wrapper = mountWith(GamificationSettings, { settings: { ...SETTINGS, dailyGoalCards: 10 } })
    const input = wrapper.get('input[max="500"]')

    input.element.value = '40'
    await input.trigger('change')
    wrapper.emitted('change')[0][1](true)

    expect(input.element.value).toBe('40')
  })

  it('valeur hors limites - ramenée au maximum avant l\'envoi', async () => {
    const wrapper = mountWith(GamificationSettings, { settings: SETTINGS })
    const input = wrapper.get('input[max="50"]')

    input.element.value = '999'
    await input.trigger('change')

    expect(wrapper.emitted('change')[0][0]).toEqual({ dailyGoalExercises: 50 })
  })

  it('le rappel de série et l\'objectif ne sont plus annoncés comme « pas encore actifs »', () => {
    const wrapper = mountWith(GamificationSettings, { settings: SETTINGS })

    expect(wrapper.text()).not.toContain("n'est pas encore")
    expect(wrapper.text()).not.toContain('pas encore actif')
  })
})

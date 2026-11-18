import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import axe from 'axe-core'
import StreakFlame from '@/components/badges/StreakFlame.vue'
import SessionEncouragement from '@/components/badges/SessionEncouragement.vue'
import BadgeCelebration from '@/components/badges/BadgeCelebration.vue'
import BadgeLevelHeader from '@/components/badges/BadgeLevelHeader.vue'
import AdminBadgesPanel from '@/components/admin/AdminBadgesPanel.vue'
import { useBadgesStore } from '@/stores/badges'
import { useAuthStore } from '@/stores/auth'
import { useSubjectStore } from '@/stores/subjects'
import { PRACTICE_EVENT } from '@/helpers/practiceEvents'
import { ENCOURAGEMENTS } from '@/helpers/gamificationMessages'

const api = vi.hoisted(() => ({
  list: vi.fn(),
  summary: vi.fn(),
  markSeen: vi.fn(),
  settings: vi.fn(),
  updateSettings: vi.fn(),
  dailyGoal: vi.fn(),
  recent: vi.fn(),
  sessionFeedback: vi.fn(),
  setSubjects: vi.fn(),
  notify: vi.fn(),
}))

vi.mock('@/helpers/badgesApi', () => ({ badgesApi: api }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: api.notify } }))
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal()),
  useRoute: () => ({ fullPath: '/' }),
}))

const ok = (data) => ({ status: 200, data })
const SETTINGS = {
  dailyGoalCards: 0,
  dailyGoalExercises: 0,
  streakReminderEnabled: false,
  badgesVisibleToTeachers: false,
  animationsEnabled: true,
  zenMode: false,
  timezone: null,
}
const SUMMARY = { level: { name: 'Curieux', next: null }, earnedCount: 3, totalCount: 14, streakCurrent: 4, streakBest: 9, practicedToday: true, freezes: { available: 1, max: 2, progress: 6, every: 14 } }
const FEEDBACK = { date: '2026-11-18', firstOfDay: true, practicesToday: 1, streakCurrent: 4, streakBest: 9, streakExtended: true, dailyGoalAchieved: true }
// Comme le vrai RouterLink : un lien avec href (sans href, l'élément n'a pas le rôle « lien » et aria-label y est interdit)
const RouterLinkStub = { props: ['to'], template: '<a href="/profile/badges" data-testid="link" @click="$emit(\'click\')"><slot /></a>' }

const AXE_OPTIONS = { rules: { 'color-contrast': { enabled: false }, region: { enabled: false }, 'page-has-heading-one': { enabled: false } } }
const runAxe = async (element) => (await axe.run(element, AXE_OPTIONS)).violations.map((v) => `${v.id} : ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)

let wrapper
let pinia

function mountWith(component, props = {}) {
  wrapper = mount(component, { props, global: { plugins: [pinia], stubs: { RouterLink: RouterLinkStub } }, attachTo: document.body })
  return wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
  pinia = createPinia()
  setActivePinia(pinia)
  api.summary.mockResolvedValue(ok(SUMMARY))
  api.settings.mockResolvedValue(ok(SETTINGS))
  api.sessionFeedback.mockResolvedValue(ok(FEEDBACK))
  api.recent.mockResolvedValue(ok([]))
  api.dailyGoal.mockResolvedValue(ok({ date: '2026-11-18', cards: { goal: 0, done: 0 }, exercises: { goal: 0, done: 0 }, achieved: false }))
  api.updateSettings.mockImplementation(async (patch) => ok({ message: 'ok', ...SETTINGS, ...patch }))
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

describe('store badges — série, fuseau, bilan de fin de session', () => {
  it('fetchStreak - résumé valide - stocke série, meilleure série et « pratiqué aujourd’hui »', async () => {
    const store = useBadgesStore()

    expect(await store.fetchStreak()).toBe(true)
    expect(store.streak).toEqual({ current: 4, best: 9, practicedToday: true, freezes: 1 })
  })

  it('fetchStreak - cache de 60 s - un second appel n’interroge pas l’API, sauf si forcé', async () => {
    const store = useBadgesStore()

    await store.fetchStreak()
    await store.fetchStreak()
    await store.fetchStreak(true)

    expect(api.summary).toHaveBeenCalledTimes(2)
  })

  it('fetchStreak - erreur serveur ou réseau - false, rien de stocké', async () => {
    const store = useBadgesStore()
    api.summary.mockResolvedValueOnce({ status: 500 })
    expect(await store.fetchStreak()).toBe(false)
    api.summary.mockRejectedValueOnce(new Error('réseau'))
    expect(await store.fetchStreak(true)).toBe(false)
    expect(store.streak).toBeNull()
  })

  it('syncTimezone - fuseau du navigateur différent - enregistré en silence (aucun toast)', async () => {
    const store = useBadgesStore()
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone

    expect(await store.syncTimezone()).toBe(true)

    expect(api.updateSettings).toHaveBeenCalledWith({ timezone: zone })
    expect(api.notify).not.toHaveBeenCalled()
  })

  it('syncTimezone - déjà enregistré - n’écrit rien, et une seule fois par session', async () => {
    const store = useBadgesStore()
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    api.settings.mockResolvedValue(ok({ ...SETTINGS, timezone: zone }))

    expect(await store.syncTimezone()).toBe(true)
    expect(await store.syncTimezone()).toBe(false)

    expect(api.updateSettings).not.toHaveBeenCalled()
  })

  it('syncTimezone - l’API refuse - false sans toast, et réessayé plus tard', async () => {
    const store = useBadgesStore()
    api.updateSettings.mockResolvedValueOnce({ status: 400, data: { message: 'invalide' } })

    expect(await store.syncTimezone()).toBe(false)
    expect(api.notify).not.toHaveBeenCalled()

    expect(await store.syncTimezone()).toBe(true)
    expect(api.updateSettings).toHaveBeenCalledTimes(2)
  })

  it('updateSettings - réglage de l’utilisateur - toast de confirmation conservé', async () => {
    const store = useBadgesStore()

    await store.updateSettings({ zenMode: true })

    expect(api.notify).toHaveBeenCalledWith('Réglage enregistré.', 'success')
  })

  it('fetchSessionFeedback - bilan renvoyé tel quel, rien de gardé dans le store', async () => {
    const store = useBadgesStore()

    expect(await store.fetchSessionFeedback()).toEqual(FEEDBACK)
    expect(store.$state.feedback).toBeUndefined()
  })

  it('fetchSessionFeedback - mode zen - null, l’API n’est pas appelée', async () => {
    const store = useBadgesStore()
    api.settings.mockResolvedValue(ok({ ...SETTINGS, zenMode: true }))

    expect(await store.fetchSessionFeedback()).toBeNull()
    expect(api.sessionFeedback).not.toHaveBeenCalled()
  })

  it('fetchSessionFeedback - erreur - null', async () => {
    const store = useBadgesStore()
    api.sessionFeedback.mockResolvedValueOnce({ status: 500 })
    expect(await store.fetchSessionFeedback()).toBeNull()
    api.sessionFeedback.mockRejectedValueOnce(new Error('réseau'))
    expect(await store.fetchSessionFeedback()).toBeNull()
  })

  it('refreshAfterPractice - recharge série et badges à fêter (cache contourné), objectif seulement s’il est affiché', async () => {
    const store = useBadgesStore()
    store._fetchedAt = Date.now()
    await store.fetchStreak()
    api.summary.mockClear()

    await store.refreshAfterPractice()

    expect(api.summary).toHaveBeenCalledTimes(1)
    expect(api.recent).toHaveBeenCalledTimes(1)
    expect(api.dailyGoal).not.toHaveBeenCalled()
    expect(store._fetchedAt).toBe(0)

    await store.fetchDailyGoal()
    api.dailyGoal.mockClear()
    await store.refreshAfterPractice()
    expect(api.dailyGoal).toHaveBeenCalledTimes(1)
  })

  it('reset - vide la série et le fuseau mémorisé (changement de compte)', async () => {
    const store = useBadgesStore()
    await store.fetchStreak()
    await store.syncTimezone()

    store.reset()

    expect(store.streak).toBeNull()
    expect(store._timezoneSynced).toBeNull()
  })
})

describe('StreakFlame — flamme de série (A2)', () => {
  const connect = () => {
    useAuthStore().authenticated = true
  }

  it('série prolongée aujourd’hui - flamme et nombre, trait plein, libellé accessible', async () => {
    connect()
    mountWith(StreakFlame)
    await flushPromises()

    const flame = wrapper.find('[data-testid="streak-flame"]')
    expect(flame.exists()).toBe(true)
    expect(flame.text()).toContain('4')
    expect(flame.classes()).toContain('border-primary')
    expect(flame.attributes('aria-label')).toContain('Série de 4 jours, déjà prolongée aujourd\'hui.')
  })

  it('gel de série en réserve - affiché avec son nombre, annoncé dans le libellé', async () => {
    connect()
    mountWith(StreakFlame)
    await flushPromises()

    expect(wrapper.find('[data-testid="streak-freezes"]').text()).toContain('1')
    expect(wrapper.find('[data-testid="streak-flame"]').attributes('aria-label')).toContain('1 gel de série en réserve.')
  })

  it('aucun gel - rien d’affiché pour les gels', async () => {
    connect()
    api.summary.mockResolvedValue(ok({ ...SUMMARY, freezes: { available: 0, max: 2, progress: 3, every: 14 } }))
    mountWith(StreakFlame)
    await flushPromises()

    expect(wrapper.find('[data-testid="streak-freezes"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="streak-flame"]').attributes('aria-label')).not.toContain('gel')
  })

  it('série à prolonger - pointillé et libellé qui l’explique, sans reproche', async () => {
    connect()
    api.summary.mockResolvedValue(ok({ ...SUMMARY, practicedToday: false }))
    mountWith(StreakFlame)
    await flushPromises()

    const flame = wrapper.find('[data-testid="streak-flame"]')
    expect(flame.classes()).toContain('border-dashed')
    expect(flame.attributes('aria-label')).toContain('la prolonge')
    expect(flame.attributes('aria-label')).toContain('Un jour manqué par semaine est toléré.')
  })

  it('série nulle - rien d’affiché', async () => {
    connect()
    api.summary.mockResolvedValue(ok({ ...SUMMARY, streakCurrent: 0, practicedToday: false }))
    mountWith(StreakFlame)
    await flushPromises()

    expect(wrapper.find('[data-testid="streak-flame"]').exists()).toBe(false)
  })

  it('mode zen - masquée', async () => {
    connect()
    api.settings.mockResolvedValue(ok({ ...SETTINGS, zenMode: true }))
    mountWith(StreakFlame)
    await flushPromises()

    expect(wrapper.find('[data-testid="streak-flame"]').exists()).toBe(false)
  })

  it('utilisateur non connecté - aucun appel API', async () => {
    mountWith(StreakFlame)
    await flushPromises()

    expect(api.summary).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="streak-flame"]').exists()).toBe(false)
  })

  it('axe - aucune violation', async () => {
    connect()
    mountWith(StreakFlame)
    await flushPromises()

    expect(await runAxe(wrapper.element)).toEqual([])
  })
})

describe('SessionEncouragement — fin de session (F4 + G2)', () => {
  it('pas encore enregistrée - aucun appel, zone aria-live présente mais vide', async () => {
    mountWith(SessionEncouragement, { ready: false, scorePercent: 95 })
    await flushPromises()

    expect(api.sessionFeedback).not.toHaveBeenCalled()
    expect(wrapper.find('[aria-live="polite"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-encouragement"]').exists()).toBe(false)
  })

  it('session enregistrée, première du jour - bonus, message de score, série et objectif', async () => {
    mountWith(SessionEncouragement, { ready: true, scorePercent: 95 })
    await flushPromises()

    expect(wrapper.find('[data-testid="first-of-day"]').exists()).toBe(true)
    expect(ENCOURAGEMENTS.excellent).toContain(wrapper.find('[data-testid="encouragement-message"]').text())
    expect(wrapper.find('[data-testid="encouragement-streak"]').text()).toContain('Ta série passe à 4 jours.')
    expect(wrapper.find('[data-testid="encouragement-goal"]').text()).toContain('Objectif du jour atteint')
  })

  it('gel de série utilisé ou gagné - ligne dédiée', async () => {
    api.sessionFeedback.mockResolvedValue(ok({ ...FEEDBACK, freezeUsed: true }))
    mountWith(SessionEncouragement, { ready: true, scorePercent: 80 })
    await flushPromises()
    expect(wrapper.find('[data-testid="encouragement-freeze"]').text()).toContain('Un gel de série a protégé ta série')
    wrapper.unmount()

    pinia = createPinia()
    setActivePinia(pinia)
    api.settings.mockResolvedValue(ok(SETTINGS))
    api.sessionFeedback.mockResolvedValue(ok({ ...FEEDBACK, freezeEarned: true }))
    mountWith(SessionEncouragement, { ready: true, scorePercent: 80 })
    await flushPromises()
    expect(wrapper.find('[data-testid="encouragement-freeze"]').text()).toContain('Tu as gagné un gel de série')
  })

  it('session suivante du jour - pas de bonus, message seul', async () => {
    api.sessionFeedback.mockResolvedValue(ok({ ...FEEDBACK, firstOfDay: false, practicesToday: 3, streakExtended: false, dailyGoalAchieved: false }))
    mountWith(SessionEncouragement, { ready: true, scorePercent: 40 })
    await flushPromises()

    expect(wrapper.find('[data-testid="first-of-day"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="encouragement-streak"]').exists()).toBe(false)
    expect(ENCOURAGEMENTS.effort).toContain(wrapper.find('[data-testid="encouragement-message"]').text())
  })

  it('prêt après coup - le bilan n’est demandé qu’une fois la session enregistrée', async () => {
    mountWith(SessionEncouragement, { ready: false })
    await flushPromises()
    expect(api.sessionFeedback).not.toHaveBeenCalled()

    await wrapper.setProps({ ready: true })
    await flushPromises()

    expect(api.sessionFeedback).toHaveBeenCalledTimes(1)
  })

  it('recommencer - le bilan de la session suivante est redemandé', async () => {
    mountWith(SessionEncouragement, { ready: true, scorePercent: 80 })
    await flushPromises()

    await wrapper.setProps({ ready: false })
    expect(wrapper.find('[data-testid="session-encouragement"]').exists()).toBe(false)
    await wrapper.setProps({ ready: true })
    await flushPromises()

    expect(api.sessionFeedback).toHaveBeenCalledTimes(2)
  })

  it('mode zen ou erreur API - rien d’affiché', async () => {
    api.settings.mockResolvedValue(ok({ ...SETTINGS, zenMode: true }))
    mountWith(SessionEncouragement, { ready: true, scorePercent: 80 })
    await flushPromises()
    expect(wrapper.find('[data-testid="session-encouragement"]').exists()).toBe(false)
    wrapper.unmount()

    pinia = createPinia()
    setActivePinia(pinia)
    api.settings.mockResolvedValue(ok(SETTINGS))
    api.sessionFeedback.mockResolvedValue({ status: 500 })
    mountWith(SessionEncouragement, { ready: true, scorePercent: 80 })
    await flushPromises()
    expect(wrapper.find('[data-testid="session-encouragement"]').exists()).toBe(false)
  })

  it('axe - aucune violation', async () => {
    mountWith(SessionEncouragement, { ready: true, scorePercent: 95 })
    await flushPromises()

    expect(await runAxe(wrapper.element)).toEqual([])
  })
})

describe('BadgeLevelHeader — gels de série (A3)', () => {
  const mountHeader = (summary) => mountWith(BadgeLevelHeader, { summary })

  it('gels renvoyés par l’API - réserve, prochain gel et règle expliqués', () => {
    mountHeader({ ...SUMMARY, freezes: { available: 1, max: 2, progress: 6, every: 14 } })

    const text = wrapper.find('[data-testid="freeze-summary"]').text()
    expect(text).toContain('1 gel de série en réserve.')
    expect(text).toContain('Le prochain arrive dans 8 jours de série.')
    expect(text).toContain("ne s'achète pas")
  })

  it('réserve pleine - maximum signalé, pas de « prochain gel »', () => {
    mountHeader({ ...SUMMARY, freezes: { available: 2, max: 2, progress: 0, every: 14 } })

    const text = wrapper.find('[data-testid="freeze-summary"]').text()
    expect(text).toContain('2 gels de série en réserve (maximum atteint).')
    expect(text).not.toContain('prochain')
  })

  it('API sans le champ freezes - bloc masqué', () => {
    const { freezes, ...without } = SUMMARY
    mountHeader(without)

    expect(freezes).toBeDefined()
    expect(wrapper.find('[data-testid="freeze-summary"]').exists()).toBe(false)
  })
})

describe('BadgeCelebration — temps réel et fuseau', () => {
  const connect = () => {
    useAuthStore().authenticated = true
  }

  it('pratique enregistrée - badges à fêter recherchés tout de suite, sans changer de page', async () => {
    connect()
    mountWith(BadgeCelebration)
    await flushPromises()
    api.recent.mockClear()
    api.recent.mockResolvedValue(ok([{ code: 'streak3', label: 'Premier élan', icon: '✨', rarity: 'common', description: 'Pratiquer 3 jours de suite' }]))

    window.dispatchEvent(new CustomEvent(PRACTICE_EVENT))
    await flushPromises()

    expect(api.recent).toHaveBeenCalledTimes(1)
    expect(wrapper.find('[data-testid="badge-celebration"]').exists()).toBe(true)
  })

  it('pratique enregistrée - la série est rafraîchie', async () => {
    connect()
    mountWith(BadgeCelebration)
    await flushPromises()
    api.summary.mockClear()

    window.dispatchEvent(new CustomEvent(PRACTICE_EVENT))
    await flushPromises()

    expect(api.summary).toHaveBeenCalledTimes(1)
  })

  it('utilisateur déconnecté - l’événement est ignoré', async () => {
    mountWith(BadgeCelebration)
    await flushPromises()

    window.dispatchEvent(new CustomEvent(PRACTICE_EVENT))
    await flushPromises()

    expect(api.recent).not.toHaveBeenCalled()
    expect(api.summary).not.toHaveBeenCalled()
  })

  it('démontage - n’écoute plus l’événement', async () => {
    connect()
    mountWith(BadgeCelebration)
    await flushPromises()
    wrapper.unmount()
    wrapper = null
    api.summary.mockClear()

    window.dispatchEvent(new CustomEvent(PRACTICE_EVENT))
    await flushPromises()

    expect(api.summary).not.toHaveBeenCalled()
  })

  it('connexion - le fuseau du navigateur est envoyé', async () => {
    connect()
    mountWith(BadgeCelebration)
    await flushPromises()

    expect(api.updateSettings).toHaveBeenCalledWith({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })
  })
})

describe('AdminBadgesPanel — liens badge ↔ matières', () => {
  const BADGES = [
    { code: 'subjectExplorer', label: 'Explorateur', icon: '🧭', description: 'Pratiquer plusieurs matières', scopable: true, linkedSubjectIds: [1] },
    { code: 'streak7', label: '7 jours', icon: '🔥', description: 'Série', scopable: false, linkedSubjectIds: [] },
    { code: 'firstExercise', label: 'Premier exercice', icon: '✏️', description: 'Un exercice', scopable: true, linkedSubjectIds: [] },
  ]
  const SUBJECTS = [{ subjectId: 1, name: 'Maths' }, { subjectId: 2, name: 'Physique' }]

  beforeEach(() => {
    api.list.mockResolvedValue(ok(BADGES))
    api.setSubjects.mockImplementation(async (code, subjectIds) => ok({ message: 'ok', subjectIds }))
    vi.spyOn(useSubjectStore(), 'fetchSubjects').mockImplementation(async function () {
      useSubjectStore().subjects = SUBJECTS
      return true
    })
  })

  const save = (code) => wrapper.find(`button[aria-label^="Enregistrer les matières du badge ${code}"]`)

  it('liste uniquement les badges restreignables, avec leurs matières déjà liées cochées', async () => {
    mountWith(AdminBadgesPanel)
    await flushPromises()

    const items = wrapper.findAll('[data-testid="admin-badge-list"] > li')
    expect(items).toHaveLength(2)
    expect(wrapper.text()).not.toContain('7 jours')
    expect(wrapper.find('[data-testid="subject-subjectExplorer-1"]').element.checked).toBe(true)
    expect(wrapper.find('[data-testid="subject-subjectExplorer-2"]').element.checked).toBe(false)
  })

  it('Enregistrer - désactivé tant que rien n’a changé', async () => {
    mountWith(AdminBadgesPanel)
    await flushPromises()

    expect(save('Explorateur').attributes('disabled')).toBeDefined()
    await wrapper.find('[data-testid="subject-subjectExplorer-2"]').setValue(true)
    expect(save('Explorateur').attributes('disabled')).toBeUndefined()
    await wrapper.find('[data-testid="subject-subjectExplorer-2"]').setValue(false)
    expect(save('Explorateur').attributes('disabled')).toBeDefined()
  })

  it('cocher une matière puis enregistrer - envoie la liste complète et confirme', async () => {
    mountWith(AdminBadgesPanel)
    await flushPromises()

    await wrapper.find('[data-testid="subject-subjectExplorer-2"]').setValue(true)
    await save('Explorateur').trigger('click')
    await flushPromises()

    expect(api.setSubjects).toHaveBeenCalledWith('subjectExplorer', [1, 2])
    expect(api.notify).toHaveBeenCalledWith('Matières du badge enregistrées.', 'success')
    expect(save('Explorateur').attributes('disabled')).toBeDefined()
  })

  it('tout décocher - badge global (liste vide)', async () => {
    mountWith(AdminBadgesPanel)
    await flushPromises()

    await wrapper.find('[data-testid="subject-subjectExplorer-1"]').setValue(false)
    await save('Explorateur').trigger('click')
    await flushPromises()

    expect(api.setSubjects).toHaveBeenCalledWith('subjectExplorer', [])
    expect(wrapper.text()).toContain('Badge global')
  })

  it('refus de l’API - toast d’erreur, la sélection reste modifiable', async () => {
    api.setSubjects.mockResolvedValue({ status: 400, data: { message: 'Une ou plusieurs matières sont introuvables.' } })
    mountWith(AdminBadgesPanel)
    await flushPromises()

    await wrapper.find('[data-testid="subject-subjectExplorer-2"]').setValue(true)
    await save('Explorateur').trigger('click')
    await flushPromises()

    expect(api.notify).toHaveBeenCalledWith('Une ou plusieurs matières sont introuvables.', 'error')
    expect(save('Explorateur').attributes('disabled')).toBeUndefined()
  })

  it('chargement en échec - message et bouton Réessayer', async () => {
    api.list.mockResolvedValueOnce({ status: 500 })
    mountWith(AdminBadgesPanel)
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toContain('Impossible de charger')
    await wrapper.find('[role="alert"] button').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[data-testid="admin-badge-list"] > li')).toHaveLength(2)
  })

  it('aucune matière - message explicite, pas de liste', async () => {
    useSubjectStore().fetchSubjects.mockImplementation(async () => {
      useSubjectStore().subjects = []
      return true
    })
    mountWith(AdminBadgesPanel)
    await flushPromises()

    expect(wrapper.text()).toContain('Aucune matière n\'existe encore')
  })

  it('axe - aucune violation', async () => {
    mountWith(AdminBadgesPanel)
    await flushPromises()

    expect(await runAxe(wrapper.element)).toEqual([])
  })
})

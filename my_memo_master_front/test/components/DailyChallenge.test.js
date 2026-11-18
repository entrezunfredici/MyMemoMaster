import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import axe from 'axe-core'
import DailyChallenge from '@/components/badges/DailyChallenge.vue'
import SessionEncouragement from '@/components/badges/SessionEncouragement.vue'
import { useBadgesStore } from '@/stores/badges'
import { challengeText, sessionEncouragement } from '@/helpers/gamificationMessages'

const api = vi.hoisted(() => ({ dailyChallenge: vi.fn(), settings: vi.fn(), sessionFeedback: vi.fn(), recent: vi.fn(), summary: vi.fn(), notify: vi.fn() }))
vi.mock('@/helpers/badgesApi', () => ({ badgesApi: api }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: api.notify } }))

const ok = (data) => ({ status: 200, data })
const SETTINGS = { zenMode: false, animationsEnabled: true }
const CHALLENGE = { date: '2026-11-18', available: true, subject: { subjectId: 1, name: 'Mathématiques' }, daysSince: 12, done: false, practicesToday: 0 }
const RouterLinkStub = { props: ['to'], template: '<a :href="to" data-testid="link"><slot /></a>' }

const AXE_OPTIONS = { rules: { 'color-contrast': { enabled: false }, region: { enabled: false }, 'page-has-heading-one': { enabled: false } } }
const runAxe = async (element) => (await axe.run(element, AXE_OPTIONS)).violations.map((v) => `${v.id} : ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)

let wrapper
const mountIt = async () => {
  wrapper = mount(DailyChallenge, { global: { plugins: [createPinia()], stubs: { RouterLink: RouterLinkStub } }, attachTo: document.body })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
  api.settings.mockResolvedValue(ok(SETTINGS))
  api.dailyChallenge.mockResolvedValue(ok(CHALLENGE))
  api.recent.mockResolvedValue(ok([]))
  api.summary.mockResolvedValue(ok({ streakCurrent: 0, streakBest: 0 }))
})

afterEach(() => {
  wrapper?.unmount()
  document.body.innerHTML = ''
})

describe('challengeText', () => {
  it('aucun défi - chaîne vide', () => {
    expect(challengeText(null)).toBe('')
    expect(challengeText({ available: false })).toBe('')
    expect(challengeText({ available: true, subject: null })).toBe('')
  })

  it('matière délaissée - ancienneté, formulation sans reproche', () => {
    const text = challengeText(CHALLENGE)

    expect(text).toContain('12 jours')
    expect(text).toContain('Mathématiques')
    expect(text).not.toMatch(/retard|paresse|honte|oubli/i)
  })

  it('matière jamais pratiquée - invitation à commencer', () => {
    expect(challengeText({ ...CHALLENGE, daysSince: null })).toContain("pas encore commencé à réviser Mathématiques")
  })

  it('défi relevé - félicitation', () => {
    expect(challengeText({ ...CHALLENGE, done: true })).toBe("Défi relevé : tu as pratiqué Mathématiques aujourd'hui. Bravo !")
  })

  it('nom de matière absent - formulation de repli', () => {
    expect(challengeText({ ...CHALLENGE, subject: { name: null } })).toContain('cette matière')
  })
})

describe('sessionEncouragement — défi du jour', () => {
  const base = { date: '2026-11-18', practicesToday: 1, streakCurrent: 1 }

  it('défi relevé par cette session - ligne avec la matière', () => {
    expect(sessionEncouragement({ ...base, challengeDone: true, challengeSubject: 'Maths' }).challenge).toBe('Défi du jour relevé : Maths !')
  })

  it('matière inconnue - ligne sans nom ; pas de défi - null', () => {
    expect(sessionEncouragement({ ...base, challengeDone: true, challengeSubject: null }).challenge).toBe('Défi du jour relevé !')
    expect(sessionEncouragement(base).challenge).toBeNull()
  })

  it('composant - la ligne s’affiche', async () => {
    api.sessionFeedback.mockResolvedValue(ok({ ...base, challengeDone: true, challengeSubject: 'Maths' }))
    wrapper = mount(SessionEncouragement, { props: { ready: true, scorePercent: 80 }, global: { plugins: [createPinia()] } })
    await flushPromises()

    expect(wrapper.find('[data-testid="encouragement-challenge"]').text()).toContain('Défi du jour relevé : Maths !')
  })
})

describe('store — fetchDailyChallenge', () => {
  it('réponse valide - stocke le défi', async () => {
    const store = useBadgesStore()

    expect(await store.fetchDailyChallenge()).toBe(true)
    expect(store.dailyChallenge).toEqual(CHALLENGE)
  })

  it('erreur serveur ou réseau - false, rien de stocké', async () => {
    const store = useBadgesStore()
    api.dailyChallenge.mockResolvedValueOnce({ status: 500 })
    expect(await store.fetchDailyChallenge()).toBe(false)
    api.dailyChallenge.mockRejectedValueOnce(new Error('réseau'))
    expect(await store.fetchDailyChallenge()).toBe(false)
    expect(store.dailyChallenge).toBeNull()
  })

  it('refreshAfterPractice - le défi est rechargé seulement s’il était affiché', async () => {
    const store = useBadgesStore()
    await store.refreshAfterPractice()
    expect(api.dailyChallenge).not.toHaveBeenCalled()

    await store.fetchDailyChallenge()
    api.dailyChallenge.mockClear()
    await store.refreshAfterPractice()
    expect(api.dailyChallenge).toHaveBeenCalledTimes(1)
  })

  it('reset - vide le défi (changement de compte)', async () => {
    const store = useBadgesStore()
    await store.fetchDailyChallenge()

    store.reset()

    expect(store.dailyChallenge).toBeNull()
  })
})

describe('DailyChallenge — défi du jour (A4)', () => {
  it('défi à relever - texte, deux liens d’action', async () => {
    await mountIt()

    expect(wrapper.find('[data-testid="daily-challenge-text"]').text()).toContain('Mathématiques')
    const links = wrapper.findAll('[data-testid="link"]')
    expect(links.map((l) => [l.text(), l.attributes('href')])).toEqual([
      ['Réviser mes cartes', '/flashcards'],
      ['Faire un exercice', '/exercises'],
    ])
  })

  it('défi relevé - félicitation, plus de boutons', async () => {
    api.dailyChallenge.mockResolvedValue(ok({ ...CHALLENGE, done: true, practicesToday: 1 }))
    await mountIt()

    expect(wrapper.find('[data-testid="daily-challenge-text"]').text()).toContain('Défi relevé')
    expect(wrapper.findAll('[data-testid="link"]')).toHaveLength(0)
  })

  it('aucun défi - rien d’affiché', async () => {
    api.dailyChallenge.mockResolvedValue(ok({ ...CHALLENGE, available: false, subject: null }))
    await mountIt()

    expect(wrapper.find('[data-testid="daily-challenge"]').exists()).toBe(false)
  })

  it('erreur API - rien d’affiché, sans message d’erreur (l’accueil reste propre)', async () => {
    api.dailyChallenge.mockResolvedValue({ status: 500 })
    await mountIt()

    expect(wrapper.find('[data-testid="daily-challenge"]').exists()).toBe(false)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('mode zen - masqué', async () => {
    api.settings.mockResolvedValue(ok({ ...SETTINGS, zenMode: true }))
    await mountIt()

    expect(wrapper.find('[data-testid="daily-challenge"]').exists()).toBe(false)
  })

  it('axe - défi à relever et défi relevé - aucune violation', async () => {
    await mountIt()
    expect(await runAxe(wrapper.element)).toEqual([])
    wrapper.unmount()

    setActivePinia(createPinia())
    api.dailyChallenge.mockResolvedValue(ok({ ...CHALLENGE, done: true, practicesToday: 1 }))
    await mountIt()
    expect(await runAxe(wrapper.element)).toEqual([])
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import TodoWidget from '@/components/TodoWidget.vue'

// La date "aujourd'hui" est simulée pour stabiliser les filtres par date
const TODAY = '2026-06-13'
vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`))

// ── Données de test ──────────────────────────────────────────────────────────

const makeSession = (overrides = {}) => ({
  id: 1,
  name: 'Révision Maths',
  date: TODAY,
  startTime: '09:00',
  isDone: false,
  ...overrides
})

const makeDeadline = (overrides = {}) => ({
  id: 1,
  name: 'DM Physique',
  dueDate: TODAY,
  dueTime: '23:59',
  ...overrides
})

// ── Helper de montage ────────────────────────────────────────────────────────

function mountWidget({ sessions = [], deadlines = [] } = {}) {
  return mount(TodoWidget, {
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: true,
          initialState: {
            revisionSessions: { sessions, todaySessions: [], session: null },
            deadlines: { deadlines, deadline: null }
          }
        })
      ]
    }
  })
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('TodoWidget', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Rendu initial ──────────────────────────────────────────────────────────

  it('affiche les 4 onglets de filtre', () => {
    const wrapper = mountWidget()
    const tabs = wrapper.findAll('.todo-tab')
    expect(tabs).toHaveLength(4)
    const labels = tabs.map((t) => t.text().replace(/\d+/g, '').trim())
    expect(labels).toContain('À faire')
    expect(labels).toContain("Aujourd'hui")
    expect(labels).toContain('À venir')
    expect(labels).toContain('Terminé')
  })

  it("affiche 'Aucun élément' quand les stores sont vides", () => {
    const wrapper = mountWidget()
    expect(wrapper.text()).toContain('Aucun élément')
  })

  // ── Onglet "À faire" ───────────────────────────────────────────────────────

  it("onglet 'À faire' — affiche séances non terminées + deadlines du jour ou à venir", () => {
    const futureDeadline = makeDeadline({ id: 2, name: 'DM Chimie', dueDate: '2026-07-01' })
    const wrapper = mountWidget({
      sessions: [makeSession()],
      deadlines: [makeDeadline(), futureDeadline]
    })

    const items = wrapper.findAll('.todo-item')
    expect(items.length).toBe(3)
  })

  it("onglet 'À faire' — n'affiche pas les séances terminées", () => {
    const wrapper = mountWidget({
      sessions: [makeSession({ isDone: true })],
      deadlines: []
    })

    expect(wrapper.text()).toContain('Aucun élément')
  })

  it("onglet 'À faire' — n'affiche pas les deadlines passées", () => {
    const wrapper = mountWidget({
      sessions: [],
      deadlines: [makeDeadline({ dueDate: '2026-01-01' })]
    })

    expect(wrapper.text()).toContain('Aucun élément')
  })

  // ── Onglet "Aujourd'hui" ───────────────────────────────────────────────────

  it("onglet 'Aujourd'hui' — filtre sur la date du jour", async () => {
    const wrapper = mountWidget({
      sessions: [makeSession(), makeSession({ id: 2, name: 'Révision Histoire', date: '2026-07-01' })],
      deadlines: [makeDeadline(), makeDeadline({ id: 2, name: 'DM Chimie', dueDate: '2026-07-01' })]
    })

    await wrapper.findAll('.todo-tab')[1].trigger('click')

    const items = wrapper.findAll('.todo-item')
    expect(items.length).toBe(2)
    expect(wrapper.text()).toContain('Révision Maths')
    expect(wrapper.text()).toContain('DM Physique')
    expect(wrapper.text()).not.toContain('Révision Histoire')
    expect(wrapper.text()).not.toContain('DM Chimie')
  })

  // ── Onglet "À venir" ──────────────────────────────────────────────────────

  it("onglet 'À venir' — filtre les items dont la date est après aujourd'hui", async () => {
    const wrapper = mountWidget({
      sessions: [
        makeSession({ id: 1, date: TODAY }),
        makeSession({ id: 2, name: 'Révision Future', date: '2026-07-01' })
      ],
      deadlines: [
        makeDeadline({ id: 1, dueDate: TODAY }),
        makeDeadline({ id: 2, name: 'DM Futur', dueDate: '2026-08-01' })
      ]
    })

    await wrapper.findAll('.todo-tab')[2].trigger('click')

    const items = wrapper.findAll('.todo-item')
    expect(items.length).toBe(2)
    expect(wrapper.text()).toContain('Révision Future')
    expect(wrapper.text()).toContain('DM Futur')
    expect(wrapper.text()).not.toContain('Révision Maths')
    expect(wrapper.text()).not.toContain('DM Physique')
  })

  // ── Onglet "Terminé" ──────────────────────────────────────────────────────

  it("onglet 'Terminé' — n'affiche que les séances avec isDone = true", async () => {
    const wrapper = mountWidget({
      sessions: [
        makeSession({ id: 1, isDone: false }),
        makeSession({ id: 2, name: 'Cours terminé', isDone: true })
      ],
      deadlines: [makeDeadline()]
    })

    await wrapper.findAll('.todo-tab')[3].trigger('click')

    const items = wrapper.findAll('.todo-item')
    expect(items.length).toBe(1)
    expect(wrapper.text()).toContain('Cours terminé')
    expect(wrapper.text()).not.toContain('Révision Maths')
    expect(wrapper.text()).not.toContain('DM Physique')
  })

  // ── Badges de comptage ────────────────────────────────────────────────────

  it("affiche un badge de comptage sur l'onglet 'Aujourd'hui' si des items existent", () => {
    const wrapper = mountWidget({
      sessions: [makeSession()],
      deadlines: [makeDeadline()]
    })

    const todayTab = wrapper.findAll('.todo-tab')[1]
    expect(todayTab.find('.todo-tab-count').exists()).toBe(true)
    expect(todayTab.find('.todo-tab-count').text()).toBe('2')
  })

  it("n'affiche pas de badge si le compteur est 0", () => {
    const wrapper = mountWidget({
      sessions: [makeSession({ date: '2026-07-01' })],
      deadlines: []
    })

    const todayTab = wrapper.findAll('.todo-tab')[1]
    expect(todayTab.find('.todo-tab-count').exists()).toBe(false)
  })

  // ── Badges type (Révision / Échéance) ─────────────────────────────────────

  it("affiche le badge 'Révision' pour les séances et 'Échéance' pour les deadlines", () => {
    const wrapper = mountWidget({
      sessions: [makeSession()],
      deadlines: [makeDeadline()]
    })

    const badges = wrapper.findAll('.todo-badge')
    const texts = badges.map((b) => b.text())
    expect(texts).toContain('Révision')
    expect(texts).toContain('Échéance')
  })

  // ── Checkbox séance ───────────────────────────────────────────────────────

  it('affiche une checkbox uniquement pour les séances, pas pour les deadlines', () => {
    const wrapper = mountWidget({
      sessions: [makeSession()],
      deadlines: [makeDeadline()]
    })

    expect(wrapper.findAll('.todo-check').length).toBe(1)
    expect(wrapper.findAll('.todo-check-spacer').length).toBe(1)
  })

  it('cliquer la checkbox appelle markDone avec !isDone', async () => {
    const wrapper = mountWidget({ sessions: [makeSession({ isDone: false })], deadlines: [] })
    const { useRevisionSessionStore } = await import('@/stores/revisionSessions')
    const store = useRevisionSessionStore()

    await wrapper.find('.todo-check').trigger('change')

    expect(store.markDone).toHaveBeenCalledWith(1, true)
  })

  it("l'item terminé a la classe 'todo-item--done'", async () => {
    const wrapper = mountWidget({ sessions: [makeSession({ isDone: true })], deadlines: [] })

    // Aller sur l'onglet "Terminé" pour voir les items done
    await wrapper.findAll('.todo-tab')[3].trigger('click')

    const item = wrapper.findAll('.todo-item')[0]
    expect(item).toBeDefined()
    expect(item.classes()).toContain('todo-item--done')
  })

  // ── Tri par date/heure ─────────────────────────────────────────────────────

  it("trie les items par date puis heure croissante", () => {
    const wrapper = mountWidget({
      sessions: [
        makeSession({ id: 1, name: 'Session tardive', startTime: '18:00', date: TODAY }),
        makeSession({ id: 2, name: 'Session matinale', startTime: '08:00', date: TODAY })
      ],
      deadlines: []
    })

    const items = wrapper.findAll('.todo-name')
    expect(items[0].text()).toBe('Session matinale')
    expect(items[1].text()).toBe('Session tardive')
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import KpiPage from '@/pages/KpiPage.vue'

// ── Mocks Chart.js (pas de canvas dans jsdom) ─────────────────────────────────

vi.mock('chart.js', () => ({
  Chart: class { static register() {} },
  CategoryScale: {},
  LinearScale: {},
  BarElement: {},
  LineElement: {},
  PointElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
  Filler: {}
}))

vi.mock('vue-chartjs', () => ({
  Bar: { name: 'BarChart', template: '<canvas data-testid="bar-chart" />' },
  Line: { name: 'LineChart', template: '<canvas data-testid="line-chart" />' }
}))

vi.mock('@/components/LoaderComponent.vue', () => ({
  default: { name: 'LoaderComponent', template: '<div data-testid="loader" />' }
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BADGES_FIXTURE = [
  { id: 'streak7', label: '7 jours de suite', icon: '🔥', unlocked: false, description: 'Réviser 7 jours consécutifs' },
  { id: 'perfectScore', label: 'Score parfait', icon: '⭐', unlocked: true, description: 'Obtenir 100%' }
]

const KPI_FIXTURE = {
  revision: {
    totalPlanned: 10, totalCompleted: 8, completionRate: 80,
    streakDays: 5, sessionsLast30Days: 10, completedLast30Days: 8,
    weeklyActivity: [{ week: '2026-06-16', count: 2 }, { week: '2026-06-23', count: 3 }],
    totalMinutes: 120, revivedToday: true
  },
  exercises: {
    totalTests: 5, avgScore: 72, maxScore: 90, minScore: 50, recentTrend: 10,
    scoreHistory: [{ date: '2026-06-20T10:00:00Z', score: 8, total: 10, percentage: 80, testName: 'Test Maths' }]
  },
  leitner: {
    totalCards: 20, cardsByBox: { 1: 5, 2: 4, 3: 4, 4: 4, 5: 3 },
    globalSuccessRate: 68, mastery: 35, cardsDue: 4
  },
  subjects: {
    totalUnique: 2,
    list: [
      { subjectId: 1, name: 'Maths', tests: 3, systems: 1 },
      { subjectId: 2, name: 'Physique', tests: 2, systems: 0 }
    ]
  },
  discipline: { plannedThisWeek: 3, completedThisWeek: 2, disciplineScore: 75 },
  badges: BADGES_FIXTURE
}

// ── Helper de montage ─────────────────────────────────────────────────────────

function mountKpi({ kpis = null, loading = false } = {}) {
  return mount(KpiPage, {
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: true,
          initialState: { kpi: { kpis, loading } }
        })
      ],
      stubs: { RouterLink: true, RouterView: true }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('KpiPage', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── États de chargement ────────────────────────────────────────────────────

  it('affiche le loader quand loading = true', () => {
    const wrapper = mountKpi({ loading: true, kpis: null })
    expect(wrapper.find('[data-testid="loader"]').exists()).toBe(true)
  })

  it("n'affiche pas le contenu principal quand loading = true", () => {
    const wrapper = mountKpi({ loading: true, kpis: null })
    expect(wrapper.text()).not.toContain('Succès & Badges')
  })

  // ── État vide ──────────────────────────────────────────────────────────────

  it("affiche 'Aucune donnée disponible' quand kpis est null", () => {
    const wrapper = mountKpi({ loading: false, kpis: null })
    expect(wrapper.text()).toContain('Aucune donnée disponible pour le moment.')
  })

  it("n'affiche pas les sections quand kpis est null", () => {
    const wrapper = mountKpi({ loading: false, kpis: null })
    expect(wrapper.text()).not.toContain('Succès & Badges')
    expect(wrapper.text()).not.toContain('Discipline')
  })

  // ── Appel onMounted ────────────────────────────────────────────────────────

  it('appelle store.fetchMyKpis au montage', async () => {
    mountKpi()
    await flushPromises()

    const { useKpiStore } = await import('@/stores/kpi')
    const store = useKpiStore()
    expect(store.fetchMyKpis).toHaveBeenCalledTimes(1)
  })

  // ── Sections principales ───────────────────────────────────────────────────

  it('affiche toutes les sections avec des données', () => {
    const wrapper = mountKpi({ kpis: KPI_FIXTURE })
    const text = wrapper.text()
    expect(text).toContain('Succès & Badges')
    expect(text).toContain('Révision & Régularité')
    expect(text).toContain('Discipline')
    expect(text).toContain('Scores aux exercices')
    expect(text).toContain('Système Leitner')
    expect(text).toContain('Diversité des matières')
  })

  // ── Badges ────────────────────────────────────────────────────────────────

  it('affiche tous les badges', () => {
    const wrapper = mountKpi({ kpis: KPI_FIXTURE })
    expect(wrapper.text()).toContain('7 jours de suite')
    expect(wrapper.text()).toContain('Score parfait')
  })

  it('le badge déverrouillé a la classe bg-primary', () => {
    const wrapper = mountKpi({ kpis: KPI_FIXTURE })
    const badges = wrapper.findAll('.rounded-full.border-2')
    const unlocked = badges.find((b) => b.text().includes('Score parfait'))
    expect(unlocked?.classes()).toContain('bg-primary')
  })

  it('le badge verrouillé a la classe border-gray-200', () => {
    const wrapper = mountKpi({ kpis: KPI_FIXTURE })
    const badges = wrapper.findAll('.rounded-full.border-2')
    const locked = badges.find((b) => b.text().includes('7 jours de suite'))
    expect(locked?.classes()).toContain('border-gray-200')
  })

  // ── Statistiques révision ──────────────────────────────────────────────────

  it('affiche le streak en jours', () => {
    const wrapper = mountKpi({ kpis: KPI_FIXTURE })
    expect(wrapper.text()).toContain('5 j')
  })

  it('affiche le taux de complétion', () => {
    const wrapper = mountKpi({ kpis: KPI_FIXTURE })
    expect(wrapper.text()).toContain('80 %')
  })

  it('affiche le temps total formaté en heures', () => {
    const wrapper = mountKpi({ kpis: KPI_FIXTURE })
    expect(wrapper.text()).toContain('2 h')
  })

  // ── Discipline ─────────────────────────────────────────────────────────────

  it('affiche le score de discipline', () => {
    const wrapper = mountKpi({ kpis: KPI_FIXTURE })
    expect(wrapper.text()).toContain('75 %')
  })

  it('la barre de discipline est verte pour un score ≥ 70', () => {
    const wrapper = mountKpi({ kpis: { ...KPI_FIXTURE, discipline: { ...KPI_FIXTURE.discipline, disciplineScore: 75 } } })
    const bar = wrapper.find('.h-3.rounded-full.transition-all')
    expect(bar.classes()).toContain('bg-green-500')
  })

  it('la barre de discipline est jaune pour un score entre 40 et 69', () => {
    const wrapper = mountKpi({
      kpis: { ...KPI_FIXTURE, discipline: { ...KPI_FIXTURE.discipline, disciplineScore: 55 } }
    })
    const bar = wrapper.find('.h-3.rounded-full.transition-all')
    expect(bar.classes()).toContain('bg-yellow-400')
  })

  it('la barre de discipline est rouge pour un score < 40', () => {
    const wrapper = mountKpi({
      kpis: { ...KPI_FIXTURE, discipline: { ...KPI_FIXTURE.discipline, disciplineScore: 30 } }
    })
    const bar = wrapper.find('.h-3.rounded-full.transition-all')
    expect(bar.classes()).toContain('bg-red-400')
  })

  // ── Matières ───────────────────────────────────────────────────────────────

  it('affiche les matières de la liste', () => {
    const wrapper = mountKpi({ kpis: KPI_FIXTURE })
    expect(wrapper.text()).toContain('Maths')
    expect(wrapper.text()).toContain('Physique')
  })

  it("affiche 'Aucune matière' quand la liste est vide", () => {
    const noSubjects = {
      ...KPI_FIXTURE,
      subjects: { totalUnique: 0, list: [] }
    }
    const wrapper = mountKpi({ kpis: noSubjects })
    expect(wrapper.text()).toContain('Aucune matière enregistrée pour le moment.')
  })

  // ── Graphiques ──────────────────────────────────────────────────────────────

  it('affiche le graphique Leitner quand il y a des cartes', () => {
    const wrapper = mountKpi({ kpis: KPI_FIXTURE })
    const bars = wrapper.findAll('[data-testid="bar-chart"]')
    expect(bars.length).toBeGreaterThanOrEqual(2)
  })

  it("n'affiche pas le graphique Leitner quand totalCards = 0", () => {
    const noCards = { ...KPI_FIXTURE, leitner: { ...KPI_FIXTURE.leitner, totalCards: 0, cardsByBox: {} } }
    const wrapper = mountKpi({ kpis: noCards })
    expect(wrapper.text()).toContain('Aucune carte Leitner créée pour le moment.')
  })

  it("affiche 'Aucun exercice' quand scoreHistory est vide", () => {
    const noScores = { ...KPI_FIXTURE, exercises: { ...KPI_FIXTURE.exercises, scoreHistory: [] } }
    const wrapper = mountKpi({ kpis: noScores })
    expect(wrapper.text()).toContain('Aucun exercice complété pour le moment.')
  })
})

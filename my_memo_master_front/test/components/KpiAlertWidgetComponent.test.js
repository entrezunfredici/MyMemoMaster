import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import KpiAlertWidgetComponent from '@/components/KpiAlertWidgetComponent.vue'

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useRouter: () => ({ push: vi.fn() }),
    useRoute: () => ({ params: {} }),
    RouterLink: { template: '<a href="/kpi"><slot /></a>' }
  }
})

vi.mock('@/components/LoaderComponent.vue', () => ({
  default: { name: 'LoaderComponent', template: '<div data-testid="loader" />' }
}))

const BASE_KPIS = {
  revision: { streakDays: 0, revivedToday: true, totalPlanned: 0, totalCompleted: 0, completionRate: 0, sessionsLast30Days: 0, totalMinutes: 0, completedLast30Days: 0, weeklyActivity: [] },
  exercises: { totalTests: 0, avgScore: 0, maxScore: 0, recentTrend: 0, scoreHistory: [] },
  leitner: { totalCards: 0, cardsDue: 0, globalSuccessRate: 0, mastery: 0, cardsByBox: {} },
  discipline: { plannedThisWeek: 0, completedThisWeek: 0, disciplineScore: 0 },
  subjects: { totalUnique: 0, list: [] },
  badges: []
}

const BASE_SETTINGS = {
  enabled: true,
  streakAlertEnabled: true,
  disciplineAlertEnabled: true,
  scoreDropAlertEnabled: true,
  thresholdDiscipline: 40
}

function mountWidget({ kpis = BASE_KPIS, settings = BASE_SETTINGS, loading = false } = {}) {
  return mount(KpiAlertWidgetComponent, {
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: true,
          initialState: {
            kpi: { kpis, loading },
            kpiAlertSettings: { settings, loading: false }
          }
        })
      ],
      stubs: { RouterLink: { template: '<a href="/kpi"><slot /></a>' } }
    }
  })
}

describe('KpiAlertWidgetComponent', () => {
  it('affiche un loader pendant le chargement', () => {
    const wrapper = mountWidget({ kpis: null, settings: null, loading: true })
    expect(wrapper.find('[data-testid="loader"]').exists()).toBe(true)
  })

  it('affiche "Tout va bien" si aucune alerte ni suggestion', () => {
    const wrapper = mountWidget()
    expect(wrapper.text()).toContain('Tout va bien')
  })

  it('affiche l\'alerte streak si streakDays > 0 et non révisé aujourd\'hui', () => {
    const kpis = { ...BASE_KPIS, revision: { ...BASE_KPIS.revision, streakDays: 5, revivedToday: false } }
    const wrapper = mountWidget({ kpis })
    expect(wrapper.text()).toContain('streak')
    expect(wrapper.text()).toContain('5')
  })

  it('n\'affiche pas l\'alerte streak si révisé aujourd\'hui', () => {
    const kpis = { ...BASE_KPIS, revision: { ...BASE_KPIS.revision, streakDays: 5, revivedToday: true } }
    const wrapper = mountWidget({ kpis })
    expect(wrapper.text()).not.toContain('streak')
  })

  it('n\'affiche pas l\'alerte streak si streakDays vaut 0', () => {
    const kpis = { ...BASE_KPIS, revision: { ...BASE_KPIS.revision, streakDays: 0, revivedToday: false } }
    const wrapper = mountWidget({ kpis })
    expect(wrapper.text()).not.toContain('streak')
  })

  it('affiche l\'alerte discipline si score > 0 et inférieur au seuil', () => {
    const kpis = { ...BASE_KPIS, discipline: { ...BASE_KPIS.discipline, disciplineScore: 25 } }
    const wrapper = mountWidget({ kpis })
    expect(wrapper.text()).toContain('discipline')
    expect(wrapper.text()).toContain('25')
  })

  it('n\'affiche pas l\'alerte discipline si score >= seuil', () => {
    const kpis = { ...BASE_KPIS, discipline: { ...BASE_KPIS.discipline, disciplineScore: 60 } }
    const wrapper = mountWidget({ kpis })
    expect(wrapper.text()).not.toContain('discipline')
  })

  it('affiche l\'alerte score_drop si recentTrend <= -10', () => {
    const kpis = { ...BASE_KPIS, exercises: { ...BASE_KPIS.exercises, recentTrend: -15 } }
    const wrapper = mountWidget({ kpis })
    expect(wrapper.text()).toContain('scores ont baissé')
    expect(wrapper.text()).toContain('15')
  })

  it('n\'affiche pas l\'alerte score_drop si recentTrend > -10', () => {
    const kpis = { ...BASE_KPIS, exercises: { ...BASE_KPIS.exercises, recentTrend: -5 } }
    const wrapper = mountWidget({ kpis })
    expect(wrapper.text()).not.toContain('scores ont baissé')
  })

  it('affiche la suggestion Leitner si cardsDue > 0', () => {
    const kpis = { ...BASE_KPIS, leitner: { ...BASE_KPIS.leitner, cardsDue: 8 } }
    const wrapper = mountWidget({ kpis })
    expect(wrapper.text()).toContain('8')
    expect(wrapper.text()).toContain('Leitner')
  })

  it('n\'affiche pas les alertes si settings.enabled est false', () => {
    const kpis = {
      ...BASE_KPIS,
      revision: { ...BASE_KPIS.revision, streakDays: 5, revivedToday: false },
      discipline: { ...BASE_KPIS.discipline, disciplineScore: 10 }
    }
    const wrapper = mountWidget({ kpis, settings: { ...BASE_SETTINGS, enabled: false } })
    expect(wrapper.text()).not.toContain('streak')
    expect(wrapper.text()).not.toContain('discipline')
  })

  it('affiche la suggestion Leitner même si settings.enabled est false', () => {
    const kpis = { ...BASE_KPIS, leitner: { ...BASE_KPIS.leitner, cardsDue: 3 } }
    const wrapper = mountWidget({ kpis, settings: { ...BASE_SETTINGS, enabled: false } })
    expect(wrapper.text()).toContain('Leitner')
  })

  it('n\'affiche pas les alertes si streakAlertEnabled est false', () => {
    const kpis = { ...BASE_KPIS, revision: { ...BASE_KPIS.revision, streakDays: 5, revivedToday: false } }
    const wrapper = mountWidget({ kpis, settings: { ...BASE_SETTINGS, streakAlertEnabled: false } })
    expect(wrapper.text()).not.toContain('streak')
  })

  it('contient un lien vers la page KPI', () => {
    const wrapper = mountWidget()
    const link = wrapper.find('a[href="/kpi"]')
    expect(link.exists()).toBe(true)
  })
})

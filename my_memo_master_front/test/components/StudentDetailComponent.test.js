import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StudentDetailComponent from '@/components/StudentDetailComponent.vue'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BASE_STUDENT = {
  userId: 1,
  name: 'Alice Dupont',
  email: 'alice@test.com',
  lastActivityAt: '2026-06-10',
  daysInactive: 15,
  avgScore: 75.5,
  scoreTrend: [
    { score: 80, completedAt: '2026-05-10T10:00:00Z' },
    { score: 60, completedAt: '2026-05-20T10:00:00Z' },
  ],
  atRisk: false,
  atRiskReasons: []
}

function mountDetail(studentOverride = {}) {
  return mount(StudentDetailComponent, {
    props: { student: { ...BASE_STUDENT, ...studentOverride } }
  })
}

// ── Informations de base ──────────────────────────────────────────────────────

describe('StudentDetailComponent — informations de base', () => {
  it('affiche email de l\'étudiant', () => {
    const w = mountDetail()
    expect(w.text()).toContain('alice@test.com')
  })

  it('affiche "—" si email absent', () => {
    const w = mountDetail({ email: null })
    expect(w.text()).toContain('—')
  })

  it('affiche la date de dernière activité formatée', () => {
    const w = mountDetail()
    expect(w.text()).toContain('10 juin')
  })

  it('affiche le nombre de jours d\'inactivité', () => {
    const w = mountDetail()
    expect(w.text()).toContain('15j')
  })

  it('affiche "aucune" si pas de lastActivityAt', () => {
    const w = mountDetail({ lastActivityAt: null, daysInactive: null })
    expect(w.text()).toContain('aucune')
  })

  it('affiche le score moyen', () => {
    const w = mountDetail()
    expect(w.text()).toContain('75.5 %')
  })

  it('affiche "—" si avgScore est null', () => {
    const w = mountDetail({ avgScore: null })
    const scoreEl = w.find('.text-dark\\/40')
    expect(scoreEl.exists()).toBe(true)
  })
})

// ── Couleur du score ──────────────────────────────────────────────────────────

describe('StudentDetailComponent — couleur du score moyen', () => {
  it('score ≥ 70 → text-success', () => {
    const w = mountDetail({ avgScore: 70 })
    expect(w.html()).toContain('text-success')
  })

  it('score entre 50 et 69 → text-dark', () => {
    const w = mountDetail({ avgScore: 55 })
    const scoreSpan = w.find('p:nth-child(3) span')
    expect(scoreSpan.classes()).toContain('text-dark')
  })

  it('score < 50 → text-secondary', () => {
    const w = mountDetail({ avgScore: 40 })
    const scoreSpan = w.find('p:nth-child(3) span')
    expect(scoreSpan.classes()).toContain('text-secondary')
  })
})

// ── Alertes décrochage ────────────────────────────────────────────────────────

describe('StudentDetailComponent — alertes décrochage', () => {
  it('affiche la section alertes si atRisk', () => {
    const w = mountDetail({
      atRisk: true,
      atRiskReasons: ['Inactif depuis 15 jours', 'Baisse de score de 25%']
    })
    expect(w.text()).toContain('Alertes')
    expect(w.text()).toContain('Inactif depuis 15 jours')
    expect(w.text()).toContain('Baisse de score de 25%')
  })

  it('n\'affiche pas la section alertes si atRisk est false', () => {
    const w = mountDetail({ atRisk: false, atRiskReasons: [] })
    expect(w.text()).not.toContain('Alertes')
  })

  it('n\'affiche pas la section alertes si atRiskReasons est vide même avec atRisk true', () => {
    const w = mountDetail({ atRisk: true, atRiskReasons: [] })
    expect(w.text()).not.toContain('Alertes')
  })
})

// ── Historique des scores ─────────────────────────────────────────────────────

describe('StudentDetailComponent — historique des scores', () => {
  it('affiche chaque score du scoreTrend', () => {
    const w = mountDetail()
    expect(w.text()).toContain('80 %')
    expect(w.text()).toContain('60 %')
  })

  it('affiche la date formatée pour chaque entrée', () => {
    const w = mountDetail()
    expect(w.text()).toContain('10 mai')
    expect(w.text()).toContain('20 mai')
  })

  it('affiche "Aucun exercice complété" si scoreTrend est vide', () => {
    const w = mountDetail({ scoreTrend: [] })
    expect(w.text()).toContain('Aucun exercice complété')
  })

  it('affiche "Aucun exercice complété" si scoreTrend est absent', () => {
    const w = mountDetail({ scoreTrend: null })
    expect(w.text()).toContain('Aucun exercice complété')
  })

  it('colorie chaque score du trend selon le seuil', () => {
    const w = mountDetail({
      scoreTrend: [
        { score: 80, completedAt: '2026-05-10T00:00:00Z' },
        { score: 30, completedAt: '2026-05-20T00:00:00Z' },
      ]
    })
    expect(w.html()).toContain('text-success')
    expect(w.html()).toContain('text-secondary')
  })
})

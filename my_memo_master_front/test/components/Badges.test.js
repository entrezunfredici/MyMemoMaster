import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import BadgesPage from '@/pages/BadgesPage.vue'
import BadgeGrid from '@/components/badges/BadgeGrid.vue'
import BadgeDetailModal from '@/components/badges/BadgeDetailModal.vue'
import ProfileBadgesSummary from '@/components/badges/ProfileBadgesSummary.vue'

const { mockList, mockSummary, mockMarkSeen } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockSummary: vi.fn(),
  mockMarkSeen: vi.fn(),
}))

vi.mock('@/helpers/badgesApi', () => ({ badgesApi: { list: mockList, summary: mockSummary, markSeen: mockMarkSeen } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: vi.fn() } }))
vi.mock('@/components/LoaderComponent.vue', () => ({
  default: { name: 'LoaderComponent', template: '<div data-testid="loader" />' },
}))

const BADGES = [
  { code: 'streak7', category: 'regularity', rarity: 'common', icon: '🔥', label: '7 jours de suite', description: 'Pratiquer 7 jours consécutifs', earned: true, earnedAt: '2026-10-12T10:00:00Z', seenAt: null, progress: { current: 7, target: 7 } },
  { code: 'streak30', category: 'regularity', rarity: 'rare', icon: '🏆', label: '30 jours de suite', description: 'Pratiquer 30 jours consécutifs', earned: false, earnedAt: null, seenAt: null, progress: { current: 12, target: 30 } },
  { code: 'tenTests', category: 'exercises', rarity: 'epic', icon: '📚', label: '10 exercices', description: "Compléter 10 séries d'exercices", earned: false, earnedAt: null, seenAt: null, progress: { current: 4, target: 10 } },
]
const SUMMARY = { level: { name: 'Débutant', next: { name: 'Apprenti', min: 5 } }, earnedCount: 1, totalCount: 14, streakCurrent: 12, streakBest: 21 }

const RouterLinkStub = { props: ['to'], template: '<a data-testid="link"><slot /></a>' }

function mountWith(component, props = {}) {
  setActivePinia(createPinia())
  return mount(component, { props, global: { stubs: { RouterLink: RouterLinkStub } }, attachTo: document.body })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockList.mockResolvedValue({ status: 200, data: BADGES })
  mockSummary.mockResolvedValue({ status: 200, data: SUMMARY })
  mockMarkSeen.mockResolvedValue({ status: 200, data: { updated: 1 } })
})

describe('BadgesPage', () => {
  it('affiche niveau, série, texte de jauge et grille groupée par catégorie', async () => {
    const wrapper = mountWith(BadgesPage)
    await flushPromises()

    expect(wrapper.find('h1').text()).toBe('Mes badges')
    expect(wrapper.text()).toContain('Débutant')
    expect(wrapper.text()).toContain('1 / 5 badges pour devenir Apprenti')
    expect(wrapper.text()).toContain('12 jours')
    expect(wrapper.text()).toContain('21 jours')
    expect(wrapper.findAll('h3').map((h) => h.text())).toEqual(['Régularité', 'Exercices'])
  })

  it('badge obtenu - date ; badge en cours - progression en texte et jauge', async () => {
    const wrapper = mountWith(BadgesPage)
    await flushPromises()

    expect(wrapper.text()).toContain('Obtenu le 12 octobre 2026')
    expect(wrapper.text()).toContain('12 / 30')
    expect(wrapper.find('progress').exists()).toBe(true)
  })

  it('marque les badges non vus à l\'ouverture mais garde la pastille « Nouveau » pendant la visite', async () => {
    const wrapper = mountWith(BadgesPage)
    await flushPromises()

    expect(mockMarkSeen).toHaveBeenCalledWith(['streak7'])
    expect(wrapper.text()).toContain('Nouveau')
  })

  it('erreur API - message, bouton Réessayer qui relance le chargement', async () => {
    mockList.mockResolvedValueOnce(undefined)
    mockSummary.mockResolvedValueOnce(undefined)
    const wrapper = mountWith(BadgesPage)
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toContain('Impossible de charger tes badges.')
    await wrapper.find('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Tous les badges')
  })

  it('compte neuf - propose les prochains badges', async () => {
    mockList.mockResolvedValueOnce({ status: 200, data: BADGES.map((b) => ({ ...b, earned: false, earnedAt: null })) })
    mockSummary.mockResolvedValueOnce({ status: 200, data: { ...SUMMARY, earnedCount: 0, streakCurrent: 0, streakBest: 0 } })
    const wrapper = mountWith(BadgesPage)
    await flushPromises()

    expect(wrapper.text()).toContain('Prochains badges')
    expect(wrapper.text()).toContain('Ta première pratique')
  })

  it('clic sur une carte - ouvre le détail ; Échap le ferme', async () => {
    const wrapper = mountWith(BadgesPage)
    await flushPromises()

    await wrapper.findAll('ul button')[1].trigger('click')
    const dialog = wrapper.find('[role="dialog"]')
    expect(dialog.exists()).toBe(true)
    expect(dialog.attributes('aria-labelledby')).toBe('badge-detail-title')
    expect(dialog.text()).toContain('30 jours de suite')

    await dialog.trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })
})

describe('BadgeGrid', () => {
  it('filtre « Obtenus » - ne garde que les badges obtenus et met à jour les compteurs', async () => {
    const wrapper = mountWith(BadgeGrid, { badges: BADGES })

    expect(wrapper.text()).toContain('Tous (3)')
    expect(wrapper.text()).toContain('Obtenus (1)')
    expect(wrapper.text()).toContain('En cours (2)')

    await wrapper.findAll('[role="group"] button')[1].trigger('click')
    expect(wrapper.findAll('ul button')).toHaveLength(1)
  })

  it('filtre sans résultat - message et réinitialisation', async () => {
    const wrapper = mountWith(BadgeGrid, { badges: BADGES })
    await wrapper.find('select').setValue('exercises')
    await wrapper.findAll('[role="group"] button')[1].trigger('click')

    expect(wrapper.text()).toContain('Aucun badge ne correspond à ce filtre.')
    await wrapper.find('.underline').trigger('click')
    expect(wrapper.findAll('ul button')).toHaveLength(3)
  })

  it('les cartes ont un nom accessible complet et la rareté en texte', () => {
    const wrapper = mountWith(BadgeGrid, { badges: BADGES })
    const labels = wrapper.findAll('ul button').map((b) => b.attributes('aria-label'))

    expect(labels[1]).toBe('30 jours de suite, rare, non obtenu, 12 sur 30')
    expect(wrapper.text()).toContain('Épique')
  })
})

describe('BadgeDetailModal', () => {
  it('émet close au clic sur ✕', async () => {
    const wrapper = mountWith(BadgeDetailModal, { badge: BADGES[1] })
    await wrapper.find('button[aria-label="Fermer"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})

describe('ProfileBadgesSummary', () => {
  it('affiche niveau, série, derniers badges et lien vers la page complète', async () => {
    const wrapper = mountWith(ProfileBadgesSummary)
    await flushPromises()

    expect(wrapper.find('h2').text()).toBe('Mes succès')
    expect(wrapper.text()).toContain('Niveau Débutant')
    expect(wrapper.text()).toContain('Série : 12 j')
    expect(wrapper.text()).toContain('7 jours de suite')
    expect(wrapper.find('[data-testid="link"]').text()).toBe('Voir tous mes badges')
  })

  it('aucun badge obtenu - invitation', async () => {
    mockList.mockResolvedValueOnce({ status: 200, data: BADGES.map((b) => ({ ...b, earned: false, earnedAt: null })) })
    const wrapper = mountWith(ProfileBadgesSummary)
    await flushPromises()

    expect(wrapper.text()).toContain('Obtiens ton premier badge')
  })

  it('erreur - message et Réessayer', async () => {
    mockList.mockResolvedValueOnce(undefined)
    mockSummary.mockResolvedValueOnce(undefined)
    const wrapper = mountWith(ProfileBadgesSummary)
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toContain('Impossible de charger tes badges.')
  })
})

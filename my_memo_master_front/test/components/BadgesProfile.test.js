import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import BadgesPage from '@/pages/BadgesPage.vue'
import BadgeShowcase from '@/components/badges/BadgeShowcase.vue'
import BadgeLevelHeader from '@/components/badges/BadgeLevelHeader.vue'
import BadgeDetailModal from '@/components/badges/BadgeDetailModal.vue'
import ActivityCalendar from '@/components/badges/ActivityCalendar.vue'
import GamificationSettings from '@/components/badges/GamificationSettings.vue'
import ProfileBadgesSummary from '@/components/badges/ProfileBadgesSummary.vue'
import { useBadgesStore } from '@/stores/badges'

const api = vi.hoisted(() => ({
  list: vi.fn(),
  summary: vi.fn(),
  markSeen: vi.fn(),
  profile: vi.fn(),
  saveProfile: vi.fn(),
  activity: vi.fn(),
  subjectLevels: vi.fn(),
  settings: vi.fn(),
  updateSettings: vi.fn(),
  notify: vi.fn(),
}))

vi.mock('@/helpers/badgesApi', () => ({ badgesApi: api }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: api.notify } }))
vi.mock('@/components/LoaderComponent.vue', () => ({
  default: { name: 'LoaderComponent', template: '<div data-testid="loader" />' },
}))

const mk = (code, label, earned, extra = {}) => ({
  code,
  category: 'regularity',
  rarity: 'common',
  icon: '🔥',
  label,
  description: `Description ${label}`,
  earned,
  earnedAt: earned ? '2026-10-12T10:00:00Z' : null,
  seenAt: earned ? '2026-10-13T10:00:00Z' : null,
  progress: { current: earned ? 7 : 2, target: 7 },
  ...extra,
})
const BADGES = [mk('streak7', '7 jours de suite', true), mk('perfect', 'Score parfait', true), mk('streak30', '30 jours de suite', false)]
const SUMMARY = { level: { name: 'Débutant', next: { name: 'Apprenti', min: 5 } }, earnedCount: 2, totalCount: 14, streakCurrent: 12, streakBest: 21 }
const SETTINGS = { dailyGoalCards: 0, dailyGoalExercises: 0, streakReminderEnabled: false, badgesVisibleToTeachers: false, animationsEnabled: true, zenMode: false }
const ACTIVITY = { from: '2026-11-02', to: '2026-11-16', today: '2026-11-16', weeks: 3, activeDates: ['2026-11-02', '2026-11-16'], activeDaysLast30: 2, streakCurrent: 1, streakBest: 4 }

const RouterLinkStub = { props: ['to'], template: '<a data-testid="link"><slot /></a>' }
const ok = (data) => ({ status: 200, data })

function mountWith(component, props = {}) {
  setActivePinia(createPinia())
  return mount(component, { props, global: { stubs: { RouterLink: RouterLinkStub } }, attachTo: document.body })
}

beforeEach(() => {
  vi.clearAllMocks()
  api.list.mockResolvedValue(ok(BADGES))
  api.summary.mockResolvedValue(ok(SUMMARY))
  api.markSeen.mockResolvedValue(ok({ updated: 1 }))
  api.profile.mockResolvedValue(ok({ titleCode: null, showcaseCodes: [] }))
  api.activity.mockResolvedValue(ok(ACTIVITY))
  api.subjectLevels.mockResolvedValue(ok([]))
  api.settings.mockResolvedValue(ok(SETTINGS))
  api.saveProfile.mockImplementation(async (data) => ok({ message: 'ok', titleCode: data.titleCode ?? null, showcaseCodes: data.showcaseCodes ?? [] }))
  api.updateSettings.mockImplementation(async (patch) => ok({ message: 'ok', ...SETTINGS, ...patch }))
})

describe('store badges — profil, activité, réglages', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('fetchProfile - succès - charge titre et vitrine', async () => {
    api.profile.mockResolvedValueOnce(ok({ titleCode: 'streak7', showcaseCodes: ['perfect'] }))
    const store = useBadgesStore()

    expect(await store.fetchProfile()).toBe(true)
    expect(store.profile).toEqual({ titleCode: 'streak7', showcaseCodes: ['perfect'] })
    expect(store.profileLoaded).toBe(true)
  })

  it('fetchProfile - erreur réseau - false, profil non chargé', async () => {
    api.profile.mockRejectedValueOnce(new Error('réseau'))
    const store = useBadgesStore()

    expect(await store.fetchProfile()).toBe(false)
    expect(store.profileLoaded).toBe(false)
  })

  it('fetchActivity - succès - demande 12 semaines par défaut', async () => {
    const store = useBadgesStore()

    expect(await store.fetchActivity()).toBe(true)
    expect(api.activity).toHaveBeenCalledWith(12)
    expect(store.activity).toEqual(ACTIVITY)
  })

  it('fetchSettings - succès puis cache - un seul appel API', async () => {
    const store = useBadgesStore()

    await store.fetchSettings()
    await store.fetchSettings()

    expect(api.settings).toHaveBeenCalledTimes(1)
    expect(store.settings).toEqual(SETTINGS)
    expect(store.settingsPending).toBe(false)
  })

  it('fetchSettings - force - ignore le cache', async () => {
    const store = useBadgesStore()

    await store.fetchSettings()
    await store.fetchSettings(true)

    expect(api.settings).toHaveBeenCalledTimes(2)
  })

  it('fetchSettings - erreur - false, réglages inchangés et attente terminée', async () => {
    api.settings.mockResolvedValueOnce({ status: 500 })
    const store = useBadgesStore()

    expect(await store.fetchSettings()).toBe(false)
    expect(store.settings).toBeNull()
    expect(store.settingsPending).toBe(false)
    expect(store.zen).toBe(false)
  })

  it('fetchExtras - un des trois échoue - false', async () => {
    api.activity.mockResolvedValueOnce({ status: 500 })
    const store = useBadgesStore()

    expect(await store.fetchExtras()).toBe(false)
    expect(store.settings).toEqual(SETTINGS)
  })

  it('saveProfile - succès - met à jour le profil et confirme par toast', async () => {
    const store = useBadgesStore()

    expect(await store.saveProfile({ titleCode: 'streak7' })).toBe(true)
    expect(store.profile.titleCode).toBe('streak7')
    expect(api.notify).toHaveBeenCalledWith('Enregistré.', 'success')
  })

  it('saveProfile - refus du serveur - garde l\'état et affiche le message', async () => {
    api.saveProfile.mockResolvedValueOnce({ status: 400, data: { message: 'Seuls les badges que tu as obtenus peuvent être choisis.' } })
    const store = useBadgesStore()

    expect(await store.saveProfile({ titleCode: 'streak30' })).toBe(false)
    expect(store.profile.titleCode).toBeNull()
    expect(api.notify).toHaveBeenCalledWith('Seuls les badges que tu as obtenus peuvent être choisis.', 'error')
  })

  it('saveProfile - erreur réseau - toast d\'erreur', async () => {
    api.saveProfile.mockRejectedValueOnce(new Error('réseau'))
    const store = useBadgesStore()

    expect(await store.saveProfile({ titleCode: 'streak7' })).toBe(false)
    expect(api.notify).toHaveBeenCalledWith("Erreur lors de l'enregistrement.", 'error')
  })

  it('updateSettings - zen activé - getter zen vrai, sans la clé message', async () => {
    const store = useBadgesStore()

    expect(await store.updateSettings({ zenMode: true })).toBe(true)
    expect(store.zen).toBe(true)
    expect(store.settings.message).toBeUndefined()
    expect(api.updateSettings).toHaveBeenCalledWith({ zenMode: true })
  })

  it('updateSettings - refus - réglages inchangés', async () => {
    api.updateSettings.mockResolvedValueOnce({ status: 400, data: { message: 'zenMode doit être un booléen.' } })
    const store = useBadgesStore()
    store.settings = { ...SETTINGS }

    expect(await store.updateSettings({ zenMode: 'oui' })).toBe(false)
    expect(store.zen).toBe(false)
    expect(api.notify).toHaveBeenCalledWith('zenMode doit être un booléen.', 'error')
  })
})

describe('BadgeShowcase', () => {
  it('vitrine vide avec badges obtenus - invitation et bouton Choisir', () => {
    const wrapper = mountWith(BadgeShowcase, { badges: BADGES, codes: [] })

    expect(wrapper.text()).toContain("Choisis jusqu'à 3 badges")
    expect(wrapper.text()).toContain('Choisir')
  })

  it('aucun badge obtenu - texte d\'attente, pas de bouton Modifier', () => {
    const wrapper = mountWith(BadgeShowcase, { badges: BADGES.map((b) => ({ ...b, earned: false })), codes: [] })

    expect(wrapper.text()).toContain('Obtiens ton premier badge')
    expect(wrapper.text()).not.toContain('Modifier')
  })

  it('badges en vitrine - affichés dans l\'ordre', () => {
    const wrapper = mountWith(BadgeShowcase, { badges: BADGES, codes: ['perfect', 'streak7'] })

    expect(wrapper.findAll('[data-testid="showcase-list"] li').map((li) => li.text())).toEqual([expect.stringContaining('Score parfait'), expect.stringContaining('7 jours de suite')])
  })

  it('Modifier puis Enregistrer - émet les codes cochés', async () => {
    const wrapper = mountWith(BadgeShowcase, { badges: BADGES, codes: ['streak7'] })

    await wrapper.findAll('button').find((b) => b.text() === 'Modifier').trigger('click')
    const boxes = wrapper.findAll('input[type="checkbox"]')
    expect(boxes).toHaveLength(2)
    expect(boxes[0].element.checked).toBe(true)
    await boxes[1].setValue(true)
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('save')[0][0]).toEqual(['streak7', 'perfect'])
  })

  it('Annuler - n\'émet rien', async () => {
    const wrapper = mountWith(BadgeShowcase, { badges: BADGES, codes: [] })

    await wrapper.findAll('button').find((b) => b.text() === 'Choisir').trigger('click')
    await wrapper.findAll('button').find((b) => b.text() === 'Annuler').trigger('click')

    expect(wrapper.emitted('save')).toBeUndefined()
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('3 badges cochés - les cases non cochées sont désactivées avec le texte « 3 badges maximum »', async () => {
    const many = ['a', 'b', 'c', 'd'].map((c) => mk(c, `Badge ${c}`, true))
    const wrapper = mountWith(BadgeShowcase, { badges: many, codes: ['a', 'b', 'c'] })

    await wrapper.findAll('button').find((b) => b.text() === 'Modifier').trigger('click')
    const boxes = wrapper.findAll('input[type="checkbox"]')

    expect(boxes.map((b) => b.element.disabled)).toEqual([false, false, false, true])
    expect(wrapper.text()).toContain('3 badges maximum')
  })
})

describe('BadgeLevelHeader — titre', () => {
  const props = { summary: SUMMARY, earnedBadges: BADGES.filter((b) => b.earned), profileAvailable: true, titleCode: 'streak7' }

  it('profil disponible et badges obtenus - liste « Aucun titre » + badges, titre sélectionné', () => {
    const wrapper = mountWith(BadgeLevelHeader, props)
    const select = wrapper.find('select')

    expect(wrapper.find('label[for="badge-title-select"]').text()).toBe('Titre affiché')
    expect(select.findAll('option').map((o) => o.text())).toEqual(['Aucun titre', '7 jours de suite', 'Score parfait'])
    expect(select.element.value).toBe('streak7')
  })

  it('changement - émet le code, ou null pour « Aucun titre »', async () => {
    const wrapper = mountWith(BadgeLevelHeader, props)

    await wrapper.find('select').setValue('perfect')
    await wrapper.find('select').setValue('')

    expect(wrapper.emitted('update:title')).toEqual([['perfect'], [null]])
  })

  it('API de profil indisponible ou aucun badge obtenu - pas de sélecteur', () => {
    expect(mountWith(BadgeLevelHeader, { ...props, profileAvailable: false }).find('select').exists()).toBe(false)
    expect(mountWith(BadgeLevelHeader, { ...props, earnedBadges: [] }).find('select').exists()).toBe(false)
  })
})

describe('BadgeDetailModal — titre et vitrine', () => {
  const base = { badge: BADGES[0], profileAvailable: true }

  it('badge obtenu - propose titre et vitrine, émet les actions', async () => {
    const wrapper = mountWith(BadgeDetailModal, base)
    const buttons = wrapper.findAll('button').filter((b) => b.attributes('aria-label') !== 'Fermer')

    expect(buttons.map((b) => b.text())).toEqual(['Choisir comme titre', 'Ajouter à ma vitrine'])
    await buttons[0].trigger('click')
    await buttons[1].trigger('click')

    expect(wrapper.emitted('toggle-title')[0][0]).toMatchObject({ code: 'streak7' })
    expect(wrapper.emitted('toggle-showcase')[0][0]).toMatchObject({ code: 'streak7' })
  })

  it('déjà titre et en vitrine - libellés de retrait', () => {
    const wrapper = mountWith(BadgeDetailModal, { ...base, isTitle: true, inShowcase: true })

    expect(wrapper.text()).toContain('Retirer le titre')
    expect(wrapper.text()).toContain('Retirer de ma vitrine')
  })

  it('vitrine pleine - ajout désactivé avec explication, retrait possible', () => {
    const full = mountWith(BadgeDetailModal, { ...base, showcaseFull: true })
    const addButton = full.findAll('button').find((b) => b.text() === 'Ajouter à ma vitrine')

    expect(addButton.element.disabled).toBe(true)
    expect(full.text()).toContain('3 badges maximum dans la vitrine')

    const inside = mountWith(BadgeDetailModal, { ...base, showcaseFull: true, inShowcase: true })
    expect(inside.findAll('button').find((b) => b.text() === 'Retirer de ma vitrine').element.disabled).toBe(false)
  })

  it('badge non obtenu ou API de profil indisponible - aucune action', () => {
    expect(mountWith(BadgeDetailModal, { ...base, badge: BADGES[2] }).text()).not.toContain('Choisir comme titre')
    expect(mountWith(BadgeDetailModal, { ...base, profileAvailable: false }).text()).not.toContain('Choisir comme titre')
  })
})

describe('ActivityCalendar', () => {
  it('résumé textuel, tableau avec légende et une case nommée par jour', () => {
    const wrapper = mountWith(ActivityCalendar, { activity: ACTIVITY })

    expect(wrapper.find('h2').text()).toBe('Mon activité')
    expect(wrapper.find('[data-testid="activity-summary"]').text()).toBe('2 jours actifs sur les 30 derniers jours, série de 1 jour.')
    expect(wrapper.find('caption').exists()).toBe(true)
    expect(wrapper.findAll('thead th').map((th) => th.text())).toEqual(['S45', 'S46', 'S47'])
    expect(wrapper.findAll('tbody th').map((th) => th.text())).toEqual(['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'])
    expect(wrapper.text()).toContain('lundi 2 novembre : activité')
    expect(wrapper.text()).toContain("mardi 3 novembre : pas d'activité")
  })

  it('jours après aujourd\'hui - cases absentes (aucun nom lu)', () => {
    const wrapper = mountWith(ActivityCalendar, { activity: ACTIVITY })

    expect(wrapper.text()).not.toContain('mardi 17 novembre')
    // 15 jours de la fenêtre (2 → 16 novembre) = 15 cases nommées
    expect(wrapper.findAll('tbody .cal-cell')).toHaveLength(15)
  })

  it('jour actif et jour courant - classes distinctes', () => {
    const wrapper = mountWith(ActivityCalendar, { activity: ACTIVITY })

    expect(wrapper.findAll('tbody .cal-cell--active')).toHaveLength(2)
    expect(wrapper.findAll('tbody .cal-cell--today')).toHaveLength(1)
  })

  it('zone défilante - focalisable au clavier et nommée', () => {
    const region = mountWith(ActivityCalendar, { activity: ACTIVITY }).find('[role="region"]')

    expect(region.attributes('tabindex')).toBe('0')
    expect(region.attributes('aria-label')).toContain('Calendrier')
  })
})

describe('GamificationSettings', () => {
  it('affiche les objectifs et quatre interrupteurs nommés', () => {
    const wrapper = mountWith(GamificationSettings, { settings: SETTINGS })

    expect(wrapper.find('h2').text()).toBe('Réglages de gamification')
    expect(wrapper.findAll('input[type="number"]')).toHaveLength(2)
    expect(wrapper.findAll('input[type="checkbox"]').map((i) => i.attributes('aria-label'))).toEqual([
      'Rappel si ma série est menacée',
      'Montrer mes badges à mes enseignants',
      "Animations d'obtention",
      'Mode zen',
    ])
  })

  it('états initiaux - animations cochées, le reste non', () => {
    const boxes = mountWith(GamificationSettings, { settings: SETTINGS }).findAll('input[type="checkbox"]')

    expect(boxes.map((b) => b.element.checked)).toEqual([false, false, true, false])
  })

  it('interrupteur - émet un patch avec la clé concernée', async () => {
    const wrapper = mountWith(GamificationSettings, { settings: SETTINGS })

    await wrapper.findAll('input[type="checkbox"]')[3].setValue(true)

    expect(wrapper.emitted('change')[0][0]).toEqual({ zenMode: true })
  })

  it('objectif - valeur normalisée avant envoi (hors bornes, négative)', async () => {
    const wrapper = mountWith(GamificationSettings, { settings: SETTINGS })
    const [cards, exercises] = wrapper.findAll('input[type="number"]')

    await cards.setValue('900')
    await exercises.setValue('-4')

    expect(wrapper.emitted('change').map(([patch]) => patch)).toEqual([{ dailyGoalCards: 500 }, { dailyGoalExercises: 0 }])
  })
})

describe('BadgesPage — blocs profil, activité, réglages, mode zen', () => {
  it('affiche vitrine, calendrier et réglages quand l\'API répond', async () => {
    const wrapper = mountWith(BadgesPage)
    await flushPromises()

    expect(wrapper.text()).toContain('Ma vitrine')
    expect(wrapper.text()).toContain('Mon activité')
    expect(wrapper.text()).toContain('Réglages de gamification')
    expect(wrapper.find('#badge-title-select').exists()).toBe(true)
  })

  it('API des blocs indisponible - page utilisable, message et Réessayer', async () => {
    api.profile.mockResolvedValue({ status: 404 })
    api.activity.mockResolvedValue({ status: 404 })
    api.settings.mockResolvedValue({ status: 404 })
    const wrapper = mountWith(BadgesPage)
    await flushPromises()

    expect(wrapper.text()).toContain('Tous les badges')
    expect(wrapper.text()).not.toContain('Ma vitrine')
    expect(wrapper.find('[role="alert"]').text()).toContain("n'ont pas pu être chargés")

    api.profile.mockResolvedValue(ok({ titleCode: null, showcaseCodes: [] }))
    api.activity.mockResolvedValue(ok(ACTIVITY))
    api.settings.mockResolvedValue(ok(SETTINGS))
    await wrapper.findAll('button').find((b) => b.text() === 'Réessayer').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Ma vitrine')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('niveaux par matière - bloc affiché sur la page, absent en mode zen', async () => {
    api.subjectLevels.mockResolvedValue(ok([{ subjectId: 1, name: 'Maths', rank: 1, level: { code: 'initiate', label: 'Initié', icon: '📘' }, stats: { masteredCards: 10, totalCards: 12, exercises: 0, averagePercent: 0 }, next: null }]))
    const wrapper = mountWith(BadgesPage)
    await flushPromises()

    expect(wrapper.find('[data-testid="subject-level-1"]').text()).toContain('Initié')

    useBadgesStore().settings = { ...SETTINGS, zenMode: true }
    await flushPromises()
    expect(wrapper.find('[data-testid="subject-levels"]').exists()).toBe(false)
  })

  it('titre choisi dans la liste - enregistré', async () => {
    const wrapper = mountWith(BadgesPage)
    await flushPromises()

    await wrapper.find('#badge-title-select').setValue('perfect')

    expect(api.saveProfile).toHaveBeenCalledWith({ titleCode: 'perfect' })
  })

  it('vitrine modifiée - enregistrée avec les codes cochés', async () => {
    const wrapper = mountWith(BadgesPage)
    await flushPromises()

    await wrapper.findAll('button').find((b) => b.text() === 'Choisir').trigger('click')
    await wrapper.find('input[type="checkbox"]').setValue(true)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(api.saveProfile).toHaveBeenCalledWith({ showcaseCodes: ['streak7'] })
    expect(wrapper.find('[data-testid="showcase-list"]').text()).toContain('7 jours de suite')
  })

  it('réglage modifié - envoyé à l\'API', async () => {
    const wrapper = mountWith(BadgesPage)
    await flushPromises()

    await wrapper.find('input[aria-label="Montrer mes badges à mes enseignants"]').setValue(true)
    await flushPromises()

    expect(api.updateSettings).toHaveBeenCalledWith({ badgesVisibleToTeachers: true })
  })

  it('mode zen actif - seul le bandeau reste, aucun badge ni marquage « vu »', async () => {
    api.settings.mockResolvedValue(ok({ ...SETTINGS, zenMode: true }))
    api.list.mockResolvedValue(ok(BADGES.map((b) => (b.earned ? { ...b, seenAt: null } : b))))
    const wrapper = mountWith(BadgesPage)
    await flushPromises()

    expect(wrapper.text()).toContain('Mode zen activé')
    expect(wrapper.text()).not.toContain('Tous les badges')
    expect(wrapper.text()).not.toContain('Ma vitrine')
    expect(api.markSeen).not.toHaveBeenCalled()
  })

  it('désactiver le mode zen - réaffiche les badges, annonce vocale et marque les nouveaux comme vus', async () => {
    api.settings.mockResolvedValue(ok({ ...SETTINGS, zenMode: true }))
    api.list.mockResolvedValue(ok(BADGES.map((b) => (b.earned ? { ...b, seenAt: null } : b))))
    const wrapper = mountWith(BadgesPage)
    await flushPromises()

    await wrapper.findAll('button').find((b) => b.text() === 'Désactiver le mode zen').trigger('click')
    await flushPromises()

    expect(api.updateSettings).toHaveBeenCalledWith({ zenMode: false })
    expect(wrapper.text()).toContain('Tous les badges')
    expect(wrapper.find('[role="status"]').text()).toBe('Mode zen désactivé')
    expect(api.markSeen).toHaveBeenCalledWith(['streak7', 'perfect'])
  })

  it('activer le mode zen depuis les réglages - annonce « Mode zen activé »', async () => {
    const wrapper = mountWith(BadgesPage)
    await flushPromises()

    await wrapper.find('input[aria-label="Mode zen"]').setValue(true)
    await flushPromises()

    expect(wrapper.find('[role="status"]').text()).toBe('Mode zen activé')
    expect(wrapper.text()).not.toContain('Tous les badges')
  })

  it('détail d\'un badge obtenu - « Choisir comme titre » enregistre le titre', async () => {
    const wrapper = mountWith(BadgesPage)
    await flushPromises()

    await wrapper.findAll('button').find((b) => b.attributes('aria-label')?.startsWith('7 jours de suite')).trigger('click')
    await wrapper.findAll('button').find((b) => b.text() === 'Choisir comme titre').trigger('click')

    expect(api.saveProfile).toHaveBeenCalledWith({ titleCode: 'streak7' })
  })
})

describe('ProfileBadgesSummary — vitrine, titre, mode zen', () => {
  it('vitrine choisie - elle remplace les derniers badges, titre affiché', async () => {
    api.profile.mockResolvedValue(ok({ titleCode: 'streak7', showcaseCodes: ['perfect'] }))
    const wrapper = mountWith(ProfileBadgesSummary)
    await flushPromises()

    expect(wrapper.find('[data-testid="badge-title"]').text()).toContain('7 jours de suite')
    expect(wrapper.find('ul').text()).toContain('Score parfait')
    expect(wrapper.find('ul').text()).not.toContain('7 jours de suite')
  })

  it('aucune vitrine - retombe sur les derniers badges obtenus', async () => {
    const wrapper = mountWith(ProfileBadgesSummary)
    await flushPromises()

    expect(wrapper.find('ul').text()).toContain('7 jours de suite')
    expect(wrapper.find('[data-testid="badge-title"]').exists()).toBe(false)
  })

  it('mode zen - la carte des succès est remplacée par un bouton pour quitter le mode', async () => {
    api.settings.mockResolvedValue(ok({ ...SETTINGS, zenMode: true }))
    const wrapper = mountWith(ProfileBadgesSummary)
    await flushPromises()

    expect(wrapper.text()).not.toContain('Mes succès')
    expect(wrapper.text()).not.toContain('Voir tous mes badges')

    await wrapper.find('[data-testid="zen-disable"]').trigger('click')
    await flushPromises()

    expect(api.updateSettings).toHaveBeenCalledWith({ zenMode: false })
    expect(wrapper.text()).toContain('Mes succès')
    expect(wrapper.find('[data-testid="zen-disable"]').exists()).toBe(false)
  })

  it('API des réglages en erreur - la carte reste affichée', async () => {
    api.settings.mockRejectedValue(new Error('réseau'))
    const wrapper = mountWith(ProfileBadgesSummary)
    await flushPromises()

    expect(wrapper.find('h2').text()).toBe('Mes succès')
  })
})

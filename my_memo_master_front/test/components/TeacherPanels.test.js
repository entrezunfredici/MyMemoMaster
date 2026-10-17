import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import TeacherGroupPicker from '@/components/classroom/teacher/TeacherGroupPicker.vue'
import TeacherStudentKpi from '@/components/classroom/teacher/TeacherStudentKpi.vue'
import TeacherAnalyticsPanel from '@/components/classroom/teacher/TeacherAnalyticsPanel.vue'
import TeacherSectionsPanel from '@/components/classroom/teacher/TeacherSectionsPanel.vue'
import TeacherDeadlinesPanel from '@/components/classroom/teacher/TeacherDeadlinesPanel.vue'
import TeacherSectionForm from '@/components/classroom/teacher/TeacherSectionForm.vue'
import TeacherResourceForm from '@/components/classroom/teacher/TeacherResourceForm.vue'
import TeacherResourceList from '@/components/classroom/teacher/TeacherResourceList.vue'
import TeacherDeadlineForm from '@/components/classroom/teacher/TeacherDeadlineForm.vue'
import TeacherInviteForm from '@/components/classroom/teacher/TeacherInviteForm.vue'
import TeacherMembersPanel from '@/components/classroom/teacher/TeacherMembersPanel.vue'
import { CONFIRM_ACTION_KEY } from '@/composables/useConfirmAction'
import { useClassGroupSectionStore } from '@/stores/classGroupSections'
import { useClassGroupResourceStore } from '@/stores/classGroupResources'
import { useClassGroupSubmissionStore } from '@/stores/classGroupSubmissions'
import { useDeadlineStore } from '@/stores/deadlines'
import { useInvitationStore } from '@/stores/invitations'
import { useClassGroupStore } from '@/stores/classGroups'
import { useKpiConsentStore } from '@/stores/kpiConsent'

const { mockGet, mockOpenFile, mockDownloadFile } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockOpenFile: vi.fn(),
  mockDownloadFile: vi.fn(),
}))
vi.mock('@/helpers/api', () => ({ api: { get: mockGet, post: vi.fn(), put: vi.fn(), del: vi.fn() } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: vi.fn() } }))
vi.mock('@/composables/useStoredFile', () => ({ useStoredFile: () => ({ openFile: mockOpenFile, downloadFile: mockDownloadFile }) }))

const GROUP_ID = 7

function mountPanel(component, { props = {}, state = {}, ask = vi.fn() } = {}) {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
    initialState: state,
  })
  const wrapper = mount(component, {
    props,
    global: { plugins: [pinia], provide: { [CONFIRM_ACTION_KEY]: ask } },
  })
  return { wrapper, ask }
}

const btn = (w, text) => w.findAll('button').find((b) => b.text().includes(text))

beforeEach(() => vi.clearAllMocks())

describe('TeacherGroupPicker', () => {
  const groups = [
    { id: 1, name: 'MP2I A', level: 'MP2I', members: [{}, {}] },
    { id: 2, name: 'L3', level: 'L3' },
  ]

  it('une carte par groupe avec niveau, nom et nombre de membres', () => {
    const { wrapper } = mountPanel(TeacherGroupPicker, { props: { groups, selectedId: 1 } })
    const text = wrapper.text()
    expect(text).toContain('MP2I A')
    expect(text).toContain('2 membres')
    expect(text).toContain('0 membre') // accord français : 0 au singulier
    expect(text).not.toContain('0 membres')
  })

  it('la carte sélectionnée est mise en évidence', () => {
    const { wrapper } = mountPanel(TeacherGroupPicker, { props: { groups, selectedId: 2 } })
    const cards = wrapper.findAll('[role="button"]')
    expect(cards[0].classes()).toContain('border-gray')
    expect(cards[1].classes()).toContain('border-primary')
  })

  it('clic, Entrée et Espace émettent « select » avec l’identifiant (RGAA 7.1)', async () => {
    const { wrapper } = mountPanel(TeacherGroupPicker, { props: { groups, selectedId: null } })
    const card = wrapper.findAll('[role="button"]')[1]
    expect(card.attributes('tabindex')).toBe('0')
    await card.trigger('click')
    await card.trigger('keydown', { key: 'Enter' })
    await card.trigger('keydown', { key: ' ' })
    expect(wrapper.emitted('select')).toEqual([[2], [2], [2]])
  })

  it('« 1 membre » au singulier', () => {
    const { wrapper } = mountPanel(TeacherGroupPicker, { props: { groups: [{ id: 3, name: 'Solo', level: 'L1', members: [{}] }], selectedId: null } })
    expect(wrapper.text()).toContain('1 membre')
    expect(wrapper.text()).not.toContain('1 membres')
  })

  it('aucun groupe : message', () => {
    const { wrapper } = mountPanel(TeacherGroupPicker, { props: { groups: [], selectedId: null } })
    expect(wrapper.text()).toContain('Aucun groupe.')
  })
})

describe('TeacherStudentKpi', () => {
  const kpi = {
    revision: { streakDays: 4, totalPlanned: 10, totalCompleted: 7, completionRate: 70, sessionsLast30Days: 8, completedLast30Days: 6, totalMinutes: 135, weeklyActivity: [{ week: 'S40', count: 3 }, { week: 'S41', count: 0 }] },
    exercises: { totalTests: 5, avgScore: 74, minScore: 40, maxScore: 95, recentTrend: 6, scoreHistory: [{ date: 'a', testName: 'DS 1', percentage: 80 }] },
    leitner: { totalCards: 42, mastery: 66, cardsDue: 9, globalSuccessRate: 71, cardsByBox: { 1: 10, 3: 12 } },
    subjects: { list: [{ subjectId: 1, name: 'Maths', systems: 2, tests: 0 }] },
    discipline: { plannedThisWeek: 5, completedThisWeek: 3, disciplineScore: 55 },
    badges: [{ id: 1, unlocked: true, icon: '🔥', label: 'Série', description: '7 j' }, { id: 2, unlocked: false, icon: '🏆', label: 'Maître' }],
  }

  it('pas encore chargé : « Chargement des KPI… »', () => {
    const { wrapper } = mountPanel(TeacherStudentKpi, { props: { loaded: false, kpi: undefined } })
    expect(wrapper.text()).toContain('Chargement des KPI')
  })

  it('pas de consentement (kpi null) : message explicatif', () => {
    const { wrapper } = mountPanel(TeacherStudentKpi, { props: { loaded: true, kpi: null } })
    expect(wrapper.text()).toContain("n'a pas encore partagé ses KPI")
  })

  it('synthèse : streak, discipline, maîtrise Leitner', () => {
    const { wrapper } = mountPanel(TeacherStudentKpi, { props: { loaded: true, kpi } })
    const summary = wrapper.findAll('.grid.grid-cols-3')[0].text()
    expect(summary).toContain('4 j')
    expect(summary).toContain('55 %')
    expect(summary).toContain('66 %')
  })

  it('révision : temps formaté et une barre par semaine', () => {
    const { wrapper } = mountPanel(TeacherStudentKpi, { props: { loaded: true, kpi } })
    expect(wrapper.text()).toContain('2h 15min')
    const bars = wrapper.findAll('[title^="Semaine du"]')
    expect(bars.map((b) => b.attributes('title'))).toEqual([
      'Semaine du S40 : 3 séance(s) complétée(s)',
      'Semaine du S41 : 0 séance(s) complétée(s)',
    ])
    expect(bars[1].attributes('style')).toContain('3px')
  })

  it('exercices : tendance positive signée, dernières évaluations', () => {
    const { wrapper } = mountPanel(TeacherStudentKpi, { props: { loaded: true, kpi } })
    expect(wrapper.text()).toContain('+6 %')
    expect(wrapper.text()).toContain('DS 1')
  })

  it('Leitner : distribution sur 5 boîtes, boîtes vides à 0', () => {
    const { wrapper } = mountPanel(TeacherStudentKpi, { props: { loaded: true, kpi } })
    const text = wrapper.text()
    for (const box of ['B1', 'B2', 'B3', 'B4', 'B5']) expect(text).toContain(box)
  })

  it('matières et badges débloqués seulement', () => {
    const { wrapper } = mountPanel(TeacherStudentKpi, { props: { loaded: true, kpi } })
    expect(wrapper.text()).toContain('Maths')
    expect(wrapper.text()).toContain('2 syst.')
    expect(wrapper.text()).toContain('Série')
    expect(wrapper.text()).not.toContain('Maître')
  })

  it('sections facultatives absentes quand les données manquent', () => {
    const sparse = { ...kpi, subjects: { list: [] }, badges: [{ id: 2, unlocked: false, label: 'Maître' }], revision: { ...kpi.revision, weeklyActivity: [] }, exercises: { ...kpi.exercises, scoreHistory: [] } }
    const { wrapper } = mountPanel(TeacherStudentKpi, { props: { loaded: true, kpi: sparse } })
    expect(wrapper.text()).not.toContain('Matières étudiées')
    expect(wrapper.text()).not.toContain('Badges débloqués')
    expect(wrapper.text()).not.toContain('Activité / semaine')
    expect(wrapper.text()).not.toContain('dernières évaluations')
  })
})

describe('TeacherAnalyticsPanel', () => {
  const ANALYTICS = {
    activeStudentsCount: 2,
    atRiskCount: 1,
    scoreWeeklyTrend: [{ avgScore: 60 }, { avgScore: 72 }],
    students: [
      { userId: 21, name: 'Alice', email: 'a@x.fr', atRisk: false, atRiskReasons: [], avgScore: 82, lastActivityAt: null, daysInactive: 0, scoreTrend: [] },
      { userId: 22, name: 'Bob', email: 'b@x.fr', atRisk: true, atRiskReasons: ['Inactif'], avgScore: null, lastActivityAt: null, daysInactive: 12, scoreTrend: [] },
    ],
  }
  const mountAnalytics = async (props = {}) => {
    mockGet.mockResolvedValue({ status: 200, data: { data: ANALYTICS } })
    const r = mountPanel(TeacherAnalyticsPanel, { props: { groupId: GROUP_ID, ...props } })
    await flushPromises()
    return r
  }

  it('charge l’analyse du groupe à l’affichage', async () => {
    await mountAnalytics()
    expect(mockGet).toHaveBeenCalledWith(`class-groups/${GROUP_ID}/kpi/students`)
  })

  it('compteurs, alertes de décrochage et liste des étudiants', async () => {
    const { wrapper } = await mountAnalytics()
    const text = wrapper.text()
    expect(text).toContain('Actifs (7j)')
    expect(text).toContain('72 %') // score de la semaine courante
    expect(text).toContain('Alertes décrochage (1)')
    expect(text).toContain('Étudiants (2)')
    expect(text).toContain('⚠ Risque')
    expect(text).toContain('✓ OK')
  })

  it('« Actualiser » recharge l’analyse', async () => {
    const { wrapper } = await mountAnalytics()
    mockGet.mockClear()
    await btn(wrapper, 'Actualiser').trigger('click')
    await flushPromises()
    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('un nouveau jeton de rechargement relance le chargement (même groupe cliqué à nouveau)', async () => {
    const { wrapper } = await mountAnalytics({ refreshToken: 0 })
    mockGet.mockClear()
    await wrapper.setProps({ refreshToken: 1 })
    await flushPromises()
    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('changer de groupe relance le chargement pour le nouveau groupe', async () => {
    const { wrapper } = await mountAnalytics()
    mockGet.mockClear()
    await wrapper.setProps({ groupId: 9 })
    await flushPromises()
    expect(mockGet).toHaveBeenCalledWith('class-groups/9/kpi/students')
  })

  it('analyse indisponible : invite à sélectionner un groupe', async () => {
    mockGet.mockResolvedValue({ status: 500 })
    const { wrapper } = mountPanel(TeacherAnalyticsPanel, { props: { groupId: GROUP_ID } })
    await flushPromises()
    expect(wrapper.text()).toContain("Sélectionnez un groupe pour voir l'analyse.")
  })

  it('déplier un étudiant demande ses KPI pour ce groupe et l’annonce (aria-expanded)', async () => {
    const { wrapper } = await mountAnalytics()
    const row = wrapper.findAll('[aria-expanded]')[0]
    expect(row.attributes('aria-expanded')).toBe('false')
    await row.trigger('click')
    expect(useKpiConsentStore().fetchStudentKpis).toHaveBeenCalledWith(21, GROUP_ID)
    expect(wrapper.findAll('[aria-expanded]')[0].attributes('aria-expanded')).toBe('true')
  })

  it('l’en-tête d’un étudiant est un vrai <button> ; le détail déplié est hors du bouton (RGAA 7.1)', async () => {
    const { wrapper } = await mountAnalytics()
    expect(wrapper.findAll('[role="button"]')).toHaveLength(0)
    const row = wrapper.findAll('[aria-expanded]')[0]
    expect(row.element.tagName).toBe('BUTTON')
    expect(row.attributes('type')).toBe('button')
    await row.trigger('click')
    wrapper.findAll('[aria-expanded]').forEach((b) => expect(b.findAll('button, a, input, select')).toHaveLength(0))
  })

  it('replier ne redemande pas les KPI', async () => {
    const { wrapper } = await mountAnalytics()
    await wrapper.findAll('[aria-expanded]')[0].trigger('click')
    useKpiConsentStore().fetchStudentKpis.mockClear()
    await wrapper.findAll('[aria-expanded]')[0].trigger('click')
    expect(useKpiConsentStore().fetchStudentKpis).not.toHaveBeenCalled()
  })

  it('badge de consentement visible une fois les KPI chargés', async () => {
    mockGet.mockResolvedValue({ status: 200, data: { data: ANALYTICS } })
    const { wrapper } = mountPanel(TeacherAnalyticsPanel, {
      props: { groupId: GROUP_ID },
      state: { kpiConsent: { studentKpis: { 21: { revision: {} }, 22: null } } },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('KPI ✓')
    expect(wrapper.text()).toContain('KPI —')
  })
})

describe('TeacherSectionsPanel', () => {
  const SECTIONS = [
    { id: 1, title: 'Chapitre 1', type: 'section', description: 'Intro', dueDate: '2026-11-01' },
    { id: 2, title: 'DM 1', type: 'rendu', description: '', dueDate: null },
  ]
  const STATUS = { 2: { submitted: [{ submissionId: 1, name: 'Alice', originalName: 'dm.pdf', fileSize: 2048, submittedAt: '2026-10-12', fileKey: 'k' }], notSubmitted: [{ studentId: 5, name: 'Bob', email: 'bob@x.fr' }] } }
  const mountSections = (extra = {}) =>
    mountPanel(TeacherSectionsPanel, {
      props: { groupId: GROUP_ID, ...extra.props },
      state: { classGroupSections: { sections: extra.sections ?? SECTIONS }, classGroupSubmissions: { submissionStatus: extra.status ?? {} } },
      ask: extra.ask,
    })

  it('chargement, liste vide, liste', () => {
    expect(mountSections({ props: { loading: true } }).wrapper.text()).toContain('Chargement...')
    expect(mountSections({ sections: [] }).wrapper.text()).toContain('Aucune section créée.')
    const text = mountSections().wrapper.text()
    expect(text).toContain('Chapitre 1')
    expect(text).toContain('Date cible')
    expect(text).toContain('DM 1')
  })

  it('supprimer une section demande confirmation (texte « section ») puis supprime dans le groupe', async () => {
    const { wrapper, ask } = mountSections()
    await btn(wrapper.findAll('.rounded-xl.border')[0], 'Supprimer').trigger('click')
    const [title, message, action] = ask.mock.calls[0]
    expect(title).toBe('Supprimer la section')
    expect(message).toContain('Chapitre 1')
    expect(message).not.toContain('soumissions')
    await action()
    expect(useClassGroupSectionStore().delete).toHaveBeenCalledWith(GROUP_ID, 1)
  })

  it('supprimer un rendu prévient que les soumissions seront perdues', async () => {
    const { wrapper, ask } = mountSections()
    await btn(wrapper.findAll('.rounded-xl.border')[1], 'Supprimer').trigger('click')
    expect(ask.mock.calls[0][0]).toBe('Supprimer le rendu')
    expect(ask.mock.calls[0][1]).toContain('supprime aussi les soumissions déjà reçues')
  })

  it('un rendu se déplie par un vrai <button> (clavier natif), « Supprimer » en est le frère et non un descendant', async () => {
    const { wrapper } = mountSections({ status: STATUS })
    const headers = wrapper.findAll('.rounded-xl.border > div:first-child > :first-child')
    expect(headers[0].element.tagName).toBe('DIV')
    expect(headers[0].attributes('aria-expanded')).toBeUndefined()
    expect(headers[1].element.tagName).toBe('BUTTON')
    expect(headers[1].attributes('aria-expanded')).toBe('false')
    wrapper.findAll('.rounded-xl.border > div:first-child').forEach((row) => {
      expect(row.findAll('button button')).toHaveLength(0)
      expect(row.findAll('[role="button"]')).toHaveLength(0)
      expect(row.find(':scope > button:last-child').text()).toBe('Supprimer')
    })
  })

  it('seule une section de type rendu se déplie et charge ses soumissions', async () => {
    const { wrapper } = mountSections({ status: STATUS })
    const headers = wrapper.findAll('.rounded-xl.border > div:first-child > :first-child')
    await headers[0].trigger('click')
    expect(useClassGroupSubmissionStore().fetchStatus).not.toHaveBeenCalled()
    await headers[1].trigger('click')
    expect(headers[1].attributes('aria-expanded')).toBe('true')
    expect(useClassGroupSubmissionStore().fetchStatus).toHaveBeenCalledWith(GROUP_ID, 2)
    expect(wrapper.text()).toContain('Rendus reçus')
    expect(wrapper.text()).toContain('1 rendu(s)')
    expect(wrapper.text()).toContain('1 en attente')
    expect(wrapper.text()).toContain('Pas encore rendu')
  })

  it('replier ne recharge pas, redéplier recharge', async () => {
    const { wrapper } = mountSections({ status: STATUS })
    const header = () => wrapper.findAll('.rounded-xl.border > div:first-child > :first-child')[1]
    await header().trigger('click')
    await header().trigger('click')
    expect(wrapper.text()).not.toContain('Rendus reçus')
    await header().trigger('click')
    expect(useClassGroupSubmissionStore().fetchStatus).toHaveBeenCalledTimes(2)
  })

  it('« Chargement des rendus… » tant que le statut n’est pas arrivé', async () => {
    const { wrapper } = mountSections()
    await wrapper.findAll('.rounded-xl.border > div:first-child > :first-child')[1].trigger('click')
    expect(wrapper.text()).toContain('Chargement des rendus')
  })

  it('télécharger un rendu : nouvel onglet', async () => {
    const { wrapper } = mountSections({ status: STATUS })
    await wrapper.findAll('.rounded-xl.border > div:first-child > :first-child')[1].trigger('click')
    await btn(wrapper, 'Télécharger').trigger('click')
    expect(mockDownloadFile).toHaveBeenCalledWith('k', { newTab: true })
  })

  it('une nouvelle sélection de groupe referme les rendus dépliés', async () => {
    const { wrapper } = mountSections({ status: STATUS })
    await wrapper.findAll('.rounded-xl.border > div:first-child > :first-child')[1].trigger('click')
    expect(wrapper.text()).toContain('Rendus reçus')
    await wrapper.setProps({ refreshToken: 1 })
    expect(wrapper.text()).not.toContain('Rendus reçus')
  })
})

describe('TeacherDeadlinesPanel', () => {
  const DEADLINES = [
    { id: 1, name: 'DS 1', type: 'ds', dueDate: '2026-11-10', test: { name: 'Algèbre' }, occurrence: { calendarEvent: { name: 'Maths' } } },
    { id: 2, name: 'Exposé', type: 'exposé', dueDate: '2026-11-20', test: null, occurrence: null },
  ]
  const mountDeadlines = (props = {}, ask) =>
    mountPanel(TeacherDeadlinesPanel, { props: { groupId: GROUP_ID, ...props }, state: { deadlines: { groupDeadlines: DEADLINES } }, ask })

  it('liste avec type, date, exercice associé et séance', () => {
    const text = mountDeadlines().wrapper.text()
    expect(text).toContain('DS · ')
    expect(text).toContain('Algèbre')
    expect(text).toContain('Séance : Maths')
    expect(text).toContain('Exposé')
  })

  it('chargement et liste vide', () => {
    expect(mountDeadlines({ loading: true }).wrapper.text()).toContain('Chargement...')
    const { wrapper } = mountPanel(TeacherDeadlinesPanel, { props: { groupId: GROUP_ID }, state: { deadlines: { groupDeadlines: [] } } })
    expect(wrapper.text()).toContain('Aucune échéance.')
  })

  it('suppression confirmée : supprime puis recharge les échéances du groupe', async () => {
    const { wrapper, ask } = mountDeadlines()
    useDeadlineStore().deleteDeadline.mockResolvedValue(true)
    await btn(wrapper, 'Supprimer').trigger('click')
    expect(ask.mock.calls[0][0]).toBe("Supprimer l'échéance")
    await ask.mock.calls[0][2]()
    expect(useDeadlineStore().deleteDeadline).toHaveBeenCalledWith(1)
    expect(useDeadlineStore().fetchByGroup).toHaveBeenCalledWith(GROUP_ID)
  })

  it('suppression refusée par l’API : pas de rechargement', async () => {
    const { wrapper, ask } = mountDeadlines()
    useDeadlineStore().deleteDeadline.mockResolvedValue(false)
    await btn(wrapper, 'Supprimer').trigger('click')
    await ask.mock.calls[0][2]()
    expect(useDeadlineStore().fetchByGroup).not.toHaveBeenCalled()
  })
})

describe('TeacherSectionForm', () => {
  const mountForm = () => mountPanel(TeacherSectionForm, { props: { groupId: GROUP_ID } })

  it('titre requis', async () => {
    const { wrapper } = mountForm()
    await btn(wrapper, 'Créer').trigger('click')
    expect(wrapper.text()).toContain('Le titre est requis.')
    expect(useClassGroupSectionStore().create).not.toHaveBeenCalled()
  })

  it('crée la section (valeurs nettoyées, champs vides -> null) puis vide le formulaire', async () => {
    const { wrapper } = mountForm()
    useClassGroupSectionStore().create.mockResolvedValue(true)
    await wrapper.find('input[aria-label="Titre"]').setValue('  Chapitre 2 ')
    await wrapper.find('input[aria-label="Description"]').setValue('   ')
    await btn(wrapper, 'Créer').trigger('click')
    await flushPromises()
    expect(useClassGroupSectionStore().create).toHaveBeenCalledWith(GROUP_ID, { title: 'Chapitre 2', type: 'section', description: null, dueDate: null })
    expect(wrapper.find('input[aria-label="Titre"]').element.value).toBe('')
  })

  it('le choix « Rendu » change le type envoyé', async () => {
    const { wrapper } = mountForm()
    useClassGroupSectionStore().create.mockResolvedValue(true)
    await wrapper.find('input[aria-label="Titre"]').setValue('DM')
    await btn(wrapper, 'Rendu').trigger('click')
    await wrapper.find('input[aria-label="Date limite"]').setValue('2026-12-01')
    await btn(wrapper, 'Créer').trigger('click')
    expect(useClassGroupSectionStore().create).toHaveBeenCalledWith(GROUP_ID, expect.objectContaining({ type: 'rendu', dueDate: '2026-12-01' }))
  })

  it('échec de création : la saisie est conservée', async () => {
    const { wrapper } = mountForm()
    useClassGroupSectionStore().create.mockResolvedValue(false)
    await wrapper.find('input[aria-label="Titre"]').setValue('Garde-moi')
    await btn(wrapper, 'Créer').trigger('click')
    await flushPromises()
    expect(wrapper.find('input[aria-label="Titre"]').element.value).toBe('Garde-moi')
  })
})

describe('TeacherResourceForm', () => {
  const file = new File(['x'], 'cours.pdf', { type: 'application/pdf' })
  const mountForm = (uploading = false) =>
    mountPanel(TeacherResourceForm, { props: { groupId: GROUP_ID }, state: { classGroupResources: { resources: [], uploading } } })

  it('titre puis fichier requis', async () => {
    const { wrapper } = mountForm()
    await btn(wrapper, 'Partager').trigger('click')
    expect(wrapper.text()).toContain('Le titre est requis.')
    await wrapper.find('input[aria-label="Titre"]').setValue('Cours')
    await btn(wrapper, 'Partager').trigger('click')
    expect(wrapper.text()).toContain('Sélectionnez un fichier à partager.')
    expect(useClassGroupResourceStore().uploadAndCreate).not.toHaveBeenCalled()
  })

  it('fichier choisi par l’input : nom et taille affichés, puis envoi', async () => {
    const { wrapper } = mountForm()
    useClassGroupResourceStore().uploadAndCreate.mockResolvedValue(true)
    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change')
    expect(wrapper.text()).toContain('cours.pdf')
    await wrapper.find('input[aria-label="Titre"]').setValue('  Cours 1 ')
    await wrapper.find('select[aria-label="Type de ressource"]').setValue('sujet')
    await btn(wrapper, 'Partager').trigger('click')
    await flushPromises()
    expect(useClassGroupResourceStore().uploadAndCreate).toHaveBeenCalledWith(GROUP_ID, file, { title: 'Cours 1', type: 'sujet' })
    expect(wrapper.text()).not.toContain('cours.pdf')
  })

  it('glisser-déposer : le survol est signalé puis le fichier retenu', async () => {
    const { wrapper } = mountForm()
    const zone = wrapper.find('[role="button"]')
    await zone.trigger('dragover')
    expect(zone.classes()).toContain('border-primary')
    await zone.trigger('drop', { dataTransfer: { files: [file] } })
    expect(zone.classes()).not.toContain('border-primary')
    expect(wrapper.text()).toContain('cours.pdf')
  })

  it('« Retirer » écarte le fichier choisi sans ouvrir le sélecteur', async () => {
    const { wrapper } = mountForm()
    await wrapper.find('[role="button"]').trigger('drop', { dataTransfer: { files: [file] } })
    await btn(wrapper, 'Retirer').trigger('click')
    expect(wrapper.text()).toContain('Glissez un fichier ici')
  })

  it('zone de dépôt accessible : nommée et atteignable au clavier', () => {
    const { wrapper } = mountForm()
    const zone = wrapper.find('[role="button"]')
    expect(zone.attributes('aria-label')).toBe('Déposer ou choisir un fichier')
    expect(zone.attributes('tabindex')).toBe('0')
  })

  it('envoi en cours : bouton désactivé et libellé adapté', () => {
    const { wrapper } = mountForm(true)
    const b = btn(wrapper, 'Upload en cours')
    expect(b.attributes('disabled')).toBeDefined()
  })
})

describe('TeacherResourceList', () => {
  const RESOURCES = [
    { id: 1, title: 'Cours.pdf', type: 'cours', mimeType: 'application/pdf', fileSize: 2048, fileKey: 'k1' },
    { id: 2, title: 'Schéma', type: 'autre', mimeType: 'image/png', fileSize: 0, fileKey: null },
  ]
  const mountList = (resources = RESOURCES, ask) =>
    mountPanel(TeacherResourceList, { props: { groupId: GROUP_ID }, state: { classGroupResources: { resources } }, ask })

  it('liste vide', () => {
    expect(mountList([]).wrapper.text()).toContain('Aucun document.')
  })

  it('icône, type et taille ; « Ouvrir » seulement avec un fichier', () => {
    const { wrapper } = mountList()
    const text = wrapper.text()
    expect(text).toContain('📕')
    expect(text).toContain('Cours · 2 Ko')
    expect(wrapper.findAll('button').filter((b) => b.text() === 'Ouvrir')).toHaveLength(1)
  })

  it('« Ouvrir » ouvre le fichier', async () => {
    const { wrapper } = mountList()
    await btn(wrapper, 'Ouvrir').trigger('click')
    expect(mockOpenFile).toHaveBeenCalledWith('k1')
  })

  it('suppression : confirmation puis suppression dans le groupe', async () => {
    const { wrapper, ask } = mountList()
    await wrapper.find('button[aria-label="Supprimer la ressource"]').trigger('click')
    expect(ask.mock.calls[0][0]).toBe('Supprimer la ressource')
    await ask.mock.calls[0][2]()
    expect(useClassGroupResourceStore().delete).toHaveBeenCalledWith(GROUP_ID, 1)
  })
})

describe('TeacherDeadlineForm', () => {
  const EVENTS = [
    { id: 61, name: 'Maths', occurrences: [{ id: 611, date: '2026-11-03', startTime: '08:00' }, { id: 612, date: '2026-10-27', startTime: '08:00' }] },
    { id: 62, name: 'Anglais', occurrences: [{ id: 621, date: '2026-11-05', startTime: '10:00' }] },
    { id: 63, name: 'Sans séance' },
  ]
  const mountForm = () =>
    mountPanel(TeacherDeadlineForm, {
      props: { groupId: GROUP_ID },
      state: { calendarEvents: { groupEvents: EVENTS }, tests: { tests: [{ testId: 1, name: 'Algèbre' }] } },
    })

  it('séances triées de la plus ancienne à la plus récente, exercices proposés', () => {
    const { wrapper } = mountForm()
    const options = wrapper.findAll('select[aria-label="Séance concernée"] option').map((o) => o.attributes('value'))
    expect(options).toEqual(['', '612', '611', '621'])
    expect(wrapper.findAll('select[aria-label="Exercice associé"] option')).toHaveLength(2)
  })

  it('validations successives : titre, séance, date', async () => {
    const { wrapper } = mountForm()
    await btn(wrapper, "Ajouter l'échéance").trigger('click')
    expect(wrapper.text()).toContain('Le titre est requis.')
    await wrapper.find('input[aria-label="Titre"]').setValue('DS')
    await btn(wrapper, "Ajouter l'échéance").trigger('click')
    expect(wrapper.text()).toContain('Sélectionnez une séance.')
    await wrapper.find('select[aria-label="Séance concernée"]').setValue('611')
    await btn(wrapper, "Ajouter l'échéance").trigger('click')
    expect(wrapper.text()).toContain('La date limite est requise.')
    expect(useDeadlineStore().createDeadline).not.toHaveBeenCalled()
  })

  it('création : séance en nombre, heure et exercice facultatifs en null, puis rechargement', async () => {
    const { wrapper } = mountForm()
    useDeadlineStore().createDeadline.mockResolvedValue(true)
    await wrapper.find('input[aria-label="Titre"]').setValue(' DS 1 ')
    await wrapper.find('select[aria-label="Séance concernée"]').setValue('611')
    await wrapper.find('input[aria-label="Date limite"]').setValue('2026-11-10')
    await btn(wrapper, "Ajouter l'échéance").trigger('click')
    await flushPromises()
    expect(useDeadlineStore().createDeadline).toHaveBeenCalledWith({
      name: 'DS 1', type: 'ds', occurrenceId: 611, dueDate: '2026-11-10', dueTime: null, testId: null,
    })
    expect(useDeadlineStore().fetchByGroup).toHaveBeenCalledWith(GROUP_ID)
    expect(wrapper.find('input[aria-label="Titre"]').element.value).toBe('')
  })

  it('échec : pas de rechargement, saisie conservée', async () => {
    const { wrapper } = mountForm()
    useDeadlineStore().createDeadline.mockResolvedValue(false)
    await wrapper.find('input[aria-label="Titre"]').setValue('DS')
    await wrapper.find('select[aria-label="Séance concernée"]').setValue('611')
    await wrapper.find('input[aria-label="Date limite"]').setValue('2026-11-10')
    await btn(wrapper, "Ajouter l'échéance").trigger('click')
    await flushPromises()
    expect(useDeadlineStore().fetchByGroup).not.toHaveBeenCalled()
    expect(wrapper.find('input[aria-label="Titre"]').element.value).toBe('DS')
  })
})

describe('TeacherInviteForm', () => {
  const mountForm = () => mountPanel(TeacherInviteForm, { props: { groupId: GROUP_ID } })

  it('email requis', async () => {
    const { wrapper } = mountForm()
    await btn(wrapper, "Envoyer l'invitation").trigger('click')
    expect(wrapper.text()).toContain("L'email est requis.")
    expect(useInvitationStore().invite).not.toHaveBeenCalled()
  })

  it('succès : la fiche du groupe est rechargée (un compte existant est ajouté DIRECTEMENT aux membres)', async () => {
    const { wrapper } = mountForm()
    useInvitationStore().invite.mockResolvedValue(true)
    await wrapper.find('input[aria-label="Email"]').setValue('existant@x.fr')
    await btn(wrapper, "Envoyer l'invitation").trigger('click')
    await flushPromises()
    expect(useClassGroupStore().fetchGroupById).toHaveBeenCalledWith(GROUP_ID)
  })

  it('échec : la fiche du groupe n’est pas rechargée', async () => {
    const { wrapper } = mountForm()
    useInvitationStore().invite.mockResolvedValue(false)
    await wrapper.find('input[aria-label="Email"]').setValue('a@x.fr')
    await btn(wrapper, "Envoyer l'invitation").trigger('click')
    await flushPromises()
    expect(useClassGroupStore().fetchGroupById).not.toHaveBeenCalled()
  })

  it('succès : invitation étudiante, message de confirmation, champ vidé, liste rechargée', async () => {
    const { wrapper } = mountForm()
    useInvitationStore().invite.mockResolvedValue(true)
    await wrapper.find('input[aria-label="Email"]').setValue('nouveau@x.fr')
    await btn(wrapper, "Envoyer l'invitation").trigger('click')
    await flushPromises()
    expect(useInvitationStore().invite).toHaveBeenCalledWith(GROUP_ID, { targetEmail: 'nouveau@x.fr', role: 'student' })
    expect(useInvitationStore().fetchByGroup).toHaveBeenCalledWith(GROUP_ID)
    expect(wrapper.text()).toContain('Invitation envoyée.')
    expect(wrapper.find('.text-success').exists()).toBe(true)
    expect(wrapper.find('input[aria-label="Email"]').element.value).toBe('')
  })

  it('échec : message d’erreur, email conservé', async () => {
    const { wrapper } = mountForm()
    useInvitationStore().invite.mockResolvedValue(false)
    await wrapper.find('input[aria-label="Email"]').setValue('a@x.fr')
    await btn(wrapper, "Envoyer l'invitation").trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain("Erreur lors de l'envoi.")
    expect(wrapper.find('.text-secondary').exists()).toBe(true)
    expect(wrapper.find('input[aria-label="Email"]').element.value).toBe('a@x.fr')
  })
})

describe('TeacherMembersPanel', () => {
  const group = {
    id: GROUP_ID,
    members: [
      { userId: 1, role: 'teacher', user: { name: 'Prof', email: 'p@x.fr' } },
      { userId: 2, role: 'student', user: { name: 'Alice', email: 'a@x.fr' } },
      { userId: 3, role: 'student' },
    ],
  }
  const mountMembers = (g = group, ask, invitations = []) =>
    mountPanel(TeacherMembersPanel, { props: { group: g }, state: { invitations: { groupInvitations: invitations } }, ask })

  it('compte, noms, rôles ; identifiant à défaut de nom', () => {
    const text = mountMembers().wrapper.text()
    expect(text).toContain('Membres (3)')
    expect(text).toContain('Enseignant')
    expect(text).toContain('Alice')
    expect(text).toContain('#3')
  })

  it('le bouton de retrait n’existe que pour les étudiants', () => {
    const { wrapper } = mountMembers()
    expect(wrapper.findAll('button[aria-label="Retirer le membre"]')).toHaveLength(2)
  })

  it('retrait : confirmation nominative puis retrait du groupe', async () => {
    const { wrapper, ask } = mountMembers()
    await wrapper.findAll('button[aria-label="Retirer le membre"]')[0].trigger('click')
    expect(ask.mock.calls[0][0]).toBe('Retirer le membre')
    expect(ask.mock.calls[0][1]).toContain('Alice')
    await ask.mock.calls[0][2]()
    expect(useClassGroupStore().removeMember).toHaveBeenCalledWith(GROUP_ID, 2)
  })

  it('membre sans nom : formulation neutre dans la confirmation', async () => {
    const { wrapper, ask } = mountMembers()
    await wrapper.findAll('button[aria-label="Retirer le membre"]')[1].trigger('click')
    expect(ask.mock.calls[0][1]).toContain('cet étudiant')
  })

  it('groupe sans membre', () => {
    const { wrapper } = mountMembers({ id: GROUP_ID, members: [] })
    expect(wrapper.text()).toContain('Aucun membre.')
    expect(wrapper.text()).toContain('Membres (0)')
  })

  it('invitations en attente listées avec leur rôle, section absente sinon', () => {
    const withInv = mountMembers(group, undefined, [{ id: 1, targetEmail: 'n@x.fr', role: 'teacher' }, { id: 2, targetEmail: 'e@x.fr', role: 'student' }])
    expect(withInv.wrapper.text()).toContain('En attente')
    expect(withInv.wrapper.text()).toContain('n@x.fr')
    expect(mountMembers().wrapper.text()).not.toContain('En attente')
  })
})

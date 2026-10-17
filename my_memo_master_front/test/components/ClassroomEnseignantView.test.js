import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import ClassroomEnseignantView from '@/pages/ClassroomEnseignantView.vue'
import { useClassGroupStore } from '@/stores/classGroups'
import { useCalendarEventStore } from '@/stores/calendarEvents'
import { useDeadlineStore } from '@/stores/deadlines'
import { useClassGroupSectionStore } from '@/stores/classGroupSections'
import { useClassGroupResourceStore } from '@/stores/classGroupResources'
import { useInvitationStore } from '@/stores/invitations'
import { useKpiConsentStore } from '@/stores/kpiConsent'
import { useClassGroupSubmissionStore } from '@/stores/classGroupSubmissions'
import { useTestStore } from '@/stores/tests'

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }))
vi.mock('@/helpers/api', () => ({ api: { get: mockGet, post: vi.fn(), put: vi.fn(), del: vi.fn() } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: vi.fn() } }))

const TEACHER = { userId: 10, roleId: 3, name: 'Prof' }
const GERANT = { userId: 50, roleId: 4, name: 'Gérant' }
const GROUPS = [
  { id: 1, name: 'MP2I A', level: 'MP2I', members: [{ userId: 10, role: 'teacher', user: { name: 'Prof' } }, { userId: 21, role: 'student', user: { name: 'Alice' } }] },
  { id: 2, name: 'L3 Info', level: 'L3', members: [{ userId: 10, role: 'teacher', user: { name: 'Prof' } }] },
  { id: 3, name: 'Autre prof', level: 'M1', members: [{ userId: 99, role: 'teacher' }] },
]
const SECTIONS = [{ id: 31, title: 'Chapitre 1', type: 'section', description: '' }]

function mountView({ user = TEACHER, groups = GROUPS, tests = [{ testId: 1, name: 'Algèbre' }] } = {}) {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
    initialState: {
      auth: { user, authenticated: true, token: 't' },
      classGroups: { groups, group: null },
      classGroupSections: { sections: SECTIONS },
      tests: { tests },
    },
  })
  const wrapper = mount(ClassroomEnseignantView, { attachTo: document.body, global: { plugins: [pinia], stubs: { RouterLink: true } } })
  return wrapper
}

const stores = () => ({
  groups: useClassGroupStore(),
  calendar: useCalendarEventStore(),
  deadline: useDeadlineStore(),
  section: useClassGroupSectionStore(),
  resource: useClassGroupResourceStore(),
  invitation: useInvitationStore(),
  kpi: useKpiConsentStore(),
  submission: useClassGroupSubmissionStore(),
  test: useTestStore(),
})
const cards = (w) => w.findAll('[role="button"]').filter((e) => /MP2I|L3|Autre/.test(e.text()) && e.text().includes('membre'))

beforeEach(() => {
  vi.clearAllMocks()
  document.body.innerHTML = ''
  mockGet.mockResolvedValue({ status: 200, data: { data: null } })
})

describe('ClassroomEnseignantView — groupes visibles', () => {
  it('un enseignant ne voit que les groupes dont il est enseignant', () => {
    const w = mountView()
    expect(cards(w).map((c) => c.find('.text-lg').text())).toEqual(['MP2I A', 'L3 Info'])
  })

  it('un gérant d’établissement voit tous les groupes', () => {
    const w = mountView({ user: GERANT })
    expect(cards(w)).toHaveLength(3)
  })

  it('aucun groupe : message d’attente, aucun panneau', async () => {
    const w = mountView({ groups: [] })
    await flushPromises()
    expect(w.text()).toContain('Aucun groupe.')
    expect(w.text()).toContain('Sélectionnez un groupe pour accéder à votre espace enseignant.')
    expect(w.text()).not.toContain('Analyse pédagogique')
  })
})

describe('ClassroomEnseignantView — chargement', () => {
  it('au montage : sélectionne le premier groupe et charge ses données', async () => {
    const w = mountView()
    await flushPromises()
    const s = stores()
    expect(w.text()).toContain('Analyse pédagogique')
    expect(s.calendar.fetchByGroup).toHaveBeenCalledWith(1, true)
    expect(s.deadline.fetchByGroup).toHaveBeenCalledWith(1)
    expect(s.section.fetchByGroup).toHaveBeenCalledWith(1)
    expect(s.resource.fetchByGroup).toHaveBeenCalledWith(1)
    expect(s.invitation.fetchByGroup).toHaveBeenCalledWith(1)
    expect(mockGet).toHaveBeenCalledWith('class-groups/1/kpi/students')
  })

  it('charge les groupes et les exercices seulement s’ils sont absents', async () => {
    mountView({ tests: [] })
    await flushPromises()
    expect(stores().groups.fetchGroups).not.toHaveBeenCalled() // déjà présents
    expect(stores().test.fetchTests).toHaveBeenCalledTimes(1)
  })

  it('charge les groupes quand la liste est vide', async () => {
    mountView({ groups: [] })
    await flushPromises()
    expect(stores().groups.fetchGroups).toHaveBeenCalledTimes(1)
  })

  it('vide les KPI et rendus du groupe précédent à chaque sélection', async () => {
    mountView()
    await flushPromises()
    const s = stores()
    expect(s.kpi.clearStudentKpis).toHaveBeenCalledTimes(1)
    expect(s.submission.clearSectionSubmissions).toHaveBeenCalledTimes(1)
    expect(s.submission.clearSubmissionStatus).toHaveBeenCalledTimes(1)
  })

  it('choisir un autre groupe recharge toutes ses données', async () => {
    const w = mountView()
    await flushPromises()
    await cards(w)[1].trigger('click')
    await flushPromises()
    const s = stores()
    expect(s.section.fetchByGroup).toHaveBeenLastCalledWith(2)
    expect(s.invitation.fetchByGroup).toHaveBeenLastCalledWith(2)
    expect(mockGet).toHaveBeenLastCalledWith('class-groups/2/kpi/students')
  })

  it('recliquer sur le groupe déjà affiché le recharge (analyse comprise)', async () => {
    const w = mountView()
    await flushPromises()
    mockGet.mockClear()
    await cards(w)[0].trigger('click')
    await flushPromises()
    expect(stores().section.fetchByGroup).toHaveBeenCalledTimes(2)
    expect(mockGet).toHaveBeenCalledWith('class-groups/1/kpi/students')
  })

  it('« Chargement... » tant que les données du groupe arrivent, puis les sections', async () => {
    let release
    const w = mountView()
    await flushPromises() // sélection initiale terminée
    stores().section.fetchByGroup.mockReturnValueOnce(new Promise((resolve) => { release = resolve }))
    await cards(w)[1].trigger('click')
    expect(w.text()).toContain('Chargement...')
    release()
    await flushPromises()
    expect(w.text()).not.toContain('Chargement...')
    expect(w.text()).toContain('Chapitre 1')
  })
})

describe('ClassroomEnseignantView — panneaux du groupe', () => {
  it('affiche les panneaux des deux colonnes', async () => {
    const w = mountView()
    await flushPromises()
    const text = w.text()
    for (const title of [
      'Analyse pédagogique', 'Sections & Rendus', 'Échéances des séances',
      'Créer une section / un rendu', 'Partager un document', 'Documents partagés',
      'Ajouter une échéance', 'Inviter un étudiant', 'Membres (2)',
    ]) expect(text).toContain(title)
  })

  it('les membres affichés sont ceux du groupe choisi', async () => {
    const w = mountView()
    await flushPromises()
    await cards(w)[1].trigger('click')
    await flushPromises()
    expect(w.text()).toContain('Membres (1)')
  })
})

describe('ClassroomEnseignantView — modale de confirmation commune', () => {
  const dialog = () => document.body.querySelector('[role="dialog"]')

  it('fermée au départ', async () => {
    mountView()
    await flushPromises()
    expect(dialog()).toBeNull()
  })

  it('« Supprimer » une section ouvre la confirmation ; « Annuler » ne supprime rien', async () => {
    const w = mountView()
    await flushPromises()
    await w.findAll('button').find((b) => b.text() === 'Supprimer').trigger('click')
    expect(dialog()).not.toBeNull()
    expect(dialog().textContent).toContain('Supprimer la section')
    expect(dialog().textContent).toContain('Chapitre 1')
    ;[...dialog().querySelectorAll('button')].find((b) => b.textContent === 'Annuler').click()
    await flushPromises()
    expect(dialog()).toBeNull()
    expect(stores().section.delete).not.toHaveBeenCalled()
  })

  it('« Confirmer » exécute la suppression dans le bon groupe puis ferme', async () => {
    const w = mountView()
    await flushPromises()
    await w.findAll('button').find((b) => b.text() === 'Supprimer').trigger('click')
    ;[...dialog().querySelectorAll('button')].find((b) => b.textContent === 'Confirmer').click()
    await flushPromises()
    expect(stores().section.delete).toHaveBeenCalledWith(1, 31)
    expect(dialog()).toBeNull()
  })

  it('la même modale sert aux membres : retrait confirmé du bon groupe', async () => {
    const w = mountView()
    await flushPromises()
    await w.find('button[aria-label="Retirer le membre"]').trigger('click')
    expect(dialog().textContent).toContain('Retirer le membre')
    ;[...dialog().querySelectorAll('button')].find((b) => b.textContent === 'Confirmer').click()
    await flushPromises()
    expect(stores().groups.removeMember).toHaveBeenCalledWith(1, 21)
  })
})

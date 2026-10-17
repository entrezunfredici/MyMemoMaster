import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import ClassroomEtudiantView from '@/pages/ClassroomEtudiantView.vue'
import { useClassGroupStore } from '@/stores/classGroups'
import { useCalendarEventStore } from '@/stores/calendarEvents'
import { useDeadlineStore } from '@/stores/deadlines'
import { useClassGroupResourceStore } from '@/stores/classGroupResources'
import { useClassGroupSectionStore } from '@/stores/classGroupSections'
import { useClassGroupSubmissionStore } from '@/stores/classGroupSubmissions'
import { useKpiConsentStore } from '@/stores/kpiConsent'
import { useSubjectStore } from '@/stores/subjects'

vi.mock('@/helpers/api', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: vi.fn() } }))

const GROUPS = [
  { id: 1, name: 'MP2I A', code: 'A', level: 'Prépa', members: [{ userId: 10, role: 'teacher', user: { name: 'Prof' } }] },
  { id: 2, name: 'L3 Info', code: 'L3', level: 'L3', members: [] },
]
const SECTIONS = [
  { id: 31, title: 'Chapitre 1', type: 'section', description: '', dueDate: null },
  { id: 32, title: 'DM 1', type: 'rendu', description: '', dueDate: null },
  { id: 33, title: 'DM 2', type: 'rendu', description: '', dueDate: null },
]

function mountView({ groups = GROUPS, subjects = [{ subjectId: 1, name: 'Maths' }] } = {}) {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
    initialState: {
      auth: { user: { userId: 21, roleId: 2 }, authenticated: true, token: 't' },
      classGroups: { groups, group: null },
      classGroupSections: { sections: SECTIONS },
      subjects: { subjects },
    },
  })
  const wrapper = mount(ClassroomEtudiantView, { attachTo: document.body, global: { plugins: [pinia], stubs: { RouterLink: true } } })
  return wrapper
}

const stores = () => ({
  groups: useClassGroupStore(),
  calendar: useCalendarEventStore(),
  deadline: useDeadlineStore(),
  resource: useClassGroupResourceStore(),
  section: useClassGroupSectionStore(),
  submission: useClassGroupSubmissionStore(),
  kpi: useKpiConsentStore(),
  subject: useSubjectStore(),
})
const cards = (w) => w.findAll('[role="button"]').filter((e) => /MP2I|L3/.test(e.text()) && e.find('.text-lg').exists())
const sectionTitles = (w) => w.findAll('h2').map((h) => h.text())

beforeEach(() => {
  vi.clearAllMocks()
  document.body.innerHTML = ''
})

describe('ClassroomEtudiantView', () => {
  it('sélectionne le premier groupe et charge séances, échéances, documents, sections et consentements', async () => {
    mountView()
    await flushPromises()
    const s = stores()
    expect(s.calendar.fetchByGroup).toHaveBeenCalledWith(1)
    expect(s.deadline.fetchByGroup).toHaveBeenCalledWith(1)
    expect(s.resource.fetchByGroup).toHaveBeenCalledWith(1)
    expect(s.section.fetchByGroup).toHaveBeenCalledWith(1)
    expect(s.kpi.fetchMyConsents).toHaveBeenCalledTimes(1)
  })

  it('charge la soumission de l’étudiant pour chaque rendu (et seulement les rendus)', async () => {
    mountView()
    await flushPromises()
    const calls = stores().submission.fetchMine.mock.calls
    expect(calls).toEqual([[1, 32], [1, 33]])
  })

  it('charge les matières seulement si elles ne le sont pas déjà', async () => {
    mountView()
    await flushPromises()
    expect(stores().subject.fetchSubjects).not.toHaveBeenCalled()
    document.body.innerHTML = ''
    vi.clearAllMocks()
    mountView({ subjects: [] })
    await flushPromises()
    expect(stores().subject.fetchSubjects).toHaveBeenCalledTimes(1)
  })

  it('charge les groupes quand la liste est vide ; aucun panneau sans groupe', async () => {
    const w = mountView({ groups: [] })
    await flushPromises()
    expect(stores().groups.fetchGroups).toHaveBeenCalledTimes(1)
    expect(w.text()).toContain('Aucun groupe.')
    expect(w.find('input[aria-label^="Rechercher"]').exists()).toBe(false)
  })

  it('affiche les sept sections dans l’ordre quand aucune recherche n’est saisie', async () => {
    const w = mountView()
    await flushPromises()
    expect(sectionTitles(w)).toEqual([
      'Prochaines séances', 'Sections du cours', 'Rendus à remettre', 'Échéances à venir', 'Documents partagés', 'Partage de mes KPI',
    ])
  })

  it('une recherche masque séances, échéances et partage de KPI (non filtrables) mais pas les autres', async () => {
    const w = mountView()
    await flushPromises()
    await w.find('input[aria-label^="Rechercher"]').setValue('dm')
    expect(sectionTitles(w)).toEqual(['Sections du cours', 'Rendus à remettre', 'Documents partagés'])
  })

  it('effacer la recherche rétablit tout', async () => {
    const w = mountView()
    await flushPromises()
    await w.find('input[aria-label^="Rechercher"]').setValue('dm')
    await w.find('button[aria-label="Effacer la recherche"]').trigger('click')
    expect(sectionTitles(w)).toHaveLength(6)
  })

  it('changer de groupe recharge ses données et réinitialise la recherche', async () => {
    const w = mountView()
    await flushPromises()
    await w.find('input[aria-label^="Rechercher"]').setValue('dm')
    await cards(w)[1].trigger('click')
    await flushPromises()
    expect(stores().calendar.fetchByGroup).toHaveBeenLastCalledWith(2)
    expect(stores().section.fetchByGroup).toHaveBeenLastCalledWith(2)
    expect(w.find('input[aria-label^="Rechercher"]').element.value).toBe('')
    expect(sectionTitles(w)).toHaveLength(6)
  })

  it('« Chargement… » dans chaque section tant que les données du groupe arrivent', async () => {
    const w = mountView()
    await flushPromises()
    let release
    stores().calendar.fetchByGroup.mockReturnValueOnce(new Promise((resolve) => { release = resolve }))
    await cards(w)[1].trigger('click')
    expect(w.text()).toContain('Chargement...')
    release()
    await flushPromises()
    expect(w.text()).not.toContain('Chargement...')
  })

  it('le partage de KPI reçoit le groupe affiché', async () => {
    const w = mountView()
    await flushPromises()
    expect(w.text()).toContain('Prof') // enseignant du groupe 1 proposé au partage
    await cards(w)[1].trigger('click')
    await flushPromises()
    expect(w.text()).toContain('Aucun enseignant disponible dans ce groupe.')
  })
})

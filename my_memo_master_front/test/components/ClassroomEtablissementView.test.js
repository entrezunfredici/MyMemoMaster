import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import ClassroomEtablissementView from '@/pages/ClassroomEtablissementView.vue'
import { useClassGroupStore } from '@/stores/classGroups'
import { useCalendarEventStore } from '@/stores/calendarEvents'
import { useInvitationStore } from '@/stores/invitations'
import { useEtablissementStore } from '@/stores/etablissement'

vi.mock('@/helpers/api', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: vi.fn() } }))

const GERANT = { userId: 50, roleId: 4, name: 'Gérant' }
const TEACHER = { userId: 10, roleId: 3, name: 'Prof' }
const GROUPS = [
  { id: 1, name: 'MP2I A', code: 'A', level: 'Prépa', members: [{ userId: 21, role: 'student', user: { name: 'Alice', email: 'a@x.fr', isActive: true } }] },
  { id: 2, name: 'L3 Info', code: 'L3', level: 'L3', members: [] },
]

function mountView({ user = GERANT, groups = GROUPS, etab = { id: 5 }, state = {} } = {}) {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
    initialState: {
      auth: { user, authenticated: true, token: 't' },
      classGroups: { groups, group: null },
      etablissement: { stats: null, audit: [], content: null, list: [], current: null, loading: false },
      ...state,
    },
  })
  const etabStore = useEtablissementStore(pinia)
  etabStore.fetchMine.mockResolvedValue(etab)
  const wrapper = mount(ClassroomEtablissementView, { attachTo: document.body, global: { plugins: [pinia] } })
  return { wrapper, etabStore }
}

const nav = (w) => w.find('.border-b')
const tabLabels = (w) => nav(w).findAll('button').map((b) => b.text())
const openTab = async (w, label) => {
  await nav(w).findAll('button').find((b) => b.text() === label).trigger('click')
  await flushPromises()
}

beforeEach(() => {
  vi.clearAllMocks()
  document.body.innerHTML = ''
})

describe('ClassroomEtablissementView — onglets selon le rôle', () => {
  it('gérant d’établissement : 5 onglets, « Groupes » actif', async () => {
    const { wrapper } = mountView()
    await flushPromises()
    expect(tabLabels(wrapper)).toEqual(['Groupes', 'Statistiques', 'Journal', 'Contenu', 'Comptes'])
    expect(nav(wrapper).find('.border-primary').text()).toBe('Groupes')
  })

  it('autre rôle : uniquement « Groupes », l’établissement n’est même pas interrogé', async () => {
    const { wrapper, etabStore } = mountView({ user: TEACHER })
    await flushPromises()
    expect(tabLabels(wrapper)).toEqual(['Groupes'])
    expect(etabStore.fetchMine).not.toHaveBeenCalled()
  })
})

describe('ClassroomEtablissementView — chargement paresseux des onglets', () => {
  it('résout l’établissement du gérant au montage', async () => {
    const { etabStore } = mountView()
    await flushPromises()
    expect(etabStore.fetchMine).toHaveBeenCalledTimes(1)
  })

  it('« Statistiques » : charge les statistiques une seule fois', async () => {
    const { wrapper, etabStore } = mountView()
    await flushPromises()
    await openTab(wrapper, 'Statistiques')
    expect(etabStore.fetchStats).toHaveBeenCalledWith(5)
    await openTab(wrapper, 'Groupes')
    etabStore.stats = { groupCount: 1, roleBreakdown: {} }
    await openTab(wrapper, 'Statistiques')
    expect(etabStore.fetchStats).toHaveBeenCalledTimes(1)
  })

  it('« Journal » : charge si le journal est vide, pas sinon', async () => {
    const { wrapper, etabStore } = mountView()
    await flushPromises()
    await openTab(wrapper, 'Journal')
    expect(etabStore.fetchAudit).toHaveBeenCalledWith(5)
    etabStore.audit = [{ id: 1, action: 'X' }]
    await openTab(wrapper, 'Groupes')
    await openTab(wrapper, 'Journal')
    expect(etabStore.fetchAudit).toHaveBeenCalledTimes(1)
  })

  it('« Contenu » : charge si absent', async () => {
    const { wrapper, etabStore } = mountView()
    await flushPromises()
    await openTab(wrapper, 'Contenu')
    expect(etabStore.fetchContent).toHaveBeenCalledWith(5)
  })

  it('établissement introuvable : les onglets s’affichent mais rien n’est chargé', async () => {
    const { wrapper, etabStore } = mountView({ etab: null })
    await flushPromises()
    await openTab(wrapper, 'Statistiques')
    await openTab(wrapper, 'Journal')
    await openTab(wrapper, 'Contenu')
    expect(etabStore.fetchStats).not.toHaveBeenCalled()
    expect(etabStore.fetchAudit).not.toHaveBeenCalled()
    expect(etabStore.fetchContent).not.toHaveBeenCalled()
  })

  it('un seul onglet affiché à la fois', async () => {
    const { wrapper } = mountView()
    await flushPromises()
    await openTab(wrapper, 'Journal')
    expect(wrapper.text()).toContain("Journal d'activité")
    expect(wrapper.text()).not.toContain('Groupes classes')
    await openTab(wrapper, 'Comptes')
    expect(wrapper.text()).toContain('Gestion des comptes')
    expect(wrapper.text()).not.toContain("Journal d'activité")
  })
})

describe('ClassroomEtablissementView — groupe sélectionné', () => {
  it('sélectionne le premier groupe et charge planning, invitations et fiche', async () => {
    const { wrapper } = mountView()
    await flushPromises()
    expect(useCalendarEventStore().fetchByGroup).toHaveBeenCalledWith(1)
    expect(useInvitationStore().fetchByGroup).toHaveBeenCalledWith(1)
    expect(useClassGroupStore().fetchGroupById).toHaveBeenCalledWith(1)
    expect(wrapper.text()).toContain('Emploi du temps — MP2I A')
  })

  it('charge les groupes quand la liste est vide, puis aucun groupe sélectionné', async () => {
    const { wrapper } = mountView({ groups: [] })
    await flushPromises()
    expect(useClassGroupStore().fetchGroups).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Sélectionnez un groupe pour gérer son emploi du temps et ses membres.')
  })

  it('ne recharge pas les groupes quand ils sont présents', async () => {
    mountView()
    await flushPromises()
    expect(useClassGroupStore().fetchGroups).not.toHaveBeenCalled()
  })

  it('cliquer un autre groupe charge ses données et met à jour le titre et les membres', async () => {
    const { wrapper } = mountView()
    await flushPromises()
    await wrapper.findAll('[role="button"][tabindex="0"]').find((e) => e.text().includes('L3 Info')).trigger('click')
    await flushPromises()
    expect(useCalendarEventStore().fetchByGroup).toHaveBeenLastCalledWith(2)
    expect(wrapper.text()).toContain('Emploi du temps — L3 Info')
    expect(wrapper.text()).toContain('Membres (0)')
  })

  it('supprimer le groupe affiché : retombe sur le premier groupe restant', async () => {
    const { wrapper } = mountView()
    await flushPromises()
    await wrapper.findAll('[role="button"][tabindex="0"]').find((e) => e.text().includes('L3 Info')).trigger('click')
    await flushPromises()
    useClassGroupStore().deleteGroup.mockResolvedValue(true)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await wrapper.findAll('button[aria-label="Supprimer le groupe"]')[1].trigger('click')
    await flushPromises()
    // le store simulé conserve la liste : la page retombe sur groups[0]
    expect(wrapper.text()).toContain('Emploi du temps — MP2I A')
  })

  it('supprimer un autre groupe que celui affiché ne change pas la sélection', async () => {
    const { wrapper } = mountView()
    await flushPromises()
    useClassGroupStore().deleteGroup.mockResolvedValue(true)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await wrapper.findAll('button[aria-label="Supprimer le groupe"]')[1].trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Emploi du temps — MP2I A')
  })

  it('l’onglet « Comptes » reflète le groupe sélectionné', async () => {
    const { wrapper } = mountView()
    await flushPromises()
    await openTab(wrapper, 'Comptes')
    expect(wrapper.text()).toContain('Alice')
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import EtablissementStatsTab from '@/components/classroom/etablissement/EtablissementStatsTab.vue'
import EtablissementAuditTab from '@/components/classroom/etablissement/EtablissementAuditTab.vue'
import EtablissementContentTab from '@/components/classroom/etablissement/EtablissementContentTab.vue'
import EtablissementAccountsTab from '@/components/classroom/etablissement/EtablissementAccountsTab.vue'
import EtablissementGroupPicker from '@/components/classroom/etablissement/EtablissementGroupPicker.vue'
import EtablissementEventForm from '@/components/classroom/etablissement/EtablissementEventForm.vue'
import EtablissementEventList from '@/components/classroom/etablissement/EtablissementEventList.vue'
import EtablissementInviteForm from '@/components/classroom/etablissement/EtablissementInviteForm.vue'
import EtablissementMembersList from '@/components/classroom/etablissement/EtablissementMembersList.vue'
import { useEtablissementStore } from '@/stores/etablissement'
import { useClassGroupStore } from '@/stores/classGroups'
import { useCalendarEventStore } from '@/stores/calendarEvents'
import { useInvitationStore } from '@/stores/invitations'
import { CONFIRM_ACTION_KEY } from '@/composables/useConfirmAction'

vi.mock('@/helpers/api', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: vi.fn() } }))

const GROUP_ID = 3

// `ask` = fonction de confirmation fournie par la page parente (provideConfirmAction) : on l'espionne
let ask
function mountPanel(component, { props = {}, state = {} } = {}) {
  const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true, initialState: state })
  return mount(component, { props, global: { plugins: [pinia], provide: { [CONFIRM_ACTION_KEY]: ask } } })
}
const btn = (w, text) => w.findAll('button').find((b) => b.text().trim() === text)

beforeEach(() => {
  vi.clearAllMocks()
  ask = vi.fn()
})

describe('EtablissementStatsTab', () => {
  const STATS = { groupCount: 2, totalMembers: 9, activeMembers: 7, pendingInvitations: 1, validatedAccounts: 8, inactiveMembers: 2, roleBreakdown: { students: 6, teachers: 3 } }

  it('chargement, puis absence de données', () => {
    expect(mountPanel(EtablissementStatsTab, { props: { loading: true } }).text()).toContain('Chargement...')
    expect(mountPanel(EtablissementStatsTab, { state: { etablissement: { stats: null } } }).text()).toContain('Aucune donnée disponible.')
  })

  it('affiche les 8 compteurs dans l’ordre', () => {
    const w = mountPanel(EtablissementStatsTab, { state: { etablissement: { stats: STATS } } })
    expect(w.findAll('.text-2xl').map((n) => n.text())).toEqual(['2', '9', '7', '1', '8', '6', '3', '2'])
  })

  it('répartition par rôle absente : 0 étudiant, 0 enseignant', () => {
    const w = mountPanel(EtablissementStatsTab, { state: { etablissement: { stats: { ...STATS, roleBreakdown: undefined } } } })
    expect(w.findAll('.text-2xl').map((n) => n.text()).slice(5, 7)).toEqual(['0', '0'])
  })
})

describe('EtablissementAuditTab', () => {
  const AUDIT = [{ id: 1, action: 'USER_INVITED', entityType: 'User', entityId: 5, actor: { name: 'Gérant' }, createdAt: '2026-10-10T10:00:00' }, { id: 2, action: 'LOGIN', entityType: 'User', entityId: null, actor: null, createdAt: null }]

  it('journal vide', () => {
    expect(mountPanel(EtablissementAuditTab, { props: { etabId: 5 } }).text()).toContain('Aucune entrée.')
  })

  it('entrées : action, entité, acteur (« — » si absent) et date', () => {
    const text = mountPanel(EtablissementAuditTab, { props: { etabId: 5 }, state: { etablissement: { audit: AUDIT } } }).text()
    expect(text).toContain('USER_INVITED')
    expect(text).toContain('User #5')
    expect(text).toContain('Gérant')
    expect(text).toContain('User #—')
  })

  it('« Filtrer » transmet les filtres renseignés (vides -> undefined)', async () => {
    const w = mountPanel(EtablissementAuditTab, { props: { etabId: 5 } })
    await w.find('input[aria-label="Action (ex: USER_INVITED)"]').setValue('LOGIN')
    await btn(w, 'Filtrer').trigger('click')
    expect(useEtablissementStore().fetchAudit).toHaveBeenCalledWith(5, { action: 'LOGIN', limit: undefined })
    await w.find('input[aria-label="Limite (défaut 100)"]').setValue('25')
    await btn(w, 'Filtrer').trigger('click')
    expect(useEtablissementStore().fetchAudit).toHaveBeenLastCalledWith(5, { action: 'LOGIN', limit: 25 })
  })

  it('établissement non résolu : « Filtrer » ne fait rien', async () => {
    const w = mountPanel(EtablissementAuditTab, { props: { etabId: null } })
    await btn(w, 'Filtrer').trigger('click')
    expect(useEtablissementStore().fetchAudit).not.toHaveBeenCalled()
  })

  it('champs nommés (RGAA 11.1)', () => {
    const w = mountPanel(EtablissementAuditTab, { props: { etabId: 5 } })
    w.findAll('input').forEach((i) => expect(i.attributes('aria-label')).toBeTruthy())
  })
})

describe('EtablissementContentTab', () => {
  const CONTENT = {
    resources: [{ id: 11, title: 'Cours.pdf', type: 'pdf', classGroup: { name: 'MP2I A' }, creator: { name: 'Prof' } }],
    sections: [{ id: 12, title: 'Chapitre 1', type: 'section', classGroup: { name: 'MP2I A' }, creator: { name: 'Prof' } }],
  }
  const mountContent = (content) => mountPanel(EtablissementContentTab, { props: { etabId: 5 }, state: { etablissement: { content } } })

  it('non chargé : « Chargement… »', () => {
    expect(mountContent(null).text()).toContain('Chargement...')
  })

  it('ressources et sections avec leur nombre, groupe, type et auteur', () => {
    const text = mountContent(CONTENT).text()
    expect(text).toContain('Ressources (1)')
    expect(text).toContain('Sections (1)')
    expect(text).toContain('MP2I A · pdf · Prof')
  })

  it('contenu vide', () => {
    const text = mountContent({ resources: [], sections: [] }).text()
    expect(text).toContain('Aucune ressource.')
    expect(text).toContain('Aucune section.')
  })

  it('« Supprimer » demande confirmation ; rien n’est supprimé avant que l’action soit exécutée', async () => {
    const w = mountContent(CONTENT)
    await btn(w, 'Supprimer').trigger('click')
    expect(ask).toHaveBeenCalledTimes(1)
    expect(ask.mock.calls[0][0]).toBe('Supprimer le contenu')
    expect(ask.mock.calls[0][1]).toBe('Supprimer « Cours.pdf » ? Cette action est irréversible.')
    expect(useEtablissementStore().deleteContent).not.toHaveBeenCalled()
  })

  it('l’action confirmée transmet le type et l’identifiant pour l’établissement', async () => {
    const w = mountContent(CONTENT)
    await btn(w, 'Supprimer').trigger('click')
    await ask.mock.calls[0][2]()
    expect(useEtablissementStore().deleteContent).toHaveBeenCalledWith(5, 'resource', 11)
  })

  it('section : type « section »', async () => {
    const w = mountContent(CONTENT)
    await w.findAll('button').filter((b) => b.text() === 'Supprimer')[1].trigger('click')
    await ask.mock.calls[0][2]()
    expect(useEtablissementStore().deleteContent).toHaveBeenCalledWith(5, 'section', 12)
  })
})

describe('EtablissementAccountsTab', () => {
  const group = () => ({
    id: GROUP_ID,
    members: [
      { userId: 1, user: { name: 'Alice', email: 'a@x.fr', isActive: true } },
      { userId: 2, user: { name: 'Bob', email: 'b@x.fr', isActive: false } },
      { userId: 3 },
    ],
  })

  it('aucun groupe sélectionné', () => {
    expect(mountPanel(EtablissementAccountsTab, { props: { group: undefined } }).text()).toContain('Aucun groupe sélectionné.')
  })

  it('actif / inactif, bouton adapté ; membre sans fiche : identifiant, traité comme actif', () => {
    const w = mountPanel(EtablissementAccountsTab, { props: { group: group() } })
    const text = w.text()
    expect(text).toContain('Alice')
    expect(text).toContain('#3')
    expect(w.findAll('span').filter((s) => s.text() === 'Inactif')).toHaveLength(1)
    expect(w.findAll('button').map((b) => b.text())).toEqual(['Désactiver', 'Activer', 'Désactiver'])
  })

  it('désactiver réussi : appel puis état local mis à jour', async () => {
    const g = group()
    const w = mountPanel(EtablissementAccountsTab, { props: { group: g } })
    useEtablissementStore().deactivateUser.mockResolvedValue(true)
    await btn(w, 'Désactiver').trigger('click')
    await flushPromises()
    expect(useEtablissementStore().deactivateUser).toHaveBeenCalledWith(1)
    expect(g.members[0].user.isActive).toBe(false)
  })

  it('activer réussi : état local mis à jour', async () => {
    const g = group()
    const w = mountPanel(EtablissementAccountsTab, { props: { group: g } })
    useEtablissementStore().activateUser.mockResolvedValue(true)
    await btn(w, 'Activer').trigger('click')
    await flushPromises()
    expect(useEtablissementStore().activateUser).toHaveBeenCalledWith(2)
    expect(g.members[1].user.isActive).toBe(true)
  })

  it('échec : l’état local ne change pas', async () => {
    const g = group()
    const w = mountPanel(EtablissementAccountsTab, { props: { group: g } })
    useEtablissementStore().deactivateUser.mockResolvedValue(false)
    await btn(w, 'Désactiver').trigger('click')
    await flushPromises()
    expect(g.members[0].user.isActive).toBe(true)
  })

  it('groupe sans membre', () => {
    expect(mountPanel(EtablissementAccountsTab, { props: { group: { id: 1, members: [] } } }).text()).toContain('Aucun membre.')
  })
})

describe('EtablissementGroupPicker', () => {
  const GROUPS = [
    { id: 1, name: 'MP2I A', code: 'MP2I-A', level: 'Prépa', members: [{}, {}] },
    { id: 2, name: 'L3', code: 'L3', level: 'L3' },
  ]
  const mountPicker = (props = {}) => mountPanel(EtablissementGroupPicker, { props: { groups: GROUPS, selectedId: 1, ...props } })

  it('une carte par groupe : niveau, nom, code, membres', () => {
    const text = mountPicker().text()
    expect(text).toContain('MP2I A')
    expect(text).toContain('MP2I-A')
    expect(text).toContain('2 membres')
    expect(text).toContain('0 membre')
    expect(text).not.toContain('0 membres')
  })

  it('aucun groupe : invite à en créer', () => {
    expect(mountPicker({ groups: [] }).text()).toContain('Aucun groupe. Créez-en un.')
  })

  it('sélection au clic et au clavier, carte active mise en évidence', async () => {
    const w = mountPicker()
    const cards = w.findAll('button[aria-pressed]')
    expect(cards.map((c) => c.attributes('aria-pressed'))).toEqual(['true', 'false'])
    expect(cards[0].element.parentElement.className).toContain('border-primary')
    expect(cards[1].element.parentElement.className).not.toContain('border-primary')
    await cards[1].trigger('click')
    expect(w.emitted('select')).toEqual([[2]])
  })

  it('la sélection et la suppression sont deux boutons frères (aucun contrôle imbriqué — RGAA 7.1)', () => {
    const w = mountPicker()
    expect(w.findAll('[role="button"]')).toHaveLength(0)
    expect(w.findAll('button button')).toHaveLength(0)
    expect(w.findAll('button[aria-label^="Supprimer le groupe "]').map((b) => b.attributes('aria-label')))
      .toEqual(['Supprimer le groupe MP2I A', 'Supprimer le groupe L3'])
  })

  describe('création', () => {
    it('le formulaire s’ouvre et se ferme', async () => {
      const w = mountPicker()
      expect(w.text()).not.toContain('Nouvelle classe\n')
      await btn(w, '+ Nouvelle classe').trigger('click')
      expect(w.find('h3').text()).toBe('Nouvelle classe')
      await btn(w, 'Annuler').trigger('click')
      expect(w.find('h3').exists()).toBe(false)
    })

    it('nom requis', async () => {
      const w = mountPicker()
      await btn(w, '+ Nouvelle classe').trigger('click')
      await btn(w, 'Créer').trigger('click')
      expect(w.text()).toContain('Le nom est requis.')
      expect(useClassGroupStore().createGroup).not.toHaveBeenCalled()
    })

    it('chaque champ a un <label> visible relié (pas seulement un placeholder) — RGAA 11.1', async () => {
      const w = mountPicker()
      await btn(w, '+ Nouvelle classe').trigger('click')
      const labels = w.findAll('label').map((l) => [l.attributes('for'), l.text()])
      expect(labels).toEqual([
        ['create-group-name', 'Nom *'],
        ['create-group-code', 'Code'],
        ['create-group-level', 'Niveau'],
        ['create-group-description', 'Description'],
      ])
      labels.forEach(([id]) => expect(w.find('#' + id).exists()).toBe(true))
      expect(w.find('#create-group-name').attributes('aria-required')).toBe('true')
      expect(w.find('#create-group-code').attributes('aria-required')).toBeUndefined()
    })

    it('crée avec valeurs nettoyées (vides -> null), ferme et vide', async () => {
      const w = mountPicker()
      useClassGroupStore().createGroup.mockResolvedValue({ id: 9 })
      await btn(w, '+ Nouvelle classe').trigger('click')
      await w.find('#create-group-name').setValue('  Nouvelle ')
      await w.find('#create-group-level').setValue('L1')
      await btn(w, 'Créer').trigger('click')
      await flushPromises()
      expect(useClassGroupStore().createGroup).toHaveBeenCalledWith({ name: 'Nouvelle', code: null, level: 'L1', description: null })
      expect(w.find('h3').exists()).toBe(false)
    })

    it('échec : le formulaire reste ouvert avec la saisie', async () => {
      const w = mountPicker()
      useClassGroupStore().createGroup.mockResolvedValue(null)
      await btn(w, '+ Nouvelle classe').trigger('click')
      await w.find('#create-group-name').setValue('X')
      await btn(w, 'Créer').trigger('click')
      await flushPromises()
      expect(w.find('#create-group-name').element.value).toBe('X')
    })
  })

  describe('suppression', () => {
    it('demande confirmation nominative, puis l’action confirmée émet « deleted » avec l’identifiant', async () => {
      const w = mountPicker()
      useClassGroupStore().deleteGroup.mockResolvedValue(true)
      await w.findAll('button[aria-label^="Supprimer le groupe "]')[1].trigger('click')
      expect(ask.mock.calls[0][0]).toBe('Supprimer le groupe')
      expect(ask.mock.calls[0][1]).toBe('Supprimer le groupe « L3 » ? Cette action est irréversible.')
      expect(useClassGroupStore().deleteGroup).not.toHaveBeenCalled()
      await ask.mock.calls[0][2]()
      expect(useClassGroupStore().deleteGroup).toHaveBeenCalledWith(2)
      expect(w.emitted('deleted')).toEqual([[2]])
    })

    it('le clic de suppression ne sélectionne pas le groupe', async () => {
      const w = mountPicker()
      await w.findAll('button[aria-label^="Supprimer le groupe "]')[0].trigger('click')
      expect(w.emitted('select')).toBeUndefined()
    })

    it('suppression en échec : pas d’événement « deleted »', async () => {
      const w = mountPicker()
      useClassGroupStore().deleteGroup.mockResolvedValue(false)
      await w.findAll('button[aria-label^="Supprimer le groupe "]')[0].trigger('click')
      await ask.mock.calls[0][2]()
      expect(w.emitted('deleted')).toBeUndefined()
    })
  })
})

describe('EtablissementEventForm', () => {
  const mountForm = () => mountPanel(EtablissementEventForm, { props: { groupId: GROUP_ID } })
  const fillRecurring = async (w) => {
    await w.find('input[aria-label="Nom"]').setValue(' Cours de maths ')
    await w.find('input[aria-label="Date de début"]').setValue('2026-09-01')
    await w.find('input[aria-label="Date de fin"]').setValue('2027-06-30')
  }

  it('valeurs par défaut : récurrent, hebdomadaire, lundi, 09:00-11:00', () => {
    const w = mountForm()
    expect(w.find('select[aria-label="Fréquence"]').element.value).toBe('weekly')
    expect(w.findAll('[role="group"] input[type="checkbox"]').map((c) => c.element.checked)).toEqual([true, false, false, false, false, false])
    expect(w.find('input[aria-label="Heure de début"]').element.value).toBe('09:00')
    expect(w.find('input[aria-label="Heure de fin"]').element.value).toBe('11:00')
  })

  it('groupe des jours nommé (RGAA 11.6) et masqué en fréquence mensuelle', async () => {
    const w = mountForm()
    const group = w.find('[role="group"]')
    expect(w.find(`#${group.attributes('aria-labelledby')}`).text()).toBe('Jours de la semaine')
    await w.find('select[aria-label="Fréquence"]').setValue('monthly')
    expect(w.find('[role="group"]').exists()).toBe(false)
  })

  it('« Séance unique » remplace la période par une date', async () => {
    const w = mountForm()
    expect(w.find('input[aria-label="Date de début"]').exists()).toBe(true)
    await btn(w, 'Séance unique').trigger('click')
    expect(w.find('input[aria-label="Date de début"]').exists()).toBe(false)
    expect(w.find('input[aria-label="Date"]').exists()).toBe(true)
  })

  it.each([
    ['nom', async () => {}, 'Le nom est requis.'],
    ['heures', async (w) => { await w.find('input[aria-label="Nom"]').setValue('X'); await w.find('input[aria-label="Heure de fin"]').setValue('') }, "L'heure de début et de fin sont requises."],
    ['période', async (w) => { await w.find('input[aria-label="Nom"]').setValue('X') }, 'Les dates de début et fin de période sont requises.'],
  ])('validation : %s manquant(e)', async (_label, prepare, message) => {
    const w = mountForm()
    await prepare(w)
    await btn(w, 'Créer le créneau').trigger('click')
    expect(w.text()).toContain(message)
    expect(useCalendarEventStore().createEvent).not.toHaveBeenCalled()
  })

  it('aucun jour coché (hors mensuel) : erreur', async () => {
    const w = mountForm()
    await fillRecurring(w)
    await w.findAll('[role="group"] input[type="checkbox"]')[0].setValue(false)
    await btn(w, 'Créer le créneau').trigger('click')
    expect(w.text()).toContain('Sélectionnez au moins un jour.')
  })

  it('séance unique sans date : erreur', async () => {
    const w = mountForm()
    await btn(w, 'Séance unique').trigger('click')
    await w.find('input[aria-label="Nom"]').setValue('X')
    await btn(w, 'Créer le créneau').trigger('click')
    expect(w.text()).toContain('La date est requise.')
  })

  it('récurrent valide : règle de récurrence envoyée, message de succès, rechargement', async () => {
    const w = mountForm()
    useCalendarEventStore().createEvent.mockResolvedValue(true)
    await fillRecurring(w)
    await btn(w, 'Créer le créneau').trigger('click')
    await flushPromises()
    expect(useCalendarEventStore().createEvent).toHaveBeenCalledWith({
      name: 'Cours de maths', type: 'cours', classGroupId: GROUP_ID, recurrenceMode: 'auto',
      recurrenceRule: { frequency: 'weekly', days: ['monday'], startDate: '2026-09-01', endDate: '2027-06-30', startTime: '09:00', endTime: '11:00' },
    })
    expect(useCalendarEventStore().fetchByGroup).toHaveBeenCalledWith(GROUP_ID, true)
    expect(w.text()).toContain('Créneau créé avec succès.')
    expect(w.find('input[aria-label="Nom"]').element.value).toBe('')
  })

  it('mensuel : pas de jours dans la règle', async () => {
    const w = mountForm()
    useCalendarEventStore().createEvent.mockResolvedValue(true)
    await w.find('select[aria-label="Fréquence"]').setValue('monthly')
    await fillRecurring(w)
    await btn(w, 'Créer le créneau').trigger('click')
    expect(useCalendarEventStore().createEvent.mock.calls[0][0].recurrenceRule.days).toBeUndefined()
  })

  it('séance unique valide : une occurrence', async () => {
    const w = mountForm()
    useCalendarEventStore().createEvent.mockResolvedValue(true)
    await btn(w, 'Séance unique').trigger('click')
    await w.find('input[aria-label="Nom"]').setValue('Rattrapage')
    await w.find('input[aria-label="Date"]').setValue('2026-12-05')
    await btn(w, 'Créer le créneau').trigger('click')
    expect(useCalendarEventStore().createEvent).toHaveBeenCalledWith({
      name: 'Rattrapage', type: 'cours', classGroupId: GROUP_ID, recurrenceMode: 'manual',
      occurrences: [{ date: '2026-12-05', startTime: '09:00', endTime: '11:00' }],
    })
  })

  it('échec de création : pas de message de succès ni de rechargement', async () => {
    const w = mountForm()
    useCalendarEventStore().createEvent.mockResolvedValue(false)
    await fillRecurring(w)
    await btn(w, 'Créer le créneau').trigger('click')
    await flushPromises()
    expect(w.text()).not.toContain('Créneau créé')
    expect(useCalendarEventStore().fetchByGroup).not.toHaveBeenCalled()
  })
})

describe('EtablissementEventList', () => {
  const EVENTS = [
    { id: 61, name: 'Maths', type: 'cours', occurrences: [1, 2, 3, 4, 5, 6, 7].map((n) => ({ id: 600 + n, date: `2026-11-0${n}`, startTime: '08:00:00' })) },
    { id: 62, name: 'DS', type: 'examen', occurrences: [] },
    { id: 63, name: 'Autre', type: 'autre' },
  ]
  const mountList = (events = EVENTS, props = {}) =>
    mountPanel(EtablissementEventList, { props: { groupId: GROUP_ID, ...props }, state: { calendarEvents: { groupEvents: events } } })

  it('chargement et liste vide', () => {
    expect(mountList(EVENTS, { loading: true }).text()).toContain('Chargement...')
    expect(mountList([]).text()).toContain('Aucun créneau planifié.')
  })

  it('type, nom et nombre de séances ; 5 dates puis « +N »', () => {
    const w = mountList()
    const text = w.text()
    expect(text).toContain('Cours')
    expect(text).toContain('Examen')
    expect(text).toContain('7 séance(s)')
    expect(text).toContain('0 séance(s)')
    expect(text).toContain('+2')
    expect(w.findAll('.rounded-full.bg-gray')).toHaveLength(5)
  })

  it('les séances affichent le JOUR seul, sans heure parasite ni décalage de fuseau', () => {
    const w = mountList([{ id: 7, name: 'Maths', type: 'cours', occurrences: [{ id: 1, date: '2026-11-20', startTime: '10:00:00' }] }])
    const text = w.text().replace(/\s+/g, ' ')
    expect(text).toMatch(/20 nov\.? 2026 10:00/)
    expect(text).not.toMatch(/01:00/)
  })

  it('« Supprimer » demande confirmation (elle partait sans) en citant le créneau et ses séances', async () => {
    const w = mountList()
    await btn(w, 'Supprimer').trigger('click')
    expect(ask.mock.calls[0][0]).toBe('Supprimer le créneau')
    expect(ask.mock.calls[0][1]).toContain('« Maths » et ses 7 séance(s)')
    expect(useCalendarEventStore().deleteEvent).not.toHaveBeenCalled()
  })

  it('l’action confirmée supprime puis recharge les créneaux du groupe', async () => {
    const w = mountList()
    await btn(w, 'Supprimer').trigger('click')
    await ask.mock.calls[0][2]()
    expect(useCalendarEventStore().deleteEvent).toHaveBeenCalledWith(61)
    expect(useCalendarEventStore().fetchByGroup).toHaveBeenCalledWith(GROUP_ID, true)
  })
})

describe('EtablissementInviteForm', () => {
  const mountForm = () => mountPanel(EtablissementInviteForm, { props: { groupId: GROUP_ID } })

  it('email requis', async () => {
    const w = mountForm()
    await btn(w, "Envoyer l'invitation").trigger('click')
    expect(w.text()).toContain("L'email est requis.")
    expect(useInvitationStore().invite).not.toHaveBeenCalled()
  })

  it('succès : rôle choisi, listes rechargées, champ vidé', async () => {
    const w = mountForm()
    useInvitationStore().invite.mockResolvedValue(true)
    await btn(w, 'Enseignant').trigger('click')
    await w.find('input[aria-label="Email"]').setValue('prof@x.fr')
    await btn(w, "Envoyer l'invitation").trigger('click')
    await flushPromises()
    expect(useInvitationStore().invite).toHaveBeenCalledWith(GROUP_ID, { targetEmail: 'prof@x.fr', role: 'teacher' })
    expect(useInvitationStore().fetchByGroup).toHaveBeenCalledWith(GROUP_ID)
    expect(useClassGroupStore().fetchGroupById).toHaveBeenCalledWith(GROUP_ID)
    expect(w.text()).toContain('Invitation envoyée.')
    expect(w.find('input[aria-label="Email"]').element.value).toBe('')
  })

  it('échec : message d’erreur, rien n’est rechargé', async () => {
    const w = mountForm()
    useInvitationStore().invite.mockResolvedValue(false)
    await w.find('input[aria-label="Email"]').setValue('a@x.fr')
    await btn(w, "Envoyer l'invitation").trigger('click')
    await flushPromises()
    expect(w.text()).toContain("Erreur lors de l'envoi.")
    expect(w.find('.text-secondary').exists()).toBe(true)
    expect(useInvitationStore().fetchByGroup).not.toHaveBeenCalled()
  })
})

describe('EtablissementMembersList', () => {
  const group = { id: GROUP_ID, members: [{ userId: 1, role: 'student', user: { name: 'Alice', email: 'a@x.fr' } }, { userId: 2, role: 'teacher' }] }
  const mountMembers = (invitations = []) =>
    mountPanel(EtablissementMembersList, { props: { group }, state: { invitations: { groupInvitations: invitations } } })

  it('compte, noms et rôle sélectionné', () => {
    const w = mountMembers()
    expect(w.text()).toContain('Membres (2)')
    expect(w.text()).toContain('#2')
    expect(w.findAll('select[aria-label="Rôle du membre"]').map((s) => s.element.value)).toEqual(['student', 'teacher'])
  })

  it('changer le rôle : mise à jour dans le bon groupe', async () => {
    const w = mountMembers()
    await w.findAll('select[aria-label="Rôle du membre"]')[0].setValue('teacher')
    expect(useClassGroupStore().updateMemberRole).toHaveBeenCalledWith(GROUP_ID, 1, 'teacher')
  })

  it('retirer un membre : retrait dans le bon groupe', async () => {
    const w = mountMembers()
    await w.findAll('button[aria-label="Retirer le membre"]')[1].trigger('click')
    expect(useClassGroupStore().removeMember).toHaveBeenCalledWith(GROUP_ID, 2)
  })

  it('invitations en attente listées avec leur rôle, section absente sinon', () => {
    const w = mountMembers([{ id: 1, targetEmail: 'n@x.fr', role: 'teacher' }, { id: 2, targetEmail: 'e@x.fr', role: 'student' }])
    expect(w.text()).toContain('En attente')
    expect(w.text()).toContain('n@x.fr')
    expect(mountMembers().text()).not.toContain('En attente')
  })
})

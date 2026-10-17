import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import CalendarPage from '@/pages/CalendarPage.vue'
import { useRevisionSessionStore } from '@/stores/revisionSessions'
import { useCalendarEventStore } from '@/stores/calendarEvents'
import { useDeadlineStore } from '@/stores/deadlines'
import { usePlanningStore } from '@/stores/planning'
import { useLeitnerSystemStore } from '@/stores/leitnerSystems'
import { useGuidedTourStore } from '@/stores/guidedTour'

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mockPush }) }))
vi.mock('@/helpers/api', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() } }))

const ReminderWidgetStub = {
  name: 'ReminderWidget',
  props: ['entityType', 'entityId'],
  template: '<div class="reminder-stub">{{ entityType }}#{{ entityId }}</div>',
}
const TodoWidgetStub = { name: 'TodoWidget', template: '<div class="todo-stub" />' }

// 15 juin 2026 (lundi) : le mois affiché au montage est juin 2026
const NOW = new Date(2026, 5, 15, 12)

const state = (extra = {}) => ({
  calendarEvents: { events: [{ id: 1, name: 'Cours de maths', occurrences: [{ date: '2026-06-09' }] }] },
  deadlines: { deadlines: [{ id: 2, name: 'Devoir physique', dueDate: '2026-06-09', dueTime: '18:30:00' }] },
  revisionSessions: {
    sessions: [
      { id: 3, name: 'Révision chimie', date: '2026-06-09', startTime: '09:00:00', endTime: '10:30:00', leitnerSystem: { idSystem: 7, name: 'Chimie' } },
      { id: 4, name: 'Révision libre', date: '2026-06-20' },
    ],
  },
  leitnerSystems: { systems: [{ idSystem: 7, name: 'Chimie' }, { idSystem: 8, name: 'Maths' }] },
  planning: {
    priorities: {
      overdue: [{ id: 'o1', type: 'deadline', name: 'Rendu en retard', daysOverdue: 2 }],
      today: [{ id: 't1', type: 'revision_session', name: 'Séance du jour', startTime: '14:00:00' }],
      upcoming: [{ id: 'u1', type: 'deadline', name: 'À venir', daysUntil: 3 }],
    },
  },
  ...extra,
})

let wrapper
const mountPage = (initialState = state()) => {
  wrapper = mount(CalendarPage, {
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: true, initialState })],
      stubs: { ReminderWidget: ReminderWidgetStub, TodoWidget: TodoWidgetStub },
    },
    attachTo: document.body,
  })
  return wrapper
}

const dayCell = (day) => wrapper.findAll('.month-day-cell:not(.other-month)')[day - 1]
const panel = () => wrapper.find('.detail-panel')

describe('CalendarPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    vi.clearAllMocks()
  })
  afterEach(() => {
    wrapper?.unmount()
    vi.useRealTimers()
  })

  describe('chargement', () => {
    it('charge événements, séances, échéances et agenda au montage', async () => {
      mountPage()
      await flushPromises()
      expect(useCalendarEventStore().fetchEvents).toHaveBeenCalled()
      expect(useRevisionSessionStore().fetchSessions).toHaveBeenCalled()
      expect(useDeadlineStore().fetchDeadlines).toHaveBeenCalled()
      expect(usePlanningStore().fetchPriorities).toHaveBeenCalled()
      expect(useLeitnerSystemStore().fetchSystems).toHaveBeenCalled()
    })
  })

  describe('vue mensuelle', () => {
    it('affiche juin 2026, le jour courant et les événements du 9 (plafond de 2 + « +N autres »)', async () => {
      mountPage()
      await flushPromises()
      expect(wrapper.find('.month-nav h2').text()).toBe('Juin')
      expect(dayCell(15).classes()).toContain('today')
      const cell9 = dayCell(9)
      expect(cell9.findAll('.event-pill').map((p) => p.text())).toEqual(['Cours de maths', 'Devoir physique'])
      expect(cell9.find('.more-badge').text()).toBe('+1 autres')
      expect(dayCell(20).findAll('.event-pill')).toHaveLength(1)
      expect(dayCell(3).findAll('.event-pill')).toHaveLength(0)
    })

    it('le jour est un bouton dont le nom annonce le nombre d’événements', async () => {
      mountPage()
      await flushPromises()
      expect(dayCell(9).attributes('aria-label')).toBe('9 Juin 2026, 3 événements')
      expect(dayCell(20).attributes('aria-label')).toBe('20 Juin 2026, 1 événement')
      expect(dayCell(3).attributes('aria-label')).toBe('3 Juin 2026')
      expect(dayCell(9).attributes('role')).toBe('button')
      expect(dayCell(9).attributes('tabindex')).toBe('0')
    })

    it('navigation : mois suivant / précédent, jusqu’au changement d’année', async () => {
      mountPage()
      await flushPromises()
      await wrapper.find('[aria-label="Mois suivant"]').trigger('click')
      expect(wrapper.find('.month-nav h2').text()).toBe('Juillet')
      for (let i = 0; i < 6; i++) await wrapper.find('[aria-label="Mois suivant"]').trigger('click')
      expect(wrapper.find('.month-nav h2').text()).toBe('Janvier')
      await wrapper.find('[aria-label="Mois précédent"]').trigger('click')
      expect(wrapper.find('.month-nav h2').text()).toBe('Décembre')
    })
  })

  describe('vue annuelle', () => {
    it('bascule en vue année, puis un clic sur un mois ouvre ce mois', async () => {
      mountPage()
      await flushPromises()
      const [yearBtn] = wrapper.findAll('.view-toggle button')
      await yearBtn.trigger('click')
      expect(wrapper.findAll('.month-block')).toHaveLength(12)
      expect(wrapper.find('.year-label').text()).toBe('2026')
      await wrapper.findAll('.month-block')[2].trigger('click')
      expect(wrapper.find('.month-nav h2').text()).toBe('Mars')
    })

    it('les mois sont accessibles au clavier', async () => {
      mountPage()
      await flushPromises()
      await wrapper.findAll('.view-toggle button')[0].trigger('click')
      const march = wrapper.findAll('.month-block')[2]
      expect(march.attributes('aria-label')).toBe('Mars 2026')
      await march.trigger('keydown.enter')
      expect(wrapper.find('.month-nav h2').text()).toBe('Mars')
    })

    it('les jours avec événement sont marqués', async () => {
      mountPage()
      await flushPromises()
      await wrapper.findAll('.view-toggle button')[0].trigger('click')
      const june = wrapper.findAll('.month-block')[5]
      expect(june.findAll('.mini-cell.has-event').map((c) => c.text())).toEqual(['9', '20'])
    })
  })

  describe('panneau du jour', () => {
    it('fermé au départ ; cliquer un jour l’ouvre avec ses événements, recliquer le referme', async () => {
      mountPage()
      await flushPromises()
      expect(panel().classes()).not.toContain('open')
      await dayCell(9).trigger('click')
      expect(panel().classes()).toContain('open')
      expect(panel().find('.detail-date').text()).toBe('9 Juin 2026')
      const cards = panel().findAll('.ev-card')
      expect(cards.map((c) => c.find('.ev-label').text())).toEqual(['Événement', 'Échéance', 'Révision'])
      expect(cards.map((c) => c.find('.ev-title').text())).toEqual(['Cours de maths', 'Devoir physique', 'Révision chimie'])
      expect(cards[1].find('.ev-meta').text()).toBe('À rendre avant 18:30')
      expect(cards[2].find('.ev-meta').text()).toBe('09:00 – 10:30 · Chimie')
      await dayCell(9).trigger('click')
      expect(panel().classes()).not.toContain('open')
    })

    it('un jour sans événement l’indique', async () => {
      mountPage()
      await flushPromises()
      await dayCell(3).trigger('click')
      expect(panel().find('.detail-empty').text()).toBe('Aucun événement ce jour.')
    })

    it('le jour sélectionné est marqué et exposé comme pressé', async () => {
      mountPage()
      await flushPromises()
      await dayCell(9).trigger('click')
      expect(dayCell(9).classes()).toContain('selected')
      expect(dayCell(9).attributes('aria-pressed')).toBe('true')
      expect(dayCell(10).attributes('aria-pressed')).toBe('false')
    })

    it('clavier : Entrée et Espace sélectionnent le jour', async () => {
      mountPage()
      await flushPromises()
      await dayCell(9).trigger('keydown.enter')
      expect(panel().classes()).toContain('open')
      await dayCell(10).trigger('keydown.space')
      expect(panel().find('.detail-date').text()).toBe('10 Juin 2026')
    })

    it('changer de mois referme le panneau', async () => {
      mountPage()
      await flushPromises()
      await dayCell(9).trigger('click')
      await wrapper.find('[aria-label="Mois suivant"]').trigger('click')
      expect(panel().classes()).not.toContain('open')
    })

    it('fermé, le panneau est inerte (ni focalisable ni lu)', async () => {
      mountPage()
      await flushPromises()
      expect(panel().attributes('inert')).toBeDefined()
      await dayCell(9).trigger('click')
      expect(panel().attributes('inert')).toBeUndefined()
    })

    it('le bouton de fermeture referme le panneau', async () => {
      mountPage()
      await flushPromises()
      await dayCell(9).trigger('click')
      await panel().find('[aria-label="Fermer le détail du jour"]').trigger('click')
      expect(panel().classes()).not.toContain('open')
    })
  })

  describe('fiche d’un événement', () => {
    const openCard = async (index) => {
      await dayCell(9).trigger('click')
      await panel().findAll('.ev-card')[index].trigger('click')
    }

    it('séance de révision : date, horaires, système lié et lancement de la session', async () => {
      mountPage()
      await flushPromises()
      await openCard(2)
      const modal = wrapper.find('[role="dialog"]')
      expect(modal.find('.detail-modal__badge').text()).toBe('Révision')
      expect(modal.find('.detail-modal__title').text()).toBe('Révision chimie')
      expect(modal.text()).toContain('9 Juin 2026 · 09:00 – 10:30')
      expect(modal.text()).toContain('Système de Leitner lié : Chimie')
      await modal.findAll('button').find((b) => b.text() === 'Lancer la session').trigger('click')
      expect(mockPush).toHaveBeenCalledWith({ name: 'flashcardssession', params: { systemId: 7 } })
      expect(wrapper.find('.reminder-stub').text()).toBe('revision_session#3')
    })

    it('séance sans système : pas de bouton de lancement', async () => {
      mountPage()
      await flushPromises()
      await dayCell(20).trigger('click')
      await panel().find('.ev-card').trigger('click')
      expect(wrapper.text()).toContain('Aucun système de Leitner lié.')
      expect(wrapper.text()).not.toContain('Lancer la session')
    })

    it('échéance : rappels de type « deadline »', async () => {
      mountPage()
      await flushPromises()
      await openCard(1)
      expect(wrapper.find('[role="dialog"] .detail-modal__badge').text()).toBe('Échéance')
      expect(wrapper.find('.reminder-stub').text()).toBe('deadline#2')
    })

    it('événement de calendrier : pas de rappels', async () => {
      mountPage()
      await flushPromises()
      await openCard(0)
      expect(wrapper.find('.reminder-stub').exists()).toBe(false)
      expect(wrapper.text()).toContain('Les rappels ne sont pas disponibles')
    })

    it('se referme par le bouton ou par un clic sur le fond', async () => {
      mountPage()
      await flushPromises()
      await openCard(0)
      await wrapper.find('[role="dialog"] [aria-label="Fermer"]').trigger('click')
      expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
      await panel().findAll('.ev-card')[0].trigger('click') // le jour est toujours sélectionné
      expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
      await wrapper.find('.detail-overlay').trigger('click')
      expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    })
  })

  describe('création d’une séance', () => {
    const submitForm = async () => {
      await wrapper.find('form.create-form').trigger('submit')
      await flushPromises()
    }

    it('« + » ouvre le formulaire vide, sans date', async () => {
      mountPage()
      await flushPromises()
      await wrapper.find('.add-btn').trigger('click')
      expect(wrapper.find('#create-session-title').text()).toBe('Nouvelle séance')
      expect(wrapper.find('input[type="date"]').element.value).toBe('')
      expect(wrapper.find('input[aria-label="Nom de la séance"]').element.value).toBe('')
    })

    it('depuis le panneau d’un jour : la date du jour est préremplie', async () => {
      mountPage()
      await flushPromises()
      await dayCell(9).trigger('click')
      await panel().find('.detail-add').trigger('click')
      expect(wrapper.find('input[type="date"]').element.value).toBe('2026-06-09')
    })

    it('choisir un système préremplit le nom tant que rien n’est saisi', async () => {
      mountPage()
      await flushPromises()
      await wrapper.find('.add-btn').trigger('click')
      await wrapper.find('#create-session-system').setValue(8)
      expect(wrapper.find('input[aria-label="Nom de la séance"]').element.value).toBe('Maths')
      await wrapper.find('input[aria-label="Nom de la séance"]').setValue('Mon nom')
      await wrapper.find('#create-session-system').setValue(7)
      expect(wrapper.find('input[aria-label="Nom de la séance"]').element.value).toBe('Mon nom')
    })

    it('envoie la séance, enregistre le parcours guidé, ferme la fenêtre et recharge séances et agenda', async () => {
      mountPage()
      await flushPromises()
      const revisions = useRevisionSessionStore()
      revisions.createSession.mockResolvedValue(true)
      revisions.sessions = [{ id: 42, name: 'créée' }]
      await dayCell(9).trigger('click')
      await panel().find('.detail-add').trigger('click')
      await wrapper.find('input[aria-label="Nom de la séance"]').setValue('Ma séance')
      await wrapper.find('input[aria-label="Heure de début"]').setValue('09:00')
      await wrapper.find('input[aria-label="Heure de fin"]').setValue('10:00')
      await wrapper.find('#create-session-system').setValue(7)
      await wrapper.find('textarea').setValue('Notes')
      await submitForm()
      expect(revisions.createSession).toHaveBeenCalledWith({
        name: 'Ma séance', date: '2026-06-09', startTime: '09:00', endTime: '10:00', description: 'Notes', idSystem: 7,
      })
      expect(useGuidedTourStore().recordLinks).toHaveBeenCalledWith({ revisionSessionId: 42 })
      expect(wrapper.find('form.create-form').exists()).toBe(false)
      expect(revisions.fetchSessions).toHaveBeenCalledTimes(2) // au montage + après la création
      expect(usePlanningStore().fetchPriorities).toHaveBeenCalledTimes(2)
    })

    it('sans description ni système : ces champs ne sont pas envoyés', async () => {
      mountPage()
      await flushPromises()
      const revisions = useRevisionSessionStore()
      revisions.createSession.mockResolvedValue(true)
      await wrapper.find('.add-btn').trigger('click')
      await wrapper.find('input[aria-label="Nom de la séance"]').setValue('Simple')
      await submitForm()
      expect(revisions.createSession).toHaveBeenCalledWith({ name: 'Simple', date: '', startTime: '', endTime: '' })
    })

    it('échec de création : la fenêtre reste ouverte', async () => {
      mountPage()
      await flushPromises()
      useRevisionSessionStore().createSession.mockResolvedValue(false)
      await wrapper.find('.add-btn').trigger('click')
      await submitForm()
      expect(wrapper.find('form.create-form').exists()).toBe(true)
    })

    it('parcours guidé actif : le système créé à l’étape 2 est présélectionné avec son nom', async () => {
      mountPage(state({ guidedTour: { active: true, links: { leitnerSystemId: 7 } } }))
      await flushPromises()
      await wrapper.find('.add-btn').trigger('click')
      expect(wrapper.find('#create-session-system').element.value).toBe('7')
      expect(wrapper.find('input[aria-label="Nom de la séance"]').element.value).toBe('Chimie')
    })

    it('Annuler ferme sans rien envoyer ; la fenêtre rouverte repart vide', async () => {
      mountPage()
      await flushPromises()
      await wrapper.find('.add-btn').trigger('click')
      await wrapper.find('input[aria-label="Nom de la séance"]').setValue('Brouillon')
      await wrapper.findAll('.btn-cancel')[0].trigger('click')
      expect(wrapper.find('form.create-form').exists()).toBe(false)
      expect(useRevisionSessionStore().createSession).not.toHaveBeenCalled()
      await wrapper.find('.add-btn').trigger('click')
      expect(wrapper.find('input[aria-label="Nom de la séance"]').element.value).toBe('')
    })
  })

  describe('agenda latéral', () => {
    it('affiche en retard, aujourd’hui et à venir', async () => {
      mountPage()
      await flushPromises()
      const agenda = wrapper.find('.cal-agenda')
      expect(agenda.find('.agenda-title--overdue').text()).toBe('En retard')
      expect(agenda.text()).toContain('-2j')
      expect(agenda.text()).toContain('Rendu en retard')
      expect(agenda.text()).toContain('14:00')
      expect(agenda.text()).toContain('Séance du jour')
      expect(agenda.text()).toContain('+3j')
      expect(agenda.text()).toContain('À venir')
    })

    it('listes vides : messages dédiés', async () => {
      mountPage(state({ planning: { priorities: { overdue: [], today: [], upcoming: [] } } }))
      await flushPromises()
      const agenda = wrapper.find('.cal-agenda')
      expect(agenda.text()).toContain("Rien aujourd'hui")
      expect(agenda.text()).toContain('Aucun élément')
      expect(agenda.find('.agenda-title--overdue').exists()).toBe(false)
    })

    it('onglet To-do : affiche la liste des tâches à la place de l’agenda', async () => {
      mountPage()
      await flushPromises()
      const [agendaTab, todoTab] = wrapper.findAll('.sidebar-tab')
      expect(agendaTab.attributes('aria-pressed')).toBe('true')
      await todoTab.trigger('click')
      expect(wrapper.find('.todo-stub').exists()).toBe(true)
      expect(wrapper.find('.agenda-section').exists()).toBe(false)
      await agendaTab.trigger('click')
      expect(wrapper.find('.todo-stub').exists()).toBe(false)
    })

    it('la légende reprend les types d’événements du calendrier', async () => {
      mountPage()
      await flushPromises()
      expect(wrapper.findAll('.legend-item').map((i) => i.text())).toEqual(['Événement', 'Échéance', 'Révision'])
    })
  })

  it('le bouton de bascule et le bouton « + » ont un nom accessible', async () => {
    mountPage()
    await flushPromises()
    expect(wrapper.find('.add-btn').attributes('aria-label')).toBe('Nouvelle séance de révision')
    expect(wrapper.find('.view-toggle').attributes('aria-label')).toBe('Affichage du calendrier')
    await nextTick()
  })
})

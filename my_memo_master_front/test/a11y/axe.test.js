/**
 * Tests d'accessibilité automatisés (axe-core) — RGAA / WCAG 2.1.
 *
 * Complément runtime de l'audit statique `scripts/audit-a11y.mjs` : axe vérifie
 * le DOM réellement rendu (rôles ARIA, noms accessibles, structure).
 * Les règles nécessitant un rendu visuel complet (contrastes) sont désactivées :
 * jsdom ne calcule pas les styles — elles relèvent de l'audit navigateur.
 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import axe from 'axe-core'
import ModalComponent from '@/components/ModalComponent.vue'
import ButtonComponent from '@/components/ButtonComponent.vue'
import TutorialItem from '@/components/TutorialItem.vue'
import PasswordStrengthComponent from '@/components/PasswordStrengthComponent.vue'
import DropdownComponent from '@/components/DropdownComponent.vue'
import ToggleButton from '@/components/ToggleButton.vue'
import PillComponent from '@/components/PillComponent.vue'
import TagSelectorComponent from '@/components/TagSelectorComponent.vue'
import TodoWidget from '@/components/TodoWidget.vue'
import MenuItemComponent from '@/components/MenuItemComponent.vue'
import ItemListLayout from '@/components/ItemListLayout.vue'
import GuidedTourBannerComponent from '@/components/GuidedTourBannerComponent.vue'
import MindMapNodePickerComponent from '@/components/MindMapNodePickerComponent.vue'
import NotificationBellComponent from '@/components/NotificationBellComponent.vue'
import SubjectFilterComponent from '@/components/SubjectFilterComponent.vue'
import SubjectSelectorComponent from '@/components/SubjectSelectorComponent.vue'
import ReminderWidget from '@/components/ReminderWidget.vue'
import FormulaHelperComponent from '@/components/FormulaHelperComponent.vue'
import StudentDetailComponent from '@/components/StudentDetailComponent.vue'
import KpiAlertWidgetComponent from '@/components/KpiAlertWidgetComponent.vue'
import AdminRolesPanel from '@/components/admin/AdminRolesPanel.vue'
import AdminAccountsPanel from '@/components/admin/AdminAccountsPanel.vue'
import AdminAuditPanel from '@/components/admin/AdminAuditPanel.vue'
import { CONFIRM_ACTION_KEY } from '@/composables/useConfirmAction'

// Composants sans route dans leur template : pas besoin du mock vue-router.
// GuidedTourBannerComponent et SubjectFilterComponent lisent route/router — mockés
// une fois pour toute la suite, comme dans test/components/ExerciseDetailPage.test.js.
vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useRoute: () => ({ name: 'home', query: {} }),
    useRouter: () => ({ push: vi.fn() })
  }
})

let wrapper

afterEach(() => {
  wrapper?.unmount()
})

const AXE_OPTIONS = {
  rules: {
    // jsdom : pas de moteur de rendu — les contrastes sont audités au navigateur
    'color-contrast': { enabled: false },
    // les composants sont montés isolés, hors landmark/page complète
    region: { enabled: false },
    'page-has-heading-one': { enabled: false }
  }
}

const runAxe = async (element) => {
  const results = await axe.run(element, AXE_OPTIONS)
  // Message d'échec lisible : liste des violations avec leurs cibles
  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact}) : ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`
  )
  return summary
}

describe('Accessibilité (axe-core)', () => {
  it('ModalComponent - modale ouverte avec contenu - aucune violation axe', async () => {
    wrapper = mount(ModalComponent, {
      props: { visible: true, title: 'Titre test' },
      slots: {
        default: '<label for="champ">Champ</label><input id="champ" type="text" />'
      },
      attachTo: document.body
    })
    expect(await runAxe(wrapper.element)).toEqual([])
  })

  it('ButtonComponent - bouton avec texte - aucune violation axe', async () => {
    wrapper = mount(ButtonComponent, {
      slots: { default: 'Valider' },
      attachTo: document.body
    })
    expect(await runAxe(wrapper.element)).toEqual([])
  })

  it('TutorialItem - lien de tutoriel - aucune violation axe', async () => {
    wrapper = mount(TutorialItem, {
      props: {
        tutorial: {
          name: 'Bien démarrer',
          description: 'Guide de prise en main',
          link: 'https://example.com/tuto'
        }
      },
      attachTo: document.body
    })
    expect(await runAxe(wrapper.element)).toEqual([])
  })

  it('PasswordStrengthComponent - jauge affichée - aucune violation axe', async () => {
    wrapper = mount(PasswordStrengthComponent, {
      props: { password: 'Abcdef123!' },
      attachTo: document.body
    })
    expect(await runAxe(wrapper.element)).toEqual([])
  })

  it('DropdownComponent - menu fermé - aucune violation axe', async () => {
    wrapper = mount(DropdownComponent, {
      props: { title: 'Filtrer' },
      slots: { default: '<p>Contenu du menu</p>' },
      attachTo: document.body
    })
    expect(await runAxe(wrapper.element)).toEqual([])
  })

  it('ToggleButton - coché - aucune violation axe', async () => {
    wrapper = mount(ToggleButton, {
      props: { modelValue: true, ariaLabel: 'Mode sombre' },
      attachTo: document.body
    })
    expect(await runAxe(wrapper.element)).toEqual([])
  })

  it('PillComponent - pastille cliquable - aucune violation axe', async () => {
    wrapper = mount(PillComponent, {
      props: { text: 'Mathématiques', clickable: true },
      attachTo: document.body
    })
    expect(await runAxe(wrapper.element)).toEqual([])
  })

  it('TagSelectorComponent - tags sélectionnés - aucune violation axe', async () => {
    wrapper = mount(TagSelectorComponent, {
      props: { modelValue: [1] },
      global: {
        plugins: [
          createTestingPinia({
            stubActions: true,
            initialState: {
              tags: { tags: [{ tagId: 1, name: 'Algèbre', color: '#6366F1' }] }
            }
          })
        ]
      },
      attachTo: document.body
    })
    expect(await runAxe(wrapper.element)).toEqual([])
  })

  // Extension du 2026-08-30 — élargit le périmètre à 20 composants (compte rendu
  // de pilotage §7.2 : le RGAA statique/jsdom/navigateur ne couvre par nature
  // qu'une partie des 106 critères ; ceci monte la part outillable jsdom au-delà
  // des 8 composants du 2026-08-29, en priorité champs de formulaire et boutons
  // icône-seule (même critère de sélection que la campagne précédente).

  it('TodoWidget - séances et échéances mêlées - aucune violation axe', async () => {
    wrapper = mount(TodoWidget, {
      global: {
        plugins: [
          createTestingPinia({
            stubActions: true,
            initialState: {
              revisionSessions: {
                sessions: [
                  { id: 1, name: 'Réviser algèbre', date: '2026-08-30', startTime: '10:00:00', isDone: false }
                ]
              },
              deadlines: {
                deadlines: [
                  { id: 1, name: 'Rendu exercice', dueDate: '2026-08-30', dueTime: '18:00' }
                ]
              }
            }
          })
        ]
      },
      attachTo: document.body
    })
    expect(await runAxe(wrapper.element)).toEqual([])
  })

  it('MenuItemComponent - actions éditer/supprimer - aucune violation axe', async () => {
    wrapper = mount(MenuItemComponent, {
      props: {
        title: 'Mathématiques',
        actionLabel: 'Ouvrir',
        onAction: () => {},
        onEdit: () => {},
        onDelete: () => {}
      },
      attachTo: document.body
    })
    expect(await runAxe(wrapper.element)).toEqual([])
  })

  it('ItemListLayout - recherche + filtre sujet - aucune violation axe', async () => {
    wrapper = mount(ItemListLayout, {
      props: {
        search: '',
        filteredCount: 1,
        subjects: [{ subjectId: 1, name: 'Physique' }],
        selectedSubjectId: 1
      },
      attachTo: document.body
    })
    expect(await runAxe(wrapper.element)).toEqual([])
  })

  it('GuidedTourBannerComponent - étape en cours, action non faite - aucune violation axe', async () => {
    wrapper = mount(GuidedTourBannerComponent, {
      global: {
        plugins: [
          createTestingPinia({
            stubActions: true,
            initialState: {
              guidedTour: {
                active: true,
                stepIndex: 0,
                links: { subjectId: null, mindMapId: null, leitnerSystemId: null, testId: null, revisionSessionId: null }
              }
            }
          })
        ]
      },
      attachTo: document.body
    })
    expect(await runAxe(wrapper.element)).toEqual([])
  })

  it('MindMapNodePickerComponent - nœuds liables au clavier - aucune violation axe', async () => {
    wrapper = mount(MindMapNodePickerComponent, {
      props: {
        mindMapJson: {
          nodes: {
            n1: { id: 'n1', label: 'Racine', layout: { x: 0, y: 0 } },
            n2: { id: 'n2', label: 'Notion A', layout: { x: 200, y: 0 } }
          },
          links: [{ id: 'l1', from: 'n1', to: 'n2' }],
          subjectNodeId: 'n1'
        },
        modelValue: 'n2'
      },
      attachTo: document.body
    })
    expect(await runAxe(wrapper.element)).toEqual([])
  })

  it('NotificationBellComponent - panneau ouvert avec rappels - aucune violation axe', async () => {
    wrapper = mount(NotificationBellComponent, {
      global: {
        plugins: [
          createTestingPinia({
            stubActions: true,
            initialState: {
              auth: { authenticated: true },
              reminders: {
                reminders: [
                  { id: 1, status: 'pending', entityType: 'deadline', message: 'Rendu exercice', reminderAt: '2026-09-01T10:00:00Z' }
                ]
              }
            }
          })
        ]
      },
      attachTo: document.body
    })
    await wrapper.find('button').trigger('click')
    expect(await runAxe(wrapper.element)).toEqual([])
  })

  it('SubjectFilterComponent - sujets en onglets - aucune violation axe', async () => {
    wrapper = mount(SubjectFilterComponent, {
      global: {
        plugins: [
          createTestingPinia({
            stubActions: true,
            initialState: {
              subjects: { subjects: [{ subjectId: 1, name: 'Mathématiques' }] }
            }
          })
        ]
      },
      attachTo: document.body
    })
    expect(await runAxe(wrapper.element)).toEqual([])
  })

  it('SubjectSelectorComponent - formulaire inline de création - aucune violation axe', async () => {
    wrapper = mount(SubjectSelectorComponent, {
      props: { modelValue: 1, required: true },
      global: {
        plugins: [
          createTestingPinia({
            stubActions: true,
            initialState: {
              subjects: { subjects: [{ subjectId: 1, name: 'Mathématiques' }] }
            }
          })
        ]
      },
      attachTo: document.body
    })
    await wrapper.find('button.subject-create-link').trigger('click')
    expect(await runAxe(wrapper.element)).toEqual([])
  })

  it('ReminderWidget - liste + formulaire personnalisé - aucune violation axe', async () => {
    wrapper = mount(ReminderWidget, {
      props: { entityType: 'deadline', entityId: 1 },
      global: {
        plugins: [
          createTestingPinia({
            stubActions: true,
            initialState: {
              reminders: {
                reminders: [
                  { id: 1, entityType: 'deadline', entityId: 1, status: 'pending', delayMinutes: 60 }
                ]
              }
            }
          })
        ]
      },
      attachTo: document.body
    })
    await wrapper.findAll('button.preset-btn').at(-1).trigger('click') // bascule en mode "Perso."
    expect(await runAxe(wrapper.element)).toEqual([])
  })

  it('FormulaHelperComponent - bouton insérer une formule - aucune violation axe', async () => {
    wrapper = mount(FormulaHelperComponent, {
      props: { modelValue: '' },
      slots: { default: '<label for="reponse">Réponse</label><input id="reponse" type="text" />' },
      attachTo: document.body
    })
    expect(await runAxe(wrapper.element)).toEqual([])
  })

  it('StudentDetailComponent - fiche étudiant avec alertes - aucune violation axe', async () => {
    wrapper = mount(StudentDetailComponent, {
      props: {
        student: {
          email: 'eleve@example.com',
          lastActivityAt: '2026-08-28T10:00:00Z',
          daysInactive: 2,
          avgScore: 62,
          atRisk: true,
          atRiskReasons: ['Score en baisse'],
          scoreTrend: [{ score: 55, completedAt: '2026-08-20' }, { score: 62, completedAt: '2026-08-27' }]
        }
      },
      attachTo: document.body
    })
    expect(await runAxe(wrapper.element)).toEqual([])
  })

  it('KpiAlertWidgetComponent - alerte streak affichée - aucune violation axe', async () => {
    wrapper = mount(KpiAlertWidgetComponent, {
      global: {
        plugins: [
          createTestingPinia({
            stubActions: true,
            initialState: {
              kpi: {
                loading: false,
                kpis: {
                  leitner: { cardsDue: 0 },
                  revision: { streakDays: 5, revivedToday: false },
                  discipline: { disciplineScore: 0 },
                  exercises: { recentTrend: 0 }
                }
              },
              kpiAlertSettings: {
                loading: false,
                settings: { enabled: true, streakAlertEnabled: true, disciplineAlertEnabled: true, scoreDropAlertEnabled: true, thresholdDiscipline: 40 }
              }
            }
          })
        ],
        stubs: { RouterLink: { template: '<a href="/kpi"><slot /></a>' } }
      },
      attachTo: document.body
    })
    expect(await runAxe(wrapper.element)).toEqual([])
  })

  // Pages d'administration, avec des données : tableaux (légende, en-têtes), champs libellés, fenêtres.
  const ADMIN_ROLES = [
    { roleId: 1, name: 'Admin plateforme' },
    { roleId: 2, name: 'Étudiant' },
    { roleId: 10, name: 'Invité' }
  ]
  const mountAdmin = (component, initialState) =>
    mount(component, {
      global: {
        plugins: [createTestingPinia({ stubActions: true, initialState })],
        provide: { [CONFIRM_ACTION_KEY]: () => {} }
      },
      attachTo: document.body
    })

  it('AdminRolesPanel - liste de rôles - aucune violation axe', async () => {
    wrapper = mountAdmin(AdminRolesPanel, { roles: { roles: ADMIN_ROLES, role: {} } })
    expect(await runAxe(wrapper.element)).toEqual([])
  })

  it('AdminRolesPanel - fenêtre de renommage ouverte - aucune violation axe', async () => {
    wrapper = mountAdmin(AdminRolesPanel, { roles: { roles: ADMIN_ROLES, role: {} } })
    await wrapper.findAll('button').find((b) => b.text() === 'Renommer').trigger('click')
    expect(await runAxe(wrapper.element)).toEqual([])
  })

  it('AdminAccountsPanel - tableau paginé - aucune violation axe', async () => {
    wrapper = mountAdmin(AdminAccountsPanel, {
      adminUsers: {
        users: [
          { userId: 1, name: 'Moi', email: 'moi@x.fr', roleId: 1, isActive: true, lastLogin: null },
          { userId: 2, name: 'Alice', email: 'a@x.fr', roleId: 2, isActive: true, lastLogin: '2026-10-17T09:30:00Z' },
          { userId: 3, name: 'Bob', email: 'b@x.fr', roleId: null, isActive: false, lastLogin: null }
        ],
        total: 45,
        page: 2,
        limit: 20
      },
      roles: { roles: ADMIN_ROLES, role: {} },
      auth: { user: { userId: 1 } }
    })
    expect(await runAxe(wrapper.element)).toEqual([])
  })

  it('AdminAccountsPanel - fenêtre de changement de rôle ouverte - aucune violation axe', async () => {
    wrapper = mountAdmin(AdminAccountsPanel, {
      adminUsers: { users: [{ userId: 2, name: 'Alice', email: 'a@x.fr', roleId: 2, isActive: true, lastLogin: null }], total: 1, page: 1, limit: 20 },
      roles: { roles: ADMIN_ROLES, role: {} },
      auth: { user: { userId: 1 } }
    })
    await wrapper.findAll('button').find((b) => b.text() === 'Changer le rôle').trigger('click')
    expect(await runAxe(wrapper.element)).toEqual([])
  })

  it('AdminAuditPanel - journal rempli - aucune violation axe', async () => {
    wrapper = mountAdmin(AdminAuditPanel, {
      auditLogs: {
        loading: false,
        logs: [
          { id: 1, action: 'USER_ROLE_CHANGED', entityType: 'User', entityId: 2, actor: { name: 'Admin' }, metadata: { roleId: 3 }, createdAt: '2026-10-17T09:30:00Z' },
          { id: 2, action: 'USER_INVITED', entityType: 'Invitation', entityId: null, actor: null, metadata: null, createdAt: '2026-10-16T08:00:00Z' }
        ]
      }
    })
    expect(await runAxe(wrapper.element)).toEqual([])
  })
})

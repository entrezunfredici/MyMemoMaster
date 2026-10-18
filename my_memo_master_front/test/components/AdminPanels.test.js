import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import AdminPage from '@/pages/AdminPage.vue'
import AdminRolesPanel from '@/components/admin/AdminRolesPanel.vue'
import AdminAccountsPanel from '@/components/admin/AdminAccountsPanel.vue'
import AdminAuditPanel from '@/components/admin/AdminAuditPanel.vue'
import { CONFIRM_ACTION_KEY } from '@/composables/useConfirmAction'
import { useRoleStore } from '@/stores/roles'
import { useAdminUserStore } from '@/stores/adminUsers'
import { useAuditLogStore } from '@/stores/auditLogs'

vi.mock('@/helpers/api', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: vi.fn() } }))

const ROLES = [
  { roleId: 1, name: 'Admin plateforme' },
  { roleId: 2, name: 'Étudiant' },
  { roleId: 3, name: 'Enseignant' },
  { roleId: 4, name: 'Admin établissement' },
  { roleId: 5, name: 'Modérateur' },
  { roleId: 10, name: 'Invité' },
]

function mountPanel(component, { state = {}, ask = vi.fn() } = {}) {
  const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true, initialState: state })
  const wrapper = mount(component, { global: { plugins: [pinia], provide: { [CONFIRM_ACTION_KEY]: ask } }, attachTo: document.body })
  return { wrapper, ask, pinia }
}

const btn = (w, text) => w.findAll('button').find((b) => b.text().includes(text))
const rows = (w) => w.findAll('tbody tr')

beforeEach(() => { vi.clearAllMocks(); document.body.innerHTML = '' })

describe('AdminRolesPanel', () => {
  const mountRoles = (ask) => {
    const out = mountPanel(AdminRolesPanel, { state: { roles: { roles: ROLES, role: {} } }, ask })
    return { ...out, store: useRoleStore() }
  }

  it('charge les rôles à l’ouverture', () => {
    const { store } = mountRoles()
    expect(store.fetchRoles).toHaveBeenCalledTimes(1)
  })

  it('tableau accessible : légende, en-têtes de colonne, un rôle par ligne', () => {
    const { wrapper } = mountRoles()
    expect(wrapper.find('caption').text()).toBe('Rôles de la plateforme')
    expect(wrapper.findAll('th[scope="col"]').map((h) => h.text())).toEqual(['Identifiant', 'Nom', 'Type', 'Actions'])
    expect(rows(wrapper)).toHaveLength(ROLES.length)
  })

  it('rôles système : « Non modifiable », aucun bouton ; rôle personnalisé : Renommer et Supprimer nommés', () => {
    const { wrapper } = mountRoles()
    const [first, , , , , custom] = rows(wrapper)
    expect(first.text()).toContain('Système')
    expect(first.text()).toContain('Non modifiable')
    expect(first.findAll('button')).toHaveLength(0)
    expect(custom.text()).toContain('Personnalisé')
    expect(custom.findAll('button').map((b) => b.attributes('aria-label'))).toEqual(['Renommer le rôle Invité', 'Supprimer le rôle Invité'])
    for (let i = 0; i < 5; i++) expect(rows(wrapper)[i].findAll('button')).toHaveLength(0)
  })

  it('aucun rôle : message', () => {
    const { wrapper } = mountPanel(AdminRolesPanel, { state: { roles: { roles: [], role: {} } } })
    expect(wrapper.text()).toContain('Aucun rôle.')
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('le champ de création a un libellé visible', () => {
    const { wrapper } = mountRoles()
    expect(wrapper.find('label[for="admin-new-role"]').text()).toBe('Nom du nouveau rôle')
    expect(wrapper.find('#admin-new-role').exists()).toBe(true)
  })

  it('création : nom trop court ou trop long refusé sans appel au store', async () => {
    const { wrapper, store } = mountRoles()
    const input = wrapper.find('#admin-new-role')
    await input.setValue(' x ')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.find('[role="alert"]').text()).toBe('Le nom doit contenir entre 2 et 50 caractères.')
    await input.setValue('y'.repeat(51))
    await wrapper.find('form').trigger('submit')
    expect(store.addRole).not.toHaveBeenCalled()
  })

  it('création : envoie le nom sans espaces, recharge la liste, vide le champ', async () => {
    const { wrapper, store } = mountRoles()
    store.addRole.mockResolvedValue(true)
    store.fetchRoles.mockClear()
    await wrapper.find('#admin-new-role').setValue('  Invité 2  ')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(store.role).toEqual({ name: 'Invité 2' })
    expect(store.addRole).toHaveBeenCalledTimes(1)
    expect(store.fetchRoles).toHaveBeenCalledTimes(1)
    expect(wrapper.find('#admin-new-role').element.value).toBe('')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('création refusée par l’API : le champ est conservé, la liste n’est pas rechargée', async () => {
    const { wrapper, store } = mountRoles()
    store.addRole.mockResolvedValue(false)
    store.fetchRoles.mockClear()
    await wrapper.find('#admin-new-role').setValue('Invité 2')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('#admin-new-role').element.value).toBe('Invité 2')
    expect(store.fetchRoles).not.toHaveBeenCalled()
  })

  it('renommer : la fenêtre s’ouvre avec le nom actuel, enregistre et recharge', async () => {
    const { wrapper, store } = mountRoles()
    store.updateRole.mockResolvedValue(true)
    store.fetchRoles.mockClear()
    await btn(wrapper, 'Renommer').trigger('click')
    const dialog = wrapper.find('[role="dialog"]')
    expect(dialog.attributes('aria-label')).toBe('Renommer le rôle')
    const input = wrapper.find('#admin-rename-role')
    expect(input.element.value).toBe('Invité')
    await input.setValue(' Visiteur ')
    await btn(wrapper, 'Enregistrer').trigger('click')
    await flushPromises()
    expect(store.role).toEqual({ name: 'Visiteur' })
    expect(store.updateRole).toHaveBeenCalledWith(10)
    expect(store.fetchRoles).toHaveBeenCalledTimes(1)
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('renommer : nom invalide — erreur dans la fenêtre, aucun appel ; échec API — la fenêtre reste ouverte', async () => {
    const { wrapper, store } = mountRoles()
    await btn(wrapper, 'Renommer').trigger('click')
    await wrapper.find('#admin-rename-role').setValue('a')
    await btn(wrapper, 'Enregistrer').trigger('click')
    expect(wrapper.find('[role="dialog"] [role="alert"]').text()).toBe('Le nom doit contenir entre 2 et 50 caractères.')
    expect(store.updateRole).not.toHaveBeenCalled()
    await wrapper.find('#admin-rename-role').setValue('Valide')
    store.updateRole.mockResolvedValue(false)
    await btn(wrapper, 'Enregistrer').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
  })

  it('renommer : Annuler ferme sans rien enregistrer', async () => {
    const { wrapper, store } = mountRoles()
    await btn(wrapper, 'Renommer').trigger('click')
    await btn(wrapper, 'Annuler').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(store.updateRole).not.toHaveBeenCalled()
  })

  it('supprimer : demande confirmation (titre, message avec le nom) puis supprime et recharge', async () => {
    const { wrapper, store, ask } = mountRoles()
    store.deleteRole.mockResolvedValue(true)
    store.fetchRoles.mockClear()
    await btn(wrapper, 'Supprimer').trigger('click')
    expect(store.deleteRole).not.toHaveBeenCalled()
    const [title, message, action] = ask.mock.calls[0]
    expect(title).toBe('Supprimer ce rôle ?')
    expect(message).toContain('« Invité »')
    await action()
    expect(store.deleteRole).toHaveBeenCalledWith(10)
    expect(store.fetchRoles).toHaveBeenCalledTimes(1)
  })

  it('supprimer refusé par l’API (rôle attribué) : la liste n’est pas rechargée', async () => {
    const { wrapper, store, ask } = mountRoles()
    store.deleteRole.mockResolvedValue(false)
    store.fetchRoles.mockClear()
    await btn(wrapper, 'Supprimer').trigger('click')
    await ask.mock.calls[0][2]()
    expect(store.fetchRoles).not.toHaveBeenCalled()
  })
})

describe('AdminAccountsPanel', () => {
  const USERS = [
    { userId: 1, name: 'Moi Admin', email: 'moi@x.fr', roleId: 1, isActive: true, lastLogin: '2026-10-17T09:30:00Z' },
    { userId: 2, name: 'Alice', email: 'alice@x.fr', roleId: 2, isActive: true, lastLogin: null },
    { userId: 3, name: 'Bob', email: 'bob@x.fr', roleId: null, isActive: false, lastLogin: null },
    { userId: 4, name: 'Carl', email: 'carl@x.fr', roleId: 99, isActive: true, lastLogin: null },
  ]
  const mountAccounts = ({ users = USERS, total = 45, page = 2, limit = 20, loading = false, ask } = {}) => {
    const out = mountPanel(AdminAccountsPanel, {
      state: { adminUsers: { users, total, page, limit, loading }, roles: { roles: ROLES, role: {} }, auth: { user: { userId: 1 } } },
      ask,
    })
    return { ...out, userStore: useAdminUserStore(), roleStore: useRoleStore() }
  }

  it('charge les rôles puis la première page à l’ouverture', async () => {
    const { userStore, roleStore } = mountAccounts()
    await flushPromises()
    expect(roleStore.fetchRoles).toHaveBeenCalledTimes(1)
    expect(userStore.search).toHaveBeenCalledWith({ search: '', roleId: '', page: 1 })
  })

  it('tableau accessible, rôles nommés (« Aucun rôle », rôle inconnu), statut et dates', () => {
    const { wrapper } = mountAccounts()
    expect(wrapper.find('caption').text()).toBe('Comptes de la plateforme')
    expect(wrapper.findAll('th[scope="col"]').map((h) => h.text())).toEqual(['Nom', 'E-mail', 'Rôle', 'Statut', 'Dernière connexion', 'Actions'])
    const cells = (i) => rows(wrapper)[i].findAll('td').map((c) => c.text())
    expect(cells(0).slice(0, 4)).toEqual(['Moi Admin', 'moi@x.fr', 'Admin plateforme', 'Actif'])
    expect(cells(1)[2]).toBe('Étudiant')
    expect(cells(2).slice(2, 4)).toEqual(['Aucun rôle', 'Désactivé'])
    expect(cells(3)[2]).toBe('Rôle 99')
    expect(cells(0)[4]).toContain('2026')
    expect(cells(1)[4]).toBe('—')
  })

  it('résumé : total, pluriel et page courante', () => {
    const { wrapper } = mountAccounts()
    expect(wrapper.text()).toContain('45 comptes · page 2 sur 3')
    const one = mountAccounts({ users: [USERS[1]], total: 1, page: 1 }).wrapper
    expect(one.text()).toContain('1 compte · page 1 sur 1')
  })

  it('son propre compte : « Votre compte », aucune action ; les autres ont des actions nommées', () => {
    const { wrapper } = mountAccounts()
    const [me, alice, bob] = rows(wrapper)
    expect(me.text()).toContain('Votre compte')
    expect(me.findAll('button')).toHaveLength(0)
    expect(alice.findAll('button').map((b) => b.attributes('aria-label'))).toEqual(['Changer le rôle de Alice', 'Retirer le rôle de Alice'])
    expect(bob.findAll('button').map((b) => b.attributes('aria-label'))).toEqual(['Changer le rôle de Bob'])
  })

  it('états : chargement, liste vide', () => {
    expect(mountAccounts({ loading: true }).wrapper.text()).toContain('Chargement…')
    const empty = mountAccounts({ users: [], total: 0, page: 1 }).wrapper
    expect(empty.text()).toContain('Aucun compte ne correspond.')
    expect(empty.find('table').exists()).toBe(false)
  })

  it('champs de recherche avec libellés visibles ; le filtre de rôle propose tous les rôles', () => {
    const { wrapper } = mountAccounts()
    expect(wrapper.find('label[for="admin-account-search"]').text()).toBe('Nom ou e-mail')
    expect(wrapper.find('label[for="admin-account-role"]').text()).toBe('Rôle')
    expect(wrapper.findAll('#admin-account-role option').map((o) => o.text())).toEqual(['Tous les rôles', ...ROLES.map((r) => r.name)])
  })

  it('rechercher : transmet le texte et le rôle choisis, depuis la page 1', async () => {
    const { wrapper, userStore } = mountAccounts()
    await flushPromises()
    userStore.search.mockClear()
    await wrapper.find('#admin-account-search').setValue('ali')
    await wrapper.find('#admin-account-role').setValue(3)
    await wrapper.find('form').trigger('submit')
    expect(userStore.search).toHaveBeenCalledWith({ search: 'ali', roleId: 3, page: 1 })
  })

  it('pagination : page précédente / suivante avec les filtres courants, désactivées aux bornes', async () => {
    const { wrapper, userStore } = mountAccounts()
    await flushPromises()
    userStore.search.mockClear()
    await wrapper.find('#admin-account-search').setValue('ali')
    await btn(wrapper, 'Page suivante').trigger('click')
    expect(userStore.search).toHaveBeenLastCalledWith({ search: 'ali', roleId: '', page: 3 })
    await btn(wrapper, 'Page précédente').trigger('click')
    expect(userStore.search).toHaveBeenLastCalledWith({ search: 'ali', roleId: '', page: 1 })
    expect(btn(mountAccounts({ page: 1 }).wrapper, 'Page précédente').attributes('disabled')).toBeDefined()
    expect(btn(mountAccounts({ page: 3 }).wrapper, 'Page suivante').attributes('disabled')).toBeDefined()
  })

  it('changer le rôle : la fenêtre propose le rôle actuel, enregistre et se ferme', async () => {
    const { wrapper, userStore } = mountAccounts()
    userStore.setRole.mockResolvedValue(true)
    await btn(wrapper, 'Changer le rôle').trigger('click')
    expect(wrapper.find('[role="dialog"]').attributes('aria-label')).toBe('Rôle de Alice')
    expect(wrapper.find('#admin-account-new-role').element.value).toBe('2')
    await wrapper.find('#admin-account-new-role').setValue(3)
    await btn(wrapper, 'Enregistrer').trigger('click')
    await flushPromises()
    expect(userStore.setRole).toHaveBeenCalledWith(2, 3)
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('changer le rôle d’un compte sans rôle : le premier rôle est présélectionné ; refus API : la fenêtre reste', async () => {
    const { wrapper, userStore } = mountAccounts()
    userStore.setRole.mockResolvedValue(false)
    await wrapper.find('button[aria-label="Changer le rôle de Bob"]').trigger('click')
    expect(wrapper.find('#admin-account-new-role').element.value).toBe('1')
    await btn(wrapper, 'Enregistrer').trigger('click')
    await flushPromises()
    expect(userStore.setRole).toHaveBeenCalledWith(3, 1)
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
  })

  it('changer le rôle : Annuler ne change rien', async () => {
    const { wrapper, userStore } = mountAccounts()
    await btn(wrapper, 'Changer le rôle').trigger('click')
    await btn(wrapper, 'Annuler').trigger('click')
    expect(userStore.setRole).not.toHaveBeenCalled()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('retirer le rôle : demande confirmation (avec le nom) puis retire', async () => {
    const { wrapper, userStore, ask } = mountAccounts()
    await btn(wrapper, 'Retirer le rôle').trigger('click')
    expect(userStore.removeRole).not.toHaveBeenCalled()
    const [title, message, action] = ask.mock.calls[0]
    expect(title).toBe('Retirer le rôle de ce compte ?')
    expect(message).toContain('Alice')
    await action()
    expect(userStore.removeRole).toHaveBeenCalledWith(2)
  })

  it('identifiant de session sous la clé « id » : le compte est aussi reconnu', () => {
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      stubActions: true,
      initialState: { adminUsers: { users: USERS, total: 4, page: 1, limit: 20 }, roles: { roles: ROLES, role: {} }, auth: { user: { id: 1 } } },
    })
    const wrapper = mount(AdminAccountsPanel, { global: { plugins: [pinia], provide: { [CONFIRM_ACTION_KEY]: vi.fn() } } })
    expect(rows(wrapper)[0].text()).toContain('Votre compte')
  })
})

describe('AdminAuditPanel', () => {
  const LOGS = [
    { id: 1, action: 'USER_ROLE_CHANGED', entityType: 'User', entityId: 2, actor: { name: 'Admin' }, metadata: { roleId: 3 }, createdAt: '2026-10-17T09:30:00Z' },
    { id: 2, action: 'USER_INVITED', entityType: 'Invitation', entityId: null, actor: null, metadata: null, createdAt: '2026-10-16T08:00:00Z' },
    { id: 3, action: 'ACTION_FUTURE', entityType: 'Autre', entityId: 7, actor: { name: 'Bob' }, metadata: null, createdAt: '2026-10-15T08:00:00Z' },
  ]
  const mountAudit = ({ logs = LOGS, loading = false } = {}) => {
    const out = mountPanel(AdminAuditPanel, { state: { auditLogs: { logs, loading } } })
    return { ...out, store: useAuditLogStore() }
  }

  it('charge le journal à l’ouverture, sans filtre', () => {
    const { store } = mountAudit()
    expect(store.fetchLogs).toHaveBeenCalledWith({ entityType: '', entityId: '', actorId: '' })
  })

  it('tableau accessible ; actions et entités traduites, code brut conservé, auteur et détails', () => {
    const { wrapper } = mountAudit()
    expect(wrapper.find('caption').text()).toBe('Journal d’audit de la plateforme')
    expect(wrapper.findAll('th[scope="col"]').map((h) => h.text())).toEqual(['Date', 'Action', 'Entité', 'Auteur', 'Détails'])
    const cells = (i) => rows(wrapper)[i].findAll('td').map((c) => c.text())
    expect(cells(0)[1]).toContain('Rôle d’un compte modifié')
    expect(cells(0)[1]).toContain('USER_ROLE_CHANGED')
    expect(cells(0)[2]).toBe('Compte n° 2')
    expect(cells(0)[3]).toBe('Admin')
    expect(cells(0)[4]).toBe('{"roleId":3}')
    expect(cells(1)[2]).toBe('Invitation n° —')
    expect(cells(1)[3]).toBe('—')
    expect(cells(1)[4]).toBe('—')
    expect(cells(2)[1]).toContain('ACTION_FUTURE')
    expect(cells(2)[2]).toBe('Autre n° 7')
  })

  it('champs avec libellés visibles', () => {
    const { wrapper } = mountAudit()
    const labels = wrapper.findAll('label').map((l) => l.text())
    expect(labels).toEqual(['Type d’entité', 'Identifiant d’entité', 'Identifiant de l’auteur', 'Action'])
    for (const label of wrapper.findAll('label')) expect(wrapper.find(`#${label.attributes('for')}`).exists()).toBe(true)
  })

  it('filtrer : transmet type, entité et auteur au serveur', async () => {
    const { wrapper, store } = mountAudit()
    store.fetchLogs.mockClear()
    await wrapper.find('#admin-audit-type').setValue('User')
    await wrapper.find('#admin-audit-entity').setValue('12')
    await wrapper.find('#admin-audit-actor').setValue('1')
    await wrapper.find('form').trigger('submit')
    expect(store.fetchLogs).toHaveBeenCalledWith({ entityType: 'User', entityId: 12, actorId: 1 })
  })

  it('le filtre d’action s’applique tout de suite aux entrées chargées, sans appel serveur', async () => {
    const { wrapper, store } = mountAudit()
    store.fetchLogs.mockClear()
    await wrapper.find('#admin-audit-action').setValue('  role ')
    expect(rows(wrapper)).toHaveLength(1)
    expect(rows(wrapper)[0].text()).toContain('USER_ROLE_CHANGED')
    await wrapper.find('#admin-audit-action').setValue('zzz')
    expect(wrapper.text()).toContain('Aucune entrée.')
    expect(store.fetchLogs).not.toHaveBeenCalled()
  })

  it('états : chargement, journal vide', () => {
    expect(mountAudit({ loading: true }).wrapper.text()).toContain('Chargement…')
    const empty = mountAudit({ logs: [] }).wrapper
    expect(empty.text()).toContain('Aucune entrée.')
    expect(empty.find('table').exists()).toBe(false)
  })
})

describe('AdminPage', () => {
  const mountPage = () => {
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      stubActions: true,
      initialState: { roles: { roles: ROLES, role: {} }, auth: { user: { userId: 1, roleId: 1 } } },
    })
    const wrapper = mount(AdminPage, { global: { plugins: [pinia] }, attachTo: document.body })
    return { wrapper, roleStore: useRoleStore() }
  }

  it('un titre de niveau 1 et un groupe de boutons nommé', () => {
    const { wrapper } = mountPage()
    expect(wrapper.findAll('h1')).toHaveLength(1)
    expect(wrapper.find('h1').text()).toBe('Administration')
    expect(wrapper.find('[role="group"]').attributes('aria-label')).toBe('Sections d’administration')
  })

  it('les rôles sont affichés par défaut ; chaque bouton annonce son état (aria-pressed)', async () => {
    const { wrapper } = mountPage()
    const pressed = () => wrapper.findAll('[role="group"] button').map((b) => [b.text(), b.attributes('aria-pressed')])
    expect(wrapper.find('#admin-roles-title').exists()).toBe(true)
    expect(pressed()).toEqual([['Rôles', 'true'], ['Comptes', 'false'], ['Journal d’audit', 'false']])
    await btn(wrapper, 'Comptes').trigger('click')
    expect(wrapper.find('#admin-accounts-title').exists()).toBe(true)
    expect(wrapper.find('#admin-roles-title').exists()).toBe(false)
    expect(pressed()[1]).toEqual(['Comptes', 'true'])
    await btn(wrapper, 'Journal d’audit').trigger('click')
    expect(wrapper.find('#admin-audit-title').exists()).toBe(true)
    expect(wrapper.find('#admin-accounts-title').exists()).toBe(false)
  })

  it('les rôles ne sont chargés qu’une fois à l’ouverture de la page', () => {
    const { roleStore } = mountPage()
    expect(roleStore.fetchRoles).toHaveBeenCalledTimes(1)
  })

  it('la suppression d’un rôle passe par la modale de confirmation de la page', async () => {
    const { wrapper, roleStore } = mountPage()
    roleStore.deleteRole.mockResolvedValue(true)
    await btn(wrapper, 'Supprimer').trigger('click')
    const dialog = wrapper.find('[role="dialog"]')
    expect(dialog.attributes('aria-label')).toBe('Supprimer ce rôle ?')
    expect(dialog.text()).toContain('« Invité »')
    expect(roleStore.deleteRole).not.toHaveBeenCalled()
    await btn(wrapper, 'Confirmer').trigger('click')
    await flushPromises()
    expect(roleStore.deleteRole).toHaveBeenCalledWith(10)
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('annuler la confirmation ne supprime rien', async () => {
    const { wrapper, roleStore } = mountPage()
    await btn(wrapper, 'Supprimer').trigger('click')
    await btn(wrapper, 'Annuler').trigger('click')
    expect(roleStore.deleteRole).not.toHaveBeenCalled()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })
})

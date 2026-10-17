import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import AdminPage from '@/pages/AdminPage.vue'
import { useEtablissementStore } from '@/stores/etablissement'

const { mockReplace, isAdminPlateforme } = vi.hoisted(() => ({ mockReplace: vi.fn(), isAdminPlateforme: { value: true } }))
vi.mock('vue-router', async (importOriginal) => ({ ...(await importOriginal()), useRouter: () => ({ replace: mockReplace }) }))
vi.mock('@/composables/useRole', () => ({ useRole: () => ({ isAdminPlateforme }) }))

const LIST = [
  { id: 1, name: 'Lycée Pasteur', code: 'PAST01', adminId: 8, admin: { name: 'Mme Curie', email: 'curie@lycee.fr' } },
  { id: 2, name: 'Collège Hugo', code: 'HUGO02', adminId: null, admin: null },
]
const STATS = { groupCount: 4, totalMembers: 40, activeMembers: 35, pendingInvitations: 3, validatedAccounts: 30, inactiveMembers: 5, roleBreakdown: { students: 33, teachers: 7 }, recentActivity: [] }

function mountPage({ list = LIST, loading = false } = {}) {
  const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true, initialState: { etablissement: { list, loading } } })
  const store = useEtablissementStore(pinia)
  store.fetchOne.mockImplementation(async (id) => { store.current = list.find((e) => e.id === id) })
  store.fetchStats.mockImplementation(async () => { store.stats = STATS })
  const wrapper = mount(AdminPage, { global: { plugins: [pinia] } })
  return { wrapper, store }
}

const button = (scope, text) => scope.findAll('button').find((b) => b.text() === text)
const rowOf = (wrapper, name) => wrapper.findAll('tbody tr').find((r) => r.text().includes(name))
const modal = (wrapper) => wrapper.find('.fixed.inset-0')

describe('AdminPage', () => {
  let confirmSpy
  beforeEach(() => {
    vi.clearAllMocks()
    isAdminPlateforme.value = true
    confirmSpy = vi.spyOn(window, 'confirm')
  })
  afterEach(() => confirmSpy.mockRestore())

  describe('accès', () => {
    it('administrateur plateforme - reste sur la page', () => {
      mountPage()
      expect(mockReplace).not.toHaveBeenCalled()
    })

    it('autre rôle - redirigé vers /classroom', () => {
      isAdminPlateforme.value = false
      mountPage()
      expect(mockReplace).toHaveBeenCalledWith('/classroom')
    })
  })

  describe('liste', () => {
    it('affiche le titre de la page (un seul h1) et charge les établissements', () => {
      const { wrapper, store } = mountPage()
      expect(wrapper.findAll('h1')).toHaveLength(1)
      expect(wrapper.find('h1').text()).toBe('Administration plateforme')
      expect(store.fetchAll).toHaveBeenCalledTimes(1)
    })

    it('liste nom, code et administrateur (ou « — »)', () => {
      const { wrapper } = mountPage()
      expect(rowOf(wrapper, 'Lycée Pasteur').text()).toContain('Mme Curie (curie@lycee.fr)')
      expect(rowOf(wrapper, 'Collège Hugo').findAll('td')[2].text()).toBe('—')
    })

    it('RGAA 5 : légende et en-têtes de colonne', () => {
      const { wrapper } = mountPage()
      expect(wrapper.find('caption.sr-only').text()).toBe('Liste des établissements')
      wrapper.findAll('thead th').forEach((th) => expect(th.attributes('scope')).toBe('col'))
    })

    it('états chargement et vide', () => {
      expect(mountPage({ loading: true }).wrapper.text()).toContain('Chargement...')
      expect(mountPage({ list: [] }).wrapper.text()).toContain('Aucun établissement.')
    })
  })

  describe('création', () => {
    const openForm = (wrapper) => button(wrapper, '+ Nouveau').trigger('click')

    it('validations : nom puis code requis', async () => {
      const { wrapper, store } = mountPage()
      await openForm(wrapper)
      await button(wrapper, 'Créer').trigger('click')
      expect(wrapper.text()).toContain('Le nom est requis.')
      await wrapper.find('input[aria-label="Nom"]').setValue('École')
      await button(wrapper, 'Créer').trigger('click')
      expect(wrapper.text()).toContain('Le code est requis.')
      expect(store.createEtab).not.toHaveBeenCalled()
    })

    it('envoie le code en majuscules et l’identifiant admin numérique', async () => {
      const { wrapper, store } = mountPage()
      store.createEtab.mockResolvedValue({ id: 3 })
      await openForm(wrapper)
      await wrapper.find('input[aria-label="Nom"]').setValue(' École ')
      await wrapper.find('input[aria-label="Code (ex: ETAB01)"]').setValue('ec01')
      await wrapper.find('input[aria-label="ID admin (optionnel)"]').setValue('12')
      await button(wrapper, 'Créer').trigger('click')
      await flushPromises()
      expect(store.createEtab).toHaveBeenCalledWith({ name: 'École', code: 'EC01', adminId: 12 })
      expect(wrapper.text()).not.toContain('Nouvel établissement')
    })

    it('sans identifiant admin - adminId vaut null', async () => {
      const { wrapper, store } = mountPage()
      store.createEtab.mockResolvedValue({ id: 3 })
      await openForm(wrapper)
      await wrapper.find('input[aria-label="Nom"]').setValue('École')
      await wrapper.find('input[aria-label="Code (ex: ETAB01)"]').setValue('ec01')
      await button(wrapper, 'Créer').trigger('click')
      await flushPromises()
      expect(store.createEtab).toHaveBeenCalledWith({ name: 'École', code: 'EC01', adminId: null })
    })

    it('échec - le formulaire reste ouvert', async () => {
      const { wrapper, store } = mountPage()
      store.createEtab.mockResolvedValue(false)
      await openForm(wrapper)
      await wrapper.find('input[aria-label="Nom"]').setValue('École')
      await wrapper.find('input[aria-label="Code (ex: ETAB01)"]').setValue('ec01')
      await button(wrapper, 'Créer').trigger('click')
      await flushPromises()
      expect(wrapper.text()).toContain('Nouvel établissement')
    })
  })

  describe('modification', () => {
    const openEdit = (wrapper, name = 'Lycée Pasteur') => button(rowOf(wrapper, name), 'Modifier').trigger('click')

    it('préremplit nom, code et identifiant admin', async () => {
      const { wrapper } = mountPage()
      await openEdit(wrapper)
      expect(modal(wrapper).find('input[aria-label="Nom"]').element.value).toBe('Lycée Pasteur')
      expect(modal(wrapper).find('input[aria-label="Code"]').element.value).toBe('PAST01')
      expect(modal(wrapper).find('input[aria-label="ID admin (optionnel)"]').element.value).toBe('8')
    })

    it('succès - envoie les valeurs et ferme', async () => {
      const { wrapper, store } = mountPage()
      store.updateEtab.mockResolvedValue(true)
      await openEdit(wrapper)
      await button(modal(wrapper), 'Enregistrer').trigger('click')
      await flushPromises()
      expect(store.updateEtab).toHaveBeenCalledWith(1, { name: 'Lycée Pasteur', code: 'PAST01', adminId: 8 })
      expect(modal(wrapper).exists()).toBe(false)
    })

    it('établissement sans admin - adminId null', async () => {
      const { wrapper, store } = mountPage()
      store.updateEtab.mockResolvedValue(true)
      await openEdit(wrapper, 'Collège Hugo')
      await button(modal(wrapper), 'Enregistrer').trigger('click')
      await flushPromises()
      expect(store.updateEtab).toHaveBeenCalledWith(2, { name: 'Collège Hugo', code: 'HUGO02', adminId: null })
    })

    it('échec - message d’erreur', async () => {
      const { wrapper, store } = mountPage()
      store.updateEtab.mockResolvedValue(false)
      await openEdit(wrapper)
      await button(modal(wrapper), 'Enregistrer').trigger('click')
      await flushPromises()
      expect(modal(wrapper).text()).toContain('Erreur lors de la mise à jour.')
    })
  })

  describe('suppression', () => {
    it('refusée - aucun appel', async () => {
      confirmSpy.mockReturnValue(false)
      const { wrapper, store } = mountPage()
      await button(rowOf(wrapper, 'Collège Hugo'), 'Supprimer').trigger('click')
      expect(store.deleteEtab).not.toHaveBeenCalled()
    })

    it('acceptée - supprime et ferme le détail si c’était l’établissement affiché', async () => {
      confirmSpy.mockReturnValue(true)
      const { wrapper, store } = mountPage()
      await button(rowOf(wrapper, 'Lycée Pasteur'), 'Détail').trigger('click')
      await flushPromises()
      await button(rowOf(wrapper, 'Lycée Pasteur'), 'Supprimer').trigger('click')
      await flushPromises()
      expect(store.deleteEtab).toHaveBeenCalledWith(1)
      expect(wrapper.find('button[aria-label="Fermer le détail"]').exists()).toBe(false)
    })
  })

  describe('détail', () => {
    async function openDetail(wrapper, name = 'Lycée Pasteur') {
      await button(rowOf(wrapper, name), 'Détail').trigger('click')
      await flushPromises()
    }
    const tab = async (wrapper, label) => {
      await button(wrapper.find('section:last-of-type'), label).trigger('click')
      await flushPromises()
    }

    it('charge fiche et statistiques puis affiche les 8 compteurs', async () => {
      const { wrapper, store } = mountPage()
      await openDetail(wrapper)
      expect(store.fetchOne).toHaveBeenCalledWith(1)
      expect(store.fetchStats).toHaveBeenCalledWith(1)
      expect(wrapper.findAll('.rounded-xl .text-2xl').map((n) => n.text())).toEqual(['4', '40', '35', '3', '30', '33', '7', '5'])
    })

    it('journal : chargé une seule fois, filtres transmis', async () => {
      const { wrapper, store } = mountPage()
      store.fetchAudit.mockImplementation(async () => { store.audit = [{ id: 1, action: 'LOGIN', entityType: 'User', actor: null, createdAt: null }] })
      await openDetail(wrapper)
      await tab(wrapper, "Journal d'audit")
      await tab(wrapper, 'Statistiques')
      await tab(wrapper, "Journal d'audit")
      expect(store.fetchAudit).toHaveBeenCalledTimes(1)
      await wrapper.find('input[aria-label="Type entité"]').setValue('User')
      await button(wrapper, 'Filtrer').trigger('click')
      await flushPromises()
      expect(store.fetchAudit).toHaveBeenLastCalledWith(1, { action: undefined, entityType: 'User', limit: undefined })
    })

    it('contenu : suppression confirmée transmet type et identifiant', async () => {
      confirmSpy.mockReturnValue(true)
      const { wrapper, store } = mountPage()
      store.fetchContent.mockImplementation(async () => {
        store.content = { resources: [], sections: [{ id: 21, title: 'Chapitre 1', type: 'text', classGroup: { name: 'A' }, creator: { name: 'Bob' } }] }
      })
      await openDetail(wrapper)
      await tab(wrapper, 'Modération contenu')
      const row = wrapper.findAll('.min-w-0').find((d) => d.text().includes('Chapitre 1')).element.parentElement
      row.querySelector('button').click()
      await flushPromises()
      expect(store.deleteContent).toHaveBeenCalledWith(1, 'section', 21)
    })

    describe('gérant', () => {
      it('email requis', async () => {
        const { wrapper, store } = mountPage()
        await openDetail(wrapper)
        await tab(wrapper, 'Gérant')
        await button(wrapper, 'Assigner').trigger('click')
        expect(wrapper.text()).toContain("L'email est requis.")
        expect(store.assignAdmin).not.toHaveBeenCalled()
      })

      it('succès - email nettoyé envoyé, champ vidé', async () => {
        const { wrapper, store } = mountPage()
        store.assignAdmin.mockResolvedValue({ directlyAssigned: true })
        await openDetail(wrapper)
        await tab(wrapper, 'Gérant')
        await wrapper.find('input[aria-label="Email du gérant"]').setValue(' g@lycee.fr ')
        await button(wrapper, 'Assigner').trigger('click')
        await flushPromises()
        expect(store.assignAdmin).toHaveBeenCalledWith(1, 'g@lycee.fr')
        expect(wrapper.find('input[aria-label="Email du gérant"]').element.value).toBe('')
      })

      it('échec - message propre à cette page', async () => {
        const { wrapper, store } = mountPage()
        store.assignAdmin.mockResolvedValue(false)
        await openDetail(wrapper)
        await tab(wrapper, 'Gérant')
        await wrapper.find('input[aria-label="Email du gérant"]').setValue('x@y.fr')
        await button(wrapper, 'Assigner').trigger('click')
        await flushPromises()
        expect(wrapper.text()).toContain('Aucun compte trouvé pour cet email ou erreur serveur.')
      })

      it('« Réinitialiser » vide l’email et l’erreur', async () => {
        const { wrapper } = mountPage()
        await openDetail(wrapper)
        await tab(wrapper, 'Gérant')
        await button(wrapper, 'Assigner').trigger('click')
        await button(wrapper, 'Réinitialiser').trigger('click')
        expect(wrapper.text()).not.toContain("L'email est requis.")
      })
    })
  })
})

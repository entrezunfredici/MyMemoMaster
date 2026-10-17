import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import ClassroomPlateformeView from '@/pages/ClassroomPlateformeView.vue'
import { useEtablissementStore } from '@/stores/etablissement'

const LIST = [
  { id: 1, name: 'Lycée Pasteur', code: 'PAST01', admin: { name: 'Mme Curie', email: 'curie@lycee.fr' } },
  { id: 2, name: 'Collège Hugo', code: 'HUGO02', admin: null },
]
const STATS = {
  groupCount: 4,
  totalMembers: 40,
  activeMembers: 35,
  pendingInvitations: 3,
  validatedAccounts: 30,
  inactiveMembers: 5,
  roleBreakdown: { students: 33, teachers: 7 },
  recentActivity: [{ id: 9, action: 'USER_INVITED', actor: { name: 'Mme Curie' }, createdAt: '2026-10-01T10:00:00Z' }],
}

function mountPage({ list = LIST, loading = false } = {}) {
  const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true, initialState: { etablissement: { list, loading } } })
  const store = useEtablissementStore(pinia)
  store.fetchOne.mockImplementation(async (id) => {
    store.current = list.find((e) => e.id === id)
    return store.current
  })
  store.fetchStats.mockImplementation(async () => {
    store.stats = STATS
    return true
  })
  const wrapper = mount(ClassroomPlateformeView, { global: { plugins: [pinia] } })
  return { wrapper, store }
}

const button = (wrapper, text, scope) => (scope || wrapper).findAll('button').find((b) => b.text() === text)
const rowOf = (wrapper, name) => wrapper.findAll('tbody tr').find((r) => r.text().includes(name))
const openDetail = async (wrapper, name = 'Lycée Pasteur') => {
  await button(wrapper, 'Détail', rowOf(wrapper, name)).trigger('click')
  await flushPromises()
}
const openTab = async (wrapper, label) => {
  await button(wrapper, label, wrapper.find('section:last-of-type')).trigger('click')
  await flushPromises()
}

describe('ClassroomPlateformeView', () => {
  beforeEach(() => vi.clearAllMocks())

  // Confirmations : modale commune (ConfirmActionModal), plus de confirm() natif
  const answer = async (wrapper, selector) => {
    await wrapper.find(selector).trigger('click')
    await flushPromises()
  }

  describe('liste des établissements', () => {
    it('charge la liste au montage', () => {
      const { store } = mountPage()
      expect(store.fetchAll).toHaveBeenCalledTimes(1)
    })

    it('affiche nom, code et gérant (ou « — ») de chaque établissement', () => {
      const { wrapper } = mountPage()
      const rows = wrapper.findAll('tbody tr')
      expect(rows).toHaveLength(2)
      expect(rows[0].text()).toContain('Lycée Pasteur')
      expect(rows[0].text()).toContain('PAST01')
      expect(rows[0].text()).toContain('Mme Curie (curie@lycee.fr)')
      expect(rows[1].findAll('td')[2].text()).toBe('—')
    })

    it('RGAA 5 : le tableau a une légende et des en-têtes de colonne', () => {
      const { wrapper } = mountPage()
      expect(wrapper.find('caption.sr-only').text()).toBe('Liste des établissements')
      wrapper.findAll('thead th').forEach((th) => expect(th.attributes('scope')).toBe('col'))
    })

    it('message de chargement', () => {
      const { wrapper } = mountPage({ loading: true })
      expect(wrapper.text()).toContain('Chargement...')
      expect(wrapper.find('table').exists()).toBe(false)
    })

    it('liste vide', () => {
      const { wrapper } = mountPage({ list: [] })
      expect(wrapper.text()).toContain('Aucun établissement.')
    })
  })

  describe('création', () => {
    const openForm = async (wrapper) => button(wrapper, '+ Nouveau').trigger('click')

    it('le formulaire s’ouvre et se ferme avec « + Nouveau » / « Annuler »', async () => {
      const { wrapper } = mountPage()
      expect(wrapper.text()).not.toContain('Nouvel établissement')
      await openForm(wrapper)
      expect(wrapper.text()).toContain('Nouvel établissement')
      await button(wrapper, 'Annuler').trigger('click')
      expect(wrapper.text()).not.toContain('Nouvel établissement')
    })

    it('nom manquant - message, aucun appel', async () => {
      const { wrapper, store } = mountPage()
      await openForm(wrapper)
      await button(wrapper, 'Créer').trigger('click')
      expect(wrapper.text()).toContain('Le nom est requis.')
      expect(store.createEtab).not.toHaveBeenCalled()
    })

    it('code manquant (ou espaces) - message, aucun appel', async () => {
      const { wrapper, store } = mountPage()
      await openForm(wrapper)
      await wrapper.find('input[aria-label="Nom"]').setValue('Nouvelle école')
      await wrapper.find('input[aria-label="Code (ex: ETAB01)"]').setValue('   ')
      await button(wrapper, 'Créer').trigger('click')
      expect(wrapper.text()).toContain('Le code est requis.')
      expect(store.createEtab).not.toHaveBeenCalled()
    })

    it('succès - envoie le nom nettoyé et le code en majuscules, puis referme et vide', async () => {
      const { wrapper, store } = mountPage()
      store.createEtab.mockResolvedValue({ id: 3 })
      await openForm(wrapper)
      await wrapper.find('input[aria-label="Nom"]').setValue('  Nouvelle école ')
      await wrapper.find('input[aria-label="Code (ex: ETAB01)"]').setValue(' etab03 ')
      await button(wrapper, 'Créer').trigger('click')
      await flushPromises()
      expect(store.createEtab).toHaveBeenCalledWith({ name: 'Nouvelle école', code: 'ETAB03' })
      expect(wrapper.text()).not.toContain('Nouvel établissement')
      await openForm(wrapper)
      expect(wrapper.find('input[aria-label="Nom"]').element.value).toBe('')
    })

    it('échec - le formulaire reste ouvert avec la saisie', async () => {
      const { wrapper, store } = mountPage()
      store.createEtab.mockResolvedValue(false)
      await openForm(wrapper)
      await wrapper.find('input[aria-label="Nom"]').setValue('X')
      await wrapper.find('input[aria-label="Code (ex: ETAB01)"]').setValue('Y')
      await button(wrapper, 'Créer').trigger('click')
      await flushPromises()
      expect(wrapper.text()).toContain('Nouvel établissement')
      expect(wrapper.find('input[aria-label="Nom"]').element.value).toBe('X')
    })
  })

  describe('modification', () => {
    const openEdit = async (wrapper, name = 'Lycée Pasteur') => button(wrapper, 'Modifier', rowOf(wrapper, name)).trigger('click')
    const modal = (wrapper) => wrapper.find('.fixed.inset-0')

    it('préremplit nom et code', async () => {
      const { wrapper } = mountPage()
      await openEdit(wrapper)
      expect(modal(wrapper).find('h3').text()).toBe("Modifier l'établissement")
      expect(modal(wrapper).find('input[aria-label="Nom"]').element.value).toBe('Lycée Pasteur')
      expect(modal(wrapper).find('input[aria-label="Code"]').element.value).toBe('PAST01')
    })

    it('RGAA 7.1 : dialogue modal nommé par son titre, fermé par Échap', async () => {
      const { wrapper } = mountPage()
      await openEdit(wrapper)
      const d = wrapper.find('[role="dialog"]')
      expect(d.attributes('aria-modal')).toBe('true')
      expect(wrapper.find(`#${d.attributes('aria-labelledby')}`).text()).toBe("Modifier l'établissement")
      await d.trigger('keydown', { key: 'Escape' })
      expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    })

    it('succès - met à jour puis ferme', async () => {
      const { wrapper, store } = mountPage()
      store.updateEtab.mockResolvedValue(true)
      await openEdit(wrapper)
      await modal(wrapper).find('input[aria-label="Nom"]').setValue('Lycée Pasteur 2')
      await button(wrapper, 'Enregistrer').trigger('click')
      await flushPromises()
      expect(store.updateEtab).toHaveBeenCalledWith(1, { name: 'Lycée Pasteur 2', code: 'PAST01' })
      expect(modal(wrapper).exists()).toBe(false)
    })

    it('champ vidé - envoyé comme undefined (non modifié)', async () => {
      const { wrapper, store } = mountPage()
      store.updateEtab.mockResolvedValue(true)
      await openEdit(wrapper)
      await modal(wrapper).find('input[aria-label="Code"]').setValue('')
      await button(wrapper, 'Enregistrer').trigger('click')
      await flushPromises()
      expect(store.updateEtab).toHaveBeenCalledWith(1, { name: 'Lycée Pasteur', code: undefined })
    })

    it('échec - message d’erreur, fenêtre ouverte', async () => {
      const { wrapper, store } = mountPage()
      store.updateEtab.mockResolvedValue(false)
      await openEdit(wrapper)
      await button(wrapper, 'Enregistrer').trigger('click')
      await flushPromises()
      expect(modal(wrapper).text()).toContain('Erreur lors de la mise à jour.')
    })

    it('« Annuler » ferme sans enregistrer', async () => {
      const { wrapper, store } = mountPage()
      await openEdit(wrapper)
      await button(wrapper, 'Annuler', modal(wrapper)).trigger('click')
      expect(modal(wrapper).exists()).toBe(false)
      expect(store.updateEtab).not.toHaveBeenCalled()
    })
  })

  describe('suppression d’un établissement', () => {
    it('« Supprimer » ouvre une confirmation nominative ; « Annuler » ne supprime rien', async () => {
      const { wrapper, store } = mountPage()
      await button(wrapper, 'Supprimer', rowOf(wrapper, 'Collège Hugo')).trigger('click')
      const d = wrapper.find('[role="dialog"]')
      expect(d.attributes('aria-label')).toBe("Supprimer l'établissement")
      expect(d.text()).toContain('Supprimer « Collège Hugo » ? Cette action est irréversible.')
      await answer(wrapper, '.btn-modal-cancel')
      expect(store.deleteEtab).not.toHaveBeenCalled()
    })

    it('« Confirmer » supprime', async () => {
      const { wrapper, store } = mountPage()
      await button(wrapper, 'Supprimer', rowOf(wrapper, 'Collège Hugo')).trigger('click')
      await answer(wrapper, '.btn-modal-danger')
      expect(store.deleteEtab).toHaveBeenCalledWith(2)
    })

    it('supprimer l’établissement affiché ferme le panneau de détail', async () => {
      const { wrapper } = mountPage()
      await openDetail(wrapper)
      expect(wrapper.find('button[aria-label="Fermer le détail"]').exists()).toBe(true)
      await button(wrapper, 'Supprimer', rowOf(wrapper, 'Lycée Pasteur')).trigger('click')
      await answer(wrapper, '.btn-modal-danger')
      expect(wrapper.find('button[aria-label="Fermer le détail"]').exists()).toBe(false)
    })
  })

  describe('panneau de détail', () => {
    it('« Détail » charge l’établissement et ses statistiques', async () => {
      const { wrapper, store } = mountPage()
      await openDetail(wrapper)
      expect(store.fetchOne).toHaveBeenCalledWith(1)
      expect(store.fetchStats).toHaveBeenCalledWith(1)
      expect(wrapper.find('section:last-of-type h2').text()).toContain('Lycée Pasteur')
    })

    it('affiche les statistiques dans l’onglet par défaut', async () => {
      const { wrapper } = mountPage()
      await openDetail(wrapper)
      const text = wrapper.text()
      expect(text).toContain('Groupes')
      expect(text).toContain('Invitations en attente')
      expect(text).toContain('USER_INVITED')
      const values = wrapper.findAll('.text-2xl').map((n) => n.text())
      expect(values).toEqual(['4', '40', '35', '3', '30', '33', '7', '5'])
    })

    it('réinitialise statistiques, journal et contenu avant de recharger', async () => {
      const { wrapper, store } = mountPage()
      store.audit = [{ id: 1 }]
      store.content = { resources: [], sections: [] }
      await openDetail(wrapper)
      expect(store.audit).toEqual([])
      expect(store.content).toBeNull()
    })

    it('« Fermer le détail » masque le panneau', async () => {
      const { wrapper } = mountPage()
      await openDetail(wrapper)
      await wrapper.find('button[aria-label="Fermer le détail"]').trigger('click')
      expect(wrapper.find('button[aria-label="Fermer le détail"]').exists()).toBe(false)
    })

    describe('journal d’audit', () => {
      it('charge le journal à la première ouverture seulement', async () => {
        const { wrapper, store } = mountPage()
        store.fetchAudit.mockImplementation(async () => { store.audit = [{ id: 1, action: 'LOGIN', entityType: 'User', entityId: 5, actor: { name: 'Alice' }, createdAt: '2026-10-01T10:00:00Z' }] })
        await openDetail(wrapper)
        await openTab(wrapper, "Journal d'audit")
        expect(store.fetchAudit).toHaveBeenCalledWith(1)
        expect(wrapper.text()).toContain('LOGIN')
        expect(wrapper.text()).toContain('User #5')
        await openTab(wrapper, 'Statistiques')
        await openTab(wrapper, "Journal d'audit")
        expect(store.fetchAudit).toHaveBeenCalledTimes(1)
      })

      it('journal vide', async () => {
        const { wrapper } = mountPage()
        await openDetail(wrapper)
        await openTab(wrapper, "Journal d'audit")
        expect(wrapper.text()).toContain('Aucune entrée.')
      })

      it('« Filtrer » n’envoie que les filtres renseignés', async () => {
        const { wrapper, store } = mountPage()
        await openDetail(wrapper)
        await openTab(wrapper, "Journal d'audit")
        store.fetchAudit.mockClear()
        await wrapper.find('input[aria-label="Action (ex: USER_INVITED)"]').setValue('DELETE')
        await wrapper.find('input[aria-label="Limite"]').setValue('50')
        await button(wrapper, 'Filtrer').trigger('click')
        await flushPromises()
        expect(store.fetchAudit).toHaveBeenCalledWith(1, { action: 'DELETE', entityType: undefined, limit: 50 })
      })
    })

    describe('modération du contenu', () => {
      const CONTENT = {
        resources: [{ id: 11, title: 'Cours 1', type: 'pdf', classGroup: { name: '1ère A' }, creator: { name: 'M. Dupont' } }],
        sections: [],
      }

      async function openContent(wrapper, store) {
        store.fetchContent.mockImplementation(async () => { store.content = CONTENT })
        await openDetail(wrapper)
        await openTab(wrapper, 'Modération contenu')
      }

      it('liste ressources et sections avec leur nombre', async () => {
        const { wrapper, store } = mountPage()
        await openContent(wrapper, store)
        expect(wrapper.text()).toContain('Ressources (1)')
        expect(wrapper.text()).toContain('Sections (0)')
        expect(wrapper.text()).toContain('Cours 1')
        expect(wrapper.text()).toContain('1ère A · pdf · M. Dupont')
        expect(wrapper.text()).toContain('Aucune section.')
      })

      const askDeleteContent = async (wrapper, store) => {
        await openContent(wrapper, store)
        const row = wrapper.findAll('.min-w-0').find((d) => d.text().includes('Cours 1')).element.parentElement
        row.querySelector('button').click()
        await flushPromises()
      }

      it('suppression confirmée - transmet le type et l’identifiant', async () => {
        const { wrapper, store } = mountPage()
        await askDeleteContent(wrapper, store)
        expect(wrapper.find('[role="dialog"]').text()).toContain('Supprimer « Cours 1 » ? Cette action est irréversible.')
        expect(store.deleteContent).not.toHaveBeenCalled()
        await answer(wrapper, '.btn-modal-danger')
        expect(store.deleteContent).toHaveBeenCalledWith(1, 'resource', 11)
      })

      it('suppression annulée - aucun appel', async () => {
        const { wrapper, store } = mountPage()
        await askDeleteContent(wrapper, store)
        await answer(wrapper, '.btn-modal-cancel')
        expect(store.deleteContent).not.toHaveBeenCalled()
      })
    })

    describe('gérant', () => {
      async function openGerant(wrapper) {
        await openDetail(wrapper)
        await openTab(wrapper, 'Gérant')
      }

      it('affiche le gérant actuel ou « Aucun gérant assigné »', async () => {
        const { wrapper } = mountPage()
        await openGerant(wrapper)
        expect(wrapper.text()).toContain('Mme Curie')
        expect(wrapper.text()).toContain('curie@lycee.fr')
      })

      it('établissement sans gérant', async () => {
        const { wrapper } = mountPage()
        await openDetail(wrapper, 'Collège Hugo')
        await openTab(wrapper, 'Gérant')
        expect(wrapper.text()).toContain('Aucun gérant assigné')
      })

      it('email vide - message, aucun appel', async () => {
        const { wrapper, store } = mountPage()
        await openGerant(wrapper)
        await button(wrapper, 'Assigner').trigger('click')
        expect(wrapper.text()).toContain("L'email est requis.")
        expect(store.assignAdmin).not.toHaveBeenCalled()
      })

      it('assignation directe - envoie l’email nettoyé et vide le champ', async () => {
        const { wrapper, store } = mountPage()
        store.assignAdmin.mockResolvedValue({ directlyAssigned: true })
        await openGerant(wrapper)
        await wrapper.find('input[aria-label="Email du gérant"]').setValue('  nouveau@lycee.fr ')
        await button(wrapper, 'Assigner').trigger('click')
        await flushPromises()
        expect(store.assignAdmin).toHaveBeenCalledWith(1, 'nouveau@lycee.fr')
        expect(wrapper.find('input[aria-label="Email du gérant"]').element.value).toBe('')
        expect(wrapper.text()).not.toContain("email d'invitation")
      })

      it('compte introuvable - affiche l’invitation envoyée', async () => {
        const { wrapper, store } = mountPage()
        store.assignAdmin.mockResolvedValue({ directlyAssigned: false, email: 'inconnu@x.fr' })
        await openGerant(wrapper)
        await wrapper.find('input[aria-label="Email du gérant"]').setValue('inconnu@x.fr')
        await button(wrapper, 'Assigner').trigger('click')
        await flushPromises()
        expect(wrapper.text()).toContain("Aucun compte trouvé — un email d'invitation a été envoyé à inconnu@x.fr.")
      })

      it('échec - message d’erreur et saisie conservée', async () => {
        const { wrapper, store } = mountPage()
        store.assignAdmin.mockResolvedValue(false)
        await openGerant(wrapper)
        await wrapper.find('input[aria-label="Email du gérant"]').setValue('a@b.fr')
        await button(wrapper, 'Assigner').trigger('click')
        await flushPromises()
        expect(wrapper.text()).toContain("Erreur lors de l'assignation. Vérifiez l'email et réessayez.")
        expect(wrapper.find('input[aria-label="Email du gérant"]').element.value).toBe('a@b.fr')
      })

      it('« Réinitialiser » vide l’email et l’erreur', async () => {
        const { wrapper } = mountPage()
        await openGerant(wrapper)
        await button(wrapper, 'Assigner').trigger('click')
        expect(wrapper.text()).toContain("L'email est requis.")
        await button(wrapper, 'Réinitialiser').trigger('click')
        expect(wrapper.text()).not.toContain("L'email est requis.")
      })
    })
  })
})

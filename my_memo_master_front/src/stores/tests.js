// stores/tests.js
import { defineStore } from 'pinia'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'

export const useTestStore = defineStore('tests', {
  state: () => ({
    test: {},        // test actif ou en cours de création/édition
    tests: []        // tous les tests
  }),

  actions: {
    async fetchTests() {
      try {
        const resp = await api.get('tests')
        if (resp.status !== 200) {
          notif.notify(resp.data?.message || 'Erreur inconnue', 'error')
          return false
        }
        this.tests = resp.data
        return true
      } catch (err) {
        notif.notify('Erreur lors du chargement des tests', 'error')
        return false
      }
    },

    async fetchTestById(id) {
      try {
        const resp = await api.get(`tests/${id}`)
        if (resp.status !== 200) {
          notif.notify(resp.data?.message || 'Test non trouvé', 'error')
          return false
        }
        this.test = resp.data
        return true
      } catch (err) {
        notif.notify('Erreur lors de la récupération du test', 'error')
        return false
      }
    },

  async createTest() {
    try {
        const resp = await api.post('tests', this.test)
        if (resp.status !== 201) {
        notif.notify(resp.data?.message || 'Erreur lors de la création', 'error')
        return false
        }

        // ✅ Met à jour le test actif avec l'objet renvoyé (doit contenir l'id)
        this.test = resp.data

        notif.notify('Test créé avec succès', 'success')
        this.fetchTests() // rafraîchir la liste
        return true
    } catch (err) {
        notif.notify('Erreur lors de la création du test', 'error')
        return false
    }
},


    async updateTest(id) {
      try {
        const resp = await api.put(`tests/${id}`, this.test)
        if (resp.status !== 200) {
          notif.notify(resp.data?.message || 'Erreur lors de la mise à jour', 'error')
          return false
        }
        notif.notify('Test mis à jour avec succès', 'success')
        this.fetchTests()
        return true
      } catch (err) {
        notif.notify('Erreur lors de la mise à jour du test', 'error')
        return false
      }
    },

    async deleteTest(id) {
      try {
        const resp = await api.del(`tests/${id}`)
        // api.del retourne undefined quand le serveur répond 204 (no content)
        if (resp !== undefined) {
          notif.notify(resp.data?.message || 'Erreur lors de la suppression', 'error')
          return false
        }
        notif.notify('Exercice supprimé.', 'success')
        await this.fetchTests()
        return true
      } catch (err) {
        notif.notify('Erreur lors de la suppression du test', 'error')
        return false
      }
    },

    async assignGroups(testId, groupIds) {
      try {
        const resp = await api.post(`tests/${testId}/groups`, { groupIds })
        if (resp.status !== 200) {
          notif.notify(resp.data?.message || 'Erreur lors de l\'assignation', 'error')
          return false
        }
        // Met à jour le test dans la liste locale
        const idx = this.tests.findIndex((t) => t.testId === testId)
        if (idx !== -1) this.tests[idx] = { ...this.tests[idx], ...resp.data.data }
        notif.notify(groupIds.length ? 'Exercice assigné aux groupes.' : 'Exercice rendu privé.', 'success')
        return true
      } catch (err) {
        notif.notify('Erreur lors de l\'assignation des groupes', 'error')
        return false
      }
    }
  }
})

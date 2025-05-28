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
        const resp = await api.get('tests/all')
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
        const resp = await api.post('tests/add', this.test)
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
        if (resp.status !== 200) {
          notif.notify(resp.data?.message || 'Erreur lors de la suppression', 'error')
          return false
        }
        notif.notify('Test supprimé avec succès', 'success')
        this.fetchTests()
        return true
      } catch (err) {
        notif.notify('Erreur lors de la suppression du test', 'error')
        return false
      }
    }
  }
})

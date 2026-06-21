import { defineStore } from 'pinia'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'

export const useTestResultStore = defineStore('testResults', {
  state: () => ({
    results: [],      // résultats pour un test précis (chargés via fetchByTest)
    history: []       // historique complet de l'utilisateur
  }),

  getters: {
    bestScore: (state) => {
      if (!state.results.length) return null
      return state.results.reduce((best, r) =>
        (r.score / r.total) > (best.score / best.total) ? r : best
      )
    }
  },

  actions: {
    async fetchByTest(testId) {
      try {
        const resp = await api.get(`test-results/test/${testId}`)
        if (!resp || resp.status !== 200) return false
        this.results = resp.data
        return true
      } catch {
        return false
      }
    },

    async fetchByUser() {
      try {
        const resp = await api.get('test-results')
        if (!resp || resp.status !== 200) return false
        this.history = resp.data
        return true
      } catch {
        return false
      }
    },

    async saveResult(testId, score, total) {
      try {
        const resp = await api.post('test-results', { testId, score, total })
        if (!resp || resp.status !== 201) return false
        this.results.unshift(resp.data)
        return true
      } catch {
        notif.notify('Erreur lors de l\'enregistrement du score.', 'error')
        return false
      }
    }
  }
})

import { defineStore } from 'pinia'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'

export const useSearchStore = defineStore('search', {
  state: () => ({
    results: { mindMaps: [], leitnerSystems: [], tests: [] },
    loading: false
  }),

  actions: {
    async searchAll({ subjectId = null, q = null } = {}) {
      this.loading = true
      try {
        const params = {}
        if (subjectId) params.subjectId = subjectId
        if (q) params.q = q
        const resp = await api.get('search', params)
        if (resp?.status !== 200) return false
        this.results = resp.data
        return true
      } catch (error) {
        notif.notify(`Erreur lors de la recherche : ${error}`, 'error')
        return false
      } finally {
        this.loading = false
      }
    }
  }
})

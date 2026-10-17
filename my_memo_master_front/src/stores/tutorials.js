import { defineStore } from 'pinia'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'

// Tutoriels de révision (route publique `GET /tutorials`, liste paginée).
export const useTutorialStore = defineStore('tutorials', {
  state: () => ({
    tutorials: [],
    loading: false,
    // { page, perPage, total } — `total` est le nombre de pages
    pagination: null,
  }),

  actions: {
    /**
     * @param {{ subjectId?: number|string, revisionTips?: boolean, search?: string, page?: number, perPage?: number }} [filters]
     * @returns {Promise<boolean>}
     */
    async fetchTutorials({ subjectId, revisionTips, search, page, perPage = 100 } = {}) {
      this.loading = true
      try {
        const params = { perPage }
        if (subjectId) params.subjectId = subjectId
        if (revisionTips !== undefined) params.revisionTips = revisionTips
        if (search) params.search = search
        if (page) params.page = page

        const resp = await api.get('tutorials', params)
        if (!resp || resp.status !== 200) {
          this.tutorials = []
          notif.notify(resp?.data?.message || 'Erreur lors du chargement des tutoriels.', 'error')
          return false
        }
        this.tutorials = resp.data?.data ?? []
        this.pagination = resp.data?.pagination ?? null
        return true
      } catch {
        this.tutorials = []
        notif.notify('Erreur lors du chargement des tutoriels.', 'error')
        return false
      } finally {
        this.loading = false
      }
    },
  },
})

import { defineStore } from 'pinia'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'

export const useKpiStore = defineStore('kpi', {
  state: () => ({
    kpis: null,
    loading: false
  }),

  actions: {
    async fetchMyKpis() {
      this.loading = true
      try {
        const resp = await api.get('kpi/my')
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors du chargement des indicateurs.', 'error')
          return false
        }
        this.kpis = resp.data
        return true
      } catch {
        notif.notify('Erreur lors du chargement des indicateurs.', 'error')
        return false
      } finally {
        this.loading = false
      }
    }
  }
})

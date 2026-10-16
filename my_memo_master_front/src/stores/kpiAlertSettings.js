import { defineStore } from 'pinia'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'

export const useKpiAlertSettingsStore = defineStore('kpiAlertSettings', {
  state: () => ({
    settings: null,
    loading: false,
    saving: false
  }),

  actions: {
    async fetchSettings() {
      this.loading = true
      try {
        const resp = await api.get('kpi/alert-settings')
        if (resp?.status === 200) this.settings = resp.data
      } catch {
        notif.notify('Erreur lors du chargement des préférences d\'alertes.', 'error')
      } finally {
        this.loading = false
      }
    },

    async updateSettings(updates) {
      this.saving = true
      try {
        const resp = await api.put('kpi/alert-settings', updates)
        if (resp?.status === 200) {
          this.settings = resp.data
          notif.notify('Préférences d\'alertes mises à jour.', 'success')
          return true
        }
        return false
      } catch {
        notif.notify('Erreur lors de la mise à jour des préférences.', 'error')
        return false
      } finally {
        this.saving = false
      }
    }
  }
})

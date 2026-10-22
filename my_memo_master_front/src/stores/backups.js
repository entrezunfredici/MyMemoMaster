import { defineStore } from 'pinia'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'

// Sauvegardes de la base (réservé à l'administrateur plateforme) : état global (réglages, dernier succès,
// dernier échec) et historique des exécutions, les plus récentes d'abord.
export const useBackupStore = defineStore('backups', {
  state: () => ({
    status: null,
    runs: [],
    loading: false,
    launching: false,
  }),
  actions: {
    /**
     * Charge l'état des sauvegardes et leur historique.
     *
     * @param {{ silent?: boolean }} [options] - silent : sans indicateur de chargement ni notification (rafraîchissement automatique)
     * @returns {Promise<boolean>} true si les données sont chargées.
     */
    async fetchBackups({ silent = false } = {}) {
      if (!silent) this.loading = true
      try {
        const resp = await api.get('backups', { limit: 30 })
        if (resp?.status !== 200) {
          if (!silent) notif.notify(resp?.data?.message || 'Erreur lors du chargement des sauvegardes.', 'error')
          return false
        }
        this.status = resp.data.data.status
        this.runs = resp.data.data.runs
        return true
      } catch (error) {
        if (!silent) notif.notify(`Une erreur est survenue : ${error}`, 'error')
        return false
      } finally {
        this.loading = false
      }
    },

    /**
     * Lance une sauvegarde manuelle (le dump s'exécute côté serveur ; l'avancement se lit via fetchBackups).
     *
     * @returns {Promise<boolean>} true si la sauvegarde est lancée.
     */
    async launchBackup() {
      this.launching = true
      try {
        const resp = await api.post('backups')
        if (resp?.status !== 201) {
          notif.notify(resp?.data?.message || 'Erreur lors du lancement de la sauvegarde.', 'error')
          return false
        }
        notif.notify('Sauvegarde lancée.', 'success')
        await this.fetchBackups({ silent: true })
        return true
      } catch (error) {
        notif.notify(`Une erreur est survenue : ${error}`, 'error')
        return false
      } finally {
        this.launching = false
      }
    },
  },
})

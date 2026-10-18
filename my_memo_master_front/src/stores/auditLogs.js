import { defineStore } from 'pinia'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'

// Journal d'audit global de la plateforme (réservé à l'administrateur plateforme). L'API renvoie au plus
// les 500 entrées les plus récentes ; seuls le type d'entité, l'identifiant d'entité et l'auteur se filtrent
// côté serveur (l'action se filtre côté page, sur ces entrées).
export const useAuditLogStore = defineStore('auditLogs', {
  state: () => ({
    logs: [],
    loading: false,
  }),
  actions: {
    /**
     * Charge les entrées du journal.
     *
     * @param {{ entityType?: string, entityId?: (number|string), actorId?: (number|string) }} [filters] - Filtres ; un filtre vide est ignoré.
     * @returns {Promise<boolean>} true si le journal est chargé.
     */
    async fetchLogs({ entityType, entityId, actorId } = {}) {
      const params = {}
      if (entityType) params.entityType = entityType
      if (entityId !== undefined && entityId !== null && entityId !== '') params.entityId = entityId
      if (actorId !== undefined && actorId !== null && actorId !== '') params.actorId = actorId
      this.loading = true
      try {
        const resp = await api.get('audit-logs', params)
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors du chargement du journal.', 'error')
          return false
        }
        this.logs = resp.data.data
        return true
      } catch (error) {
        notif.notify(`Une erreur est survenue : ${error}`, 'error')
        return false
      } finally {
        this.loading = false
      }
    },
  },
})

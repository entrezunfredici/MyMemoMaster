import { defineStore } from 'pinia'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'

// Journal d'audit global de la plateforme (réservé à l'administrateur plateforme). L'API renvoie les entrées
// les plus récentes d'abord (500 au plus) et filtre par type d'entité, identifiant d'entité, auteur et action.
export const useAuditLogStore = defineStore('auditLogs', {
  state: () => ({
    logs: [],
    loading: false,
  }),
  actions: {
    /**
     * Charge les entrées du journal.
     *
     * @param {{ entityType?: string, entityId?: (number|string), actorId?: (number|string), action?: string, limit?: (number|string) }} [filters] - Filtres ; un filtre vide est ignoré.
     * @returns {Promise<boolean>} true si le journal est chargé.
     */
    async fetchLogs({ entityType, entityId, actorId, action, limit } = {}) {
      const params = {}
      if (entityType) params.entityType = entityType
      if (entityId !== undefined && entityId !== null && entityId !== '') params.entityId = entityId
      if (actorId !== undefined && actorId !== null && actorId !== '') params.actorId = actorId
      if (action?.trim()) params.action = action.trim()
      if (limit !== undefined && limit !== null && limit !== '') params.limit = limit
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

import { defineStore } from 'pinia'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'

export const useEtablissementStore = defineStore('etablissement', {
  state: () => ({
    list: [],
    current: null,
    stats: null,
    audit: [],
    content: null,
    loading: false,
  }),

  actions: {
    async fetchAll() {
      this.loading = true
      try {
        const resp = await api.get('etablissements')
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors du chargement des établissements.', 'error')
          return false
        }
        this.list = resp.data.data
        return true
      } finally {
        this.loading = false
      }
    },

    async fetchMine() {
      const resp = await api.get('etablissements/mine')
      if (resp?.status !== 200) {
        notif.notify(resp?.data?.message || 'Aucun établissement associé à ce compte.', 'error')
        return false
      }
      this.current = resp.data.data
      return resp.data.data
    },

    async fetchOne(id) {
      const resp = await api.get(`etablissements/${id}`)
      if (resp?.status !== 200) {
        notif.notify(resp?.data?.message || 'Établissement introuvable.', 'error')
        return false
      }
      this.current = resp.data.data
      return resp.data.data
    },

    async createEtab(data) {
      const resp = await api.post('etablissements', data)
      if (resp?.status !== 201) {
        notif.notify(resp?.data?.message || "Erreur lors de la création.", 'error')
        return false
      }
      this.list.push(resp.data.data)
      notif.notify('Établissement créé.', 'success')
      return resp.data.data
    },

    async updateEtab(id, data) {
      const resp = await api.put(`etablissements/${id}`, data)
      if (resp?.status !== 200) {
        notif.notify(resp?.data?.message || "Erreur lors de la mise à jour.", 'error')
        return false
      }
      const idx = this.list.findIndex((e) => e.id === id)
      if (idx !== -1) this.list[idx] = resp.data.data
      if (this.current?.id === id) this.current = resp.data.data
      notif.notify('Établissement mis à jour.', 'success')
      return true
    },

    async deleteEtab(id) {
      const resp = await api.del(`etablissements/${id}`)
      if (resp?.status !== 200) {
        notif.notify(resp?.data?.message || "Erreur lors de la suppression.", 'error')
        return false
      }
      this.list = this.list.filter((e) => e.id !== id)
      if (this.current?.id === id) { this.current = null; this.stats = null; this.audit = []; this.content = null }
      notif.notify('Établissement supprimé.', 'success')
      return true
    },

    async fetchStats(id) {
      const resp = await api.get(`etablissements/${id}/stats`)
      if (resp?.status !== 200) {
        notif.notify(resp?.data?.message || 'Erreur lors du chargement des statistiques.', 'error')
        return false
      }
      this.stats = resp.data.data
      return true
    },

    async fetchAudit(id, filters = {}) {
      const params = {}
      if (filters.action) params.action = filters.action
      if (filters.entityType) params.entityType = filters.entityType
      if (filters.limit) params.limit = filters.limit
      const resp = await api.get(`etablissements/${id}/audit`, params)
      if (resp?.status !== 200) {
        notif.notify(resp?.data?.message || 'Erreur lors du chargement du journal.', 'error')
        return false
      }
      this.audit = resp.data.data
      return true
    },

    async fetchContent(id) {
      const resp = await api.get(`etablissements/${id}/content`)
      if (resp?.status !== 200) {
        notif.notify(resp?.data?.message || 'Erreur lors du chargement du contenu.', 'error')
        return false
      }
      this.content = resp.data.data
      return true
    },

    async deleteContent(etablissementId, contentType, contentId) {
      const resp = await api.del(`etablissements/${etablissementId}/content/${contentType}/${contentId}`)
      if (resp?.status !== 200) {
        notif.notify(resp?.data?.message || 'Erreur lors de la suppression.', 'error')
        return false
      }
      if (this.content) {
        if (contentType === 'resource') {
          this.content.resources = this.content.resources.filter((r) => r.id !== contentId)
        } else {
          this.content.sections = this.content.sections.filter((s) => s.id !== contentId)
        }
      }
      notif.notify('Contenu supprimé.', 'success')
      return true
    },

    async assignAdmin(etablissementId, email) {
      const resp = await api.post(`etablissements/${etablissementId}/assign-admin`, { email })
      if (resp?.status !== 200) {
        notif.notify(resp?.data?.message || "Erreur lors de l'assignation du gérant.", 'error')
        return false
      }
      const data = resp.data.data
      // Mise à jour locale uniquement si assignation directe (sinon pas de données etab à jour)
      if (data.directlyAssigned && data.etab) {
        const idx = this.list.findIndex((e) => e.id === etablissementId)
        if (idx !== -1) this.list[idx] = data.etab
        if (this.current?.id === etablissementId) this.current = data.etab
      }
      notif.notify(resp.data.message, data.directlyAssigned ? 'success' : 'info')
      return data
    },

    async activateUser(userId) {
      const resp = await api.patch(`users/${userId}/activate`)
      if (resp?.status !== 200) {
        notif.notify(resp?.data?.message || "Erreur lors de l'activation.", 'error')
        return false
      }
      notif.notify('Compte activé.', 'success')
      return true
    },

    async deactivateUser(userId) {
      const resp = await api.patch(`users/${userId}/deactivate`)
      if (resp?.status !== 200) {
        notif.notify(resp?.data?.message || 'Erreur lors de la désactivation.', 'error')
        return false
      }
      notif.notify('Compte désactivé.', 'success')
      return true
    },
  },
})

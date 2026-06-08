import { defineStore } from 'pinia'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'

export const useLeitnerSystemStore = defineStore('leitnerSystems', {
  state: () => ({
    system: {},
    systems: []
  }),

  actions: {
    async fetchSystems() {
      try {
        const resp = await api.get('leitnersystems')
        if (resp.status !== 200) {
          notif.notify(resp.data?.message || 'Erreur lors du chargement des systèmes.', 'error')
          return false
        }
        this.systems = resp.data
        return true
      } catch (err) {
        notif.notify('Erreur lors du chargement des systèmes.', 'error')
        return false
      }
    },

    async fetchSystemById(id) {
      try {
        const resp = await api.get(`leitnersystems/${id}`)
        if (resp.status !== 200) {
          notif.notify(resp.data?.message || 'Système introuvable.', 'error')
          return false
        }
        this.system = resp.data
        return true
      } catch (err) {
        notif.notify('Erreur lors de la récupération du système.', 'error')
        return false
      }
    },

    async fetchSystemsBySubject(subjectId) {
      try {
        const resp = await api.get(`leitnersystems/bySubjects/${subjectId}`)
        if (resp.status !== 200) {
          notif.notify(resp.data?.message || 'Aucun système trouvé pour ce sujet.', 'error')
          return false
        }
        this.systems = resp.data
        return true
      } catch (err) {
        notif.notify('Erreur lors de la récupération des systèmes par sujet.', 'error')
        return false
      }
    },

    async createSystem() {
      try {
        const resp = await api.post('leitnersystems', this.system)
        if (resp.status !== 201) {
          notif.notify(resp.data?.message || 'Erreur lors de la création.', 'error')
          return false
        }
        this.system = resp.data
        notif.notify('Système Leitner créé avec succès.', 'success')
        this.fetchSystems()
        return true
      } catch (err) {
        notif.notify('Erreur lors de la création du système.', 'error')
        return false
      }
    },

    async updateSystem(id) {
      try {
        const resp = await api.put(`leitnersystems/${id}`, this.system)
        if (resp.status !== 200) {
          notif.notify(resp.data?.message || 'Erreur lors de la mise à jour.', 'error')
          return false
        }
        notif.notify('Système Leitner mis à jour avec succès.', 'success')
        this.fetchSystems()
        return true
      } catch (err) {
        notif.notify('Erreur lors de la mise à jour du système.', 'error')
        return false
      }
    },

    async shareSystem(payload) {
      try {
        const resp = await api.post('leitnersystems/share', payload)
        if (resp.status !== 200) {
          notif.notify(resp.data?.message || 'Erreur lors du partage.', 'error')
          return false
        }
        notif.notify('Système partagé avec succès.', 'success')
        return true
      } catch (err) {
        notif.notify('Erreur lors du partage du système.', 'error')
        return false
      }
    },

    async deleteSystem(id) {
      try {
        const resp = await api.del(`leitnersystems/${id}`)
        if (resp.status !== 200) {
          notif.notify(resp.data?.message || 'Erreur lors de la suppression.', 'error')
          return false
        }
        notif.notify('Système Leitner supprimé avec succès.', 'success')
        this.fetchSystems()
        return true
      } catch (err) {
        notif.notify('Erreur lors de la suppression du système.', 'error')
        return false
      }
    }
  }
})

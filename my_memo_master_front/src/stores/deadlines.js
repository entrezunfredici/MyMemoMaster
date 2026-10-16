import { defineStore } from 'pinia'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'

export const useDeadlineStore = defineStore('deadlines', {
  state: () => ({
    deadlines: [],
    deadline: null,
    groupDeadlines: [],
    testDeadlines: [],
    _currentGroupId: null,
    _cache: {}, // { [groupId]: timestamp } — TTL 5 min, valide uniquement pour le groupe actif
  }),

  actions: {
    async fetchByGroup(groupId, force = false) {
      const TTL = 5 * 60 * 1000
      if (!force && this._currentGroupId === groupId && this._cache[groupId] && Date.now() - this._cache[groupId] < TTL) return true
      try {
        const resp = await api.get(`class-groups/${groupId}/deadlines`)
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors du chargement des échéances.', 'error')
          return false
        }
        this.groupDeadlines = resp.data.data
        this._currentGroupId = groupId
        this._cache[groupId] = Date.now()
        return true
      } catch {
        notif.notify('Erreur lors du chargement des échéances.', 'error')
        return false
      }
    },

    async fetchByTest(testId) {
      try {
        const resp = await api.get(`tests/${testId}/deadlines`)
        if (resp?.status !== 200) return false
        this.testDeadlines = resp.data.data
        return true
      } catch {
        return false
      }
    },

    async fetchDeadlines() {
      try {
        const resp = await api.get('deadlines')
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors du chargement des échéances.', 'error')
          return false
        }
        this.deadlines = resp.data.data
        return true
      } catch {
        notif.notify('Erreur lors du chargement des échéances.', 'error')
        return false
      }
    },

    async fetchDeadlineById(id) {
      try {
        const resp = await api.get(`deadlines/${id}`)
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Échéance introuvable.', 'error')
          return false
        }
        this.deadline = resp.data.data
        return true
      } catch {
        notif.notify("Erreur lors de la récupération de l'échéance.", 'error')
        return false
      }
    },

    async createDeadline(payload) {
      try {
        const resp = await api.post('deadlines', payload)
        if (resp?.status !== 201) {
          notif.notify(resp?.data?.message || 'Erreur lors de la création.', 'error')
          return false
        }
        this.deadlines.push(resp.data.data)
        this._cache = {} // invalide le cache — la vue appellera fetchByGroup ensuite
        notif.notify('Échéance créée.', 'success')
        return true
      } catch {
        notif.notify('Erreur lors de la création.', 'error')
        return false
      }
    },

    async updateDeadline(id, payload) {
      try {
        const resp = await api.put(`deadlines/${id}`, payload)
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors de la mise à jour.', 'error')
          return false
        }
        const idx = this.deadlines.findIndex((d) => d.id === id)
        if (idx !== -1) this.deadlines[idx] = resp.data.data
        notif.notify('Échéance mise à jour.', 'success')
        return true
      } catch {
        notif.notify('Erreur lors de la mise à jour.', 'error')
        return false
      }
    },

    async deleteDeadline(id) {
      try {
        const resp = await api.del(`deadlines/${id}`)
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors de la suppression.', 'error')
          return false
        }
        this.deadlines = this.deadlines.filter((d) => d.id !== id)
        this._cache = {} // invalide le cache — la vue appellera fetchByGroup ensuite
        notif.notify('Échéance supprimée.', 'success')
        return true
      } catch {
        notif.notify('Erreur lors de la suppression.', 'error')
        return false
      }
    },
  },
})

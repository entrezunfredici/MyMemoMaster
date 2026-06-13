import { defineStore } from 'pinia'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'

export const useRevisionSessionStore = defineStore('revisionSessions', {
  state: () => ({
    sessions: [],
    todaySessions: [],
    session: null,
  }),

  actions: {
    async fetchSessions() {
      try {
        const resp = await api.get('revision-sessions')
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors du chargement des séances.', 'error')
          return false
        }
        this.sessions = resp.data.data
        return true
      } catch {
        notif.notify('Erreur lors du chargement des séances.', 'error')
        return false
      }
    },

    async fetchTodaySessions() {
      try {
        const resp = await api.get('revision-sessions/today')
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors du chargement des séances du jour.', 'error')
          return false
        }
        this.todaySessions = resp.data.data
        return true
      } catch {
        notif.notify('Erreur lors du chargement des séances du jour.', 'error')
        return false
      }
    },

    async fetchSessionById(id) {
      try {
        const resp = await api.get(`revision-sessions/${id}`)
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Séance introuvable.', 'error')
          return false
        }
        this.session = resp.data.data
        return true
      } catch {
        notif.notify('Erreur lors de la récupération de la séance.', 'error')
        return false
      }
    },

    async createSession(payload) {
      try {
        const resp = await api.post('revision-sessions', payload)
        if (resp?.status !== 201) {
          notif.notify(resp?.data?.message || 'Erreur lors de la création.', 'error')
          return false
        }
        this.sessions.push(resp.data.data)
        notif.notify('Séance créée.', 'success')
        return true
      } catch {
        notif.notify('Erreur lors de la création.', 'error')
        return false
      }
    },

    async updateSession(id, payload) {
      try {
        const resp = await api.put(`revision-sessions/${id}`, payload)
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors de la mise à jour.', 'error')
          return false
        }
        const idx = this.sessions.findIndex((s) => s.id === id)
        if (idx !== -1) this.sessions[idx] = resp.data.data
        notif.notify('Séance mise à jour.', 'success')
        return true
      } catch {
        notif.notify('Erreur lors de la mise à jour.', 'error')
        return false
      }
    },

    async markDone(id, isDone) {
      try {
        const resp = await api.put(`revision-sessions/${id}/done`, { isDone })
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors de la mise à jour.', 'error')
          return false
        }
        const updated = resp.data.data
        const applyUpdate = (list) => {
          const idx = list.findIndex((s) => s.id === id)
          if (idx !== -1) list[idx] = updated
        }
        applyUpdate(this.sessions)
        applyUpdate(this.todaySessions)
        return true
      } catch {
        notif.notify('Erreur lors de la mise à jour.', 'error')
        return false
      }
    },

    async deleteSession(id) {
      try {
        const resp = await api.del(`revision-sessions/${id}`)
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors de la suppression.', 'error')
          return false
        }
        this.sessions = this.sessions.filter((s) => s.id !== id)
        this.todaySessions = this.todaySessions.filter((s) => s.id !== id)
        notif.notify('Séance supprimée.', 'success')
        return true
      } catch {
        notif.notify('Erreur lors de la suppression.', 'error')
        return false
      }
    },
  },
})

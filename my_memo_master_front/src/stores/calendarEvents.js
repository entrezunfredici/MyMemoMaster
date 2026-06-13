import { defineStore } from 'pinia'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'

export const useCalendarEventStore = defineStore('calendarEvents', {
  state: () => ({
    events: [],
    event: null,
  }),

  actions: {
    async fetchEvents() {
      try {
        const resp = await api.get('calendar-events')
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors du chargement des événements.', 'error')
          return false
        }
        this.events = resp.data.data
        return true
      } catch {
        notif.notify('Erreur lors du chargement des événements.', 'error')
        return false
      }
    },

    async fetchEventById(id) {
      try {
        const resp = await api.get(`calendar-events/${id}`)
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Événement introuvable.', 'error')
          return false
        }
        this.event = resp.data.data
        return true
      } catch {
        notif.notify("Erreur lors de la récupération de l'événement.", 'error')
        return false
      }
    },

    async createEvent(payload) {
      try {
        const resp = await api.post('calendar-events', payload)
        if (resp?.status !== 201) {
          notif.notify(resp?.data?.message || 'Erreur lors de la création.', 'error')
          return false
        }
        this.events.push(resp.data.data)
        notif.notify('Événement créé.', 'success')
        return true
      } catch {
        notif.notify('Erreur lors de la création.', 'error')
        return false
      }
    },

    async updateEvent(id, payload) {
      try {
        const resp = await api.put(`calendar-events/${id}`, payload)
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors de la mise à jour.', 'error')
          return false
        }
        const idx = this.events.findIndex((e) => e.id === id)
        if (idx !== -1) this.events[idx] = resp.data.data
        notif.notify('Événement mis à jour.', 'success')
        return true
      } catch {
        notif.notify('Erreur lors de la mise à jour.', 'error')
        return false
      }
    },

    async deleteEvent(id) {
      try {
        const resp = await api.del(`calendar-events/${id}`)
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors de la suppression.', 'error')
          return false
        }
        this.events = this.events.filter((e) => e.id !== id)
        notif.notify('Événement supprimé.', 'success')
        return true
      } catch {
        notif.notify('Erreur lors de la suppression.', 'error')
        return false
      }
    },

    async addOccurrence(id, payload) {
      try {
        const resp = await api.post(`calendar-events/${id}/occurrences`, payload)
        if (resp?.status !== 201) {
          notif.notify(resp?.data?.message || "Erreur lors de l'ajout de l'occurrence.", 'error')
          return false
        }
        await this.fetchEventById(id)
        const idx = this.events.findIndex((e) => e.id === id)
        if (idx !== -1 && this.event) this.events[idx] = this.event
        notif.notify('Occurrence ajoutée.', 'success')
        return true
      } catch {
        notif.notify("Erreur lors de l'ajout de l'occurrence.", 'error')
        return false
      }
    },

    async deleteOccurrence(occurrenceId) {
      try {
        const resp = await api.del(`calendar-events/occurrences/${occurrenceId}`)
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || "Erreur lors de la suppression de l'occurrence.", 'error')
          return false
        }
        this.events = this.events.map((ev) => ({
          ...ev,
          occurrences: ev.occurrences?.filter((o) => o.id !== occurrenceId) ?? [],
        }))
        notif.notify('Occurrence supprimée.', 'success')
        return true
      } catch {
        notif.notify("Erreur lors de la suppression de l'occurrence.", 'error')
        return false
      }
    },
  },
})

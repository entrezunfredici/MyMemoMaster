import { defineStore } from 'pinia'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'

export const useReminderStore = defineStore('reminders', {
  state: () => ({
    reminder: {
      entityType: 'deadline',
      entityId: null,
      delayMinutes: 1440,
      message: '',
    },
    reminders: [],
  }),

  getters: {
    pendingReminders: (state) => state.reminders.filter((r) => r.status === 'pending'),
    remindersByEntity: (state) => (entityType, entityId) =>
      state.reminders.filter(
        (r) => r.entityType === entityType && r.entityId === entityId
      ),
  },

  actions: {
    async fetchReminders() {
      try {
        const resp = await api.get('reminders')
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors du chargement des rappels.', 'error')
          return false
        }
        this.reminders = resp.data.data
        return true
      } catch {
        notif.notify('Erreur lors du chargement des rappels.', 'error')
        return false
      }
    },

    async fetchReminderById(id) {
      try {
        const resp = await api.get(`reminders/${id}`)
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Rappel introuvable.', 'error')
          return false
        }
        this.reminder = resp.data.data
        return true
      } catch {
        notif.notify('Erreur lors de la récupération du rappel.', 'error')
        return false
      }
    },

    async createReminder(payload) {
      try {
        const resp = await api.post('reminders', payload)
        if (resp?.status !== 201) {
          notif.notify(resp?.data?.message || 'Erreur lors de la création du rappel.', 'error')
          return false
        }
        this.reminders.push(resp.data.data)
        notif.notify('Rappel créé avec succès.', 'success')
        return true
      } catch {
        notif.notify('Erreur lors de la création du rappel.', 'error')
        return false
      }
    },

    async updateReminder(id, payload) {
      try {
        const resp = await api.put(`reminders/${id}`, payload)
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors de la mise à jour du rappel.', 'error')
          return false
        }
        const idx = this.reminders.findIndex((r) => r.id === id)
        if (idx !== -1) this.reminders[idx] = resp.data.data
        notif.notify('Rappel mis à jour avec succès.', 'success')
        return true
      } catch {
        notif.notify('Erreur lors de la mise à jour du rappel.', 'error')
        return false
      }
    },

    async deleteReminder(id) {
      try {
        const resp = await api.del(`reminders/${id}`)
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors de la suppression du rappel.', 'error')
          return false
        }
        this.reminders = this.reminders.filter((r) => r.id !== id)
        notif.notify('Rappel supprimé.', 'success')
        return true
      } catch {
        notif.notify('Erreur lors de la suppression du rappel.', 'error')
        return false
      }
    },

    resetForm() {
      this.reminder = {
        entityType: 'deadline',
        entityId: null,
        delayMinutes: 1440,
        message: '',
      }
    },
  },
})

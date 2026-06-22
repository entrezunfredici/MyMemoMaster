import { defineStore } from 'pinia'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'

export const useInvitationStore = defineStore('invitations', {
  state: () => ({
    mine: [],
    groupInvitations: []
  }),

  actions: {
    async fetchMine() {
      try {
        const resp = await api.get('invitations/mine')
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors du chargement des invitations.', 'error')
          return false
        }
        this.mine = resp.data.data
        return true
      } catch {
        notif.notify('Erreur lors du chargement des invitations.', 'error')
        return false
      }
    },

    async fetchByGroup(groupId) {
      try {
        const resp = await api.get(`class-groups/${groupId}/invitations`)
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors du chargement des invitations du groupe.', 'error')
          return false
        }
        this.groupInvitations = resp.data.data
        return true
      } catch {
        notif.notify('Erreur lors du chargement des invitations du groupe.', 'error')
        return false
      }
    },

    async invite(groupId, payload) {
      try {
        const resp = await api.post(`class-groups/${groupId}/invitations`, payload)
        if (resp?.status !== 201) {
          notif.notify(resp?.data?.message || "Erreur lors de l'envoi de l'invitation.", 'error')
          return false
        }
        this.groupInvitations.unshift(resp.data.data)
        notif.notify('Invitation envoyée.', 'success')
        return true
      } catch {
        notif.notify("Erreur lors de l'envoi de l'invitation.", 'error')
        return false
      }
    },

    async respond(invitationId, status) {
      try {
        const resp = await api.put(`invitations/${invitationId}`, { status })
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || "Erreur lors de la réponse à l'invitation.", 'error')
          return false
        }
        this.mine = this.mine.filter((inv) => inv.id !== invitationId)
        const msg = status === 'accepted' ? 'Invitation acceptée.' : 'Invitation déclinée.'
        notif.notify(msg, 'success')
        return true
      } catch {
        notif.notify("Erreur lors de la réponse à l'invitation.", 'error')
        return false
      }
    }
  }
})

import { defineStore } from 'pinia'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'

export const useClassGroupStore = defineStore('classGroups', {
  state: () => ({
    groups: [],
    group: null,
  }),

  actions: {
    async fetchGroups() {
      try {
        const resp = await api.get('class-groups')
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors du chargement des groupes.', 'error')
          return false
        }
        this.groups = resp.data.data
        return true
      } catch {
        notif.notify('Erreur lors du chargement des groupes.', 'error')
        return false
      }
    },

    async fetchGroupById(id) {
      try {
        const resp = await api.get(`class-groups/${id}`)
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Groupe introuvable.', 'error')
          return false
        }
        this.group = resp.data.data
        return true
      } catch {
        notif.notify('Erreur lors de la récupération du groupe.', 'error')
        return false
      }
    },

    async createGroup(payload) {
      try {
        const resp = await api.post('class-groups', payload)
        if (resp?.status !== 201) {
          notif.notify(resp?.data?.message || 'Erreur lors de la création.', 'error')
          return false
        }
        this.groups.push(resp.data.data)
        notif.notify('Groupe créé.', 'success')
        return true
      } catch {
        notif.notify('Erreur lors de la création.', 'error')
        return false
      }
    },

    async updateGroup(id, payload) {
      try {
        const resp = await api.put(`class-groups/${id}`, payload)
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors de la mise à jour.', 'error')
          return false
        }
        const idx = this.groups.findIndex((g) => g.id === id)
        if (idx !== -1) this.groups[idx] = resp.data.data
        notif.notify('Groupe mis à jour.', 'success')
        return true
      } catch {
        notif.notify('Erreur lors de la mise à jour.', 'error')
        return false
      }
    },

    async deleteGroup(id) {
      try {
        const resp = await api.del(`class-groups/${id}`)
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors de la suppression.', 'error')
          return false
        }
        this.groups = this.groups.filter((g) => g.id !== id)
        notif.notify('Groupe supprimé.', 'success')
        return true
      } catch {
        notif.notify('Erreur lors de la suppression.', 'error')
        return false
      }
    },

    async addMember(id, userId) {
      try {
        const resp = await api.post(`class-groups/${id}/members`, { userId })
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || "Erreur lors de l'ajout du membre.", 'error')
          return false
        }
        await this.fetchGroupById(id)
        const idx = this.groups.findIndex((g) => g.id === id)
        if (idx !== -1 && this.group) this.groups[idx] = this.group
        notif.notify('Membre ajouté.', 'success')
        return true
      } catch {
        notif.notify("Erreur lors de l'ajout du membre.", 'error')
        return false
      }
    },

    async removeMember(id, userId) {
      try {
        const resp = await api.del(`class-groups/${id}/members/${userId}`)
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors de la suppression du membre.', 'error')
          return false
        }
        await this.fetchGroupById(id)
        const idx = this.groups.findIndex((g) => g.id === id)
        if (idx !== -1 && this.group) this.groups[idx] = this.group
        notif.notify('Membre retiré.', 'success')
        return true
      } catch {
        notif.notify('Erreur lors de la suppression du membre.', 'error')
        return false
      }
    },
  },
})

import { defineStore } from 'pinia'
import { notif } from '@/helpers/notif.js'
import { api } from '@/helpers/api'

// Chaque action renvoie `true` en cas de succès et `false` sinon (après avoir notifié l'erreur), comme les
// autres stores. BUG CORRIGÉ: les `return` se trouvaient dans des callbacks `.then`, donc l'action elle-même
// ne renvoyait rien (`undefined`) : un appelant ne pouvait pas savoir si l'opération avait réussi.
export const useRoleStore = defineStore('roles', {
  state: () => ({
    role: {},
    roles: [],
  }),
  actions: {
    async fetchRoles() {
      try {
        const resp = await api.get('roles')
        if (resp.status !== 200) {
          notif.notify(resp.data?.message || 'Erreur lors du chargement.', 'error')
          return false
        }
        this.roles = resp.data
        return true
      } catch (error) {
        notif.notify(`Une erreur est survenue : ${error}`, 'error')
        return false
      }
    },

    async fetchRoleById(id) {
      try {
        const resp = await api.get(`roles/${id}`)
        if (resp.status !== 200) {
          notif.notify(resp.data?.message || 'Rôle introuvable.', 'error')
          return false
        }
        this.role = resp.data
        return true
      } catch (error) {
        notif.notify(`Une erreur est survenue : ${error}`, 'error')
        return false
      }
    },

    async addRole() {
      try {
        const resp = await api.post('roles', this.role)
        if (resp.status !== 201) {
          notif.notify(resp.data?.message || 'Erreur lors de la création.', 'error')
          return false
        }
        notif.notify('Rôle créé avec succès.', 'success')
        return true
      } catch (error) {
        notif.notify(`Une erreur est survenue : ${error}`, 'error')
        return false
      }
    },

    async updateRole(id) {
      try {
        const resp = await api.put(`roles/${id}`, this.role)
        if (resp.status !== 200) {
          notif.notify(resp.data?.message || 'Erreur lors de la mise à jour.', 'error')
          return false
        }
        notif.notify('Rôle mis à jour avec succès.', 'success')
        return true
      } catch (error) {
        notif.notify(`Une erreur est survenue : ${error}`, 'error')
        return false
      }
    },

    async deleteRole(id) {
      try {
        const resp = await api.del(`roles/${id}`, this.role)
        // api.del retourne undefined quand le serveur répond 204 (no content) : toute valeur est une erreur
        if (resp !== undefined) {
          notif.notify(resp.data?.message || 'Erreur lors de la suppression.', 'error')
          return false
        }
        notif.notify('Rôle supprimé avec succès.', 'success')
        return true
      } catch (error) {
        notif.notify(`Une erreur est survenue : ${error}`, 'error')
        return false
      }
    },
  },
})

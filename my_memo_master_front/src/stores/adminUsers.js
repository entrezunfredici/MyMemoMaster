import { defineStore } from 'pinia'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'

// Comptes vus par l'administrateur plateforme (rôle 1) : recherche paginée et gestion du rôle d'un compte.
// Chaque action renvoie `true` en cas de succès et `false` sinon (après avoir notifié l'erreur).
export const useAdminUserStore = defineStore('adminUsers', {
  state: () => ({
    users: [],
    total: 0,
    page: 1,
    limit: 20,
    loading: false,
  }),
  getters: {
    pageCount: (state) => Math.max(1, Math.ceil(state.total / state.limit)),
  },
  actions: {
    /**
     * Charge une page de comptes.
     *
     * @param {{ search?: string, roleId?: (number|string), page?: number }} [filters] - Filtres ; un filtre vide est ignoré.
     * @returns {Promise<boolean>} true si la page est chargée.
     */
    async search({ search, roleId, page = 1 } = {}) {
      const params = { page }
      if (search?.trim()) params.search = search.trim()
      if (roleId !== undefined && roleId !== null && roleId !== '') params.roleId = roleId
      this.loading = true
      try {
        const resp = await api.get('users', params)
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors du chargement des comptes.', 'error')
          return false
        }
        const { users, total, page: current, limit } = resp.data.data
        Object.assign(this, { users, total, page: current, limit })
        return true
      } catch (error) {
        notif.notify(`Une erreur est survenue : ${error}`, 'error')
        return false
      } finally {
        this.loading = false
      }
    },

    /**
     * Attribue un rôle à un compte.
     *
     * @param {number} userId - Compte concerné
     * @param {number} roleId - Rôle à attribuer
     * @returns {Promise<boolean>} true si le rôle est attribué.
     */
    async setRole(userId, roleId) {
      try {
        const resp = await api.put(`users/${userId}/role`, { roleId })
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors de la mise à jour du rôle.', 'error')
          return false
        }
        const user = this.users.find((item) => item.userId === userId)
        if (user) user.roleId = roleId
        notif.notify('Rôle mis à jour.', 'success')
        return true
      } catch (error) {
        notif.notify(`Une erreur est survenue : ${error}`, 'error')
        return false
      }
    },

    /**
     * Retire son rôle à un compte.
     *
     * @param {number} userId - Compte concerné
     * @returns {Promise<boolean>} true si le rôle est retiré.
     */
    async removeRole(userId) {
      try {
        const resp = await api.del(`users/${userId}/role`)
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors du retrait du rôle.', 'error')
          return false
        }
        const user = this.users.find((item) => item.userId === userId)
        if (user) user.roleId = null
        notif.notify('Rôle retiré.', 'success')
        return true
      } catch (error) {
        notif.notify(`Une erreur est survenue : ${error}`, 'error')
        return false
      }
    },
  },
})

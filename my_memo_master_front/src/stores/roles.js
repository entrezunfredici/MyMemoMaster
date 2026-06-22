import { defineStore } from 'pinia'
import { notif } from '@/helpers/notif.js'
import { api } from '@/helpers/api'

export const useRoleStore = defineStore('roles', {
    state: () => ({
        role: {},
        roles: []
    }),
    actions: {
        async fetchRoles() {
            await api.get(`roles`).then(resp => {
                if (resp.status !== 200) {
                    notif.notify(resp.data?.message || 'Erreur lors du chargement.', 'error')
                    return false
                }

                this.roles = resp.data
                return true
            }).catch(error => {
                notif.notify(`Une erreur est survenue : ${error}`, 'error')
                return false
            })
        },
        async fetchRoleById(id) {
            await api.get(`roles/${id}`).then(resp => {
                if (resp.status !== 200) {
                    notif.notify(resp.data?.message || 'Rôle introuvable.', 'error');
                    return false;
                }
                this.role = resp.data;
                return true;
            }).catch(error => {
                notif.notify(`Une erreur est survenue : ${error}`, 'error')
                return false
            })
        },
        async addRole() {
            const rolePayload = this.role
            await api.post(`roles`, rolePayload).then(resp => {
                if (resp.status !== 201) {
                    notif.notify(resp.data?.message || 'Erreur lors de la création.', 'error')
                    return false
                }
                notif.notify('Rôle créé avec succès.', 'success')
                return true
            }).catch(error => {
                notif.notify(`Une erreur est survenue : ${error}`, 'error')
                return false
            })
        },
        async updateRole(id) {
            const rolePayload = this.role
            await api.put(`roles/${id}`, rolePayload).then(resp => {
                if (resp.status !== 200) {
                    notif.notify(resp.data?.message || 'Erreur lors de la mise à jour.', 'error')
                    return false
                }
                notif.notify('Rôle mis à jour avec succès.', 'success')
                return true
            }).catch(error => {
                notif.notify(`Une erreur est survenue : ${error}`, 'error')
                return false
            })
        },
        async deleteRole(id) {
            const rolePayload = this.role
            await api.del(`roles/${id}`, rolePayload).then(resp => {
                // api.del retourne undefined quand le serveur répond 204 (no content)
                if (resp !== undefined) {
                    notif.notify(resp.data?.message || 'Erreur lors de la suppression.', 'error')
                    return false
                }
                notif.notify('Rôle supprimé avec succès.', 'success')
                return true
            }).catch(error => {
                notif.notify(`Une erreur est survenue : ${error}`, 'error')
                return false
            })
        },
    },
},
)
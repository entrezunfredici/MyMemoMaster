import { defineStore } from 'pinia'
import { notif } from '@/helpers/notif.js'
import router from '@/router'
import { api } from '@/helpers/api'

export const useRoleStore = defineStore('role', {
    state: () => ({
        role: {},
        roles: []
    }),
    actions: {
        async fetchRoles() {
            await api.get(`roles/all`).then(resp => {

                if (resp.status !== 200) {
                  notif.notify(resp.data.message, 'error')
                  return false
                }
        
                this.roles = resp.data.data
                return true
            }).catch(error => {
                notif.notify(`An error occured: ${error}`, 'error')
                return false
            })
        },
        async fetchRoleById(id) {
            await api.get(`roles/${id}`).then(resp => {
                if (resp.status !== 200) {
                    notif.notify(resp.data.message, 'error');
                    return false;
                }
                this.role = resp.data.data;
                return true;
            }).catch(error => {
                notif.notify(`An error occured: ${error}`, 'error')
                return false
            })
        },
        async addRole() {
            const rolePayload = this.role
            await api.post(`roles/add`, rolePayload).then(resp => {
                if (resp.status !== 201) {
                    notif.notify(resp.data.message, 'error')
                    return false
                }
                notif.notify('Role has been added', 'success')
                return true
            }).catch(error => {
                notif.notify(`An error occured: ${error}`, 'error')
                return false
            })
        },
        async updateRole(id) {
            const rolePayload = this.role
            await api.put(`roles/${id}`, rolePayload).then(resp => {
                if (resp.status === 'error') {
                    notif.notify(resp.data.message, 'error')
                    return false
                }
                notif.notify('Role has been updated', 'success')
                return true
            }).catch(error => {
                notif.notify(`An error occured: ${error}`, 'error')
                return false
            })
        },
        async deleteRole(id) {
            const rolePayload = this.role
            await api.del(`roles/${id}`, rolePayload).then(resp => {
                if (resp.status === 'error') {
                    notif.notify(resp.data.message, 'error')
                    return false
                }
                notif.notify('Role has been deleted', 'success')
                return true
            }).catch(error => {
                notif.notify(`An error occured: ${error}`, 'error')
                return false
            })
        },
    },
},
)
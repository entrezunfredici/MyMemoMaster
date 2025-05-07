import { defineStore } from 'pinia'
import { notif } from '@/helpers/notif.js'
import { api } from '@/helpers/api'

export const useDiagrammeStore = defineStore('diagrammes', {
    state: () => ({
        diagramme: {},
        diagrammes: []
    }),
    actions: {
        async fetchDiagrammes() {
            await api.get(`diagrammes/all`).then(resp => {
                if (resp.status !== 200) {
                    notif.notify(resp.data.message, 'error')
                    return false
                }

                this.diagrammes = resp.data
                return true
            }).catch(error => {
                notif.notify(`An error occured: ${error}`, 'error')
                return false
            })
        },
        async fetchDiagrammeById(id) {
            await api.get(`diagrammes/${id}`).then(resp => {
                if (resp.status !== 200) {
                    notif.notify(resp.data.message, 'error');
                    return false;
                }
                this.diagramme = resp.data;
                return true;
            }).catch(error => {
                notif.notify(`An error occured: ${error}`, 'error')
                return false
            })
        },
        async addDiagramme() {
            const diagrammePayload = this.diagramme
            await api.post(`diagrammes/add`, diagrammePayload).then(resp => {
                if (resp.status !== 201) {
                    notif.notify(resp.data.message, 'error')
                    return false
                }
                notif.notify('Diagramme has been added', 'success')
                return true
            }).catch(error => {
                notif.notify(`An error occured: ${error}`, 'error')
                return false
            })
        },
        async updateDiagramme(id) {
            const diagrammePayload = this.diagramme
            await api.put(`diagrammes/${id}`, diagrammePayload).then(resp => {
                if (resp.status === 200) {
                    notif.notify(resp.data.message, 'error')
                    return false
                }
                notif.notify('Diagramme has been updated', 'success')
                return true
            }).catch(error => {
                notif.notify(`An error occured: ${error}`, 'error')
                return false
            })
        },
        async deleteDiagramme(id) {
            const diagrammePayload = this.diagramme
            await api.del(`diagrammes/${id}`, diagrammePayload).then(resp => {
                if (resp.status === 204) {
                    notif.notify(resp.data.message, 'error')
                    return false
                }
                notif.notify('Diagramme has been deleted', 'success')
                return true
            }).catch(error => {
                notif.notify(`An error occured: ${error}`, 'error')
                return false
            })
        },
    },
},
)
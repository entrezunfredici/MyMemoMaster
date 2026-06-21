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
            await api.get(`diagrammes`).then(resp => {
                if (resp.status !== 200) {
                    notif.notify(resp.data?.message || 'Erreur lors du chargement.', 'error')
                    return false
                }

                this.diagrammes = resp.data
                return true
            }).catch(error => {
                notif.notify(`Une erreur est survenue : ${error}`, 'error')
                return false
            })
        },
        async fetchDiagrammeById(id) {
            await api.get(`diagrammes/${id}`).then(resp => {
                if (resp.status !== 200) {
                    notif.notify(resp.data?.message || 'Diagramme introuvable.', 'error');
                    return false;
                }
                this.diagramme = resp.data;
                return true;
            }).catch(error => {
                notif.notify(`Une erreur est survenue : ${error}`, 'error')
                return false
            })
        },
        async addDiagramme() {
            const diagrammePayload = this.diagramme
            await api.post(`diagrammes`, diagrammePayload).then(resp => {
                if (resp.status !== 201) {
                    notif.notify(resp.data?.message || 'Erreur lors de la création.', 'error')
                    return false
                }
                notif.notify('Diagramme créé avec succès.', 'success')
                return true
            }).catch(error => {
                notif.notify(`Une erreur est survenue : ${error}`, 'error')
                return false
            })
        },
        async updateDiagramme(id) {
            const diagrammePayload = this.diagramme
            await api.put(`diagrammes/${id}`, diagrammePayload).then(resp => {
                if (resp.status !== 200) {
                    notif.notify(resp.data?.message || 'Erreur lors de la mise à jour.', 'error')
                    return false
                }
                notif.notify('Diagramme mis à jour avec succès.', 'success')
                return true
            }).catch(error => {
                notif.notify(`Une erreur est survenue : ${error}`, 'error')
                return false
            })
        },
        async deleteDiagramme(id) {
            const diagrammePayload = this.diagramme
            await api.del(`diagrammes/${id}`, diagrammePayload).then(resp => {
                // api.del retourne undefined quand le serveur répond 204 (no content)
                if (resp !== undefined) {
                    notif.notify(resp.data?.message || 'Erreur lors de la suppression.', 'error')
                    return false
                }
                notif.notify('Diagramme supprimé avec succès.', 'success')
                return true
            }).catch(error => {
                notif.notify(`Une erreur est survenue : ${error}`, 'error')
                return false
            })
        },
    },
},
)
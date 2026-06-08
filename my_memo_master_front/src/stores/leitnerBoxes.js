import { defineStore } from 'pinia'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'

export const useLeitnerBoxStore = defineStore('leitnerBoxes', {
  state: () => ({
    box: {},
    boxes: []
  }),

  actions: {
    async fetchBoxes() {
      try {
        const resp = await api.get('leitnerboxes')
        if (resp.status !== 200) {
          notif.notify(resp.data?.message || 'Erreur lors du chargement des boîtes.', 'error')
          return false
        }
        this.boxes = resp.data
        return true
      } catch (err) {
        notif.notify('Erreur lors du chargement des boîtes.', 'error')
        return false
      }
    },

    async fetchBoxById(id) {
      try {
        const resp = await api.get(`leitnerboxes/${id}`)
        if (resp.status !== 200) {
          notif.notify(resp.data?.message || 'Boîte introuvable.', 'error')
          return false
        }
        this.box = resp.data
        return true
      } catch (err) {
        notif.notify('Erreur lors de la récupération de la boîte.', 'error')
        return false
      }
    },

    async createBox() {
      try {
        const resp = await api.post('leitnerboxes', this.box)
        if (resp.status !== 201) {
          notif.notify(resp.data?.message || 'Erreur lors de la création.', 'error')
          return false
        }
        this.box = resp.data
        notif.notify('Boîte créée avec succès.', 'success')
        this.fetchBoxes()
        return true
      } catch (err) {
        notif.notify('Erreur lors de la création de la boîte.', 'error')
        return false
      }
    },

    async updateBox(id) {
      try {
        const resp = await api.put(`leitnerboxes/${id}`, this.box)
        if (resp.status !== 200) {
          notif.notify(resp.data?.message || 'Erreur lors de la mise à jour.', 'error')
          return false
        }
        notif.notify('Boîte mise à jour avec succès.', 'success')
        this.fetchBoxes()
        return true
      } catch (err) {
        notif.notify('Erreur lors de la mise à jour de la boîte.', 'error')
        return false
      }
    },

    async deleteBox(id) {
      try {
        const resp = await api.del(`leitnerboxes/${id}`)
        if (resp.status !== 200) {
          notif.notify(resp.data?.message || 'Erreur lors de la suppression.', 'error')
          return false
        }
        notif.notify('Boîte supprimée avec succès.', 'success')
        this.fetchBoxes()
        return true
      } catch (err) {
        notif.notify('Erreur lors de la suppression de la boîte.', 'error')
        return false
      }
    }
  }
})

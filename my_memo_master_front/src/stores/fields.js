import { defineStore } from 'pinia'
import { notif } from '@/helpers/notif.js'
import { api } from '@/helpers/api'

export const useFieldStore = defineStore('fields', {
  state: () => ({
    field: {
      fieldletter: '',
      idType: null,
      data: null,
    },
    fields: [],
  }),
  actions: {
    async fetchFields() {
      try {
        const resp = await api.get('fields')
        if (resp.status !== 200) {
          notif.notify(resp.data?.message || 'Erreur lors du chargement des champs.', 'error')
          return false
        }
        this.fields = resp.data
        return true
      } catch (error) {
        notif.notify(`Une erreur est survenue : ${error}`, 'error')
        return false
      }
    },

    async fetchFieldById(id) {
      try {
        const resp = await api.get(`fields/${id}`)
        if (resp.status !== 200) {
          notif.notify(resp.data?.message || 'Champ introuvable.', 'error')
          return false
        }
        this.field = resp.data
        return true
      } catch (error) {
        notif.notify(`Une erreur est survenue : ${error}`, 'error')
        return false
      }
    },

    async createField() {
      try {
        const resp = await api.post('fields', this.field)
        if (resp.status !== 201) {
          notif.notify(resp.data?.message || 'Erreur lors de la création.', 'error')
          return false
        }
        notif.notify('Champ créé avec succès.', 'success')
        return true
      } catch (error) {
        notif.notify(`Une erreur est survenue : ${error}`, 'error')
        return false
      }
    },

    async updateField(id) {
      try {
        const resp = await api.put(`fields/${id}`, this.field)
        if (resp.status !== 200) {
          notif.notify(resp.data?.message || 'Erreur lors de la mise à jour.', 'error')
          return false
        }
        notif.notify('Champ mis à jour avec succès.', 'success')
        return true
      } catch (error) {
        notif.notify(`Une erreur est survenue : ${error}`, 'error')
        return false
      }
    },

    async deleteField(id) {
      try {
        const resp = await api.del(`fields/${id}`)
        if (resp.status !== 204) {
          notif.notify(resp.data?.message || 'Erreur lors de la suppression.', 'error')
          return false
        }
        notif.notify('Champ supprimé avec succès.', 'success')
        return true
      } catch (error) {
        notif.notify(`Une erreur est survenue : ${error}`, 'error')
        return false
      }
    },
  },
})

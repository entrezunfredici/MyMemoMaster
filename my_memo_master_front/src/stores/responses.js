import { defineStore } from 'pinia'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'

export const useResponseStore = defineStore('responses', {
  state: () => ({
    responses: [],
    response: {
      content: '',
      correction: false,
      questionId: null,
    },
    correction: null
  }),

  actions: {
    async fetchAllResponsesByQuestion(questionId) {
      try {
        const resp = await api.get(`responses/all/${questionId}`)
        if (resp.status !== 200) {
          notif.notify(resp.data.message, 'error')
          return false
        }
        this.responses = resp.data
        return true
      } catch (error) {
        notif.notify(`Erreur récupération réponses : ${error}`, 'error')
        return false
      }
    },

    async fetchCorrectionByQuestion(questionId) {
      try {
        const resp = await api.get(`responses/correction/${questionId}`)
        if (resp.status !== 200) {
          notif.notify(resp.data.message, 'error')
          return false
        }
        this.correction = resp.data
        return true
      } catch (error) {
        notif.notify(`Erreur récupération correction : ${error}`, 'error')
        return false
      }
    },

    async fetchResponse(id) {
      try {
        const resp = await api.get(`responses/${id}`)
        if (resp.status !== 200) {
          notif.notify(resp.data.message, 'error')
          return false
        }
        this.response = resp.data
        return true
      } catch (error) {
        notif.notify(`Erreur récupération réponse : ${error}`, 'error')
        return false
      }
    },

    async createResponse() {
      try {
        const resp = await api.post('responses/add', this.response)
        if (resp.status !== 201) {
          notif.notify(resp.data.message, 'error')
          return false
        }
        notif.notify('Réponse créée avec succès', 'success')
        return true
      } catch (error) {
        notif.notify(`Erreur création réponse : ${error}`, 'error')
        return false
      }
    },

    async updateResponse(id) {
      try {
        const resp = await api.put(`responses/edit/${id}`, this.response)
        if (resp.status !== 200) {
          notif.notify(resp.data.message, 'error')
          return false
        }
        notif.notify('Réponse mise à jour', 'success')
        return true
      } catch (error) {
        notif.notify(`Erreur mise à jour réponse : ${error}`, 'error')
        return false
      }
    },

    async deleteResponse(id) {
      try {
        const resp = await api.del(`responses/${id}`)
        if (resp.status !== 204) {
          notif.notify(resp.data.message, 'error')
          return false
        }
        notif.notify('Réponse supprimée', 'success')
        return true
      } catch (error) {
        notif.notify(`Erreur suppression réponse : ${error}`, 'error')
        return false
      }
    }
  }
})

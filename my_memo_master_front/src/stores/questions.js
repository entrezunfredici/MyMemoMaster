import { defineStore } from 'pinia'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'

export const useQuestionStore = defineStore('questions', {
  state: () => ({
    question: {
      statement: '',
      questionPosition: null,
      type: '',
      idTest: null,
      idCard: null,
    },
    questions: [],
  }),

  actions: {
    async fetchAllQuestions() {
      try {
        const resp = await api.get('questions/all')
        if (resp.status !== 200) {
          notif.notify(resp.data.message, 'error')
          return false
        }
        this.questions = resp.data
        return true
      } catch (error) {
        notif.notify(`Erreur récupération questions : ${error}`, 'error')
        return false
      }
    },

    async fetchQuestionsByTest(testId) {
      try {
        const resp = await api.get(`questions/tests/${testId}`)
        if (resp.status !== 200) {
          notif.notify(resp.data.message, 'error')
          return false
        }
        this.questions = resp.data
        return true
      } catch (error) {
        notif.notify(`Erreur récupération questions du test : ${error}`, 'error')
        return false
      }
    },

    async fetchQuestion(id) {
      try {
        const resp = await api.get(`questions/${id}`)
        if (resp.status !== 200) {
          notif.notify(resp.data.message, 'error')
          return false
        }
        this.question = resp.data
        return true
      } catch (error) {
        notif.notify(`Erreur récupération question : ${error}`, 'error')
        return false
      }
    },

    async createQuestion() {
      try {
        const resp = await api.post('questions/add', this.question)
        if (resp.status !== 201) {
          notif.notify(resp.data.message, 'error')
          return false
        }
        notif.notify('Question créée avec succès', 'success')
        return true
      } catch (error) {
        notif.notify(`Erreur création question : ${error}`, 'error')
        return false
      }
    },

    async updateQuestion(id) {
      try {
        const resp = await api.put(`questions/edit/${id}`, this.question)
        if (resp.status !== 200) {
          notif.notify(resp.data.message, 'error')
          return false
        }
        notif.notify('Question mise à jour', 'success')
        return true
      } catch (error) {
        notif.notify(`Erreur mise à jour question : ${error}`, 'error')
        return false
      }
    },

    async deleteQuestion(id) {
      try {
        const resp = await api.del(`questions/${id}`)
        if (resp.status !== 204) {
          notif.notify(resp.data.message, 'error')
          return false
        }
        notif.notify('Question supprimée', 'success')
        return true
      } catch (error) {
        notif.notify(`Erreur suppression question : ${error}`, 'error')
        return false
      }
    },
  },
})

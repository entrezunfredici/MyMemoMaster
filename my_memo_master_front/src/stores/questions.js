import { defineStore } from 'pinia'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'

export const useQuestionStore = defineStore('questions', {
  state: () => ({
    question: {
      statement: '',
      questionPosition: null,
      type: 'open',
      content: null,
      idTest: null,
      idCard: null,
      imageUrl: null,
      imageKey: null,
      imageMimeType: null,
      imageOriginalName: null,
      imageSize: null,
    },
    questions: [],
    uploading: false,
  }),

  actions: {
    async fetchAllQuestions() {
      try {
        const resp = await api.get('questions')
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
        const resp = await api.post('questions', this.question)
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

    // Upload une image/schéma via le stockage générique (POST /storage/upload, voir
    // stores/classGroupResources.js#uploadAndCreate, même pattern) puis renvoie les champs à
    // rattacher à une question (create/update) — ne mute pas `this.question` directement : l'appelant
    // (formulaire de création/édition) décide où placer ces champs sur son propre brouillon.
    async uploadImage(file) {
      this.uploading = true
      try {
        const form = new FormData()
        form.append('file', file)
        const resp = await api.post('storage/upload', form)
        if (resp?.status !== 201) {
          notif.notify(resp?.data?.message || "Erreur lors de l'upload de l'image.", 'error')
          return false
        }
        const { url, key, mimetype, size } = resp.data
        return {
          imageUrl: url,
          imageKey: key,
          imageMimeType: mimetype,
          imageOriginalName: file.name,
          imageSize: size,
        }
      } catch (error) {
        notif.notify(`Erreur lors de l'upload de l'image : ${error}`, 'error')
        return false
      } finally {
        this.uploading = false
      }
    },

    // Retire l'image d'une question déjà persistée (supprime aussi l'objet de stockage côté API).
    // Pour une question pas encore créée, l'appelant efface simplement les champs de son brouillon
    // local — inutile d'appeler l'API.
    async removeImage(id) {
      try {
        const resp = await api.del(`questions/${id}/image`)
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || "Erreur lors de la suppression de l'image.", 'error')
          return false
        }
        notif.notify('Image supprimée', 'success')
        return true
      } catch (error) {
        notif.notify(`Erreur lors de la suppression de l'image : ${error}`, 'error')
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

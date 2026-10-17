import { defineStore } from 'pinia'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'

export const useSubjectStore = defineStore('subjects', {
  state: () => ({
    subject: {},
    subjects: []
  }),

  actions: {
    async fetchSubjects() {
      try {
        const resp = await api.get('subjects')
        if (resp.status !== 200) {
          notif.notify(resp.data.message, 'error')
          return false
        }
        this.subjects = resp.data
        return true
      } catch (error) {
        notif.notify(`Erreur lors de la récupération des sujets : ${error}`, 'error')
        return false
      }
    },

    async fetchSubjectById(id) {
      try {
        const resp = await api.get(`subjects/${id}`)
        if (resp.status !== 200) {
          notif.notify(resp.data.message, 'error')
          return false
        }
        this.subject = resp.data
        return true
      } catch (error) {
        notif.notify(`Erreur lors de la récupération du sujet : ${error}`, 'error')
        return false
      }
    },

    // Création à partir d'un simple nom (sélecteur de sujet) : renvoie le sujet créé, ou `false` après
    // avoir notifié l'erreur. Ne passe pas par `this.subject` (état du formulaire d'édition) ni ne
    // recharge la liste : l'appelant décide.
    async createSubject(name) {
      try {
        const resp = await api.post('subjects', { name })
        if (!resp || resp.status !== 201) {
          notif.notify(resp?.data?.message || 'Erreur lors de la création du sujet.', 'error')
          return false
        }
        return resp.data
      } catch {
        notif.notify('Erreur lors de la création du sujet.', 'error')
        return false
      }
    },

    async addSubject() {
      try {
        const resp = await api.post('subjects', this.subject)
        if (resp.status !== 201) {
          notif.notify(resp.data.message, 'error')
          return false
        }
        notif.notify('Sujet créé avec succès', 'success')
        return true
      } catch (error) {
        notif.notify(`Erreur lors de la création du sujet : ${error}`, 'error')
        return false
      }
    },

    async updateSubject(id) {
      try {
        const resp = await api.put(`subjects/${id}`, this.subject)
        if (resp.status !== 200) {
          notif.notify(resp.data.message, 'error')
          return false
        }
        notif.notify('Sujet mis à jour avec succès', 'success')
        return true
      } catch (error) {
        notif.notify(`Erreur lors de la mise à jour du sujet : ${error}`, 'error')
        return false
      }
    },

    async deleteSubject(id) {
      try {
        const resp = await api.del(`subjects/${id}`)
        if (resp.status !== 200) {
          notif.notify(resp.data.message, 'error')
          return false
        }
        notif.notify('Sujet supprimé avec succès', 'success')
        return true
      } catch (error) {
        notif.notify(`Erreur lors de la suppression du sujet : ${error}`, 'error')
        return false
      }
    }
  }
})

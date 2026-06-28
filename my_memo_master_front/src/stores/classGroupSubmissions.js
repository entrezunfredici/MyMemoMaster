import { defineStore } from 'pinia'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'

export const useClassGroupSubmissionStore = defineStore('classGroupSubmissions', {
  state: () => ({
    // Map sectionId → submission (own, vue étudiant)
    mySubmissions: {},
    // Map sectionId → Submission[] (tous, vue enseignant)
    sectionSubmissions: {},
    // Map sectionId → { submitted: [], notSubmitted: [] } (enseignant)
    submissionStatus: {},
    // Map sectionId → boolean (chargement en cours)
    loadingSection: {},
    uploading: false,
  }),

  actions: {
    async fetchStatus(groupId, sectionId) {
      try {
        const resp = await api.get(`class-groups/${groupId}/sections/${sectionId}/submissions/status`)
        if (resp?.status !== 200) return false
        this.submissionStatus[sectionId] = resp.data.data
        return true
      } catch {
        return false
      }
    },

    clearSubmissionStatus() {
      this.submissionStatus = {}
    },

    async fetchMine(groupId, sectionId) {
      try {
        const resp = await api.get(`class-groups/${groupId}/sections/${sectionId}/submissions`)
        if (resp?.status !== 200) return false
        const list = resp.data.data
        this.mySubmissions[sectionId] = list.length ? list[0] : null
        return true
      } catch {
        return false
      }
    },

    async fetchBySection(groupId, sectionId) {
      this.loadingSection[sectionId] = true
      try {
        const resp = await api.get(`class-groups/${groupId}/sections/${sectionId}/submissions`)
        if (resp?.status !== 200) {
          this.sectionSubmissions[sectionId] = []
          return false
        }
        this.sectionSubmissions[sectionId] = resp.data.data
        return true
      } catch {
        this.sectionSubmissions[sectionId] = []
        return false
      } finally {
        delete this.loadingSection[sectionId]
      }
    },

    clearSectionSubmissions() {
      this.sectionSubmissions = {}
      this.loadingSection = {}
    },

    async uploadAndSubmit(groupId, sectionId, file) {
      this.uploading = true
      try {
        const form = new FormData()
        form.append('file', file)
        const uploadResp = await api.post('storage/upload', form)
        if (uploadResp?.status !== 201) {
          notif.notify(uploadResp?.data?.message || "Erreur lors de l'upload.", 'error')
          return false
        }
        const { url, key, mimetype, size } = uploadResp.data
        const submitResp = await api.post(`class-groups/${groupId}/sections/${sectionId}/submissions`, {
          url,
          fileKey: key,
          mimeType: mimetype,
          originalName: file.name,
          fileSize: size,
        })
        if (submitResp?.status !== 200) {
          notif.notify(submitResp?.data?.message || 'Erreur lors de la soumission.', 'error')
          return false
        }
        this.mySubmissions[sectionId] = submitResp.data.data
        notif.notify('Rendu soumis avec succès.', 'success')
        return true
      } catch {
        notif.notify('Erreur lors de la soumission du rendu.', 'error')
        return false
      } finally {
        this.uploading = false
      }
    },

    async deleteSubmission(groupId, sectionId, submissionId) {
      try {
        const resp = await api.del(`class-groups/${groupId}/sections/${sectionId}/submissions/${submissionId}`)
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors de la suppression.', 'error')
          return false
        }
        this.mySubmissions[sectionId] = null
        if (this.sectionSubmissions[sectionId]) {
          this.sectionSubmissions[sectionId] = this.sectionSubmissions[sectionId].filter(
            (s) => s.id !== submissionId
          )
        }
        notif.notify('Soumission retirée.', 'success')
        return true
      } catch {
        notif.notify('Erreur lors de la suppression.', 'error')
        return false
      }
    },
  },
})

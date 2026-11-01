import { defineStore } from 'pinia'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'

export const useContentReportStore = defineStore('contentReports', {
  state: () => ({
    submitting: false,
  }),

  actions: {
    /**
     * Signale un contenu (ressource ou section d'un groupe classe) à la modération.
     *
     * @param {{contentType: 'resource'|'section', contentId: number, reason: string, comment?: string}} report
     * @returns {Promise<boolean>} true si le signalement est enregistré
     */
    async submit({ contentType, contentId, reason, comment }) {
      this.submitting = true
      try {
        const body = { contentType, contentId, reason }
        const text = (comment || '').trim()
        if (text) body.comment = text
        const resp = await api.post('content-reports', body)
        if (resp?.status !== 201) {
          // 409 (déjà signalé) et 429 (limite atteinte) portent un message de l'API déjà lisible
          const level = [409, 429].includes(resp?.status) ? 'warning' : 'error'
          notif.notify(resp?.data?.message || "Erreur lors de l'envoi du signalement.", level)
          return false
        }
        notif.notify('Signalement envoyé. Merci, il sera examiné par la modération.', 'success')
        return true
      } finally {
        this.submitting = false
      }
    },
  },
})

import { defineStore } from 'pinia'
import { badgesApi } from '@/helpers/badgesApi'
import { notif } from '@/helpers/notif'

const TTL = 60 * 1000

export const useBadgesStore = defineStore('badges', {
  state: () => ({
    badges: [],
    summary: null,
    loading: false,
    error: false,
    _fetchedAt: 0,
  }),

  getters: {
    unseenCodes: (state) => state.badges.filter((badge) => badge.earned && !badge.seenAt).map((badge) => badge.code),
  },

  actions: {
    /**
     * Charge catalogue et résumé en parallèle. Cache court (60 s) pour les cartes de synthèse
     * (profil, accueil) qui le partagent avec la page complète.
     *
     * @param {boolean} [force=false] - ignorer le cache
     * @returns {Promise<boolean>} true si les données sont à jour
     */
    async fetchAll(force = false) {
      if (!force && this._fetchedAt && Date.now() - this._fetchedAt < TTL) return true
      this.loading = true
      this.error = false
      try {
        const [listResp, summaryResp] = await Promise.all([badgesApi.list(), badgesApi.summary()])
        if (listResp?.status !== 200 || summaryResp?.status !== 200) {
          this.error = true
          return false
        }
        this.badges = listResp.data
        this.summary = summaryResp.data
        this._fetchedAt = Date.now()
        return true
      } catch {
        this.error = true
        return false
      } finally {
        this.loading = false
      }
    },

    /**
     * Marque comme vus les badges obtenus non encore vus (pastille « Nouveau »).
     * Une erreur est notifiée mais n'efface pas l'affichage courant.
     *
     * @returns {Promise<boolean>}
     */
    async markAllSeen() {
      const codes = this.unseenCodes
      if (codes.length === 0) return true
      try {
        const resp = await badgesApi.markSeen(codes)
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors de la mise à jour des badges.', 'error')
          return false
        }
        const now = new Date().toISOString()
        this.badges = this.badges.map((badge) => (codes.includes(badge.code) ? { ...badge, seenAt: now } : badge))
        return true
      } catch {
        notif.notify('Erreur lors de la mise à jour des badges.', 'error')
        return false
      }
    },
  },
})

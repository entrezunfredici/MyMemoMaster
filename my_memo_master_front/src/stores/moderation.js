import { defineStore } from 'pinia'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'

// Action de modération → route de l'API (PATCH /content-reports/:id/<route>) et message de succès.
const ACTIONS = {
  claim: { route: 'claim', success: 'Signalement pris en charge.' },
  dismiss: { route: 'dismiss', success: 'Signalement rejeté.' },
  hide: { route: 'hide', success: 'Contenu masqué pour 30 jours au maximum.' },
  restore: { route: 'restore', success: 'Contenu rétabli.' },
  remove: { route: 'remove-content', success: 'Contenu supprimé définitivement.' },
  suspend: { route: 'suspend-author', success: "Compte de l'auteur suspendu." },
}

// File de traitement des signalements (rôles 1, 4 et 5) : une ligne par contenu signalé, regroupant ses signalements.
export const useModerationStore = defineStore('moderation', {
  state: () => ({
    items: [],
    total: 0,
    page: 1,
    limit: 20,
    loading: false,
    detail: null,
    detailLoading: false,
    acting: false,
  }),

  getters: {
    pageCount: (state) => Math.max(1, Math.ceil(state.total / state.limit)),
  },

  actions: {
    /**
     * Charge la file de traitement. Sans statut, l'API renvoie les dossiers ouverts.
     *
     * @param {{status?: string, reason?: string, contentType?: string, page?: number, limit?: number}} [filters] - Un filtre vide est ignoré
     * @returns {Promise<boolean>} true si la file est chargée
     */
    async fetchQueue({ status, reason, contentType, page = 1, limit = 20 } = {}) {
      const params = { page, limit }
      if (status) params.status = status
      if (reason) params.reason = reason
      if (contentType) params.contentType = contentType
      this.loading = true
      try {
        const resp = await api.get('content-reports', params)
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors du chargement de la file de traitement.', 'error')
          return false
        }
        const data = resp.data.data
        this.items = data.items
        this.total = data.total
        this.page = data.page
        this.limit = data.limit
        return true
      } finally {
        this.loading = false
      }
    },

    /**
     * Charge le détail d'un dossier : signalements, contenu actuel et état du compte de l'auteur.
     *
     * @param {number} id - Identifiant d'un des signalements du contenu
     * @returns {Promise<boolean>} true si le détail est chargé
     */
    async fetchDetail(id) {
      this.detailLoading = true
      try {
        const resp = await api.get(`content-reports/${id}`)
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || 'Erreur lors du chargement du signalement.', 'error')
          this.detail = null
          return false
        }
        this.detail = resp.data.data
        return true
      } finally {
        this.detailLoading = false
      }
    },

    /**
     * Applique une action de modération à un dossier.
     *
     * @param {number} id - Identifiant d'un des signalements du contenu
     * @param {'claim'|'dismiss'|'hide'|'restore'|'remove'|'suspend'} action
     * @param {string} [decisionNote] - Motif de la décision (obligatoire sauf pour claim et restore)
     * @returns {Promise<boolean>} true si l'action est appliquée
     */
    async act(id, action, decisionNote) {
      const spec = ACTIONS[action]
      if (!spec) return false
      this.acting = true
      try {
        const body = ['claim', 'restore'].includes(action) ? {} : { decisionNote: (decisionNote || '').trim() }
        const resp = await api.patch(`content-reports/${id}/${spec.route}`, body)
        if (resp?.status !== 200) {
          // 409 (dossier déjà traité) : message de l'API déjà lisible, signalé comme avertissement
          const level = resp?.status === 409 ? 'warning' : 'error'
          notif.notify(resp?.data?.message || "Erreur lors de l'action de modération.", level)
          return false
        }
        notif.notify(spec.success, 'success')
        return true
      } finally {
        this.acting = false
      }
    },
  },
})

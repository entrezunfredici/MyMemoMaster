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
    // Titre, vitrine, calendrier et réglages : chargés à part (la page fonctionne sans eux)
    profile: { titleCode: null, showcaseCodes: [] },
    profileLoaded: false,
    activity: null,
    settings: null,
    settingsPending: false,
    _settingsFetchedAt: 0,
  }),

  getters: {
    unseenCodes: (state) => state.badges.filter((badge) => badge.earned && !badge.seenAt).map((badge) => badge.code),
    // Mode zen : masque badges, séries et objectifs partout (profil, accueil, KPI, page des badges)
    zen: (state) => state.settings?.zenMode === true,
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

    /**
     * Charge les réglages (cache court, partagé par les cartes du profil, de l'accueil et de la page KPI).
     * Un échec laisse `settings` à null : l'affichage normal est conservé.
     *
     * @param {boolean} [force=false]
     * @returns {Promise<boolean>}
     */
    async fetchSettings(force = false) {
      if (!force && this._settingsFetchedAt && Date.now() - this._settingsFetchedAt < TTL) return true
      this.settingsPending = !this.settings
      try {
        const resp = await badgesApi.settings()
        if (resp?.status !== 200) return false
        this.settings = resp.data
        this._settingsFetchedAt = Date.now()
        return true
      } catch {
        return false
      } finally {
        this.settingsPending = false
      }
    },

    /** @returns {Promise<boolean>} */
    async fetchProfile() {
      try {
        const resp = await badgesApi.profile()
        if (resp?.status !== 200) return false
        this.profile = { titleCode: resp.data.titleCode ?? null, showcaseCodes: resp.data.showcaseCodes ?? [] }
        this.profileLoaded = true
        return true
      } catch {
        return false
      }
    },

    /**
     * @param {number} [weeks=12]
     * @returns {Promise<boolean>}
     */
    async fetchActivity(weeks = 12) {
      try {
        const resp = await badgesApi.activity(weeks)
        if (resp?.status !== 200) return false
        this.activity = resp.data
        return true
      } catch {
        return false
      }
    },

    /**
     * Charge profil, calendrier et réglages en parallèle (page des badges).
     *
     * @param {boolean} [force=false]
     * @returns {Promise<boolean>} false si au moins un des trois a échoué
     */
    async fetchExtras(force = false) {
      const results = await Promise.all([this.fetchProfile(), this.fetchActivity(), this.fetchSettings(force)])
      return results.every(Boolean)
    },

    /**
     * Enregistre titre et/ou vitrine. En cas d'erreur, l'état affiché est conservé et un toast explique.
     *
     * @param {{ titleCode?: string|null, showcaseCodes?: string[] }} data
     * @returns {Promise<boolean>}
     */
    async saveProfile(data) {
      try {
        const resp = await badgesApi.saveProfile(data)
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || "Erreur lors de l'enregistrement.", 'error')
          return false
        }
        this.profile = { titleCode: resp.data.titleCode ?? null, showcaseCodes: resp.data.showcaseCodes ?? [] }
        notif.notify('Enregistré.', 'success')
        return true
      } catch {
        notif.notify("Erreur lors de l'enregistrement.", 'error')
        return false
      }
    },

    /**
     * Modifie une partie des réglages (enregistrés à l'action, avec confirmation par toast).
     *
     * @param {object} patch - ex. { zenMode: true }
     * @returns {Promise<boolean>}
     */
    async updateSettings(patch) {
      try {
        const resp = await badgesApi.updateSettings(patch)
        if (resp?.status !== 200) {
          notif.notify(resp?.data?.message || "Erreur lors de l'enregistrement du réglage.", 'error')
          return false
        }
        // La réponse mêle `message` et les réglages : on ne garde que les réglages
        this.settings = Object.fromEntries(Object.entries(resp.data).filter(([key]) => key !== 'message'))
        this._settingsFetchedAt = Date.now()
        notif.notify('Réglage enregistré.', 'success')
        return true
      } catch {
        notif.notify("Erreur lors de l'enregistrement du réglage.", 'error')
        return false
      }
    },
  },
})

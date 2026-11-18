import { defineStore } from 'pinia'
import { badgesApi } from '@/helpers/badgesApi'
import { notif } from '@/helpers/notif'

const TTL = 60 * 1000

// CHOIX: compteur de « session » capturé au début de chaque requête et comparé à la réponse
// RAISON: une réponse arrivée après un changement de compte (déconnexion → connexion d'un autre utilisateur)
// ne doit jamais remplir le store du nouveau compte avec les données de l'ancien.
let generation = 0

// Fuseau IANA du navigateur (« Europe/Paris »), ou null s'il n'est pas disponible.
function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null
  } catch {
    return null
  }
}

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
    // Objectif quotidien (anneau de l'accueil) et badges à fêter (modale d'obtention)
    dailyGoal: null,
    celebrations: [],
    _celebrationsCheckedAt: 0,
    // Série affichée dans l'en-tête (flamme) : { current, best, practicedToday, freezes }
    streak: null,
    _streakFetchedAt: 0,
    // Défi du jour (A4) : null tant que non chargé
    dailyChallenge: null,
    // Niveau par matière (B1) : null tant que non chargé ; chargé à part, la page fonctionne sans
    subjectLevels: null,
    subjectLevelsError: false,
    // Fuseau du navigateur déjà enregistré pour ce compte (évite de le renvoyer à chaque page)
    _timezoneSynced: null,
  }),

  getters: {
    unseenCodes: (state) => state.badges.filter((badge) => badge.earned && !badge.seenAt).map((badge) => badge.code),
    // Mode zen : masque badges, séries et objectifs partout (profil, accueil, KPI, page des badges)
    zen: (state) => state.settings?.zenMode === true,
    // Animation d'obtention autorisée : réglage actif et mode zen coupé (le mode zen coupe toute sollicitation)
    celebrationsAllowed: (state) => state.settings?.animationsEnabled !== false && state.settings?.zenMode !== true,
  },

  actions: {
    /**
     * Vide tout l'état et invalide les requêtes en cours : à appeler quand le compte connecté change
     * (déconnexion). Sans cela, le cache de 60 s montrerait au compte suivant les badges, le titre et
     * le mode zen du précédent.
     */
    reset() {
      generation += 1
      this.$reset()
    },

    /**
     * Charge catalogue et résumé en parallèle. Cache court (60 s) pour les cartes de synthèse
     * (profil, accueil) qui le partagent avec la page complète.
     *
     * @param {boolean} [force=false] - ignorer le cache
     * @returns {Promise<boolean>} true si les données sont à jour
     */
    async fetchAll(force = false) {
      if (!force && this._fetchedAt && Date.now() - this._fetchedAt < TTL) return true
      const gen = generation
      this.loading = true
      this.error = false
      try {
        const [listResp, summaryResp] = await Promise.all([badgesApi.list(), badgesApi.summary()])
        if (gen !== generation) return false
        if (listResp?.status !== 200 || summaryResp?.status !== 200) {
          this.error = true
          return false
        }
        this.badges = listResp.data
        this.summary = summaryResp.data
        this._fetchedAt = Date.now()
        return true
      } catch {
        if (gen === generation) this.error = true
        return false
      } finally {
        if (gen === generation) this.loading = false
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
      const gen = generation
      try {
        const resp = await badgesApi.markSeen(codes)
        if (gen !== generation) return false
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
      const gen = generation
      this.settingsPending = !this.settings
      try {
        const resp = await badgesApi.settings()
        if (gen !== generation) return false
        if (resp?.status !== 200) return false
        this.settings = resp.data
        this._settingsFetchedAt = Date.now()
        return true
      } catch {
        return false
      } finally {
        if (gen === generation) this.settingsPending = false
      }
    },

    /** @returns {Promise<boolean>} */
    async fetchProfile() {
      const gen = generation
      try {
        const resp = await badgesApi.profile()
        if (gen !== generation) return false
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
      const gen = generation
      try {
        const resp = await badgesApi.activity(weeks)
        if (gen !== generation) return false
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
     * Charge la progression de l'objectif quotidien. Un échec laisse l'anneau masqué.
     *
     * @returns {Promise<boolean>}
     */
    async fetchDailyGoal() {
      const gen = generation
      try {
        const resp = await badgesApi.dailyGoal()
        if (gen !== generation) return false
        if (resp?.status !== 200) return false
        this.dailyGoal = resp.data
        return true
      } catch {
        return false
      }
    },

    /**
     * Charge la série en cours (flamme de l'en-tête). Cache court ; un échec laisse la flamme masquée.
     *
     * @param {boolean} [force=false]
     * @returns {Promise<boolean>}
     */
    async fetchStreak(force = false) {
      if (!force && this._streakFetchedAt && Date.now() - this._streakFetchedAt < TTL) return true
      const gen = generation
      try {
        const resp = await badgesApi.summary()
        if (gen !== generation) return false
        if (resp?.status !== 200) return false
        this.streak = {
          current: resp.data.streakCurrent ?? 0,
          best: resp.data.streakBest ?? 0,
          practicedToday: Boolean(resp.data.practicedToday),
          freezes: resp.data.freezes?.available ?? 0,
        }
        this._streakFetchedAt = Date.now()
        return true
      } catch {
        return false
      }
    },

    /**
     * Charge le défi du jour (matière délaissée à réviser). Un échec laisse le défi masqué.
     *
     * @returns {Promise<boolean>}
     */
    async fetchDailyChallenge() {
      const gen = generation
      try {
        const resp = await badgesApi.dailyChallenge()
        if (gen !== generation) return false
        if (resp?.status !== 200 || typeof resp.data !== 'object' || resp.data === null) return false
        this.dailyChallenge = resp.data
        return true
      } catch {
        return false
      }
    },

    /**
     * Charge le niveau de l'utilisateur dans chaque matière (cartes maîtrisées et exercices).
     * Un échec est signalé par `subjectLevelsError` ; le reste de la page n'en dépend pas.
     *
     * @returns {Promise<boolean>}
     */
    async fetchSubjectLevels() {
      const gen = generation
      this.subjectLevelsError = false
      try {
        const resp = await badgesApi.subjectLevels()
        if (gen !== generation) return false
        if (resp?.status !== 200 || !Array.isArray(resp.data)) {
          this.subjectLevelsError = true
          return false
        }
        this.subjectLevels = resp.data
        return true
      } catch {
        if (gen === generation) this.subjectLevelsError = true
        return false
      }
    },

    /**
     * Envoie le fuseau horaire du navigateur à l'API (une fois par compte et par fuseau) : le « jour »
     * de la série, l'objectif quotidien et le rappel se calculent dans ce fuseau. Silencieux : aucun toast.
     *
     * @returns {Promise<boolean>} true si le fuseau est enregistré
     */
    async syncTimezone() {
      const zone = browserTimeZone()
      if (!zone || this._timezoneSynced === zone) return false
      const gen = generation
      await this.fetchSettings()
      if (gen !== generation || !this.settings) return false
      if (this.settings.timezone === zone) {
        this._timezoneSynced = zone
        return true
      }
      const saved = await this.updateSettings({ timezone: zone }, { silent: true })
      if (saved && gen === generation) this._timezoneSynced = zone
      return saved
    },

    /**
     * Bilan de fin de session (première pratique du jour, série) pour le message d'encouragement.
     * Aucune donnée n'est gardée dans le store : le bilan ne vaut que pour la session qui vient de finir.
     *
     * @returns {Promise<object|null>} null en mode zen, ou si l'API échoue
     */
    async fetchSessionFeedback() {
      const gen = generation
      try {
        await this.fetchSettings()
        if (gen !== generation || this.zen) return null
        const resp = await badgesApi.sessionFeedback()
        if (gen !== generation || resp?.status !== 200) return null
        return resp.data
      } catch {
        return null
      }
    },

    /**
     * Une pratique vient d'être enregistrée (l'API a déjà évalué les badges) : rafraîchit la série, l'objectif
     * quotidien et cherche les badges à fêter sans attendre le prochain changement de page.
     *
     * @returns {Promise<void>}
     */
    async refreshAfterPractice() {
      this._fetchedAt = 0 // la page des badges doit se recharger : progression et badges ont changé
      await Promise.all([
        this.fetchStreak(true),
        this.dailyGoal ? this.fetchDailyGoal() : Promise.resolve(),
        this.dailyChallenge ? this.fetchDailyChallenge() : Promise.resolve(),
        this.fetchCelebrations(true),
      ])
    },

    /**
     * Cherche les badges obtenus dont l'animation n'a pas été jouée. Ne fait rien (et ne marque rien comme
     * vu) si les animations sont coupées ou en mode zen : les badges gardent alors leur pastille « Nouveau ».
     * Appels espacés d'au moins 30 s (appelée à chaque changement de page).
     *
     * @param {boolean} [force=false]
     * @returns {Promise<boolean>} true si au moins un badge est à fêter
     */
    async fetchCelebrations(force = false) {
      if (!force && Date.now() - this._celebrationsCheckedAt < 30 * 1000) return this.celebrations.length > 0
      const gen = generation
      this._celebrationsCheckedAt = Date.now()
      try {
        await this.fetchSettings()
        if (gen !== generation || !this.celebrationsAllowed) return false
        const resp = await badgesApi.recent()
        if (gen !== generation) return false
        if (resp?.status !== 200 || !Array.isArray(resp.data)) return false
        this.celebrations = resp.data
        return this.celebrations.length > 0
      } catch {
        return false
      }
    },

    /**
     * Ferme la modale d'obtention : les badges montrés sont marqués comme vus (la pastille « Nouveau » disparaît).
     * Si l'enregistrement échoue, ils seront simplement proposés à nouveau à la prochaine vérification.
     *
     * @returns {Promise<boolean>}
     */
    async dismissCelebrations() {
      const codes = this.celebrations.map((badge) => badge.code)
      this.celebrations = []
      if (codes.length === 0) return true
      const gen = generation
      try {
        const resp = await badgesApi.markSeen(codes)
        if (gen !== generation) return false
        if (resp?.status !== 200) return false
        const now = new Date().toISOString()
        this.badges = this.badges.map((badge) => (codes.includes(badge.code) ? { ...badge, seenAt: now } : badge))
        return true
      } catch {
        return false
      }
    },

    /**
     * Enregistre titre et/ou vitrine. En cas d'erreur, l'état affiché est conservé et un toast explique.
     *
     * @param {{ titleCode?: string|null, showcaseCodes?: string[] }} data
     * @returns {Promise<boolean>}
     */
    async saveProfile(data) {
      const gen = generation
      try {
        const resp = await badgesApi.saveProfile(data)
        if (gen !== generation) return false
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
     * @param {{ silent?: boolean }} [options] - silent : aucun toast (réglage posé par l'application, pas par l'utilisateur)
     * @returns {Promise<boolean>}
     */
    async updateSettings(patch, { silent = false } = {}) {
      const gen = generation
      try {
        const resp = await badgesApi.updateSettings(patch)
        if (gen !== generation) return false
        if (resp?.status !== 200) {
          if (!silent) notif.notify(resp?.data?.message || "Erreur lors de l'enregistrement du réglage.", 'error')
          return false
        }
        // La réponse mêle `message` et les réglages : on ne garde que les réglages
        this.settings = Object.fromEntries(Object.entries(resp.data).filter(([key]) => key !== 'message'))
        this._settingsFetchedAt = Date.now()
        if (!silent) notif.notify('Réglage enregistré.', 'success')
        return true
      } catch {
        if (!silent) notif.notify("Erreur lors de l'enregistrement du réglage.", 'error')
        return false
      }
    },
  },
})

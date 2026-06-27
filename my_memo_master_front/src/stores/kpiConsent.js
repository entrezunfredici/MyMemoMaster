import { defineStore } from 'pinia'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'

export const useKpiConsentStore = defineStore('kpiConsent', {
  state: () => ({
    consents: [],
    // { [studentId]: kpiData } — null = pas de consentement, absent = pas encore chargé
    studentKpis: {},
    loading: false,
    granting: false,
    _consentsFetchedAt: null,
  }),

  actions: {
    /**
     * Charge la liste des consentements accordés par l'étudiant connecté.
     * Les données ne sont pas liées au groupe sélectionné : TTL 5 min pour éviter
     * un appel réseau à chaque switch de groupe.
     *
     * @param {boolean} [force=false] - Forcer le rechargement même si le cache est valide
     * @returns {Promise<boolean>}
     */
    async fetchMyConsents(force = false) {
      const TTL = 5 * 60 * 1000
      if (!force && this._consentsFetchedAt && Date.now() - this._consentsFetchedAt < TTL) return true
      this.loading = true
      try {
        const resp = await api.get('kpi/consent/my')
        if (resp?.status === 200) {
          this.consents = resp.data.data ?? []
          this._consentsFetchedAt = Date.now()
          return true
        }
        return false
      } catch {
        return false
      } finally {
        this.loading = false
      }
    },

    /**
     * Accorde l'accès à ses KPI à un enseignant dans un groupe.
     *
     * @param {number} teacherId
     * @param {number} classGroupId
     * @param {number|null} subjectId - null = accès global (toutes matières)
     * @returns {Promise<boolean>}
     */
    async grantConsent(teacherId, classGroupId, subjectId = null) {
      this.granting = true
      try {
        const body = { teacherId, classGroupId }
        if (subjectId !== null) body.subjectId = subjectId
        const resp = await api.post('kpi/consent', body)
        if (resp?.status === 201) {
          notif.notify('Accès accordé.', 'success')
          await this.fetchMyConsents(true)
          return true
        }
        if (resp?.status === 404) {
          notif.notify("Cet enseignant n'est plus disponible dans ce groupe.", 'error')
          return false
        }
        notif.notify(resp?.data?.message || "Erreur lors de l'accord de l'accès.", 'error')
        return false
      } catch {
        notif.notify("Erreur lors de l'accord de l'accès.", 'error')
        return false
      } finally {
        this.granting = false
      }
    },

    /**
     * Révoque un consentement accordé à un enseignant.
     *
     * @param {number} teacherId
     * @param {number} classGroupId
     * @param {number|null} subjectId - null = révoque tous les consentements pour cet enseignant dans ce groupe
     * @returns {Promise<boolean>}
     */
    async revokeConsent(teacherId, classGroupId, subjectId = null) {
      try {
        const base = `kpi/consent/${teacherId}/${classGroupId}`
        const endpoint = subjectId !== null ? `${base}?subjectId=${subjectId}` : base
        const resp = await api.del(endpoint)
        if (resp?.status === 200) {
          notif.notify('Accès révoqué.', 'success')
          await this.fetchMyConsents(true)
          return true
        }
        if (resp?.status === 404) {
          notif.notify('Consentement introuvable.', 'error')
          return false
        }
        notif.notify(resp?.data?.message || 'Erreur lors de la révocation.', 'error')
        return false
      } catch {
        notif.notify('Erreur lors de la révocation.', 'error')
        return false
      }
    },

    /**
     * Charge les KPI personnels d'un étudiant (usage enseignant — requiert consentement).
     * Stocke null si l'accès est refusé (pas de consentement).
     *
     * @param {number} studentId
     * @param {number} classGroupId
     * @returns {Promise<boolean>}
     */
    async fetchStudentKpis(studentId, classGroupId) {
      try {
        const resp = await api.get(`kpi/student/${studentId}`, { classGroupId })
        if (resp?.status === 200) {
          this.studentKpis[studentId] = resp.data
          return true
        }
        this.studentKpis[studentId] = null
        return false
      } catch {
        this.studentKpis[studentId] = null
        return false
      }
    },

    /**
     * Vide le cache des KPI étudiants (à appeler lors d'un changement de groupe).
     */
    clearStudentKpis() {
      this.studentKpis = {}
    },
  },
})

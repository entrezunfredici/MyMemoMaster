import { defineStore } from 'pinia'
import { api } from '@/helpers/api'
import { useAuthStore } from '@/stores/auth'

// CHOIX: état d'onboarding synchronisé avec l'API (UserOnboardingState) plutôt que localStorage.
// RAISON: la visite de l'interface ne doit être lancée automatiquement qu'une seule fois par
// utilisateur, quel que soit le navigateur — contrairement au parcours guidé (store guidedTour)
// qui est un guide d'usage relançable et purement local.

export const useOnboardingStore = defineStore('onboarding', {
  state: () => ({
    // null = état inconnu (pas encore chargé, ou échec de chargement) — la visite
    // automatique ne se lance que si l'API a explicitement répondu tourSeen=false.
    tourSeen: null,
    checklist: {},
    loading: false
  }),

  actions: {
    /**
     * Charge l'état d'onboarding de l'utilisateur connecté depuis l'API.
     *
     * @returns {Promise<boolean>} true si l'état a été chargé, false sinon
     */
    async fetchState() {
      this.loading = true
      try {
        const resp = await api.get('onboardingState/byUserId')
        if (resp?.status === 200) {
          this.tourSeen = resp.data.tour_seen === true
          this.checklist = resp.data.checklist ?? {}
          return true
        }
        // CHOIX: pas de toast d'erreur sur ce fetch d'arrière-plan.
        // RAISON: un échec (utilisateur legacy sans ligne d'onboarding, API indisponible)
        // ne doit pas polluer chaque connexion — la visite ne se lance simplement pas.
        console.warn("Onboarding — état non chargé:", resp?.data?.message || resp?.status)
        return false
      } catch (error) {
        console.warn("Onboarding — erreur lors du chargement de l'état:", error)
        return false
      } finally {
        this.loading = false
      }
    },

    /**
     * Marque la visite de l'interface comme vue côté serveur.
     * No-op si elle est déjà marquée vue (évite un PUT en double :
     * intro.js déclenche onexit y compris après une fin normale).
     *
     * @returns {Promise<boolean>} true si l'état est "vu" côté serveur, false sinon
     */
    async markTourSeen() {
      if (this.tourSeen === true) return true

      const authStore = useAuthStore()
      const userId = authStore.user?.userId
      if (!userId) return false

      try {
        // L'API identifie l'utilisateur via le JWT ; le :id du chemin est requis par la route
        const resp = await api.put(`onboardingState/${userId}`, { tour_seen: true })
        if (resp?.status === 200) {
          this.tourSeen = true
          return true
        }
        console.warn("Onboarding — état non sauvegardé:", resp?.data?.message || resp?.status)
        return false
      } catch (error) {
        console.warn("Onboarding — erreur lors de la sauvegarde de l'état:", error)
        return false
      }
    }
  }
})

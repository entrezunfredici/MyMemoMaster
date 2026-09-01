import { defineStore } from 'pinia'
import { api } from '@/helpers/api'

// CHOIX: échec silencieux (pas de notif.notify) sur logSession()
// RAISON: c'est un journal de mesure (alimente le KPI "Temps total de révision"),
// pas une action que l'utilisateur a demandée — la session de révision qu'il
// vient de terminer reste acquise (cartes déjà corrigées une à une pendant la
// session) même si ce dernier appel échoue ; l'interrompre par un toast d'erreur
// sur un écran de fin de session serait disproportionné.
export const useLeitnerReviewSessionStore = defineStore('leitnerReviewSessions', {
  actions: {
    /**
     * Journalise une session de révision Leitner terminée (durée chronométrée
     * côté front). Best-effort : ne bloque jamais l'affichage de l'écran de fin.
     *
     * @param {number} idSystem
     * @param {number} cardsReviewed
     * @param {number} durationSeconds
     */
    async logSession(idSystem, cardsReviewed, durationSeconds) {
      try {
        await api.post('leitner-review-sessions', { idSystem, cardsReviewed, durationSeconds })
      } catch {
        // best-effort — voir CHOIX ci-dessus
      }
    }
  }
})

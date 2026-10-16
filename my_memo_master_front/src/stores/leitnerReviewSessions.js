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
     * Journalise une session de révision Leitner (durée chronométrée côté
     * front) — complète ou partielle. Best-effort : ne bloque jamais
     * l'affichage de l'écran de fin ni la navigation en cas de sortie
     * anticipée.
     *
     * @param {number} idSystem
     * @param {number} cardsReviewed
     * @param {number} durationSeconds
     * @param {boolean} [completed=true] - false pour une sortie anticipée
     *   (bouton "← Retour") : n'invalide pas la journalisation du temps passé,
     *   mais évite de valider automatiquement une séance planifiée sur une
     *   session non menée à son terme (voir RevisionSession.service.js côté API).
     */
    async logSession(idSystem, cardsReviewed, durationSeconds, completed = true) {
      try {
        await api.post('leitner-review-sessions', { idSystem, cardsReviewed, durationSeconds, completed })
      } catch {
        // best-effort — voir CHOIX ci-dessus
      }
    }
  }
})

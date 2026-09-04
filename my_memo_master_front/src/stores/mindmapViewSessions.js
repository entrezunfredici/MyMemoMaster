import { defineStore } from 'pinia'
import { api } from '@/helpers/api'

// CHOIX: échec silencieux (pas de notif.notify) sur logSession()
// RAISON: même raisonnement que leitnerReviewSessions.js — c'est un journal de
// mesure (alimente le KPI "Temps total de révision"), pas une action que
// l'utilisateur a demandée ; la consultation de la carte mentale reste acquise
// même si ce dernier appel échoue, interrompre la navigation par un toast
// d'erreur serait disproportionné.
export const useMindMapViewSessionStore = defineStore('mindmapViewSessions', {
  actions: {
    /**
     * Journalise une consultation de carte mentale terminée (durée chronométrée
     * côté front). Best-effort : ne bloque jamais la navigation.
     *
     * @param {number} idMindMap
     * @param {number} durationSeconds
     */
    async logSession(idMindMap, durationSeconds) {
      try {
        await api.post('mindmap-view-sessions', { idMindMap, durationSeconds })
      } catch {
        // best-effort — voir CHOIX ci-dessus
      }
    },

    /**
     * Variante de logSession() pour un handler `pagehide` (fermeture d'onglet
     * ou de navigateur) : utilise api.postBeacon (fetch keepalive) plutôt
     * qu'api.post (Axios/XHR), dont la requête serait annulée par le
     * navigateur pendant le déchargement de la page — voir CHOIX dans
     * helpers/api.js.
     *
     * @param {number} idMindMap
     * @param {number} durationSeconds
     */
    logSessionBeacon(idMindMap, durationSeconds) {
      api.postBeacon('mindmap-view-sessions', { idMindMap, durationSeconds })
    }
  }
})

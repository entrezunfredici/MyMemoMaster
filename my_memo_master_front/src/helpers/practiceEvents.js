// Signal « une pratique vient d'être enregistrée » : l'API a déjà traité l'événement de gamification
// (jour d'activité, badges) avant de répondre, le front peut donc rafraîchir série, objectif quotidien et
// modale d'obtention tout de suite, sans attendre un changement de page.
//
// CHOIX: un événement de la fenêtre déclenché par api.js plutôt qu'un import du store des badges
// RAISON: le store des badges importe api.js ; l'inverse créerait un cycle. L'événement garde les deux découplés
// et évite de modifier chaque écran de fin de session.

export const PRACTICE_EVENT = 'mmm:practice-logged'

// Les trois routes dont le service émet un événement de badges (Test.submit, LeitnerReviewSession.create,
// MindMapViewSession.create).
const PRACTICE_ENDPOINTS = /^(leitner-review-sessions|mindmap-view-sessions|tests\/[^/]+\/submit)$/

/**
 * @param {string} endpoint - chemin appelé (ex. « tests/12/submit »)
 * @returns {boolean} true si la route enregistre une pratique
 */
export function isPracticeEndpoint(endpoint) {
  return typeof endpoint === 'string' && PRACTICE_ENDPOINTS.test(endpoint.replace(/^\/+/, '').split('?')[0])
}

/** Annonce qu'une pratique vient d'être enregistrée (sans effet hors navigateur). */
export function announcePractice() {
  if (typeof window === 'undefined' || typeof CustomEvent !== 'function') return
  window.dispatchEvent(new CustomEvent(PRACTICE_EVENT))
}
